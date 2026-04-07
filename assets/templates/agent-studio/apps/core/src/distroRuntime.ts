import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type DistroProfile = {
  id: string;
  title: string;
  description: string;
  providerDefaults?: Record<string, unknown>;
  enabledPlugins?: string[];
  enabledTools?: string[];
  securityPreset?: "public_saas" | "single_tenant" | "local_dev";
};

type DistroState = {
  profiles: DistroProfile[];
};

const DEFAULT_STATE: DistroState = {
  profiles: [
    {
      id: "standard-ops",
      title: "Standard Ops",
      description: "Balanced digital-worker distro with guarded defaults.",
      enabledPlugins: ["browser-research-plugin", "writer-assistant-plugin", "filesystem-curator-plugin"],
      securityPreset: "public_saas",
    },
    {
      id: "research-heavy",
      title: "Research Heavy",
      description: "Bias toward research, wiki, QMD, and code graph workflows.",
      enabledPlugins: ["browser-research-plugin", "data-analyst-plugin", "writer-assistant-plugin"],
      enabledTools: ["http_fetch", "web_lookup", "draft_outline", "inspect_json"],
      securityPreset: "single_tenant",
    },
  ],
};

async function loadDistroFile(dataDir: string) {
  const filePath = path.join(dataDir, "distros.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: {
      ...DEFAULT_STATE,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<DistroState>),
    },
  };
}

export async function listDistros(dataDir: string) {
  return (await loadDistroFile(dataDir)).state.profiles;
}

export async function saveDistros(dataDir: string, profiles: DistroProfile[]) {
  const loaded = await loadDistroFile(dataDir);
  const next = { ...loaded.state, profiles };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next.profiles;
}
