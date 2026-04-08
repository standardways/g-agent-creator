import fs from "node:fs/promises";
import path from "node:path";
import type { KnowledgeConfig } from "./knowledgeRuntime.js";
import { compileKnowledgeWikiVault } from "./knowledgeWikiCompile.js";
import { renderKnowledgeWikiMarkdown, replaceManagedMarkdownBlock, withTrailingNewline, type KnowledgeWikiPageSummary } from "./knowledgeWikiMarkdown.js";
import { ensureKnowledgeWikiVault } from "./knowledgeWikiVault.js";

export type KnowledgeWikiLintIssue = {
  severity: "error" | "warning";
  category: "structure" | "provenance" | "links" | "contradictions" | "open-questions" | "quality";
  code:
    | "missing-id"
    | "duplicate-id"
    | "missing-page-type"
    | "page-type-mismatch"
    | "missing-title"
    | "missing-source-ids"
    | "missing-import-provenance"
    | "broken-link"
    | "contradiction-present"
    | "open-question"
    | "low-confidence";
  path: string;
  message: string;
};

export type LintKnowledgeWikiResult = {
  vaultRoot: string;
  issueCount: number;
  issues: KnowledgeWikiLintIssue[];
  issuesByCategory: Record<KnowledgeWikiLintIssue["category"], KnowledgeWikiLintIssue[]>;
  reportPath: string;
};

function expectedPageType(page: KnowledgeWikiPageSummary) {
  return page.kind;
}

function buildIssuesByCategory(issues: KnowledgeWikiLintIssue[]) {
  return {
    structure: issues.filter((issue) => issue.category === "structure"),
    provenance: issues.filter((issue) => issue.category === "provenance"),
    links: issues.filter((issue) => issue.category === "links"),
    contradictions: issues.filter((issue) => issue.category === "contradictions"),
    "open-questions": issues.filter((issue) => issue.category === "open-questions"),
    quality: issues.filter((issue) => issue.category === "quality"),
  } satisfies Record<KnowledgeWikiLintIssue["category"], KnowledgeWikiLintIssue[]>;
}

function collectBrokenLinks(pages: KnowledgeWikiPageSummary[]) {
  const validTargets = new Set<string>();
  for (const page of pages) {
    const withoutExt = page.relativePath.replace(/\.md$/i, "");
    validTargets.add(withoutExt.toLowerCase());
    validTargets.add(path.basename(withoutExt).toLowerCase());
    if (page.id) validTargets.add(page.id.toLowerCase());
  }
  const issues: KnowledgeWikiLintIssue[] = [];
  for (const page of pages) {
    for (const linkTarget of page.linkTargets) {
      const normalized = linkTarget.replace(/\\/g, "/").replace(/\.md$/i, "").toLowerCase();
      if (!validTargets.has(normalized)) {
        issues.push({
          severity: "warning",
          category: "links",
          code: "broken-link",
          path: page.relativePath,
          message: `Broken wiki link target \`${linkTarget}\`.`,
        });
      }
    }
  }
  return issues;
}

