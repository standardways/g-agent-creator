import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";

type Json = Record<string, unknown>;

export type CodexNotification = {
  method: string;
  params: Record<string, unknown>;
};

export type CodexServerRequest = {
  id: string | number;
  method: string;
  params: Record<string, unknown>;
};

export class CodexAppServerBridge {
  private child: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<number, (value: Json) => void>();
  private nextId = 1;
  private initialized = false;
  private startedAt: string | null = null;
  private exitedAt: string | null = null;
  private lastError: string | null = null;
  private requestsSent = 0;
  private listeners = new Set<(notification: CodexNotification) => void>();
  private requestListeners = new Set<(request: CodexServerRequest) => void>();

  async ensureStarted() {
    if (this.child) return;

    const command: [string, string[]] =
      process.platform === "win32"
        ? ["cmd.exe", ["/c", "codex app-server --listen stdio://"]]
        : ["sh", ["-lc", "codex app-server --listen stdio://"]];

    const child = spawn(command[0], command[1], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    }) as ChildProcessWithoutNullStreams;
    this.startedAt = new Date().toISOString();
    this.exitedAt = null;
    this.lastError = null;

    const rl = readline.createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let message: Json;
      try {
        message = JSON.parse(trimmed) as Json;
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
        return;
      }
      const id = message.id;
      if (typeof id === "number" && this.pending.has(id)) {
        const resolve = this.pending.get(id)!;
        this.pending.delete(id);
        resolve(message);
        return;
      }
      const method = message.method;
      const params = message.params;
      if ((typeof id === "number" || typeof id === "string") && typeof method === "string") {
        for (const listener of this.requestListeners) {
          listener({ id, method, params: (params as Record<string, unknown> | undefined) ?? {} });
        }
        return;
      }
      if (typeof method === "string" && params && typeof params === "object") {
        for (const listener of this.listeners) {
          listener({ method, params: params as Record<string, unknown> });
        }
      }
    });

    child.stderr.on("data", () => {
      // Ignore stderr noise from Codex app-server startup.
    });

    child.on("error", (error) => {
      this.lastError = error.message;
    });

    child.on("exit", () => {
      this.exitedAt = new Date().toISOString();
      this.child = null;
      this.initialized = false;
    });

    this.child = child;
  }

  subscribe(listener: (notification: CodexNotification) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeRequests(listener: (request: CodexServerRequest) => void) {
    this.requestListeners.add(listener);
    return () => this.requestListeners.delete(listener);
  }

  private send(message: Json) {
    if (!this.child) {
      throw new Error("Codex app-server is not started.");
    }
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private async request(method: string, params: Record<string, unknown>) {
    await this.ensureStarted();
    const id = this.nextId++;
    this.requestsSent += 1;
    const promise = new Promise<Json>((resolve) => {
      this.pending.set(id, resolve);
    });
    this.send({ id, method, params });
    return promise;
  }

  async initialize(clientInfo?: Record<string, unknown>) {
    await this.ensureStarted();
    if (this.initialized) {
      return {
        result: {
          protocolVersion: "0.1",
          reinitialized: false,
        },
      };
    }
    const response = await this.request("initialize", {
      clientInfo: clientInfo ?? {
        name: "__AGENT_SLUG___shell",
        title: "__AGENT_NAME__ Shell",
        version: "0.1.0",
      },
      capabilities: {
        experimentalApi: true,
      },
    });
    this.send({ method: "initialized", params: {} });
    this.initialized = true;
    return response;
  }

  async call(method: string, params: Record<string, unknown>) {
    if (!this.initialized && method !== "initialize") {
      await this.initialize();
    }
    if (method === "initialize") {
      return this.initialize(params.clientInfo as Record<string, unknown> | undefined);
    }
    return this.request(method, params);
  }

  respond(id: string | number, result: unknown) {
    this.send({ id, result });
  }

  status() {
    return {
      started: Boolean(this.child),
      initialized: this.initialized,
      pid: this.child?.pid ?? null,
      startedAt: this.startedAt,
      exitedAt: this.exitedAt,
      lastError: this.lastError,
      pendingRequests: this.pending.size,
      requestsSent: this.requestsSent,
    };
  }
}
