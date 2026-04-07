import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
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
    },
  };
}

export async function loadKnowledgeConfig(dataDir: string) {
  return (await loadKnowledgeFile(dataDir)).config;
}

export async function saveKnowledgeConfig(dataDir: string, patch: Partial<KnowledgeConfig>) {
  const loaded = await loadKnowledgeFile(dataDir);
  const next = { ...loaded.config, ...patch };
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

async function ensureFile(filePath: string, content: string) {
  if (!existsSync(filePath)) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }
}

export async function ensureKnowledgeWiki(projectRoot: string, config: KnowledgeConfig) {
  const rawDir = path.join(projectRoot, config.rawDir);
  const wikiDir = path.join(projectRoot, config.wikiDir);
  const sourcesDir = path.join(wikiDir, "sources");
  const analysesDir = path.join(wikiDir, "analyses");
  await mkdir(rawDir, { recursive: true });
  await mkdir(sourcesDir, { recursive: true });
  await mkdir(analysesDir, { recursive: true });

  await ensureFile(
    path.join(projectRoot, config.indexFile),
    "# Knowledge Index\n\nGenerated wiki index for maintained knowledge pages.\n"
  );
  await ensureFile(
    path.join(projectRoot, config.logFile),
    "# Knowledge Log\n\nChronological log of ingests, analyses, and lint passes.\n"
  );
  await ensureFile(
    path.join(projectRoot, config.schemaFile),
    [
      "# Knowledge Schema",
      "",
      "- `knowledge/raw/` stores immutable sources.",
      "- `knowledge/wiki/sources/` stores source summaries.",
      "- `knowledge/wiki/analyses/` stores filed answers and syntheses.",
      "- `knowledge/index.md` indexes maintained pages.",
      "- `knowledge/log.md` records chronological operations.",
    ].join("\n")
  );
  await ensureFile(path.join(rawDir, "README.md"), "# Raw Sources\n\nDrop immutable source documents here.\n");
  await ensureFile(path.join(wikiDir, "README.md"), "# Wiki\n\nLLM-maintained knowledge pages live here.\n");

  return {
    rawDir,
    wikiDir,
    sourcesDir,
    analysesDir,
    indexFile: path.join(projectRoot, config.indexFile),
    logFile: path.join(projectRoot, config.logFile),
    schemaFile: path.join(projectRoot, config.schemaFile),
  };
}

export async function knowledgeWikiStatus(projectRoot: string, config: KnowledgeConfig) {
  const layout = await ensureKnowledgeWiki(projectRoot, config);
  const rawFiles = (await readdir(layout.rawDir, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name);
  const wikiFiles = (await readdir(layout.wikiDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);
  const sourcePages = (await readdir(layout.sourcesDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);
  const analysisPages = (await readdir(layout.analysesDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);
  return {
    enabled: config.wikiEnabled,
    ...layout,
    rawFiles: rawFiles.length,
    sourcePages: sourcePages.length,
    analysisPages: analysisPages.length,
    rootPages: wikiFiles.length,
  };
}

export async function ingestKnowledgeSource(input: {
  dataDir: string;
  projectRoot: string;
  config: KnowledgeConfig;
  sourcePath: string;
  title?: string;
  summary?: string;
}) {
  const layout = await ensureKnowledgeWiki(input.projectRoot, input.config);
  const sourceText = await readFile(input.sourcePath, "utf8");
  const title = input.title?.trim() || path.basename(input.sourcePath, path.extname(input.sourcePath));
  const slug = slugify(title) || "source";
  const rawTarget = path.join(layout.rawDir, `${slug}${path.extname(input.sourcePath) || ".md"}`);
  const wikiTarget = path.join(layout.sourcesDir, `${slug}.md`);
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
    wikiTarget,
    [
      `# ${title}`,
      "",
      `Source: [raw/${path.basename(rawTarget)}](../raw/${path.basename(rawTarget)})`,
      "",
      "## Summary",
      "",
      shielded.content || "No summary available.",
      "",
      "## Prompt Injection Risk",
      "",
      `- severity: ${shielded.scan.severity}`,
      `- score: ${shielded.scan.score}`,
      `- suspicious: ${shielded.scan.suspicious}`,
      `- signals: ${shielded.scan.hits.length > 0 ? shielded.scan.hits.map((hit) => hit.id).join(", ") : "none"}`,
    ].join("\n"),
    "utf8"
  );

  const indexText = await readFile(layout.indexFile, "utf8");
  const indexEntry = `- [${title}](wiki/sources/${path.basename(wikiTarget)}) - source summary`;
  if (!indexText.includes(indexEntry)) {
    await writeFile(layout.indexFile, `${indexText.trimEnd()}\n${indexEntry}\n`, "utf8");
  }
  const logText = await readFile(layout.logFile, "utf8");
  await writeFile(
    layout.logFile,
    `${logText.trimEnd()}\n## [${new Date().toISOString()}] ingest | ${title}\n- source: ${input.sourcePath}\n- wiki: ${wikiTarget}\n- prompt_injection_severity: ${shielded.scan.severity}\n`,
    "utf8"
  );

  return {
    title,
    rawTarget,
    wikiTarget,
    summary,
    promptInjection: shielded.scan,
  };
}

export async function fileKnowledgeAnswer(input: {
  dataDir: string;
  projectRoot: string;
  config: KnowledgeConfig;
  title: string;
  content: string;
}) {
  const layout = await ensureKnowledgeWiki(input.projectRoot, input.config);
  const slug = slugify(input.title) || "analysis";
  const target = path.join(layout.analysesDir, `${slug}.md`);
  const shielded = await shieldUntrustedContent({
    dataDir: input.dataDir,
    sourceKind: "knowledge_analysis",
    sourceLabel: input.title,
    text: input.content.trim(),
  });
  await writeFile(target, `# ${input.title}\n\n${shielded.content}\n`, "utf8");
  const indexText = await readFile(layout.indexFile, "utf8");
  const indexEntry = `- [${input.title}](wiki/analyses/${path.basename(target)}) - filed analysis`;
  if (!indexText.includes(indexEntry)) {
    await writeFile(layout.indexFile, `${indexText.trimEnd()}\n${indexEntry}\n`, "utf8");
  }
  const logText = await readFile(layout.logFile, "utf8");
  await writeFile(
    layout.logFile,
    `${logText.trimEnd()}\n## [${new Date().toISOString()}] query | ${input.title}\n- wiki: ${target}\n- prompt_injection_severity: ${shielded.scan.severity}\n`,
    "utf8"
  );
  return { target, promptInjection: shielded.scan };
}

export async function lintKnowledgeWiki(projectRoot: string, config: KnowledgeConfig) {
  const layout = await ensureKnowledgeWiki(projectRoot, config);
  const findings: Array<{ severity: "info" | "warning"; message: string }> = [];
  const indexText = await readFile(layout.indexFile, "utf8");
  const sourcePages = (await readdir(layout.sourcesDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);
  const analysisPages = (await readdir(layout.analysesDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);
  for (const file of [...sourcePages, ...analysisPages]) {
    if (!indexText.includes(file)) {
      findings.push({
        severity: "warning",
        message: `Page is not indexed: ${file}`,
      });
    }
  }
  if (sourcePages.length === 0) {
    findings.push({
      severity: "info",
      message: "No source pages have been ingested yet.",
    });
  }
  return {
    sourcePages: sourcePages.length,
    analysisPages: analysisPages.length,
    findings,
  };
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
  const output = await execText(input.config.command, [mode, input.query, "--json", "-n", String(limit)], input.projectRoot);
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
