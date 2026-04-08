import fs from "node:fs/promises";
import path from "node:path";
import type { KnowledgeConfig } from "./knowledgeRuntime.js";
import { compileKnowledgeWikiVault, type CompileKnowledgeWikiResult } from "./knowledgeWikiCompile.js";
import {
  KNOWLEDGE_WIKI_GENERATED_END,
  KNOWLEDGE_WIKI_GENERATED_START,
  KNOWLEDGE_WIKI_HUMAN_END,
  KNOWLEDGE_WIKI_HUMAN_START,
  normalizeStringArray,
  parseKnowledgeWikiMarkdown,
  renderKnowledgeWikiMarkdown,
  replaceManagedMarkdownBlock,
  slugifyKnowledgeWikiSegment,
  withTrailingNewline,
} from "./knowledgeWikiMarkdown.js";
import { getKnowledgeWikiPage, searchKnowledgeWiki } from "./knowledgeWikiQuery.js";
import { ensureKnowledgeWikiVault } from "./knowledgeWikiVault.js";

export type CreateSynthesisKnowledgeWikiMutation = {
  op: "create_synthesis";
  title: string;
  body: string;
  sourceIds: string[];
  contradictions?: string[];
  questions?: string[];
  confidence?: number;
  status?: string;
};

export type UpdateMetadataKnowledgeWikiMutation = {
  op: "update_metadata";
  lookup: string;
  sourceIds?: string[];
  contradictions?: string[];
  questions?: string[];
  confidence?: number | null;
  status?: string;
};

export type KnowledgeWikiMutation = CreateSynthesisKnowledgeWikiMutation | UpdateMetadataKnowledgeWikiMutation;

export type ApplyKnowledgeWikiMutationResult = {
  changed: boolean;
  operation: KnowledgeWikiMutation["op"];
  pagePath: string;
  pageId?: string;
  compile: CompileKnowledgeWikiResult;
};

function ensureHumanNotesBlock(body: string) {
  if (body.includes(KNOWLEDGE_WIKI_HUMAN_START) && body.includes(KNOWLEDGE_WIKI_HUMAN_END)) {
    return body;
  }
  const trimmed = body.trimEnd();
  return `${trimmed.length > 0 ? `${trimmed}\n\n` : ""}## Notes\n${KNOWLEDGE_WIKI_HUMAN_START}\n${KNOWLEDGE_WIKI_HUMAN_END}\n`;
}

function buildSynthesisBody(title: string, originalBody: string | undefined, generatedBody: string) {
  const base =
    originalBody?.trim().length
      ? originalBody
      : `# ${title}\n\n## Notes\n${KNOWLEDGE_WIKI_HUMAN_START}\n${KNOWLEDGE_WIKI_HUMAN_END}\n`;
  return ensureHumanNotesBlock(
    replaceManagedMarkdownBlock({
      original: base,
      heading: "## Summary",
      startMarker: KNOWLEDGE_WIKI_GENERATED_START,
      endMarker: KNOWLEDGE_WIKI_GENERATED_END,
      body: generatedBody.trim(),
    }),
  );
}

async function writeWikiPage(params: {
  absolutePath: string;
  frontmatter: Record<string, unknown>;
  body: string;
}) {
  const rendered = withTrailingNewline(
    renderKnowledgeWikiMarkdown({
      frontmatter: params.frontmatter,
      body: params.body,
    }),
  );
  const existing = await fs.readFile(params.absolutePath, "utf8").catch(() => "");
  if (existing === rendered) return false;
  await fs.mkdir(path.dirname(params.absolutePath), { recursive: true });
  await fs.writeFile(params.absolutePath, rendered, "utf8");
  return true;
}

async function resolveWritablePage(projectRoot: string, config: KnowledgeConfig, lookup: string) {
  const direct = await getKnowledgeWikiPage(projectRoot, config, lookup, 1, 200);
  if (!direct) return null;
  const layout = await ensureKnowledgeWikiVault(projectRoot, config);
  return path.join(layout.wikiRoot, direct.path);
}

function normalizeMutationInput(raw: Record<string, unknown>): KnowledgeWikiMutation {
  if (raw.op === "create_synthesis") {
    if (typeof raw.title !== "string" || !raw.title.trim()) throw new Error("wiki mutation requires title.");
    if (typeof raw.body !== "string" || !raw.body.trim()) throw new Error("wiki mutation requires body.");
    const sourceIds = normalizeStringArray(raw.sourceIds);
    if (sourceIds.length === 0) throw new Error("wiki mutation requires at least one sourceId.");
    return {
      op: "create_synthesis",
      title: raw.title.trim(),
      body: raw.body.trim(),
      sourceIds,
      ...(normalizeStringArray(raw.contradictions).length > 0 ? { contradictions: normalizeStringArray(raw.contradictions) } : {}),
      ...(normalizeStringArray(raw.questions).length > 0 ? { questions: normalizeStringArray(raw.questions) } : {}),
      ...(typeof raw.confidence === "number" ? { confidence: raw.confidence } : {}),
      ...(typeof raw.status === "string" && raw.status.trim() ? { status: raw.status.trim() } : {}),
    };
  }
  if (typeof raw.lookup !== "string" || !raw.lookup.trim()) throw new Error("wiki mutation requires lookup.");
  return {
    op: "update_metadata",
    lookup: raw.lookup.trim(),
    ...(raw.sourceIds !== undefined ? { sourceIds: normalizeStringArray(raw.sourceIds) } : {}),
    ...(raw.contradictions !== undefined ? { contradictions: normalizeStringArray(raw.contradictions) } : {}),
    ...(raw.questions !== undefined ? { questions: normalizeStringArray(raw.questions) } : {}),
    ...(raw.confidence === null || typeof raw.confidence === "number" ? { confidence: raw.confidence as number | null } : {}),
    ...(typeof raw.status === "string" && raw.status.trim() ? { status: raw.status.trim() } : {}),
  };
}

