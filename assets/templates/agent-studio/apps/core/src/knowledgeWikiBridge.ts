import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { KnowledgeConfig } from "./knowledgeRuntime.js";
import { compileKnowledgeWikiVault, type CompileKnowledgeWikiResult } from "./knowledgeWikiCompile.js";
import { renderMarkdownFence, renderKnowledgeWikiMarkdown, slugifyKnowledgeWikiSegment } from "./knowledgeWikiMarkdown.js";
import { ensureKnowledgeWikiVault } from "./knowledgeWikiVault.js";
import { loadMemoryState } from "./memoryRuntime.js";
import { loadDreamState } from "./dreamRuntime.js";

type SourceSyncEntry = {
  group: "bridge";
  pagePath: string;
  sourceKey: string;
  sourceUpdatedAtMs: number;
  sourceSize: number;
  renderFingerprint: string;
};

type SourceSyncState = {
  version: 1;
  entries: Record<string, SourceSyncEntry>;
};

type BridgeArtifact = {
  syncKey: string;
  sourceType: "memory_entry" | "dream_report" | "project_memory";
  title: string;
  rawContent: string;
  sourcePath: string;
  provenanceLabel: string;
  ownerId?: string;
  updatedAtMs: number;
  size: number;
  bridgeKind: string;
};

export type KnowledgeWikiBridgeSyncResult = {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  removedCount: number;
  artifactCount: number;
  pagePaths: string[];
  indexesRefreshed: boolean;
  indexRefreshReason: "auto-compile-disabled" | "no-import-changes" | "missing-indexes" | "import-changed";
  indexUpdatedFiles: string[];
};

async function readSourceSyncState(filePath: string): Promise<SourceSyncState> {
  const raw = await fs.readFile(filePath, "utf8").catch(() => "");
  if (!raw.trim()) {
    return { version: 1, entries: {} };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SourceSyncState>;
    return {
      version: 1,
      entries: { ...(parsed.entries ?? {}) },
    };
  } catch {
    return { version: 1, entries: {} };
  }
}

