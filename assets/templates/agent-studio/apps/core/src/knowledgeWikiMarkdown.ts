import path from "node:path";

export const KNOWLEDGE_WIKI_PAGE_KINDS = ["entity", "concept", "source", "synthesis", "report"] as const;
export const KNOWLEDGE_WIKI_GENERATED_START = "<!-- gagent:wiki:generated:start -->";
export const KNOWLEDGE_WIKI_GENERATED_END = "<!-- gagent:wiki:generated:end -->";
export const KNOWLEDGE_WIKI_HUMAN_START = "<!-- gagent:wiki:human:start -->";
export const KNOWLEDGE_WIKI_HUMAN_END = "<!-- gagent:wiki:human:end -->";
export const KNOWLEDGE_WIKI_RELATED_START = "<!-- gagent:wiki:related:start -->";
export const KNOWLEDGE_WIKI_RELATED_END = "<!-- gagent:wiki:related:end -->";

export type KnowledgeWikiPageKind = (typeof KNOWLEDGE_WIKI_PAGE_KINDS)[number];

export type ParsedKnowledgeWikiMarkdown = {
  frontmatter: Record<string, unknown>;
  body: string;
};

export type KnowledgeWikiPageSummary = {
  absolutePath: string;
  relativePath: string;
  kind: KnowledgeWikiPageKind;
  title: string;
  id?: string;
  pageType?: string;
  sourceIds: string[];
  contradictions: string[];
  questions: string[];
  confidence?: number;
  status?: string;
  updatedAt?: string;
  provenanceMode?: string;
  provenanceLabel?: string;
  sourceType?: string;
  sourcePath?: string;
  bridgeKind?: string;
  bridgeKey?: string;
  ownerId?: string;
  linkTargets: string[];
};

type YamlValue = string | number | boolean | null | string[];

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;
const OBSIDIAN_LINK_PATTERN = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\(([^)]+)\)/g;
const RELATED_BLOCK_PATTERN = new RegExp(
  `${KNOWLEDGE_WIKI_RELATED_START}[\\s\\S]*?${KNOWLEDGE_WIKI_RELATED_END}`,
  "g",
);

function parseScalar(value: string): YamlValue {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function stringifyScalar(value: Exclude<YamlValue, string[]>): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0";
  if (value === "") return '""';
  if (/[:#[\]{}]|^\s|\s$/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

export function slugifyKnowledgeWikiSegment(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "page";
}

export function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((item) => (typeof item === "string" && item.trim() ? [item.trim()] : [])))];
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [] as string[];
}

export function parseKnowledgeWikiMarkdown(raw: string): ParsedKnowledgeWikiMarkdown {
  const match = raw.match(FRONTMATTER_PATTERN);
  if (!match) return { frontmatter: {}, body: raw };
  const frontmatterLines = match[1].split(/\r?\n/);
  const frontmatter: Record<string, unknown> = {};
  let currentArrayKey: string | null = null;
  for (const line of frontmatterLines) {
    if (!line.trim()) continue;
    const arrayMatch = line.match(/^\s*-\s+(.*)$/);
    if (arrayMatch && currentArrayKey) {
      const current = Array.isArray(frontmatter[currentArrayKey]) ? [...(frontmatter[currentArrayKey] as unknown[])] : [];
      current.push(parseScalar(arrayMatch[1]));
      frontmatter[currentArrayKey] = current;
      continue;
    }
    currentArrayKey = null;
    const keyMatch = line.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (!keyMatch) continue;
    const [, key, value] = keyMatch;
    if (!value.trim()) {
      frontmatter[key] = [];
      currentArrayKey = key;
      continue;
    }
    frontmatter[key] = parseScalar(value);
  }
  return {
    frontmatter,
    body: raw.slice(match[0].length),
  };
}

export function renderKnowledgeWikiMarkdown(params: {
  frontmatter: Record<string, unknown>;
  body: string;
}) {
  const preferredOrder = [
    "pageType",
    "id",
    "title",
    "status",
    "updatedAt",
    "sourceIds",
    "contradictions",
    "questions",
    "confidence",
    "provenanceMode",
    "provenanceLabel",
    "sourceType",
    "sourcePath",
    "bridgeKind",
    "bridgeKey",
    "ownerId",
  ];
  const keys = [
    ...preferredOrder.filter((key) => key in params.frontmatter),
    ...Object.keys(params.frontmatter)
      .filter((key) => !preferredOrder.includes(key))
      .sort((left, right) => left.localeCompare(right)),
  ];
  const yaml = keys
    .flatMap((key) => {
      const value = params.frontmatter[key];
      if (value === undefined) return [];
      if (Array.isArray(value)) {
        if (value.length === 0) return [`${key}: []`];
        return [`${key}:`, ...value.map((item) => `  - ${stringifyScalar(item as Exclude<YamlValue, string[]>)}`)];
      }
      return [`${key}: ${stringifyScalar(value as Exclude<YamlValue, string[]>)}`];
    })
    .join("\n");
  return `---\n${yaml}\n---\n\n${params.body.trimStart()}`;
}

