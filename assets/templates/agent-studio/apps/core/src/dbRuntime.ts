import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

type EventRow = {
  id: string;
  kind: string;
  summary: string;
  payload: string;
  created_at: string;
};

export class AgentDatabase {
  private db: DatabaseSync;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.db = new DatabaseSync(path.join(dataDir, "agent.db"));
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        summary TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  addEvent(input: { id: string; kind: string; summary: string; payload: Record<string, unknown>; createdAt: string }) {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO events (id, kind, summary, payload, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(input.id, input.kind, input.summary, JSON.stringify(input.payload), input.createdAt);
  }

  listEvents(limit = 200) {
    const stmt = this.db.prepare(
      "SELECT id, kind, summary, payload, created_at FROM events ORDER BY created_at DESC LIMIT ?"
    );
    return stmt.all(limit) as EventRow[];
  }
}
