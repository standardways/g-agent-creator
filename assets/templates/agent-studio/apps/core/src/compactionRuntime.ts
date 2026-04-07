import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

export type SessionSummary = {
  sessionId: string;
  summary: string;
  updatedAt: string;
};

type CompactionState = {
  summaries: SessionSummary[];
};

const DEFAULT_STATE: CompactionState = {
  summaries: [],
};

export async function loadCompactionState(dataDir: string) {
  const filePath = path.join(dataDir, "compaction.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: { ...DEFAULT_STATE, ...(JSON.parse(await readFile(filePath, "utf8")) as CompactionState) },
  };
}

async function saveCompactionState(filePath: string, state: CompactionState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function compactSession(input: {
  dataDir: string;
  session: { id: string; messages: Array<{ role: string; content: string }> };
  client: OpenAI | null;
  model: string;
}) {
  const loaded = await loadCompactionState(input.dataDir);
  let summary = input.session.messages
    .slice(0, -8)
    .map((message) => `[${message.role}] ${message.content}`)
    .join("\n\n")
    .slice(0, 3000);

  if (input.client && input.session.messages.length > 12) {
    try {
      const response = await input.client.chat.completions.create({
        model: input.model,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: "Summarize the earlier session context into a compact working-memory note preserving important technical facts and decisions.",
          },
          {
            role: "user",
            content: input.session.messages
              .slice(0, -8)
              .map((message) => `[${message.role}] ${message.content}`)
              .join("\n\n")
              .slice(0, 12000),
          },
        ],
      });
      summary = response.choices[0]?.message?.content ?? summary;
    } catch {
      // Keep fallback summary.
    }
  }

  const nextSummary: SessionSummary = {
    sessionId: input.session.id,
    summary,
    updatedAt: new Date().toISOString(),
  };
  loaded.state.summaries = [
    nextSummary,
    ...loaded.state.summaries.filter((item) => item.sessionId != input.session.id),
  ].slice(0, 200);
  await saveCompactionState(loaded.filePath, loaded.state);
  return nextSummary;
}

export async function getSessionSummary(dataDir: string, sessionId: string) {
  return (await loadCompactionState(dataDir)).state.summaries.find((item) => item.sessionId == sessionId) ?? null;
}
