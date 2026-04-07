import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { scanImportSource } from "./installScanRuntime.js";

type ExternalSkillsConfig = {
  externalRoots: string[];
};

const DEFAULT_CONFIG: ExternalSkillsConfig = {
  externalRoots: [],
};

export async function loadSkillsHubConfig(dataDir: string) {
  const filePath = path.join(dataDir, "skills-hub.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    return { filePath, config: DEFAULT_CONFIG };
  }
  return {
    filePath,
    config: { ...DEFAULT_CONFIG, ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<ExternalSkillsConfig>) },
  };
}

export async function saveSkillsHubConfig(dataDir: string, patch: Partial<ExternalSkillsConfig>) {
  const loaded = await loadSkillsHubConfig(dataDir);
  const next = { ...loaded.config, ...patch };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

async function scanSkillRoot(root: string) {
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const skills: Array<{ name: string; path: string; description: string }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(root, entry.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;
    const text = await readFile(skillPath, "utf8");
    const match = text.match(/description:\s*(.+)/);
    skills.push({
      name: entry.name,
      path: skillPath,
      description: match?.[1]?.trim() ?? "",
    });
  }
  return skills;
}

export async function listAllSkills(projectRoot: string, dataDir: string) {
  const projectSkills = await scanSkillRoot(path.join(projectRoot, "skills"));
  const learnedSkills = await scanSkillRoot(path.join(projectRoot, "skills", "learned"));
  const importedSkills = await scanSkillRoot(path.join(projectRoot, "skills", "imported"));
  const config = await loadSkillsHubConfig(dataDir);
  const externalSkills = (
    await Promise.all(config.config.externalRoots.map((root) => scanSkillRoot(root)))
  ).flat();

  return {
    projectSkills,
    learnedSkills,
    importedSkills,
    externalSkills,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function importSkillFromHub(projectRoot: string, sourceSkillPath: string) {
  if (!existsSync(sourceSkillPath)) {
    throw new Error(`Skill source not found: ${sourceSkillPath}`);
  }
  const sourceDir = path.dirname(sourceSkillPath);
  const findings = await scanImportSource(sourceDir);
  if (findings.some((finding) => finding.severity === "error")) {
    throw new Error(
      `Import blocked by install scan: ${findings
        .filter((finding) => finding.severity === "error")
        .map((finding) => `${finding.path}: ${finding.message}`)
        .join("; ")}`
    );
  }
  const baseName = slugify(path.basename(sourceDir)) || "imported-skill";
  const importedRoot = path.join(projectRoot, "skills", "imported");
  await mkdir(importedRoot, { recursive: true });

  let targetDir = path.join(importedRoot, baseName);
  let counter = 2;
  while (existsSync(targetDir)) {
    targetDir = path.join(importedRoot, `${baseName}-${counter}`);
    counter += 1;
  }

  await cp(sourceDir, targetDir, { recursive: true });

  return {
    sourcePath: sourceSkillPath,
    targetDir,
    targetSkillPath: path.join(targetDir, "SKILL.md"),
    scanFindings: findings,
  };
}
