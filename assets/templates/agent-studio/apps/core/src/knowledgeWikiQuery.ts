import fs from "node:fs/promises";
import path from "node:path";
import type { KnowledgeConfig } from "./knowledgeRuntime.js";
import { extractKnowledgeWikiLinks, parseKnowledgeWikiMarkdown, toKnowledgeWikiPageSummary, type KnowledgeWikiPageSummary } from "./knowledgeWikiMarkdown.js";
import { ensureKnowledgeWikiVault } from "./knowledgeWikiVault.js";

export type KnowledgeWikiSearchResult = {
  path: string;
  title: string;
  kind: KnowledgeWikiPageSummary["kind"];
  score: number;
  snippet: string;
  id?: string;
  provenanceLabel?: string;
  sourceType?: string;
  sourcePath?: string;
  updatedAt?: string;
};

export type KnowledgeWikiGetResult = {
  path: string;
  title: string;
  kind: KnowledgeWikiPageSummary["kind"];
  content: string;
  fromLine: number;
  lineCount: number;
  id?: string;
  provenanceLabel?: string;
  sourceType?: string;
  sourcePath?: string;
  updatedAt?: string;
};

type QueryablePage = KnowledgeWikiPageSummary & { raw: string };

async function listMarkdownFiles(rootDir: string) {
  const dirs = ["entities", "concepts", "sources", "syntheses", "reports"] as const;
  const files = (
    await Promise.all(
      dirs.map(async (dir) => {
        const entries = await fs.readdir(path.join(rootDir, dir), { withFileTypes: true }).catch(() => []);
        return entries
          .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "index.md")
          .map((entry) => path.join(rootDir, dir, entry.name));
      }),
    )
  ).flat();
  return files.sort((left, right) => left.localeCompare(right));
}

async function readQueryablePages(rootDir: string): Promise<QueryablePage[]> {
  const files = await listMarkdownFiles(rootDir);
  const pages = await Promise.all(
    files.map(async (absolutePath) => {
      const raw = await fs.readFile(absolutePath, "utf8");
      const summary = toKnowledgeWikiPageSummary({
        absolutePath,
        relativePath: path.relative(rootDir, absolutePath),
        raw,
      });
      return summary ? { ...summary, raw } : null;
    }),
  );
  return pages.flatMap((page) => (page ? [page] : []));
}

function normalizeLookup(value: string) {
  return value.trim().replace(/\\/g, "/").replace(/\.md$/i, "").toLowerCase();
}

function lookupCandidates(lookup: string) {
  const normalized = normalizeLookup(lookup);
  return [...new Set([normalized, `${normalized}.md`])];
}

function buildSnippet(raw: string, query: string) {
  const lowered = query.toLowerCase();
  const line = raw.split(/\r?\n/).find((entry) => entry.toLowerCase().includes(lowered) && entry.trim().length > 0);
  return line?.trim() || raw.split(/\r?\n/).find((entry) => entry.trim().length > 0)?.trim() || "";
}

function scorePage(page: QueryablePage, query: string) {
  const lowered = query.toLowerCase();
  const title = page.title.toLowerCase();
  const relPath = page.relativePath.toLowerCase();
  const id = page.id?.toLowerCase() ?? "";
  const body = page.raw.toLowerCase();
  if (!(title.includes(lowered) || relPath.includes(lowered) || id.includes(lowered) || body.includes(lowered))) {
    return 0;
  }
  let score = 1;
  if (title === lowered) score += 50;
  else if (title.includes(lowered)) score += 20;
  if (relPath.includes(lowered)) score += 10;
  if (id.includes(lowered)) score += 10;
  score += Math.min(20, body.split(lowered).length - 1);
  return score;
}

function resolveProvenanceLabel(page: KnowledgeWikiPageSummary) {
  if (page.provenanceLabel) return page.provenanceLabel;
  if (page.sourceType === "memory_entry") return `memory entry: ${page.id ?? page.relativePath}`;
  if (page.sourceType === "dream_report") return `dream report: ${page.id ?? page.relativePath}`;
  if (page.sourceType === "project_memory") return `project memory: ${page.sourcePath ?? page.relativePath}`;
  return undefined;
}

export async function searchKnowledgeWiki(projectRoot: string, config: KnowledgeConfig, query: string, maxResults = 10) {
  const layout = await ensureKnowledgeWikiVault(projectRoot, config);
  const pages = await readQueryablePages(layout.wikiRoot);
  return pages
    .map((page) => ({
      path: page.relativePath,
      title: page.title,
      kind: page.kind,
      score: scorePage(page, query),
      snippet: buildSnippet(page.raw, query),
      ...(page.id ? { id: page.id } : {}),
      ...(resolveProvenanceLabel(page) ? { provenanceLabel: resolveProvenanceLabel(page) } : {}),
      ...(page.sourceType ? { sourceType: page.sourceType } : {}),
      ...(page.sourcePath ? { sourcePath: page.sourcePath } : {}),
      ...(page.updatedAt ? { updatedAt: page.updatedAt } : {}),
    }))
    .filter((page) => page.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, maxResults) satisfies KnowledgeWikiSearchResult[];
}

export async function getKnowledgeWikiPage(projectRoot: string, config: KnowledgeConfig, lookup: string, fromLine = 1, lineCount = 200) {
  const layout = await ensureKnowledgeWikiVault(projectRoot, config);
  const pages = await readQueryablePages(layout.wikiRoot);
  const candidates = lookupCandidates(lookup);
  const page =
    pages.find((entry) => candidates.includes(entry.relativePath.toLowerCase())) ||
    pages.find((entry) => candidates.includes(entry.relativePath.replace(/\.md$/i, "").toLowerCase())) ||
    pages.find((entry) => entry.id?.toLowerCase() === normalizeLookup(lookup)) ||
    pages.find((entry) => path.basename(entry.relativePath, ".md").toLowerCase() === normalizeLookup(lookup));
  if (!page) return null;
  const parsed = parseKnowledgeWikiMarkdown(page.raw);
  const lines = parsed.body.split(/\r?\n/);
  return {
    path: page.relativePath,
    title: page.title,
    kind: page.kind,
    content: lines.slice(Math.max(0, fromLine - 1), Math.max(0, fromLine - 1) + lineCount).join("\n"),
    fromLine,
    lineCount,
    ...(page.id ? { id: page.id } : {}),
    ...(resolveProvenanceLabel(page) ? { provenanceLabel: resolveProvenanceLabel(page) } : {}),
    ...(page.sourceType ? { sourceType: page.sourceType } : {}),
    ...(page.sourcePath ? { sourcePath: page.sourcePath } : {}),
    ...(page.updatedAt ? { updatedAt: page.updatedAt } : {}),
  } satisfies KnowledgeWikiGetResult;
}
