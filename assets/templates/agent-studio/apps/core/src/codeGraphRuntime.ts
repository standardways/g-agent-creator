import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type GraphNode = {
  id: string;
  label: string;
  kind: "file" | "class" | "function" | "import";
  sourceFile: string;
  sourceLocation: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  relation: string;
  confidence: "EXTRACTED" | "INFERRED" | "AMBIGUOUS";
  confidenceScore?: number;
  sourceFile: string;
  sourceLocation: string;
};

export type CodeGraph = {
  generatedAt: string;
  root: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  reportPath: string;
};

export type CodeGraphConfig = {
  enabled: boolean;
  rootPath: string;
  includeExtensions: string[];
  maxFiles: number;
};

const DEFAULT_CONFIG: CodeGraphConfig = {
  enabled: false,
  rootPath: ".",
  includeExtensions: [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".cs"],
  maxFiles: 400,
};

const FILE_SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".dart_tool",
  "coverage",
  "graphify-out",
  "knowledge",
]);

function makeId(prefix: string, value: string) {
  return `${prefix}:${value.toLowerCase().replace(/[^a-z0-9._/-]+/g, "-")}`;
}

function sha256(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

async function loadConfigFile(dataDir: string) {
  const filePath = path.join(dataDir, "code-graph.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    return { filePath, config: DEFAULT_CONFIG };
  }
  return {
    filePath,
    config: {
      ...DEFAULT_CONFIG,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<CodeGraphConfig>),
    },
  };
}

export async function loadCodeGraphConfig(dataDir: string) {
  return (await loadConfigFile(dataDir)).config;
}

