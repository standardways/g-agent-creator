import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function summarizeWorkspace(projectRoot: string) {
  const entries = await readdir(projectRoot, { withFileTypes: true });
  return {
    projectRoot,
    directories: entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
    files: entries.filter((entry) => entry.isFile()).map((entry) => entry.name),
  };
}

export async function exportJson(pathname: string, data: unknown) {
  await mkdir(path.dirname(pathname), { recursive: true });
  await writeFile(pathname, JSON.stringify(data, null, 2), "utf8");
  return pathname;
}

export async function listArtifacts(artifactDir: string) {
  if (!existsSync(artifactDir)) {
    return [];
  }
  const sessions = await readdir(artifactDir, { withFileTypes: true });
  const results: Array<{ sessionId: string; fileName: string; path: string }> = [];
  for (const session of sessions) {
    if (!session.isDirectory()) continue;
    const sessionDir = path.join(artifactDir, session.name);
    const files = await readdir(sessionDir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile()) continue;
      results.push({
        sessionId: session.name,
        fileName: file.name,
        path: path.join(sessionDir, file.name),
      });
    }
  }
  return results;
}
