import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ToolsetProfile = {
  active: string;
  profiles: Record<
    string,
    {
      description: string;
      tools: string[];
    }
  >;
};

const DEFAULT_TOOLSETS: ToolsetProfile = {
  active: "general",
  profiles: {
    general: {
      description: "General digital worker tools across coding, research, writing, and ops.",
      tools: [
        "list_files",
        "read_file",
        "write_file",
        "search_files",
        "run_shell",
        "http_fetch",
        "project_summary",
        "web_lookup",
        "desktop_context",
        "draft_outline",
        "inspect_json",
        "workspace_digest",
      ],
    },
    coding: {
      description: "Focus on code, files, search, and shell work.",
      tools: [
        "list_files",
        "read_file",
        "write_file",
        "search_files",
        "run_shell",
        "project_summary",
        "workspace_digest",
      ],
    },
    research: {
      description: "Focus on information gathering and synthesis.",
      tools: [
        "http_fetch",
        "web_lookup",
        "draft_outline",
        "inspect_json",
      ],
    },
    operator: {
      description: "Focus on execution, environment, and operational context.",
      tools: [
        "run_shell",
        "desktop_context",
        "workspace_digest",
        "project_summary",
      ],
    },
    safe: {
      description: "Conservative profile without shell or write access.",
      tools: [
        "list_files",
        "read_file",
        "search_files",
        "http_fetch",
        "web_lookup",
        "draft_outline",
        "inspect_json",
        "project_summary",
        "workspace_digest",
      ],
    },
    terminal_web: {
      description: "Code and docs profile with shell, files, and web lookup.",
      tools: [
        "list_files",
        "read_file",
        "write_file",
        "search_files",
        "run_shell",
        "http_fetch",
        "web_lookup",
        "project_summary",
        "workspace_digest",
      ],
    },
  },
};

export async function loadToolsetProfiles(dataDir: string) {
  const filePath = path.join(dataDir, "toolset-profiles.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_TOOLSETS, null, 2), "utf8");
    return { filePath, config: DEFAULT_TOOLSETS };
  }
  return {
    filePath,
    config: { ...DEFAULT_TOOLSETS, ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<ToolsetProfile>) },
  };
}

export async function saveToolsetProfiles(dataDir: string, patch: Partial<ToolsetProfile>) {
  const loaded = await loadToolsetProfiles(dataDir);
  const next = {
    ...loaded.config,
    ...patch,
    profiles: {
      ...loaded.config.profiles,
      ...(patch.profiles ?? {}),
    },
  };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function allowedToolsForActiveProfile(config: ToolsetProfile) {
  return config.profiles[config.active]?.tools ?? [];
}
