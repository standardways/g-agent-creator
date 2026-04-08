import fs from "node:fs/promises";
import path from "node:path";
import type { KnowledgeConfig } from "./knowledgeRuntime.js";
import {
  formatKnowledgeWikiLink,
  inferKnowledgeWikiPageKind,
  KNOWLEDGE_WIKI_RELATED_END,
  KNOWLEDGE_WIKI_RELATED_START,
  parseKnowledgeWikiMarkdown,
  renderKnowledgeWikiMarkdown,
  replaceManagedMarkdownBlock,
  toKnowledgeWikiPageSummary,
  type KnowledgeWikiPageKind,
  type KnowledgeWikiPageSummary,
  withTrailingNewline,
} from "./knowledgeWikiMarkdown.js";
import { ensureKnowledgeWikiVault } from "./knowledgeWikiVault.js";

const PAGE_GROUPS: Array<{ kind: KnowledgeWikiPageKind; dir: string; heading: string }> = [
  { kind: "source", dir: "sources", heading: "Sources" },
  { kind: "entity", dir: "entities", heading: "Entities" },
  { kind: "concept", dir: "concepts", heading: "Concepts" },
  { kind: "synthesis", dir: "syntheses", heading: "Syntheses" },
  { kind: "report", dir: "reports", heading: "Reports" },
];

const STALE_PAGE_DAYS = 30;

export type CompileKnowledgeWikiResult = {
  vaultRoot: string;
  pages: KnowledgeWikiPageSummary[];
  pageCounts: Record<KnowledgeWikiPageKind, number>;
  sourceProvenanceCounts: Record<string, number>;
  updatedFiles: string[];
};

