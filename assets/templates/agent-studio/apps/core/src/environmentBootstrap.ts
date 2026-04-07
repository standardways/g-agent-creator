import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

type Snapshot = {
  workspacePath?: string;
  topLevelEntries: string[];
  detectedFiles: string[];
  availableCommands: string[];
};

const cache = new Map<string, { at: number; snapshot: Snapshot }>();
const TTL_MS = 15_000;

export async function loadEnvironmentSnapshot(workspacePath?: string): Promise<Snapshot> {
  const key = workspacePath ?? "__none__";
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.snapshot;
  }

  const snapshot: Snapshot = {
    workspacePath,
    topLevelEntries: [],
    detectedFiles: [],
    availableCommands: [],
  };

  if (workspacePath && existsSync(workspacePath)) {
    const entries = await readdir(workspacePath, { withFileTypes: true });
    snapshot.topLevelEntries = entries.slice(0, 30).map((entry) => entry.name);
    const detected = [
      "package.json",
      "pnpm-workspace.yaml",
      "Cargo.toml",
      "pyproject.toml",
      "go.mod",
      "pubspec.yaml",
      "firebase.json",
      "docker-compose.yml",
      ".env",
      "README.md",
    ];
    snapshot.detectedFiles = detected
      .filter((name) => existsSync(path.join(workspacePath, name)))
      .slice(0, 10);
  }

  const commands = ["node", "npm", "git", "flutter", "dart", "python", "python3", "rg"];
  for (const command of commands) {
    if (await commandExists(command)) {
      snapshot.availableCommands.push(command);
    }
  }

  cache.set(key, { at: Date.now(), snapshot });
  return snapshot;
}

function commandExists(command: string) {
  return new Promise<boolean>((resolve) => {
    const shell = process.platform === "win32" ? "where.exe" : "which";
    const child = spawn(shell, [command], { stdio: ["ignore", "ignore", "ignore"] });
    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

export function renderEnvironmentSnapshot(snapshot: Snapshot) {
  const lines = [
    "Environment bootstrap:",
    `- Workspace: ${snapshot.workspacePath ?? "not set"}`,
    `- Top-level entries: ${snapshot.topLevelEntries.join(", ") || "none detected"}`,
    `- Detected project files: ${snapshot.detectedFiles.join(", ") || "none detected"}`,
    `- Available commands: ${snapshot.availableCommands.join(", ") || "none detected"}`,
  ];
  return lines.join("\n");
}