export async function saveCodeGraphConfig(dataDir: string, patch: Partial<CodeGraphConfig>) {
  const loaded = await loadConfigFile(dataDir);
  const next = { ...loaded.config, ...patch };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

async function walkFiles(root: string, extensions: string[], maxFiles: number, files: string[] = []) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (files.length >= maxFiles) break;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (FILE_SKIP_DIRS.has(entry.name)) continue;
      await walkFiles(full, extensions, maxFiles, files);
      continue;
    }
    if (extensions.includes(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

function lineNo(source: string, index: number) {
  return `L${source.slice(0, index).split(/\r?\n/).length}`;
}

function extractImports(fileText: string, relPath: string) {
  const edges: GraphEdge[] = [];
  const importRegexes = [
    /\bimport\s+.*?from\s+["'](.+?)["']/g,
    /\brequire\(["'](.+?)["']\)/g,
    /^\s*from\s+([a-zA-Z0-9_./-]+)\s+import\s+/gm,
  ];
  for (const regex of importRegexes) {
    for (const match of fileText.matchAll(regex)) {
      const imported = (match[1] ?? "").trim();
      if (!imported) continue;
      edges.push({
        source: makeId("file", relPath),
        target: makeId("import", imported),
        relation: "imports",
        confidence: "EXTRACTED",
        sourceFile: relPath,
        sourceLocation: lineNo(fileText, match.index ?? 0),
      });
    }
  }
  return edges;
}

function extractClasses(fileText: string, relPath: string) {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const classRegexes = [
    /\bclass\s+([A-Z][A-Za-z0-9_]*)/g,
  ];
  for (const regex of classRegexes) {
    for (const match of fileText.matchAll(regex)) {
      const name = match[1];
      const id = makeId("class", `${relPath}:${name}`);
      nodes.push({
        id,
        label: name,
        kind: "class",
        sourceFile: relPath,
        sourceLocation: lineNo(fileText, match.index ?? 0),
      });
      edges.push({
        source: makeId("file", relPath),
        target: id,
        relation: "contains",
        confidence: "EXTRACTED",
        sourceFile: relPath,
        sourceLocation: lineNo(fileText, match.index ?? 0),
      });
    }
  }
  return { nodes, edges };
}

function extractFunctions(fileText: string, relPath: string) {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const functionRegexes = [
    /\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
    /\bdef\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
    /\bfunc\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\([^)]*\)\s*=>/g,
  ];
  for (const regex of functionRegexes) {
    for (const match of fileText.matchAll(regex)) {
      const name = match[1];
      const id = makeId("function", `${relPath}:${name}`);
      nodes.push({
        id,
        label: `${name}()`,
        kind: "function",
        sourceFile: relPath,
        sourceLocation: lineNo(fileText, match.index ?? 0),
      });
      edges.push({
        source: makeId("file", relPath),
        target: id,
        relation: "contains",
        confidence: "EXTRACTED",
        sourceFile: relPath,
        sourceLocation: lineNo(fileText, match.index ?? 0),
      });
    }
  }
  return { nodes, edges };
}

function inferFileRelationships(fileNodes: GraphNode[], importEdges: GraphEdge[]) {
  const edges: GraphEdge[] = [];
  const filesByStem = new Map<string, string>();
  for (const node of fileNodes) {
    filesByStem.set(path.basename(node.sourceFile, path.extname(node.sourceFile)).toLowerCase(), node.id);
  }
  for (const edge of importEdges) {
    const targetStem = edge.target.replace(/^import:/, "").split("/").pop()?.split(".")[0]?.toLowerCase();
    if (!targetStem) continue;
    const target = filesByStem.get(targetStem);
    if (!target) continue;
    edges.push({
      source: edge.source,
      target,
      relation: "imports_project_file",
      confidence: "INFERRED",
      confidenceScore: 0.72,
      sourceFile: edge.sourceFile,
      sourceLocation: edge.sourceLocation,
    });
  }
  return edges;
}

async function loadGraphCache(root: string) {
  const cacheDir = path.join(root, "graphify-out", "cache");
  await mkdir(cacheDir, { recursive: true });
  return cacheDir;
}

async function loadCachedExtraction(cacheDir: string, filePath: string, hash: string) {
  const target = path.join(cacheDir, `${hash}.json`);
  if (!existsSync(target)) return null;
  try {
    return JSON.parse(await readFile(target, "utf8")) as { nodes: GraphNode[]; edges: GraphEdge[] };
  } catch {
    return null;
  }
}

async function saveCachedExtraction(cacheDir: string, hash: string, payload: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  await writeFile(path.join(cacheDir, `${hash}.json`), JSON.stringify(payload), "utf8");
}

function buildGraphReport(graph: CodeGraph) {
  const degree = new Map<string, number>();
  for (const edge of graph.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  const godNodes = graph.nodes
    .filter((node) => node.kind !== "file")
    .map((node) => ({ label: node.label, degree: degree.get(node.id) ?? 0, sourceFile: node.sourceFile }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 12);
  const surprising = graph.edges
    .filter((edge) => edge.confidence !== "EXTRACTED")
    .sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0))
    .slice(0, 10);

  return [
    `# Graph Report - ${graph.root}`,
    "",
    `- ${graph.nodes.length} nodes`,
    `- ${graph.edges.length} edges`,
    "",
    "## God Nodes",
    ...godNodes.map((node, index) => `${index + 1}. \`${node.label}\` - ${node.degree} edges (${node.sourceFile})`),
    "",
    "## Surprising Connections",
    ...surprising.map((edge) => `- ${edge.source} --${edge.relation}--> ${edge.target} [${edge.confidence}${edge.confidenceScore != null ? ` ${edge.confidenceScore.toFixed(2)}` : ""}]`),
    "",
    "## Suggested Questions",
    "- What are the load-bearing abstractions?",
    "- Which files connect distant parts of the codebase?",
    "- Where are the most structurally central functions or classes?",
  ].join("\n");
}

export async function buildCodeGraph(projectRoot: string, config: CodeGraphConfig) {
  const root = path.resolve(projectRoot, config.rootPath || ".");
  const files = await walkFiles(root, config.includeExtensions.map((item) => item.toLowerCase()), config.maxFiles);
  const cacheDir = await loadGraphCache(projectRoot);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const fileNodes: GraphNode[] = [];

  for (const file of files) {
    const relPath = path.relative(projectRoot, file).replace(/\\/g, "/");
    const text = await readFile(file, "utf8");
    const hash = sha256(text);
    const cached = await loadCachedExtraction(cacheDir, file, hash);
    if (cached) {
      nodes.push(...cached.nodes);
      edges.push(...cached.edges);
      fileNodes.push(
        ...cached.nodes.filter((node) => node.kind === "file")
      );
      continue;
    }

    const fileNode: GraphNode = {
      id: makeId("file", relPath),
      label: path.basename(relPath),
      kind: "file",
      sourceFile: relPath,
      sourceLocation: "L1",
    };
    const imports = extractImports(text, relPath);
    const classes = extractClasses(text, relPath);
    const functions = extractFunctions(text, relPath);
    const extraction = {
      nodes: [fileNode, ...classes.nodes, ...functions.nodes],
      edges: [...imports, ...classes.edges, ...functions.edges],
    };
    await saveCachedExtraction(cacheDir, hash, extraction);
    nodes.push(...extraction.nodes);
    edges.push(...extraction.edges);
    fileNodes.push(fileNode);
  }

  edges.push(...inferFileRelationships(fileNodes, edges.filter((edge) => edge.relation === "imports")));

  const outDir = path.join(projectRoot, "graphify-out");
  await mkdir(outDir, { recursive: true });
  const reportPath = path.join(outDir, "GRAPH_REPORT.md");
  const graph: CodeGraph = {
    generatedAt: new Date().toISOString(),
    root,
    nodes,
    edges,
    reportPath,
  };
  await writeFile(path.join(outDir, "graph.json"), JSON.stringify(graph, null, 2), "utf8");
  await writeFile(reportPath, buildGraphReport(graph), "utf8");
  return graph;
}

export async function loadCodeGraph(projectRoot: string) {
  const filePath = path.join(projectRoot, "graphify-out", "graph.json");
  if (!existsSync(filePath)) return null;
  return JSON.parse(await readFile(filePath, "utf8")) as CodeGraph;
}

export function graphStats(graph: CodeGraph) {
  return {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    files: graph.nodes.filter((node) => node.kind === "file").length,
    classes: graph.nodes.filter((node) => node.kind === "class").length,
    functions: graph.nodes.filter((node) => node.kind === "function").length,
    imports: graph.edges.filter((edge) => edge.relation === "imports").length,
    inferred: graph.edges.filter((edge) => edge.confidence === "INFERRED").length,
    ambiguous: graph.edges.filter((edge) => edge.confidence === "AMBIGUOUS").length,
    reportPath: graph.reportPath,
  };
}

export function queryCodeGraph(graph: CodeGraph, question: string) {
  const terms = question
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2);
  const scored = graph.nodes
    .map((node) => ({
      node,
      score: terms.reduce((sum, term) => sum + (node.label.toLowerCase().includes(term) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  return scored.map((entry) => ({
    id: entry.node.id,
    title: entry.node.label,
    path: entry.node.sourceFile,
    score: entry.score,
    summary: `${entry.node.kind} in ${entry.node.sourceFile} at ${entry.node.sourceLocation}`,
  }));
}

export function getCodeGraphNode(graph: CodeGraph, selector: string) {
  const lowered = selector.toLowerCase();
  return graph.nodes.find((node) => node.id.toLowerCase() === lowered || node.label.toLowerCase().includes(lowered)) ?? null;
}