export function replaceManagedMarkdownBlock(params: {
  original: string;
  heading: string;
  startMarker: string;
  endMarker: string;
  body: string;
}) {
  const block = `${params.heading}\n${params.startMarker}\n${params.body.trim()}\n${params.endMarker}`;
  const pattern = new RegExp(`${escapeRegExp(params.startMarker)}[\\s\\S]*?${escapeRegExp(params.endMarker)}`, "g");
  if (pattern.test(params.original)) {
    return params.original.replace(
      new RegExp(
        `${escapeRegExp(params.heading)}\\n${escapeRegExp(params.startMarker)}[\\s\\S]*?${escapeRegExp(params.endMarker)}`,
        "g",
      ),
      block,
    );
  }
  const trimmed = params.original.trimEnd();
  return `${trimmed.length > 0 ? `${trimmed}\n\n` : ""}${block}\n`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function withTrailingNewline(value: string) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

export function inferKnowledgeWikiPageKind(relativePath: string): KnowledgeWikiPageKind | null {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.startsWith("entities/")) return "entity";
  if (normalized.startsWith("concepts/")) return "concept";
  if (normalized.startsWith("sources/")) return "source";
  if (normalized.startsWith("syntheses/")) return "synthesis";
  if (normalized.startsWith("reports/")) return "report";
  return null;
}

export function extractKnowledgeWikiTitle(body: string) {
  return body.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim();
}

export function extractKnowledgeWikiLinks(markdown: string) {
  const searchable = markdown.replace(RELATED_BLOCK_PATTERN, "");
  const links: string[] = [];
  for (const match of searchable.matchAll(OBSIDIAN_LINK_PATTERN)) {
    const target = match[1]?.trim();
    if (target) links.push(target);
  }
  for (const match of searchable.matchAll(MARKDOWN_LINK_PATTERN)) {
    const rawTarget = match[1]?.trim();
    if (!rawTarget || rawTarget.startsWith("#") || /^[a-z]+:/i.test(rawTarget)) continue;
    const target = rawTarget.split("#")[0]?.split("?")[0]?.replace(/\\/g, "/").trim();
    if (target) links.push(target);
  }
  return links;
}

export function formatKnowledgeWikiLink(params: {
  renderMode: "native" | "obsidian";
  relativePath: string;
  title: string;
}) {
  const withoutExtension = params.relativePath.replace(/\.md$/i, "");
  return params.renderMode === "obsidian"
    ? `[[${withoutExtension}|${params.title}]]`
    : `[${params.title}](${params.relativePath})`;
}

export function renderMarkdownFence(content: string, infoString = "text") {
  const fenceSize = Math.max(3, ...Array.from(content.matchAll(/`+/g), (match) => match[0].length + 1));
  const fence = "`".repeat(fenceSize);
  return `${fence}${infoString}\n${content}\n${fence}`;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function toKnowledgeWikiPageSummary(params: {
  absolutePath: string;
  relativePath: string;
  raw: string;
}): KnowledgeWikiPageSummary | null {
  const kind = inferKnowledgeWikiPageKind(params.relativePath);
  if (!kind) return null;
  const parsed = parseKnowledgeWikiMarkdown(params.raw);
  const title =
    optionalString(parsed.frontmatter.title) ||
    extractKnowledgeWikiTitle(parsed.body) ||
    path.basename(params.relativePath, ".md");
  return {
    absolutePath: params.absolutePath,
    relativePath: params.relativePath.replace(/\\/g, "/"),
    kind,
    title,
    id: optionalString(parsed.frontmatter.id),
    pageType: optionalString(parsed.frontmatter.pageType),
    sourceIds: normalizeStringArray(parsed.frontmatter.sourceIds),
    contradictions: normalizeStringArray(parsed.frontmatter.contradictions),
    questions: normalizeStringArray(parsed.frontmatter.questions),
    confidence:
      typeof parsed.frontmatter.confidence === "number" && Number.isFinite(parsed.frontmatter.confidence)
        ? parsed.frontmatter.confidence
        : undefined,
    status: optionalString(parsed.frontmatter.status),
    updatedAt: optionalString(parsed.frontmatter.updatedAt),
    provenanceMode: optionalString(parsed.frontmatter.provenanceMode),
    provenanceLabel: optionalString(parsed.frontmatter.provenanceLabel),
    sourceType: optionalString(parsed.frontmatter.sourceType),
    sourcePath: optionalString(parsed.frontmatter.sourcePath),
    bridgeKind: optionalString(parsed.frontmatter.bridgeKind),
    bridgeKey: optionalString(parsed.frontmatter.bridgeKey),
    ownerId: optionalString(parsed.frontmatter.ownerId),
    linkTargets: extractKnowledgeWikiLinks(params.raw),
  };
}