async function collectMarkdownFiles(dirPath: string) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "index.md")
    .map((entry) => path.join(dirPath, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function readPages(wikiRoot: string) {
  const files = (
    await Promise.all(
      PAGE_GROUPS.map((group) => collectMarkdownFiles(path.join(wikiRoot, group.dir))),
    )
  ).flat();
  const pages = await Promise.all(
    files.map(async (absolutePath) => {
      const raw = await fs.readFile(absolutePath, "utf8");
      return toKnowledgeWikiPageSummary({
        absolutePath,
        relativePath: path.relative(wikiRoot, absolutePath),
        raw,
      });
    }),
  );
  return pages.flatMap((page) => (page ? [page] : [])).sort((left, right) => left.title.localeCompare(right.title));
}

function buildPageCounts(pages: KnowledgeWikiPageSummary[]) {
  return {
    entity: pages.filter((page) => page.kind === "entity").length,
    concept: pages.filter((page) => page.kind === "concept").length,
    source: pages.filter((page) => page.kind === "source").length,
    synthesis: pages.filter((page) => page.kind === "synthesis").length,
    report: pages.filter((page) => page.kind === "report").length,
  } satisfies Record<KnowledgeWikiPageKind, number>;
}

function buildSourceProvenanceCounts(pages: KnowledgeWikiPageSummary[]) {
  const counts: Record<string, number> = {
    native: 0,
    memory_entry: 0,
    dream_report: 0,
    project_memory: 0,
    other: 0,
  };
  for (const page of pages.filter((entry) => entry.kind === "source")) {
    const key =
      page.sourceType === "memory_entry" ||
      page.sourceType === "dream_report" ||
      page.sourceType === "project_memory"
        ? page.sourceType
        : !page.sourceType
          ? "native"
          : "other";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function normalizeLookupTarget(value: string) {
  return value.trim().replace(/\\/g, "/").replace(/\.md$/i, "").replace(/^\.\/+/, "").toLowerCase();
}

function lookupKeys(page: KnowledgeWikiPageSummary) {
  const keys = new Set<string>();
  keys.add(normalizeLookupTarget(page.relativePath));
  keys.add(normalizeLookupTarget(page.title));
  if (page.id) keys.add(normalizeLookupTarget(page.id));
  return keys;
}

function uniquePages(pages: KnowledgeWikiPageSummary[]) {
  const seen = new Set<string>();
  const result: KnowledgeWikiPageSummary[] = [];
  for (const page of pages) {
    const key = page.id ?? page.relativePath;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(page);
  }
  return result;
}

function renderPageLinks(config: KnowledgeConfig, pages: KnowledgeWikiPageSummary[]) {
  if (pages.length === 0) return "- None.";
  return pages
    .map(
      (page) =>
        `- ${formatKnowledgeWikiLink({
          renderMode: config.renderMode,
          relativePath: page.relativePath,
          title: page.title,
        })}`,
    )
    .join("\n");
}

function buildRelatedBody(config: KnowledgeConfig, page: KnowledgeWikiPageSummary, allPages: KnowledgeWikiPageSummary[]) {
  const sourcePages = uniquePages(
    page.sourceIds.flatMap((sourceId) => allPages.filter((candidate) => candidate.id === sourceId)),
  );
  const pageKeys = lookupKeys(page);
  const backlinks = uniquePages(
    allPages.filter((candidate) => {
      if (candidate.relativePath === page.relativePath || candidate.kind === "report") return false;
      return candidate.linkTargets.some((target) => pageKeys.has(normalizeLookupTarget(target)));
    }),
  );
  const relatedPages = uniquePages(
    allPages.filter((candidate) => {
      if (candidate.relativePath === page.relativePath || candidate.kind === "report") return false;
      if (sourcePages.some((source) => source.relativePath === candidate.relativePath)) return false;
      if (backlinks.some((backlink) => backlink.relativePath === candidate.relativePath)) return false;
      return page.sourceIds.length > 0 && candidate.sourceIds.some((sourceId) => page.sourceIds.includes(sourceId));
    }),
  );
  const sections: string[] = [];
  if (sourcePages.length > 0) sections.push("### Sources", renderPageLinks(config, sourcePages));
  if (backlinks.length > 0) sections.push("### Referenced By", renderPageLinks(config, backlinks));
  if (relatedPages.length > 0) sections.push("### Related Pages", renderPageLinks(config, relatedPages));
  return sections.length > 0 ? sections.join("\n\n") : "- No related pages yet.";
}

async function refreshRelatedBlocks(config: KnowledgeConfig, pages: KnowledgeWikiPageSummary[]) {
  if (!config.render.createBacklinks) return [] as string[];
  const updatedFiles: string[] = [];
  for (const page of pages) {
    if (page.kind === "report") continue;
    const original = await fs.readFile(page.absolutePath, "utf8");
    const body = buildRelatedBody(config, page, pages);
    const updated = withTrailingNewline(
      replaceManagedMarkdownBlock({
        original,
        heading: "## Related",
        startMarker: KNOWLEDGE_WIKI_RELATED_START,
        endMarker: KNOWLEDGE_WIKI_RELATED_END,
        body,
      }),
    );
    if (updated !== original) {
      await fs.writeFile(page.absolutePath, updated, "utf8");
      updatedFiles.push(page.absolutePath);
    }
  }
  return updatedFiles;
}

function dashboardBody(config: KnowledgeConfig, type: "open-questions" | "contradictions" | "low-confidence" | "stale-pages", pages: KnowledgeWikiPageSummary[]) {
  if (type === "open-questions") {
    const matches = pages.filter((page) => page.questions.length > 0);
    return matches.length === 0
      ? "- No open questions right now."
      : matches.map((page) => `- ${formatKnowledgeWikiLink({ renderMode: config.renderMode, relativePath: page.relativePath, title: page.title })}: ${page.questions.join(" | ")}`).join("\n");
  }
  if (type === "contradictions") {
    const matches = pages.filter((page) => page.contradictions.length > 0);
    return matches.length === 0
      ? "- No contradictions flagged right now."
      : matches.map((page) => `- ${formatKnowledgeWikiLink({ renderMode: config.renderMode, relativePath: page.relativePath, title: page.title })}: ${page.contradictions.join(" | ")}`).join("\n");
  }
  if (type === "low-confidence") {
    const matches = pages.filter((page) => typeof page.confidence === "number" && (page.confidence ?? 1) < 0.5);
    return matches.length === 0
      ? "- No low-confidence pages right now."
      : matches
          .sort((left, right) => (left.confidence ?? 1) - (right.confidence ?? 1))
          .map((page) => `- ${formatKnowledgeWikiLink({ renderMode: config.renderMode, relativePath: page.relativePath, title: page.title })}: confidence ${(page.confidence ?? 0).toFixed(2)}`)
          .join("\n");
  }
  const staleBeforeMs = Date.now() - STALE_PAGE_DAYS * 24 * 60 * 60 * 1000;
  const matches = pages.filter((page) => {
    if (page.kind === "report") return false;
    if (!page.updatedAt) return true;
    const updatedAtMs = Date.parse(page.updatedAt);
    return !Number.isFinite(updatedAtMs) || updatedAtMs < staleBeforeMs;
  });
  return matches.length === 0
    ? `- No stale pages older than ${STALE_PAGE_DAYS} days.`
    : matches
        .map((page) => `- ${formatKnowledgeWikiLink({ renderMode: config.renderMode, relativePath: page.relativePath, title: page.title })}: ${page.updatedAt ? `updated ${page.updatedAt}` : "missing updatedAt"}`)
        .join("\n");
}

async function writeDashboardFile(config: KnowledgeConfig, reportsDir: string, fileName: string, title: string, body: string) {
  const absolutePath = path.join(reportsDir, `${fileName}.md`);
  const existing = await fs.readFile(absolutePath, "utf8").catch(() =>
    renderKnowledgeWikiMarkdown({
      frontmatter: {
        pageType: "report",
        id: `report.${fileName}`,
        title,
        status: "active",
      },
      body: `# ${title}\n`,
    }),
  );
  const parsed = parseKnowledgeWikiMarkdown(existing);
  const updatedBody = replaceManagedMarkdownBlock({
    original: parsed.body.trim().length > 0 ? parsed.body : `# ${title}\n`,
    heading: "## Generated",
    startMarker: `<!-- gagent:wiki:${fileName}:start -->`,
    endMarker: `<!-- gagent:wiki:${fileName}:end -->`,
    body,
  });
  const rendered = withTrailingNewline(
    renderKnowledgeWikiMarkdown({
      frontmatter: {
        ...parsed.frontmatter,
        pageType: "report",
        id: `report.${fileName}`,
        title,
        status: typeof parsed.frontmatter.status === "string" ? parsed.frontmatter.status : "active",
        updatedAt: new Date().toISOString(),
      },
      body: updatedBody,
    }),
  );
  if (rendered === existing) return null;
  await fs.writeFile(absolutePath, rendered, "utf8");
  return absolutePath;
}

async function refreshDashboards(config: KnowledgeConfig, reportsDir: string, pages: KnowledgeWikiPageSummary[]) {
  if (!config.render.createDashboards) return [] as string[];
  const outputs = await Promise.all([
    writeDashboardFile(config, reportsDir, "open-questions", "Open Questions", dashboardBody(config, "open-questions", pages)),
    writeDashboardFile(config, reportsDir, "contradictions", "Contradictions", dashboardBody(config, "contradictions", pages)),
    writeDashboardFile(config, reportsDir, "low-confidence", "Low Confidence", dashboardBody(config, "low-confidence", pages)),
    writeDashboardFile(config, reportsDir, "stale-pages", "Stale Pages", dashboardBody(config, "stale-pages", pages)),
  ]);
  return outputs.flatMap((value) => (value ? [value] : []));
}

async function writeIndexFile(filePath: string, title: string, startMarker: string, endMarker: string, body: string) {
  const original = await fs.readFile(filePath, "utf8").catch(() => `# ${title}\n`);
  const updated = withTrailingNewline(
    replaceManagedMarkdownBlock({
      original,
      heading: "## Generated",
      startMarker,
      endMarker,
      body,
    }),
  );
  if (updated === original) return null;
  await fs.writeFile(filePath, updated, "utf8");
  return filePath;
}

function sectionBody(config: KnowledgeConfig, pages: KnowledgeWikiPageSummary[], kind: KnowledgeWikiPageKind, emptyText: string) {
  return renderPageLinks(config, pages.filter((page) => page.kind === kind)).replace("- None.", `- ${emptyText}`);
}

export async function compileKnowledgeWikiVault(projectRoot: string, config: KnowledgeConfig): Promise<CompileKnowledgeWikiResult> {
  const layout = await ensureKnowledgeWikiVault(projectRoot, config);
  let pages = await readPages(layout.wikiRoot);
  const updatedFiles: string[] = [];

  const relatedUpdates = await refreshRelatedBlocks(config, pages);
  updatedFiles.push(...relatedUpdates);
  if (relatedUpdates.length > 0) pages = await readPages(layout.wikiRoot);

  const dashboardUpdates = await refreshDashboards(config, layout.reportsDir, pages);
  updatedFiles.push(...dashboardUpdates);
  if (dashboardUpdates.length > 0) pages = await readPages(layout.wikiRoot);

  const pageCounts = buildPageCounts(pages);
  const sourceProvenanceCounts = buildSourceProvenanceCounts(pages);

  const rootBody = [
    `- Render mode: \`${config.renderMode}\``,
    `- Total pages: ${pages.length}`,
    `- Sources: ${pageCounts.source}`,
    `- Entities: ${pageCounts.entity}`,
    `- Concepts: ${pageCounts.concept}`,
    `- Syntheses: ${pageCounts.synthesis}`,
    `- Reports: ${pageCounts.report}`,
    "",
    "### Sources",
    sectionBody(config, pages, "source", "No sources yet."),
    "",
    "### Entities",
    sectionBody(config, pages, "entity", "No entities yet."),
    "",
    "### Concepts",
    sectionBody(config, pages, "concept", "No concepts yet."),
    "",
    "### Syntheses",
    sectionBody(config, pages, "synthesis", "No syntheses yet."),
    "",
    "### Reports",
    sectionBody(config, pages, "report", "No reports yet."),
  ].join("\n");
  const rootIndex = await writeIndexFile(
    layout.indexFile,
    "Knowledge Index",
    "<!-- gagent:knowledge:index:start -->",
    "<!-- gagent:knowledge:index:end -->",
    rootBody,
  );
  if (rootIndex) updatedFiles.push(rootIndex);

  for (const group of PAGE_GROUPS) {
    const indexFile = path.join(layout.wikiRoot, group.dir, "index.md");
    const written = await writeIndexFile(
      indexFile,
      group.heading,
      `<!-- gagent:wiki:${group.dir}:index:start -->`,
      `<!-- gagent:wiki:${group.dir}:index:end -->`,
      sectionBody(config, pages, group.kind, `No ${group.heading.toLowerCase()} yet.`),
    );
    if (written) updatedFiles.push(written);
  }

  const runtimeLog = await fs.readFile(layout.runtimeLogFile, "utf8").catch(() => "");
  await fs.writeFile(
    layout.runtimeLogFile,
    `${runtimeLog}${JSON.stringify({
      type: "compile",
      timestamp: new Date().toISOString(),
      pageCounts,
      updatedFiles: updatedFiles.map((filePath) => path.relative(layout.knowledgeRoot, filePath).replace(/\\/g, "/")),
    })}\n`,
    "utf8",
  );

  return {
    vaultRoot: layout.wikiRoot,
    pages,
    pageCounts,
    sourceProvenanceCounts,
    updatedFiles,
  };
}
