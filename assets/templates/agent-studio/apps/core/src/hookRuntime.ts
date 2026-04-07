export type HookName =
  | "on_session_start"
  | "on_session_end"
  | "pre_llm_call"
  | "post_llm_call"
  | "pre_tool_call"
  | "post_tool_call";

export type HookPayload = Record<string, unknown>;
export type HookHandler = (payload: HookPayload) => Promise<void> | void;

export class HookRegistry {
  private readonly hooks = new Map<HookName, HookHandler[]>();
  private readonly failures: Array<{ hook: HookName; message: string; at: string }> = [];

  register(name: HookName, handler: HookHandler) {
    const list = this.hooks.get(name) ?? [];
    list.push(handler);
    this.hooks.set(name, list);
  }

  async emit(name: HookName, payload: HookPayload) {
    const list = this.hooks.get(name) ?? [];
    for (const handler of list) {
      try {
        await handler(payload);
      } catch (error) {
        this.failures.unshift({
          hook: name,
          message: error instanceof Error ? error.message : String(error),
          at: new Date().toISOString(),
        });
        this.failures.splice(20);
      }
    }
  }

  summary() {
    return {
      counts: Object.fromEntries([...this.hooks.entries()].map(([name, list]) => [name, list.length])),
      failures: this.failures,
    };
  }
}
