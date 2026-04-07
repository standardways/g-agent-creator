import { existsSync, lstatSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export type InstallScanFinding = {
  severity: "warning" | "error";
  path: string;
  message: string;
};

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".jsonc",
  ".yaml",
  ".yml",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".mts",
  ".cts",
  ".sh",
  ".ps1",
  ".toml",
]);

const SUSPICIOUS_PATTERNS: Array<[RegExp, string]> = [
  [/\bcurl\b[^\n]*\|\s*(sh|bash|zsh|pwsh|powershell)\b/i, "pipes remote script directly into a shell"],
  [/\bwget\b[^\n]*\|\s*(sh|bash|zsh|pwsh|powershell)\b/i, "pipes remote download directly into a shell"],
  [/\brm\s+-rf\s+\//i, "contains destructive root delete command"],
  [/\bRemove-Item\b[^\n]*-Recurse[^\n]*-Force/i, "contains forceful recursive PowerShell delete"],
  [/\bauthori[sz]ed_keys\b/i, "references ssh authorized_keys"],
  [/\btoken\b|\bsecret\b|\bprivate[_-]?key\b/i, "appears to embed secret-oriented content"],
];

async function walkFiles(root: string, base = root, results: string[] = []) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "dist", "build"].includes(entry.name)) continue;
      await walkFiles(full, base, results);
      continue;
    }
    results.push(path.relative(base, full));
  }
  return results;
}

async function scanTextFile(fullPath: string, relativePath: string) {
  const findings: InstallScanFinding[] = [];
  const ext = path.extname(fullPath).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) {
    return findings;
  }
  const content = await readFile(fullPath, "utf8");
  for (const [pattern, message] of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      findings.push({
        severity: message.includes("destructive") ? "error" : "warning",
        path: relativePath,
        message,
      });
    }
  }
  return findings;
}

export async function scanImportSource(root: string) {
  if (!existsSync(root)) {
    return [{ severity: "error", path: root, message: "source path does not exist" }] satisfies InstallScanFinding[];
  }
  const findings: InstallScanFinding[] = [];
  const rootStat = lstatSync(root);
  if (rootStat.isSymbolicLink()) {
    findings.push({
      severity: "error",
      path: root,
      message: "symlinked install source is not allowed",
    });
    return findings;
  }

  const files = await walkFiles(root);
  for (const relativePath of files) {
    const fullPath = path.join(root, relativePath);
    const fileStat = await stat(fullPath);
    if (fileStat.size > 2_000_000) {
      findings.push({
        severity: "warning",
        path: relativePath,
        message: "file is unusually large for a skill/plugin import",
      });
    }
    findings.push(...(await scanTextFile(fullPath, relativePath)));
  }

  return findings;
}
