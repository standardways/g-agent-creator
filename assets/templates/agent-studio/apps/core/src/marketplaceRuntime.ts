import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function loadLocalMarketplace(projectRoot: string) {
  const marketplacePath = path.join(projectRoot, ".agents", "plugins", "marketplace.json");
  const runtimePluginsRoot = path.join(projectRoot, "plugins");
  const runtimePluginDirs = existsSync(runtimePluginsRoot)
    ? (await readdir(runtimePluginsRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : [];
  if (!existsSync(marketplacePath)) {
    return {
      path: marketplacePath,
      marketplaces: [],
      plugins: [],
      runtimePluginDirs,
      missingRuntimePluginDirs: [],
      unmanagedRuntimePlugins: runtimePluginDirs,
      errors: [],
    };
  }

  try {
    const value = JSON.parse(await readFile(marketplacePath, "utf8")) as Record<string, unknown>;
    const plugins = Array.isArray(value.plugins) ? value.plugins : [];
    const marketplacePluginIds = plugins
      .map((plugin) => (plugin as Record<string, unknown>)?.id)
      .filter((id): id is string => typeof id === "string");
    return {
      path: marketplacePath,
      marketplaces: [value],
      plugins,
      runtimePluginDirs,
      missingRuntimePluginDirs: marketplacePluginIds.filter((id) => !runtimePluginDirs.includes(id)),
      unmanagedRuntimePlugins: runtimePluginDirs.filter((dir) => !marketplacePluginIds.includes(dir)),
      errors: [],
    };
  } catch (error) {
    return {
      path: marketplacePath,
      marketplaces: [],
      plugins: [],
      runtimePluginDirs,
      missingRuntimePluginDirs: [],
      unmanagedRuntimePlugins: runtimePluginDirs,
      errors: [String(error)],
    };
  }
}
