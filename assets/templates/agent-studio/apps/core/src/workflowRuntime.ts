import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type WorkflowPreset = {
  id: string;
  title: string;
  description: string;
  recommendedRole: string;
  promptTemplate: string;
};

export type WorkflowMission = {
  id: string;
  workflowId: string;
  sessionId: string | null;
  title: string;
  lane?: string;
  parentMissionId?: string | null;
  dependsOnIds?: string[];
  status: "created" | "queued" | "running" | "blocked" | "completed" | "failed" | "cancelled";
  detail?: string;
  createdAt: string;
  updatedAt: string;
};

type WorkflowState = {
  missions: WorkflowMission[];
};

const DEFAULT_PRESETS: WorkflowPreset[] = [
  {
    id: "deep_interview",
    title: "Deep Interview",
    description: "Clarify intent, boundaries, risks, and non-goals before execution.",
    recommendedRole: "planner",
    promptTemplate:
      "Clarify this request before implementation. Ask only the highest-value questions, identify constraints, and summarize the approved scope: {{task}}",
  },
  {
    id: "ralplan",
    title: "Approved Plan",
    description: "Turn clarified scope into a concrete implementation plan with tradeoffs.",
    recommendedRole: "planner",
    promptTemplate:
      "Produce an implementation plan with major steps, tradeoffs, risks, and verification strategy for: {{task}}",
  },
  {
    id: "ralph",
    title: "Completion Loop",
    description: "Carry the approved plan through execution, verification, and closure.",
    recommendedRole: "executor",
    promptTemplate:
      "Carry this work to completion autonomously. Execute, verify, and report blockers only if truly necessary: {{task}}",
  },
  {
    id: "team",
    title: "Parallel Team",
    description: "Break work into coordinated streams for multi-role parallel execution.",
    recommendedRole: "planner",
    promptTemplate:
      "Break this work into parallel lanes, assign specialist roles, and define integration checkpoints: {{task}}",
  },
];

const DEFAULT_STATE: WorkflowState = {
  missions: [],
};

async function loadWorkflowFile(dataDir: string) {
  const filePath = path.join(dataDir, "workflows.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: {
      ...DEFAULT_STATE,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<WorkflowState>),
    },
  };
}

async function saveWorkflowFile(filePath: string, state: WorkflowState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export function listWorkflowPresets() {
  return DEFAULT_PRESETS;
}

export async function listWorkflowMissions(dataDir: string) {
  return (await loadWorkflowFile(dataDir)).state.missions;
}

export async function createWorkflowMission(dataDir: string, mission: WorkflowMission) {
  const loaded = await loadWorkflowFile(dataDir);
  loaded.state.missions.unshift(mission);
  await saveWorkflowFile(loaded.filePath, loaded.state);
  return mission;
}

export async function updateWorkflowMission(dataDir: string, id: string, patch: Partial<WorkflowMission>) {
  const loaded = await loadWorkflowFile(dataDir);
  loaded.state.missions = loaded.state.missions.map((mission) =>
    mission.id === id
      ? {
          ...mission,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : mission
  );
  await saveWorkflowFile(loaded.filePath, loaded.state);
  return loaded.state.missions.find((mission) => mission.id === id) ?? null;
}
