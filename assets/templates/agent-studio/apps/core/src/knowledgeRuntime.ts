import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { applyKnowledgeWikiMutation } from "./knowledgeWikiApply.js";
import { syncKnowledgeWikiBridge } from "./knowledgeWikiBridge.js";
import { compileKnowledgeWikiVault } from "./knowledgeWikiCompile.js";
import { renderMarkdownFence, renderKnowledgeWikiMarkdown, slugifyKnowledgeWikiSegment } from "./knowledgeWikiMarkdown.js";
import { getKnowledgeWikiPage, searchKnowledgeWiki } from "./knowledgeWikiQuery.js";
import { buildKnowledgeWikiDoctor, buildKnowledgeWikiPromptSupplement, resolveKnowledgeWikiStatus } from "./knowledgeWikiStatus.js";
import { ensureKnowledgeWikiVault } from "./knowledgeWikiVault.js";
import { lintKnowledgeWikiVault } from "./knowledgeWikiLint.js";
import { loadPromptInjectionState, scanPromptInjectionText, shieldUntrustedContent } from "./promptInjectionRuntime.js";

export type KnowledgeConfig = {
  enabled: boolean;
  command: string;
  defaultMode: "search" | "vsearch" | "query";
  defaultLimit: number;
  wikiEnabled: boolean;
  rawDir: string;
  wikiDir: string;
  indexFile: string;
  logFile: string;
  schemaFile: string;
  autoFileAnswers: boolean;
  vaultMode: "isolated" | "bridge";
  renderMode: "native" | "obsidian";
  bridge: {
    enabled: boolean;
    indexMemoryEntries: boolean;
    indexDreamReports: boolean;
    indexProjectMemoryFiles: boolean;
  };
  ingest: {
    autoCompile: boolean;
  };
  render: {
    preserveHumanBlocks: boolean;
    createBacklinks: boolean;
    createDashboards: boolean;
  };
};

export type KnowledgeConfigPatch = Partial<Omit<KnowledgeConfig, "bridge" | "ingest" | "render">> & {
  bridge?: Partial<KnowledgeConfig["bridge"]>;
  ingest?: Partial<KnowledgeConfig["ingest"]>;
  render?: Partial<KnowledgeConfig["render"]>;
};

const DEFAULT_CONFIG: KnowledgeConfig = {
  enabled: false,
  command: "qmd",
  defaultMode: "query",
  defaultLimit: 8,
  wikiEnabled: true,
  rawDir: "knowledge/raw",
  wikiDir: "knowledge/wiki",
  indexFile: "knowledge/index.md",
  logFile: "knowledge/log.md",
  schemaFile: "knowledge/schema.md",
  autoFileAnswers: false,
  vaultMode: "isolated",
  renderMode: "native",
  bridge: {
    enabled: false,
    indexMemoryEntries: true,
    indexDreamReports: true,
    indexProjectMemoryFiles: true,
  },
  ingest: {
    autoCompile: true,
  },
  render: {
    preserveHumanBlocks: true,
    createBacklinks: true,
    createDashboards: true,
  },
};

async function loadKnowledgeFile(dataDir: string) {
  const filePath = path.join(dataDir, "knowledge-engine.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    return { filePath, config: DEFAULT_CONFIG };
  }
  return {
    filePath,
    config: {
      ...DEFAULT_CONFIG,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<KnowledgeConfig>),
      bridge: {
        ...DEFAULT_CONFIG.bridge,
        ...(((JSON.parse(await readFile(filePath, "utf8")) as Partial<KnowledgeConfig>).bridge) ?? {}),
      },
      ingest: {
        ...DEFAULT_CONFIG.ingest,
        ...(((JSON.parse(await readFile(filePath, "utf8")) as Partial<KnowledgeConfig>).ingest) ?? {}),
      },
      render: {
        ...DEFAULT_CONFIG.render,
        ...(((JSON.parse(await readFile(filePath, "utf8")) as Partial<KnowledgeConfig>).render) ?? {}),
      },
    },
  };
}

export async function loadKnowledgeConfig(dataDir: string) {
  return (await loadKnowledgeFile(dataDir)).config;
}