function collectPageIssues(pages: KnowledgeWikiPageSummary[]) {
  const issues: KnowledgeWikiLintIssue[] = [];
  const byId = new Map<string, KnowledgeWikiPageSummary[]>();
  for (const page of pages) {
    if (!page.id) {
      issues.push({ severity: "error", category: "structure", code: "missing-id", path: page.relativePath, message: "Missing `id` frontmatter." });
    } else {
      const current = byId.get(page.id) ?? [];
      current.push(page);
      byId.set(page.id, current);
    }
    if (!page.pageType) {
      issues.push({ severity: "error", category: "structure", code: "missing-page-type", path: page.relativePath, message: "Missing `pageType` frontmatter." });
    } else if (page.pageType !== expectedPageType(page)) {
      issues.push({ severity: "error", category: "structure", code: "page-type-mismatch", path: page.relativePath, message: `Expected pageType \`${expectedPageType(page)}\`, found \`${page.pageType}\`.` });
    }
    if (!page.title.trim()) {
      issues.push({ severity: "error", category: "structure", code: "missing-title", path: page.relativePath, message: "Missing page title." });
    }
    if (page.kind !== "source" && page.kind !== "report" && page.sourceIds.length === 0) {
      issues.push({ severity: "warning", category: "provenance", code: "missing-source-ids", path: page.relativePath, message: "Non-source page is missing `sourceIds` provenance." });
    }
    if (
      (page.sourceType === "memory_entry" || page.sourceType === "dream_report" || page.sourceType === "project_memory") &&
      (!page.provenanceMode || !page.sourcePath)
    ) {
      issues.push({ severity: "warning", category: "provenance", code: "missing-import-provenance", path: page.relativePath, message: "Imported source page is missing provenance metadata." });
    }
    if (page.contradictions.length > 0) {
      issues.push({ severity: "warning", category: "contradictions", code: "contradiction-present", path: page.relativePath, message: `Page lists ${page.contradictions.length} contradiction${page.contradictions.length === 1 ? "" : "s"} to resolve.` });
    }
    if (page.questions.length > 0) {
      issues.push({ severity: "warning", category: "open-questions", code: "open-question", path: page.relativePath, message: `Page lists ${page.questions.length} open question${page.questions.length === 1 ? "" : "s"}.` });
    }
    if (typeof page.confidence === "number" && page.confidence < 0.5) {
      issues.push({ severity: "warning", category: "quality", code: "low-confidence", path: page.relativePath, message: `Page confidence is low (${page.confidence.toFixed(2)}).` });
    }
  }
  for (const [id, matches] of byId.entries()) {
    if (matches.length > 1) {
      for (const match of matches) {
        issues.push({ severity: "error", category: "structure", code: "duplicate-id", path: match.relativePath, message: `Duplicate page id \`${id}\`.` });
      }
    }
  }
  issues.push(...collectBrokenLinks(pages));
  return issues.sort((left, right) => left.path.localeCompare(right.path));
}

function buildLintReportBody(issues: KnowledgeWikiLintIssue[]) {
  if (issues.length === 0) return "No issues found.";
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const byCategory = buildIssuesByCategory(issues);
  const lines = [`- Errors: ${errors.length}`, `- Warnings: ${warnings.length}`];
  if (errors.length > 0) {
    lines.push("", "### Errors", ...errors.map((issue) => `- \`${issue.path}\`: ${issue.message}`));
  }
  if (warnings.length > 0) {
    lines.push("", "### Warnings", ...warnings.map((issue) => `- \`${issue.path}\`: ${issue.message}`));
  }
  if (byCategory.contradictions.length > 0) {
    lines.push("", "### Contradictions", ...byCategory.contradictions.map((issue) => `- \`${issue.path}\`: ${issue.message}`));
  }
  if (byCategory["open-questions"].length > 0) {
    lines.push("", "### Open Questions", ...byCategory["open-questions"].map((issue) => `- \`${issue.path}\`: ${issue.message}`));
  }
  return lines.join("\n");
}

async function writeLintReport(reportsDir: string, issues: KnowledgeWikiLintIssue[]) {
  const reportPath = path.join(reportsDir, "lint.md");
  const original = await fs.readFile(reportPath, "utf8").catch(() =>
    renderKnowledgeWikiMarkdown({
      frontmatter: {
        pageType: "report",
        id: "report.lint",
        title: "Lint Report",
        status: "active",
      },
      body: "# Lint Report\n",
    }),
  );
  const updated = withTrailingNewline(
    replaceManagedMarkdownBlock({
      original,
      heading: "## Generated",
      startMarker: "<!-- gagent:wiki:lint:start -->",
      endMarker: "<!-- gagent:wiki:lint:end -->",
      body: buildLintReportBody(issues),
    }),
  );
  await fs.writeFile(reportPath, updated, "utf8");
  return reportPath;
}

export async function lintKnowledgeWikiVault(projectRoot: string, config: KnowledgeConfig): Promise<LintKnowledgeWikiResult> {
  const compile = await compileKnowledgeWikiVault(projectRoot, config);
  const issues = collectPageIssues(compile.pages);
  const layout = await ensureKnowledgeWikiVault(projectRoot, config);
  const reportPath = await writeLintReport(layout.reportsDir, issues);
  return {
    vaultRoot: compile.vaultRoot,
    issueCount: issues.length,
    issues,
    issuesByCategory: buildIssuesByCategory(issues),
    reportPath,
  };
}
