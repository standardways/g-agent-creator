import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { KnowledgeConfig } from "./knowledgeRuntime.js";
import { replaceManagedMarkdownBlock, withTrailingNewline } from "./knowledgeWikiMarkdown.js";

export const KNOWLEDGE_WIKI_DIRECTORIES = [
  "entities",
  "concepts",
  "syntheses",
  "sources",
  "reports",
  "_attachments",
  "_views",
  ".agent-wiki",
] as const;

export type KnowledgeWikiLayout = {
  knowledgeRoot: string;
  rawDir: string;
  wikiRoot: string;
  entitiesDir: string;
  conceptsDir: string;
  synthesesDir: string;
  sourcesDir: string;
  reportsDir: string;
  hiddenDir: string;
  indexFile: string;
  logFile: string;
  schemaFile: string;
  syncStateFile: string;
  runtimeLogFile: string;
  stateFile: string;
};

function buildKnowledgeIndex() {
  return withTrailingNewline(
    replaceManagedMarkdownBlock({
      original: "# Knowledge Index\n",
      heading: "## Generated",
      startMarker: "<!-- gagent:knowledge:index:start -->",
      endMarker: "<!-- gagent:knowledge:index:end -->",
      body: "- No compiled pages yet.",
    }),
  );
}

function buildKnowledgeSchema() {
  return withTrailingNewline([
    "# Knowledge Schema",
    "",
    "- `knowledge/raw/` stores immutable source files.",
    "- `knowledge/wiki/sources/` stores provenance-bearing source pages.",
    "- `knowledge/wiki/entities/` stores durable entity pages.",
    "- `knowledge/wiki/concepts/` stores durable concept pages.",
    "- `knowledge/wiki/syntheses/` stores bounded generated syntheses.",
    "- `knowledge/wiki/reports/` stores dashboards and lint output.",
    "- `knowledge/.agent-wiki/` stores sync/runtime metadata.",
  ].join("\n"));
}

async function ensureFile(filePath: string, content: string) {
  if (!existsSync(filePath)) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
  }
}

async function migrateLegacyAnalyses(layout: KnowledgeWikiLayout) {
  const legacyAnalysesDir = path.join(layout.wikiRoot, "analyses");
  if (!existsSync(legacyAnalysesDir)) return [];
  const entries = await fs.readdir(legacyAnalysesDir, { withFileTypes: true }).catch(() => []);
  const moved: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const source = path.join(legacyAnalysesDir, entry.name);
    const preferredTarget = path.join(layout.synthesesDir, entry.name);
    let target = preferredTarget;
    if (existsSync(preferredTarget)) {
      const base = entry.name.replace(/\.md$/i, "");
      target = path.join(layout.synthesesDir, `${base}-legacy.md`);
    }
    await fs.rename(source, target);
    moved.push(path.relative(layout.wikiRoot, target).replace(/\\/g, "/"));
  }
  const remaining = await fs.readdir(legacyAnalysesDir).catch(() => []);
  if (remaining.length === 0) {
    await fs.rm(legacyAnalysesDir, { recursive: true, force: true }).catch(() => undefined);
  }
  return moved;
}

export async function ensureKnowledgeWikiVault(projectRoot: string, config: KnowledgeConfig): Promise<KnowledgeWikiLayout> {
  const knowledgeRoot = path.join(projectRoot, "knowledge");
  const rawDir = path.join(projectRoot, config.rawDir);
  const wikiRoot = path.join(projectRoot, config.wikiDir);
  const hiddenDir = path.join(knowledgeRoot, ".agent-wiki");
  const layout: KnowledgeWikiLayout = {
    knowledgeRoot,
    rawDir,
    wikiRoot,
    entitiesDir: path.join(wikiRoot, "entities"),
    conceptsDir: path.join(wikiRoot, "concepts"),
    synthesesDir: path.join(wikiRoot, "syntheses"),
    sourcesDir: path.join(wikiRoot, "sources"),
    reportsDir: path.join(wikiRoot, "reports"),
    hiddenDir,
    indexFile: path.join(projectRoot, config.indexFile),
    logFile: path.join(projectRoot, config.logFile),
    schemaFile: path.join(projectRoot, config.schemaFile),
    syncStateFile: path.join(hiddenDir, "source-sync.json"),
    runtimeLogFile: path.join(hiddenDir, "log.jsonl"),
    stateFile: path.join(hiddenDir, "state.json"),
  };

  await fs.mkdir(rawDir, { recursive: true });
  await fs.mkdir(wikiRoot, { recursive: true });
  for (const relative of KNOWLEDGE_WIKI_DIRECTORIES) {
    await fs.mkdir(path.join(wikiRoot, relative), { recursive: true });
  }
  await fs.mkdir(hiddenDir, { recursive: true });

  await ensureFile(layout.indexFile, buildKnowledgeIndex());
  await ensureFile(layout.logFile, "# Knowledge Log\n\nChronological log of ingests, analyses, compiles, and sync passes.\n");
  await ensureFile(layout.schemaFile, buildKnowledgeSchema());
  await ensureFile(path.join(rawDir, "README.md"), "# Raw Sources\n\nDrop immutable source documents here.\n");
  await ensureFile(path.join(wikiRoot, "README.md"), "# Wiki\n\nCompiled knowledge pages live here.\n");
  await ensureFile(layout.syncStateFile, "{\n  \"version\": 1,\n  \"entries\": {}\n}\n");
  await ensureFile(layout.runtimeLogFile, "");
  await ensureFile(
    layout.stateFile,
    JSON.stringify(
      {
        version: 1,
        renderMode: config.renderMode,
        vaultMode: config.vaultMode,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );

  const migrated = await migrateLegacyAnalyses(layout);
  if (migrated.length > 0) {
    const existing = await fs.readFile(layout.runtimeLogFile, "utf8").catch(() => "");
    await fs.writeFile(
      layout.runtimeLogFile,
      `${existing}${JSON.stringify({ type: "migrate_analyses", moved: migrated, timestamp: new Date().toISOString() })}\n`,
      "utf8",
    );
  }

  return layout;
}