export async function saveKnowledgeConfig(dataDir: string, patch: KnowledgeConfigPatch) {
  const loaded = await loadKnowledgeFile(dataDir);
  const next = {
    ...loaded.config,
    ...patch,
    bridge: { ...loaded.config.bridge, ...(patch.bridge ?? {}) },
    ingest: { ...loaded.config.ingest, ...(patch.ingest ?? {}) },
    render: { ...loaded.config.render, ...(patch.render ?? {}) },
  };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function ensureKnowledgeWiki(projectRoot: string, config: KnowledgeConfig) {
  return await ensureKnowledgeWikiVault(projectRoot, config);
}

export async function knowledgeWikiStatus(projectRoot: string, config: KnowledgeConfig) {
  return await resolveKnowledgeWikiStatus(projectRoot, config);
}

export async function compileKnowledgeWiki(projectRoot: string, config: KnowledgeConfig) {
  return await compileKnowledgeWikiVault(projectRoot, config);
}

export async function searchKnowledgeWikiPages(projectRoot: string, config: KnowledgeConfig, query: string, limit?: number) {
  return await searchKnowledgeWiki(projectRoot, config, query, limit ?? config.defaultLimit);
}

export async function getKnowledgeWiki(projectRoot: string, config: KnowledgeConfig, lookup: string, fromLine?: number, lineCount?: number) {
  return await getKnowledgeWikiPage(projectRoot, config, lookup, fromLine, lineCount);
}

export async function applyKnowledgeWiki(projectRoot: string, config: KnowledgeConfig, mutation: Record<string, unknown>) {
  return await applyKnowledgeWikiMutation(projectRoot, config, mutation);
}

export async function bridgeKnowledgeWiki(projectRoot: string, dataDir: string, config: KnowledgeConfig, ownerId?: string) {
  return await syncKnowledgeWikiBridge(projectRoot, dataDir, config, ownerId);
}

export async function knowledgeWikiDoctor(projectRoot: string, config: KnowledgeConfig) {
  return await buildKnowledgeWikiDoctor(projectRoot, config);
}

export function knowledgeWikiPromptSupplement(config: KnowledgeConfig) {
  return buildKnowledgeWikiPromptSupplement(config);
}

export async function ingestKnowledgeSource(input: {
  dataDir: string;
  projectRoot: string;
  config: KnowledgeConfig;
  sourcePath: string;
  title?: string;
  summary?: string;
}) {
  const layout = await ensureKnowledgeWikiVault(input.projectRoot, input.config);
  const sourceText = await readFile(input.sourcePath, "utf8");
  const title = input.title?.trim() || path.basename(input.sourcePath, path.extname(input.sourcePath));
  const slug = slugify(title) || "source";
  const rawTarget = path.join(layout.rawDir, `${slug}${path.extname(input.sourcePath) || ".md"}`);
  const pagePath = path.join(layout.sourcesDir, `${slug}.md`);

  const promptInjectionState = await loadPromptInjectionState(input.dataDir);
  const scan = scanPromptInjectionText(sourceText);
  if (
    promptInjectionState.config.enabled &&
    promptInjectionState.config.blockHighRiskKnowledgeIngest &&
    scan.severity === "high"
  ) {
    await shieldUntrustedContent({
      dataDir: input.dataDir,
      sourceKind: "knowledge_source",
      sourceLabel: title,
      text: sourceText,
      blockHighRisk: true,
    });
  }

  await copyFile(input.sourcePath, rawTarget);
  const summary =
    input.summary?.trim() ||
    sourceText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12)
      .join(" ")
      .slice(0, 1500);

  const shielded = await shieldUntrustedContent({
    dataDir: input.dataDir,
    sourceKind: "knowledge_source",
    sourceLabel: title,
    text: summary,
  });

  await writeFile(
    pagePath,
    renderKnowledgeWikiMarkdown({
      frontmatter: {
        pageType: "source",
        id: `source.${slugifyKnowledgeWikiSegment(title)}`,
        title,
        sourceType: "local_source",
        provenanceMode: "isolated",
        provenanceLabel: `local source: ${path.basename(rawTarget)}`,
        sourcePath: rawTarget,
        status: "active",
        updatedAt: new Date().toISOString(),
      },
      body: [
        `# ${title}`,
        "",
        "## Source",
        `- Type: \`local_source\``,
        `- Path: \`${rawTarget}\``,
        "",
        "## Summary",
        "",
        shielded.content || "No summary available.",
        "",
        "## Content",
        renderMarkdownFence(sourceText, "text"),
        "",
        "## Prompt Injection Risk",
        "",
        `- severity: ${shielded.scan.severity}`,
        `- score: ${shielded.scan.score}`,
        `- suspicious: ${shielded.scan.suspicious}`,
        `- signals: ${shielded.scan.hits.length > 0 ? shielded.scan.hits.map((hit) => hit.id).join(", ") : "none"}`,
        "",
        "## Notes",
        "<!-- gagent:wiki:human:start -->",
        "<!-- gagent:wiki:human:end -->",
        "",
      ].join("\n"),
    }),
    "utf8",
  );

  const compile = input.config.ingest.autoCompile
    ? await compileKnowledgeWikiVault(input.projectRoot, input.config)
    : null;

  const logText = await readFile(layout.runtimeLogFile, "utf8").catch(() => "");
  await writeFile(
    layout.runtimeLogFile,
    `${logText}${JSON.stringify({
      type: "ingest",
      timestamp: new Date().toISOString(),
      sourcePath: input.sourcePath,
      pagePath: path.relative(layout.wikiRoot, pagePath).replace(/\\/g, "/"),
      promptInjectionSeverity: shielded.scan.severity,
    })}\n`,
    "utf8",
  );

  return {
    title,
    rawTarget,
    wikiTarget: pagePath,
    summary,
    promptInjection: shielded.scan,
    indexUpdatedFiles: compile?.updatedFiles ?? [],
  };
}

