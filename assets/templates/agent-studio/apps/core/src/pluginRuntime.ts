import { existsSync, lstatSync, realpathSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { HookName, HookPayload, HookRegistry } from "./hookRuntime.js";

export type DynamicTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, context: Record<string, unknown>) => Promise<unknown> | unknown;
};

export type RuntimePluginManifest = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  entry?: string;
  kind?: string | string[];
  configSchema: Record<string, unknown>;
  dangerousFlags?: Array<{ path: string; equals: string | number | boolean | null }>;
};

export type RuntimePluginDiagnostic = {
  pluginId: string;
  pluginDir: string;
  severity: "info" | "warning" | "error";
  message: string;
};

type PluginContext = {
  registerHook: (name: HookName, handler: (payload: HookPayload) => Promise<void> | void) => void;
  registerTool: (tool: DynamicTool) => void;
};

function safeRealpath(targetPath: string) {
  try {
    return realpathSync(targetPath);
  } catch {
    return null;
  }
}

function loadManifestFromJson(raw: string, fallbackId: string) {
  const parsed = JSON.parse(raw) as Partial<RuntimePluginManifest>;
  const id = typeof parsed.id === "string" && parsed.id.trim()
    ? parsed.id.trim()
    : typeof parsed.name === "string" && parsed.name.trim()
      ? parsed.name.trim()
      : fallbackId;
  const configSchema = parsed.configSchema;
  if (!configSchema || typeof configSchema !== "object" || Array.isArray(configSchema)) {
    throw new Error("plugin manifest requires configSchema");
  }
  return {
    id,
    name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : id,
    version: typeof parsed.version === "string" ? parsed.version.trim() : undefined,
    description: typeof parsed.description === "string" ? parsed.description.trim() : undefined,
    entry: typeof parsed.entry === "string" && parsed.entry.trim() ? parsed.entry.trim() : "index.mjs",
    kind: parsed.kind,
    configSchema,
    dangerousFlags: Array.isArray(parsed.dangerousFlags) ? parsed.dangerousFlags : [],
  } satisfies RuntimePluginManifest;
}

export async function loadRuntimePlugins(projectRoot: string) {
  const pluginsDir = path.join(projectRoot, "plugins");
  const hooks = new HookRegistry();
  const tools: DynamicTool[] = [];
  const manifests: RuntimePluginManifest[] = [];
  const diagnostics: RuntimePluginDiagnostic[] = [];

  if (!existsSync(pluginsDir)) {
    return { hooks, tools, manifests, diagnostics };
  }

  const entries = await readdir(pluginsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const pluginDir = path.join(pluginsDir, entry.name);
    const realDir = safeRealpath(pluginDir);
    const realRoot = safeRealpath(pluginsDir);
    if (!realDir || !realRoot || !realDir.toLowerCase().startsWith(`${realRoot.toLowerCase()}${path.sep}`.toLowerCase())) {
      diagnostics.push({
        pluginId: entry.name,
        pluginDir,
        severity: "error",
        message: "plugin path is outside the plugins root or unresolved",
      });
      continue;
    }
    try {
      const stat = lstatSync(pluginDir);
      if (stat.isSymbolicLink()) {
        diagnostics.push({
          pluginId: entry.name,
          pluginDir,
          severity: "error",
          message: "symlinked plugins are not allowed",
        });
        continue;
      }
    } catch {
      diagnostics.push({
        pluginId: entry.name,
        pluginDir,
        severity: "error",
        message: "plugin path stat failed",
      });
      continue;
    }

    const manifestCandidates = [
      path.join(pluginDir, "openclaw.plugin.json"),
      path.join(pluginDir, "plugin.json"),
    ];
    const manifestPath = manifestCandidates.find((candidate) => existsSync(candidate));
    if (!manifestPath) {
      diagnostics.push({
        pluginId: entry.name,
        pluginDir,
        severity: "error",
        message: "plugin manifest not found",
      });
      continue;
    }

    let manifest: RuntimePluginManifest;
    try {
      manifest = loadManifestFromJson(await readFile(manifestPath, "utf8"), entry.name);
    } catch (error) {
      diagnostics.push({
        pluginId: entry.name,
        pluginDir,
        severity: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    manifests.push(manifest);

    const entryFile = path.join(pluginDir, manifest.entry ?? "index.mjs");
    if (!existsSync(entryFile)) {
      diagnostics.push({
        pluginId: manifest.id,
        pluginDir,
        severity: "error",
        message: `plugin entry not found: ${manifest.entry ?? "index.mjs"}`,
      });
      continue;
    }

    try {
      const module = await import(pathToFileURL(entryFile).href);
      if (typeof module.register !== "function") {
        diagnostics.push({
          pluginId: manifest.id,
          pluginDir,
          severity: "warning",
          message: "plugin has no register() export",
        });
        continue;
      }
      const context: PluginContext = {
        registerHook: (name, handler) => hooks.register(name, handler),
        registerTool: (tool) => tools.push(tool),
      };
      await module.register(context);
    } catch (error) {
      diagnostics.push({
        pluginId: manifest.id,
        pluginDir,
        severity: "error",
        message: `plugin failed to initialize: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return { hooks, tools, manifests, diagnostics };
}
