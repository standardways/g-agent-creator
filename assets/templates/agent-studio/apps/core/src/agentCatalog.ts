import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type AgentDefinition = {
  role: string;
  prompt: string;
  model?: string;
  allowedTools?: string[];
};

export async function loadAgentCatalog(projectRoot: string) {
  const agentsDir = path.join(projectRoot, "agents");
  const entries = await readdir(agentsDir, { withFileTypes: true });
  const catalog = new Map<string, AgentDefinition>();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }
    const fullPath = path.join(agentsDir, entry.name);
    const definition = JSON.parse(await readFile(fullPath, "utf8")) as AgentDefinition;
    catalog.set(definition.role, definition);
  }

  return catalog;
}
