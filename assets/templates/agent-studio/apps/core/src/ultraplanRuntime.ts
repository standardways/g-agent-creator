import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type UltraplanPhase =
  | "launching"
  | "running"
  | "needs_input"
  | "plan_ready"
  | "executing_remote"
  | "completed"
  | "failed"
  | "cancelled";

export type UltraplanHandoffTarget = "send_back_local" | "continue_remote" | null;

export type UltraplanSession = {
  id: string;
  ownerId: string;
  localSessionId: string | null;
  remoteThreadId: string | null;
  remoteTurnId: string | null;
  phase: UltraplanPhase;
  plan: string | null;
  pendingInput: string | null;
  handoffTarget: UltraplanHandoffTarget;
  draftText: string;
  launchText: string;
  executionTarget: "planning" | "remote_execution";
  createdAt: string;
  updatedAt: string;
  error: string | null;
};

type UltraplanState = {
  sessions: UltraplanSession[];
};

const DEFAULT_STATE: UltraplanState = {
  sessions: [],
};

export const ULTRAPLAN_APPROVED_MARKER = "## APPROVED PLAN";
export const ULTRAPLAN_EDITED_MARKER = "## APPROVED PLAN (EDITED)";
export const ULTRAPLAN_QUESTIONS_MARKER = "## FOLLOW-UP QUESTIONS";

async function loadUltraplanFile(dataDir: string) {
  const filePath = path.join(dataDir, "ultraplan.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: {
      ...DEFAULT_STATE,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<UltraplanState>),
    },
  };
}

async function saveUltraplanFile(filePath: string, state: UltraplanState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function listUltraplanSessions(dataDir: string, ownerId?: string) {
  const sessions = (await loadUltraplanFile(dataDir)).state.sessions;
  const filtered = ownerId ? sessions.filter((session) => session.ownerId === ownerId) : sessions;
  return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createUltraplanSession(dataDir: string, session: UltraplanSession) {
  const loaded = await loadUltraplanFile(dataDir);
  loaded.state.sessions.unshift(session);
  await saveUltraplanFile(loaded.filePath, loaded.state);
  return session;
}

export async function updateUltraplanSession(dataDir: string, id: string, patch: Partial<UltraplanSession>) {
  const loaded = await loadUltraplanFile(dataDir);
  loaded.state.sessions = loaded.state.sessions.map((session) =>
    session.id === id
      ? {
          ...session,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : session
  );
  await saveUltraplanFile(loaded.filePath, loaded.state);
  return loaded.state.sessions.find((session) => session.id === id) ?? null;
}

export async function getUltraplanSession(dataDir: string, id: string) {
  const loaded = await loadUltraplanFile(dataDir);
  return loaded.state.sessions.find((session) => session.id === id) ?? null;
}

export function buildUltraplanPrompt(blurb: string, seedPlan?: string) {
  const parts = [
    "You are in ultraplan mode.",
    "Stay in plan mode until you have an execution-ready plan or precise follow-up questions.",
    `If you have an execution-ready plan, reply with exactly one section headed "${ULTRAPLAN_APPROVED_MARKER}" or "${ULTRAPLAN_EDITED_MARKER}".`,
    `If you still need operator input, reply with exactly one section headed "${ULTRAPLAN_QUESTIONS_MARKER}".`,
    "Do not mix approved plan and follow-up questions in the same response.",
    seedPlan ? `Draft plan to refine:\n${seedPlan}` : "",
    blurb ? `Task:\n${blurb}` : "",
  ].filter(Boolean);
  return parts.join("\n\n");
}

export function parseUltraplanOutput(text: string) {
  const editedIdx = text.indexOf(ULTRAPLAN_EDITED_MARKER);
  const approvedIdx = text.indexOf(ULTRAPLAN_APPROVED_MARKER);
  const questionsIdx = text.indexOf(ULTRAPLAN_QUESTIONS_MARKER);

  const normalize = (value: string) => value.replace(/^\s+|\s+$/g, "");

  if (editedIdx !== -1 || approvedIdx !== -1) {
    const idx = editedIdx !== -1 ? editedIdx : approvedIdx;
    const marker = editedIdx !== -1 ? ULTRAPLAN_EDITED_MARKER : ULTRAPLAN_APPROVED_MARKER;
    return {
      kind: "approved" as const,
      edited: marker === ULTRAPLAN_EDITED_MARKER,
      plan: normalize(text.slice(idx + marker.length)),
    };
  }

  if (questionsIdx !== -1) {
    return {
      kind: "needs_input" as const,
      questions: normalize(text.slice(questionsIdx + ULTRAPLAN_QUESTIONS_MARKER.length)),
    };
  }

  return {
    kind: "malformed" as const,
    error: "Ultraplan output did not include an approved plan or follow-up questions marker.",
  };
}

export function isUltraplanStuck(session: UltraplanSession, now = Date.now()) {
  const ageMs = now - new Date(session.updatedAt).getTime();
  return ["launching", "running", "needs_input", "executing_remote"].includes(session.phase) && ageMs > 30 * 60 * 1000;
}
