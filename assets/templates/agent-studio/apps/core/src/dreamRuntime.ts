import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

export type DreamReport = {
  id: string;
  sessionId: string;
  title: string;
  summary: string;
  createdAt: string;
};

type DreamState = {
  reports: DreamReport[];
  dreamedSessionIds: string[];
};

const DEFAULT_STATE: DreamState = {
  reports: [],
  dreamedSessionIds: [],
};

export async function loadDreamState(dataDir: string) {
  const filePath = path.join(dataDir, "dreams.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: { ...DEFAULT_STATE, ...(JSON.parse(await readFile(filePath, "utf8")) as DreamState) },
  };
}

async function saveDreamState(filePath: string, state: DreamState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

function fallbackDream(session: { id: string; title: string; messages: Array<{ role: string; content: string }> }) {
  return {
    title: session.title || session.id,
    summary: session.messages
      .slice(-8)
      .map((message) => `[${message.role}] ${message.content}`)
      .join("\n")
      .slice(0, 2400),
  };
}

export async function dreamSession(input: {
  dataDir: string;
  session: { id: string; title: string; messages: Array<{ role: string; content: string }> };
  client: OpenAI | null;
  model: string;
}) {
  const loaded = await loadDreamState(input.dataDir);
  if (loaded.state.dreamedSessionIds.includes(input.session.id)) {
    return null;
  }

  let title = input.session.title || input.session.id;
  let summary = fallbackDream(input.session).summary;

  if (input.client) {
    try {
      const response = await input.client.chat.completions.create({
        model: input.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Summarize the finished work into a compact reflection with lessons, reusable patterns, and what should be remembered next time. Keep it concise and practical.",
          },
          {
            role: "user",
            content: input.session.messages
              .slice(-16)
              .map((message) => `[${message.role}] ${message.content}`)
              .join("\n\n")
              .slice(0, 12000),
          },
        ],
      });
      summary = response.choices[0]?.message?.content ?? summary;
    } catch {
      // Fall back silently.
    }
  }

  const report: DreamReport = {
    id: `${Date.now()}-${input.session.id}`,
    sessionId: input.session.id,
    title,
    summary,
    createdAt: new Date().toISOString(),
  };
  loaded.state.reports.unshift(report);
  loaded.state.dreamedSessionIds.push(input.session.id);
  await saveDreamState(loaded.filePath, loaded.state);
  return report;
}
