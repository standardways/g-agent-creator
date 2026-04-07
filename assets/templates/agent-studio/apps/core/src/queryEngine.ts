import type OpenAI from "openai";

type ToolSpec = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type QueryResult<T> = {
  value: T;
  model: string;
  attempts: number;
};

export async function runChatTurn(input: {
  client: OpenAI;
  model: string;
  messages: any[];
  tools: ToolSpec[];
}) {
  return input.client.chat.completions.create({
    model: input.model,
    temperature: 0.2,
    messages: input.messages,
    tools: input.tools as any,
    tool_choice: "auto",
  });
}

export async function runWithRetry<T>(task: () => Promise<T>, attempts = 3) {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
      }
    }
  }
  throw lastError;
}

export async function runWithModelFallback<T>(input: {
  models: string[];
  task: (model: string) => Promise<T>;
  attemptsPerModel?: number;
}) {
  let lastError: unknown = null;
  const attemptsPerModel = input.attemptsPerModel ?? 2;

  for (const model of input.models) {
    try {
      const value = await runWithRetry(() => input.task(model), attemptsPerModel);
      return {
        value,
        model,
        attempts: attemptsPerModel,
      } satisfies QueryResult<T>;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
