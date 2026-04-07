import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type CompanyProfile = {
  name: string;
  mission: string;
  description: string;
  status: "active" | "paused" | "archived";
};

export type CompanyGoal = {
  id: string;
  title: string;
  description: string;
  status: "planned" | "active" | "achieved" | "cancelled";
  parentId?: string | null;
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanyAssignee = {
  id: string;
  name: string;
  role: string;
  status: "active" | "paused" | "terminated";
  reportsToId?: string | null;
  monthlyBudgetUsd?: number | null;
  createdAt: string;
  updatedAt: string;
};

type CompanyState = {
  profile: CompanyProfile;
  goals: CompanyGoal[];
  assignees: CompanyAssignee[];
};

const DEFAULT_STATE: CompanyState = {
  profile: {
    name: "Agent Company",
    mission: "Operate autonomously with clear goals, budgets, and governance.",
    description: "Generated digital-worker company control plane.",
    status: "active",
  },
  goals: [],
  assignees: [],
};

async function loadCompanyFile(dataDir: string) {
  const filePath = path.join(dataDir, "company.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: {
      ...DEFAULT_STATE,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<CompanyState>),
    },
  };
}

async function saveCompanyFile(filePath: string, state: CompanyState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function loadCompanyState(dataDir: string) {
  return (await loadCompanyFile(dataDir)).state;
}

export async function saveCompanyProfile(dataDir: string, patch: Partial<CompanyProfile>) {
  const loaded = await loadCompanyFile(dataDir);
  loaded.state.profile = {
    ...loaded.state.profile,
    ...patch,
  };
  await saveCompanyFile(loaded.filePath, loaded.state);
  return loaded.state.profile;
}

export async function createCompanyGoal(dataDir: string, goal: CompanyGoal) {
  const loaded = await loadCompanyFile(dataDir);
  loaded.state.goals.unshift(goal);
  await saveCompanyFile(loaded.filePath, loaded.state);
  return goal;
}

export async function updateCompanyGoal(dataDir: string, id: string, patch: Partial<CompanyGoal>) {
  const loaded = await loadCompanyFile(dataDir);
  loaded.state.goals = loaded.state.goals.map((goal) =>
    goal.id === id
      ? {
          ...goal,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : goal
  );
  await saveCompanyFile(loaded.filePath, loaded.state);
  return loaded.state.goals.find((goal) => goal.id === id) ?? null;
}

export async function createCompanyAssignee(dataDir: string, assignee: CompanyAssignee) {
  const loaded = await loadCompanyFile(dataDir);
  loaded.state.assignees.unshift(assignee);
  await saveCompanyFile(loaded.filePath, loaded.state);
  return assignee;
}

export async function updateCompanyAssignee(dataDir: string, id: string, patch: Partial<CompanyAssignee>) {
  const loaded = await loadCompanyFile(dataDir);
  loaded.state.assignees = loaded.state.assignees.map((assignee) =>
    assignee.id === id
      ? {
          ...assignee,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : assignee
  );
  await saveCompanyFile(loaded.filePath, loaded.state);
  return loaded.state.assignees.find((assignee) => assignee.id === id) ?? null;
}