export async function fileKnowledgeAnswer(input: {
  dataDir: string;
  projectRoot: string;
  config: KnowledgeConfig;
  title: string;
  content: string;
}) {
  const shielded = await shieldUntrustedContent({
    dataDir: input.dataDir,
    sourceKind: "knowledge_analysis",
    sourceLabel: input.title,
    text: input.content.trim(),
  });
  const result = await applyKnowledgeWikiMutation(input.projectRoot, input.config, {
    op: "create_synthesis",
    title: input.title,
    body: shielded.content,
    sourceIds: ["source.manual"],
    status: "active",
  });
  return {
    target: result.pagePath,
    promptInjection: shielded.scan,
    compile: result.compile,
  };
}

export async function lintKnowledgeWiki(projectRoot: string, config: KnowledgeConfig) {
  return await lintKnowledgeWikiVault(projectRoot, config);
}

function execText(command: string, args: string[], cwd: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("exit", (code) => {
      if (code === 0) resolve((stdout || stderr).trim());
      else reject(new Error((stderr || stdout || `command exited ${code}`).trim()));
    });
  });
}

export async function qmdStatus(projectRoot: string, config: KnowledgeConfig) {
  if (!config.enabled) {
    return {
      enabled: false,
      available: false,
      command: config.command,
      detail: "Knowledge engine disabled",
    };
  }
  try {
    const version = await execText(config.command, ["--version"], projectRoot);
    return {
      enabled: true,
      available: true,
      command: config.command,
      version,
      detail: "qmd detected",
    };
  } catch (error) {
    return {
      enabled: true,
      available: false,
      command: config.command,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function qmdQuery(input: {
  projectRoot: string;
  config: KnowledgeConfig;
  query: string;
  mode?: "search" | "vsearch" | "query";
  limit?: number;
}) {
  const mode = input.mode ?? input.config.defaultMode;
  const limit = input.limit ?? input.config.defaultLimit;
  const output = await execText(
    input.config.command,
    [mode, input.query, "--json", "-n", String(limit)],
    input.projectRoot,
  );
  return JSON.parse(output) as unknown;
}

export async function qmdGet(input: {
  dataDir: string;
  projectRoot: string;
  config: KnowledgeConfig;
  selector: string;
}) {
  const content = await execText(input.config.command, ["get", input.selector, "--full"], input.projectRoot);
  const shielded = await shieldUntrustedContent({
    dataDir: input.dataDir,
    sourceKind: "knowledge_query_result",
    sourceLabel: input.selector,
    text: content,
  });
  return {
    selector: input.selector,
    content: shielded.content,
    promptInjection: shielded.scan,
  };
}
