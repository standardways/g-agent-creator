import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type MigrationItem = {
  itemType: "config" | "skills" | "agentsMd" | "mcpServerConfig";
  description: string;
  cwd: string | null;
  sourcePath: string;
};

export async function detectExternalConfig(input: {
  projectRoot: string;
  includeHome: boolean;
  cwds?: string[];
}) {
  const items: MigrationItem[] = [];
  const roots = [...(input.cwds ?? [])];
  if (input.includeHome) {
    roots.push(path.join(process.env.USERPROFILE ?? process.env.HOME ?? "", ".codex"));
  }

  for (const root of roots.filter(Boolean)) {
    const abs = path.resolve(root);
    const agentsPath = path.join(abs, "AGENTS.md");
    if (existsSync(agentsPath)) {
      items.push({
        itemType: "agentsMd",
        description: `Import AGENTS.md from ${abs}`,
        cwd: abs,
        sourcePath: agentsPath,
      });
    }

    const mcpPath = path.join(abs, ".mcp.json");
    if (existsSync(mcpPath)) {
      items.push({
        itemType: "mcpServerConfig",
        description: `Import .mcp.json from ${abs}`,
        cwd: abs,
        sourcePath: mcpPath,
      });
    }

    const skillsDir = path.join(abs, "skills");
    if (existsSync(skillsDir)) {
      const entries = await readdir(skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
        if (!existsSync(skillPath)) continue;
        items.push({
          itemType: "skills",
          description: `Import skill ${entry.name} from ${skillsDir}`,
          cwd: abs,
          sourcePath: skillPath,
        });
      }
    }
  }

  return items;
}

export async function importExternalConfig(input: {
  projectRoot: string;
  items: MigrationItem[];
}) {
  const imported: string[] = [];
  for (const item of input.items) {
    if (item.itemType === "agentsMd") {
      const target = path.join(input.projectRoot, "AGENTS.imported.md");
      await copyFile(item.sourcePath, target);
      imported.push(target);
      continue;
    }
    if (item.itemType === "mcpServerConfig") {
      const target = path.join(input.projectRoot, ".mcp.imported.json");
      await copyFile(item.sourcePath, target);
      imported.push(target);
      continue;
    }
    if (item.itemType === "skills") {
      const sourceDir = path.dirname(item.sourcePath);
      const slug = path.basename(sourceDir);
      const targetDir = path.join(input.projectRoot, "skills", "imported", slug);
      await mkdir(targetDir, { recursive: true });
      await copyFile(item.sourcePath, path.join(targetDir, "SKILL.md"));
      imported.push(path.join(targetDir, "SKILL.md"));
    }
  }
  return imported;
}