async function writeSourceSyncState(filePath: string, state: SourceSyncState) {
  await fs.writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function listProjectMemoryArtifacts(projectRoot: string) {
  const memoryRoot = path.join(projectRoot, "memory");
  const entries = await fs.readdir(memoryRoot, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(memoryRoot, entry.name));
  return files.sort((left, right) => left.localeCompare(right));
}

function bridgeSlug(artifact: BridgeArtifact) {
  const base = slugifyKnowledgeWikiSegment(artifact.title);
  const hash = createHash("sha1").update(artifact.syncKey).digest("hex").slice(0, 8);
  return `${base}-${hash}`;
}

function bridgePagePath(artifact: BridgeArtifact) {
  return path.join("sources", `bridge-${bridgeSlug(artifact)}.md`).replace(/\\/g, "/");
}

function renderFingerprint(artifact: BridgeArtifact) {
  return createHash("sha1")
    .update(
      JSON.stringify({
        sourceType: artifact.sourceType,
        sourcePath: artifact.sourcePath,
        title: artifact.title,
        provenanceLabel: artifact.provenanceLabel,
        contentHash: createHash("sha1").update(artifact.rawContent).digest("hex"),
      }),
    )
    .digest("hex");
}

async function collectBridgeArtifacts(projectRoot: string, dataDir: string, ownerId?: string) {
  const artifacts: BridgeArtifact[] = [];
  const memoryState = await loadMemoryState(dataDir);
  for (const entry of memoryState.state.entries) {
    if (ownerId && entry.ownerId !== ownerId) continue;
    const rawContent = `# ${entry.title}\n\n${entry.content}`;
    artifacts.push({
      syncKey: `memory_entry:${entry.id}`,
      sourceType: "memory_entry",
      title: entry.title,
      rawContent,
      sourcePath: `memory:${entry.id}`,
      provenanceLabel: `memory entry: ${entry.id}`,
      ownerId: entry.ownerId,
      updatedAtMs: Date.parse(entry.createdAt),
      size: Buffer.byteLength(rawContent, "utf8"),
      bridgeKind: "memory_entry",
    });
  }
  const dreamState = await loadDreamState(dataDir);
  for (const report of dreamState.state.reports) {
    const rawContent = `# ${report.title}\n\n${report.summary}`;
    artifacts.push({
      syncKey: `dream_report:${report.id}`,
      sourceType: "dream_report",
      title: report.title,
      rawContent,
      sourcePath: `dream:${report.id}`,
      provenanceLabel: `dream report: ${report.id}`,
      updatedAtMs: Date.parse(report.createdAt),
      size: Buffer.byteLength(rawContent, "utf8"),
      bridgeKind: "dream_report",
    });
  }
  for (const filePath of await listProjectMemoryArtifacts(projectRoot)) {
    const rawContent = await fs.readFile(filePath, "utf8");
    const stats = await fs.stat(filePath);
    artifacts.push({
      syncKey: `project_memory:${filePath.toLowerCase()}`,
      sourceType: "project_memory",
      title: path.basename(filePath, path.extname(filePath)).replace(/[-_]+/g, " ").trim(),
      rawContent,
      sourcePath: filePath,
      provenanceLabel: `project memory: ${path.relative(projectRoot, filePath).replace(/\\/g, "/")}`,
      updatedAtMs: stats.mtimeMs,
      size: stats.size,
      bridgeKind: "project_memory",
    });
  }
  return artifacts.sort((left, right) => left.title.localeCompare(right.title));
}

async function writeBridgePage(projectRoot: string, layout: Awaited<ReturnType<typeof ensureKnowledgeWikiVault>>, artifact: BridgeArtifact) {
  const pagePath = bridgePagePath(artifact);
  const absolutePath = path.join(layout.wikiRoot, pagePath);
  const pageId = `source.bridge.${bridgeSlug(artifact)}`;
  const rendered = renderKnowledgeWikiMarkdown({
    frontmatter: {
      pageType: "source",
      id: pageId,
      title: artifact.title,
      sourceType: artifact.sourceType,
      provenanceMode: "bridge",
      provenanceLabel: artifact.provenanceLabel,
      sourcePath: artifact.sourcePath,
      bridgeKind: artifact.bridgeKind,
      bridgeKey: artifact.syncKey,
      ...(artifact.ownerId ? { ownerId: artifact.ownerId } : {}),
      status: "active",
      updatedAt: new Date(artifact.updatedAtMs).toISOString(),
    },
    body: [
      `# ${artifact.title}`,
      "",
      "## Bridge Source",
      `- Type: \`${artifact.sourceType}\``,
      `- Source: \`${artifact.sourcePath}\``,
      `- Provenance: ${artifact.provenanceLabel}`,
      `- Updated: ${new Date(artifact.updatedAtMs).toISOString()}`,
      "",
      "## Content",
      renderMarkdownFence(artifact.rawContent, artifact.sourceType === "project_memory" ? "markdown" : "text"),
      "",
      "## Notes",
      "<!-- gagent:wiki:human:start -->",
      "<!-- gagent:wiki:human:end -->",
      "",
    ].join("\n"),
  });
  const existing = await fs.readFile(absolutePath, "utf8").catch(() => "");
  if (existing !== rendered) {
    await fs.writeFile(absolutePath, rendered, "utf8");
  }
  return { pagePath, changed: existing !== rendered, created: !existing };
}

async function hasMissingIndexes(layout: Awaited<ReturnType<typeof ensureKnowledgeWikiVault>>) {
  const required = [
    layout.indexFile,
    path.join(layout.sourcesDir, "index.md"),
    path.join(layout.entitiesDir, "index.md"),
    path.join(layout.conceptsDir, "index.md"),
    path.join(layout.synthesesDir, "index.md"),
    path.join(layout.reportsDir, "index.md"),
  ];
  for (const filePath of required) {
    if (!existsSync(filePath)) return true;
  }
  return false;
}

export async function syncKnowledgeWikiBridge(projectRoot: string, dataDir: string, config: KnowledgeConfig, ownerId?: string): Promise<KnowledgeWikiBridgeSyncResult> {
  const layout = await ensureKnowledgeWikiVault(projectRoot, config);
  if (config.vaultMode !== "bridge" || !config.bridge.enabled) {
    return {
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      removedCount: 0,
      artifactCount: 0,
      pagePaths: [],
      indexesRefreshed: false,
      indexRefreshReason: config.ingest.autoCompile ? "no-import-changes" : "auto-compile-disabled",
      indexUpdatedFiles: [],
    };
  }

  const state = await readSourceSyncState(layout.syncStateFile);
  const artifacts = await collectBridgeArtifacts(projectRoot, dataDir, ownerId);
  const activeKeys = new Set<string>();
  const results: Array<{ pagePath: string; changed: boolean; created: boolean }> = [];

  for (const artifact of artifacts) {
    activeKeys.add(artifact.syncKey);
    const pagePath = bridgePagePath(artifact);
    const fingerprint = renderFingerprint(artifact);
    const entry = state.entries[artifact.syncKey];
    const pageExists = existsSync(path.join(layout.wikiRoot, pagePath));
    if (
      entry &&
      entry.pagePath === pagePath &&
      entry.sourceKey === artifact.syncKey &&
      entry.sourceUpdatedAtMs === artifact.updatedAtMs &&
      entry.sourceSize === artifact.size &&
      entry.renderFingerprint === fingerprint &&
      pageExists
    ) {
      results.push({ pagePath, changed: false, created: false });
      continue;
    }
    const write = await writeBridgePage(projectRoot, layout, artifact);
    results.push(write);
    state.entries[artifact.syncKey] = {
      group: "bridge",
      pagePath,
      sourceKey: artifact.syncKey,
      sourceUpdatedAtMs: artifact.updatedAtMs,
      sourceSize: artifact.size,
      renderFingerprint: fingerprint,
    };
  }

  let removedCount = 0;
  for (const [syncKey, entry] of Object.entries(state.entries)) {
    if (entry.group !== "bridge" || activeKeys.has(syncKey)) continue;
    await fs.rm(path.join(layout.wikiRoot, entry.pagePath), { force: true }).catch(() => undefined);
    delete state.entries[syncKey];
    removedCount += 1;
  }
  await writeSourceSyncState(layout.syncStateFile, state);

  const importedCount = results.filter((result) => result.changed && result.created).length;
  const updatedCount = results.filter((result) => result.changed && !result.created).length;
  const skippedCount = results.filter((result) => !result.changed).length;
  const importChanged = importedCount > 0 || updatedCount > 0 || removedCount > 0;
  const missingIndexes = await hasMissingIndexes(layout);

  let compile: CompileKnowledgeWikiResult | null = null;
  let indexRefreshReason: KnowledgeWikiBridgeSyncResult["indexRefreshReason"] = "no-import-changes";
  if (!config.ingest.autoCompile) {
    indexRefreshReason = "auto-compile-disabled";
  } else if (importChanged || missingIndexes) {
    compile = await compileKnowledgeWikiVault(projectRoot, config);
    indexRefreshReason = missingIndexes && !importChanged ? "missing-indexes" : "import-changed";
  }

  return {
    importedCount,
    updatedCount,
    skippedCount,
    removedCount,
    artifactCount: artifacts.length,
    pagePaths: results.map((result) => result.pagePath).sort((left, right) => left.localeCompare(right)),
    indexesRefreshed: Boolean(compile),
    indexRefreshReason,
    indexUpdatedFiles: compile?.updatedFiles ?? [],
  };
}
