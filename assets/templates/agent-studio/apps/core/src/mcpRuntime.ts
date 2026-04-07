import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type McpServerRecord = {
  id: string;
  name: string;
  source: "workspace" | "manual";
  status: "pending" | "approved" | "rejected";
  config: Record<string, unknown>;
};

type McpState = {
  servers: McpServerRecord[];
};

const DEFAULT_STATE: McpState = {
  servers: [],
};

export async function loadMcpState(dataDir: string) {
  const filePath = path.join(dataDir, "mcp-servers.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: { ...DEFAULT_STATE, ...(JSON.parse(await readFile(filePath, "utf8")) as McpState) },
  };
}

async function saveMcpState(filePath: string, state: McpState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function listMcpServers(dataDir: string) {
  return (await loadMcpState(dataDir)).state.servers;
}

export async function importWorkspaceMcp(dataDir: string, workspacePath: string) {
  const configPath = path.join(workspacePath, ".mcp.json");
  if (!existsSync(configPath)) {
    return [];
  }
  const loaded = await loadMcpState(dataDir);
  const raw = JSON.parse(await readFile(configPath, "utf8")) as Record<string, unknown>;
  const servers = (raw.servers ?? raw.mcpServers ?? {}) as Record<string, Record<string, unknown>>;
  const imported: McpServerRecord[] = [];

  for (const [name, config] of Object.entries(servers)) {
    const id = `workspace:${name}`;
    if (loaded.state.servers.some((server) => server.id === id)) {
      continue;
    }
    imported.push({
      id,
      name,
      source: "workspace",
      status: "pending",
      config,
    });
  }

  if (imported.length > 0) {
    loaded.state.servers.push(...imported);
    await saveMcpState(loaded.filePath, loaded.state);
  }

  return imported;
}

export async function updateMcpServerStatus(dataDir: string, id: string, status: McpServerRecord["status"]) {
  const loaded = await loadMcpState(dataDir);
  loaded.state.servers = loaded.state.servers.map((server) => (server.id === id ? { ...server, status } : server));
  await saveMcpState(loaded.filePath, loaded.state);
  return loaded.state.servers.find((server) => server.id === id) ?? null;
}
