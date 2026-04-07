type RpcEvent = {
  method: string;
  params: Record<string, unknown>;
};

type Subscriber = {
  id: string;
  push: (event: RpcEvent) => void;
};

export class RpcEventBus {
  private subscribers = new Map<string, Subscriber>();

  subscribe(id: string, push: (event: RpcEvent) => void) {
    this.subscribers.set(id, { id, push });
  }

  unsubscribe(id: string) {
    this.subscribers.delete(id);
  }

  emit(method: string, params: Record<string, unknown>) {
    for (const subscriber of this.subscribers.values()) {
      subscriber.push({ method, params });
    }
  }
}

export type RpcRequest = {
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

export type RpcResponse = {
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
};

export function ok(id: string | number | null, result: unknown): RpcResponse {
  return { id, result };
}

export function fail(id: string | number | null, message: string, code = -32000): RpcResponse {
  return {
    id,
    error: {
      code,
      message,
    },
  };
}
