import type OpenAI from "openai";
import type { Server as HttpServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";

type FunctionTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export async function runResponsesTurn(input: {
  client: OpenAI;
  model: string;
  instructions: string;
  prompt: string;
  tools: FunctionTool[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<string>;
}) {
  const toolDefs = input.tools.map((tool) => ({
    type: "function" as const,
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
    strict: false,
  }));

  let response = await input.client.responses.create({
    model: input.model,
    instructions: input.instructions,
    input: input.prompt,
    tools: toolDefs,
  });

  for (let step = 0; step < 6; step += 1) {
    const calls = (response.output ?? []).filter((item: any) => item.type === "function_call");
    if (!calls.length) {
      break;
    }
    const toolOutputs = [];
    for (const call of calls as any[]) {
      const args = JSON.parse(call.arguments || "{}") as Record<string, unknown>;
      const output = await input.callTool(call.name, args);
      toolOutputs.push({
        type: "function_call_output" as const,
        call_id: call.call_id,
        output,
      });
    }
    response = await input.client.responses.create({
      model: input.model,
      instructions: input.instructions,
      previous_response_id: response.id,
      input: toolOutputs,
      tools: toolDefs,
    });
  }

  return {
    id: response.id,
    text: response.output_text ?? "",
    output: response.output ?? [],
  };
}

export function attachRealtimeProxy(input: {
  server: HttpServer;
  path: string;
  apiKey: string;
  model: string;
}) {
  const wss = new WebSocketServer({ noServer: true });

  input.server.on("upgrade", (request, socket, head) => {
    const url = request.url ?? "";
    if (!url.startsWith(input.path)) {
      return;
    }
    wss.handleUpgrade(request, socket, head, (clientSocket) => {
      const upstream = new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(input.model)}`, {
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
        },
      });

      upstream.on("message", (data) => {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(data.toString());
        }
      });

      clientSocket.on("message", (data) => {
        if (upstream.readyState === WebSocket.OPEN) {
          upstream.send(data.toString());
        }
      });

      upstream.on("close", () => {
        if (clientSocket.readyState === WebSocket.OPEN) clientSocket.close();
      });
      clientSocket.on("close", () => {
        if (upstream.readyState === WebSocket.OPEN) upstream.close();
      });
    });
  });

  return wss;
}