async function applyCreateSynthesis(projectRoot: string, config: KnowledgeConfig, mutation: CreateSynthesisKnowledgeWikiMutation) {
  const layout = await ensureKnowledgeWikiVault(projectRoot, config);
  const slug = slugifyKnowledgeWikiSegment(mutation.title);
  const relativePath = path.join("syntheses", `${slug}.md`).replace(/\\/g, "/");
  const absolutePath = path.join(layout.wikiRoot, relativePath);
  const existing = await fs.readFile(absolutePath, "utf8").catch(() => "");
  const parsed = parseKnowledgeWikiMarkdown(existing);
  const pageId =
    (typeof parsed.frontmatter.id === "string" && parsed.frontmatter.id.trim()) || `synthesis.${slug}`;
  const changed = await writeWikiPage({
    absolutePath,
    frontmatter: {
      ...parsed.frontmatter,
      pageType: "synthesis",
      id: pageId,
      title: mutation.title,
      sourceIds: mutation.sourceIds,
      ...(mutation.contradictions ? { contradictions: mutation.contradictions } : {}),
      ...(mutation.questions ? { questions: mutation.questions } : {}),
      ...(typeof mutation.confidence === "number" ? { confidence: mutation.confidence } : {}),
      status: mutation.status ?? "active",
      updatedAt: new Date().toISOString(),
    },
    body: buildSynthesisBody(mutation.title, parsed.body, mutation.body),
  });
  return { changed, pagePath: relativePath, pageId };
}

async function applyUpdateMetadata(projectRoot: string, config: KnowledgeConfig, mutation: UpdateMetadataKnowledgeWikiMutation) {
  const absolutePath = await resolveWritablePage(projectRoot, config, mutation.lookup);
  if (!absolutePath) {
    throw new Error(`Wiki page not found: ${mutation.lookup}`);
  }
  const relativePath = path.relative((await ensureKnowledgeWikiVault(projectRoot, config)).wikiRoot, absolutePath).replace(/\\/g, "/");
  const existing = await fs.readFile(absolutePath, "utf8");
  const parsed = parseKnowledgeWikiMarkdown(existing);
  const nextFrontmatter: Record<string, unknown> = {
    ...parsed.frontmatter,
    updatedAt: new Date().toISOString(),
  };
  if (mutation.sourceIds) nextFrontmatter.sourceIds = mutation.sourceIds;
  if (mutation.contradictions) nextFrontmatter.contradictions = mutation.contradictions;
  if (mutation.questions) nextFrontmatter.questions = mutation.questions;
  if (mutation.confidence === null) delete nextFrontmatter.confidence;
  else if (typeof mutation.confidence === "number") nextFrontmatter.confidence = mutation.confidence;
  if (mutation.status) nextFrontmatter.status = mutation.status;
  const changed = await writeWikiPage({
    absolutePath,
    frontmatter: nextFrontmatter,
    body: parsed.body,
  });
  return {
    changed,
    pagePath: relativePath,
    pageId: typeof parsed.frontmatter.id === "string" ? parsed.frontmatter.id : undefined,
  };
}

export async function applyKnowledgeWikiMutation(projectRoot: string, config: KnowledgeConfig, rawMutation: Record<string, unknown> | KnowledgeWikiMutation): Promise<ApplyKnowledgeWikiMutationResult> {
  const mutation = normalizeMutationInput(rawMutation as Record<string, unknown>);
  const result =
    mutation.op === "create_synthesis"
      ? await applyCreateSynthesis(projectRoot, config, mutation)
      : await applyUpdateMetadata(projectRoot, config, mutation);
  const compile = await compileKnowledgeWikiVault(projectRoot, config);
  return {
    changed: result.changed,
    operation: mutation.op,
    pagePath: result.pagePath,
    ...(result.pageId ? { pageId: result.pageId } : {}),
    compile,
  };
}

export async function searchKnowledgeWikiForApply(projectRoot: string, config: KnowledgeConfig, lookup: string) {
  return await searchKnowledgeWiki(projectRoot, config, lookup, 5);
}
