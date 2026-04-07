import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export async function ensureLearnedSkillDir(projectRoot: string) {
  const learnedDir = path.join(projectRoot, "skills", "learned");
  await mkdir(learnedDir, { recursive: true });
  return learnedDir;
}

async function readMeta(skillDir: string) {
  const metaPath = path.join(skillDir, "meta.json");
  if (!existsSync(metaPath)) {
    return { pinned: false };
  }
  return JSON.parse(await readFile(metaPath, "utf8")) as { pinned?: boolean };
}

export async function listLearnedSkillEntries(projectRoot: string) {
  const learnedDir = await ensureLearnedSkillDir(projectRoot);
  const entries = await readdir(learnedDir, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(learnedDir, entry.name, "SKILL.md");
    let preview = "";
    if (existsSync(skillPath)) {
      preview = (await readFile(skillPath, "utf8")).slice(0, 800);
    }
    const meta = await readMeta(path.join(learnedDir, entry.name));
    skills.push({
      slug: entry.name,
      path: skillPath,
      preview,
      pinned: Boolean(meta.pinned),
      size: existsSync(skillPath) ? (await readFile(skillPath, "utf8")).length : 0,
    });
  }
  skills.sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.slug.localeCompare(b.slug));
  return skills;
}

export async function deleteLearnedSkill(projectRoot: string, slug: string) {
  const learnedDir = await ensureLearnedSkillDir(projectRoot);
  const target = path.join(learnedDir, slug);
  if (!existsSync(target)) {
    return false;
  }
  await rm(target, { recursive: true, force: true });
  return true;
}

export async function setLearnedSkillPinned(projectRoot: string, slug: string, pinned: boolean) {
  const learnedDir = await ensureLearnedSkillDir(projectRoot);
  const target = path.join(learnedDir, slug);
  if (!existsSync(target)) {
    return false;
  }
  await writeFile(path.join(target, "meta.json"), JSON.stringify({ pinned }, null, 2), "utf8");
  return true;
}
