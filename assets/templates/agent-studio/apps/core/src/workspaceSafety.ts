import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

const templateEntries = new Set([
  "AGENTS.md",
  "SOUL.md",
  "USER.md",
  "BOOTSTRAP.md",
  "memory",
  "apps",
  "agents",
  "plugins",
  "skills",
  "docs",
  "infra",
  "eval",
  "scripts",
  ".gitignore",
  "package.json",
  "README.md",
  "firebase.json",
  "firestore.rules",
  "storage.rules",
  ".firebaserc.example",
]);

export async function workspaceSafety(projectRoot: string) {
  if (!existsSync(projectRoot)) {
    return {
      safe: true,
      reason: null,
      entries: [],
    };
  }

  const entries = (await readdir(projectRoot)).filter((name) => name != ".DS_Store" && name != ".git" && name != ".gitignore");
  if (entries.length === 0) {
    return {
      safe: true,
      reason: null,
      entries,
    };
  }

  const isTemplateOnly = entries.every((entry) => templateEntries.has(entry));
  return {
    safe: isTemplateOnly,
    reason: isTemplateOnly ? null : "Workspace contains non-template files or directories.",
    entries,
  };
}
