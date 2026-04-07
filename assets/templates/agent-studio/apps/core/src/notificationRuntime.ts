import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { outboundAllowed, redactSensitive, type SecurityPolicy } from "./securityRuntime.js";

export type NotificationRoute = {
  id: string;
  title: string;
  eventPrefix: string;
  channel: "local_log" | "webhook";
  target: string;
  enabled: boolean;
};

export type NotificationDelivery = {
  id: string;
  routeId: string;
  eventName: string;
  payload: Record<string, unknown>;
  deliveredAt: string;
  status: "logged" | "sent" | "failed";
  detail: string;
};

type NotificationState = {
  routes: NotificationRoute[];
  deliveries: NotificationDelivery[];
};

const DEFAULT_STATE: NotificationState = {
  routes: [
    {
      id: "local-agent-log",
      title: "Local agent log",
      eventPrefix: "agent.",
      channel: "local_log",
      target: ".local-data/notifications.log",
      enabled: true,
    },
  ],
  deliveries: [],
};

async function loadNotificationFile(dataDir: string) {
  const filePath = path.join(dataDir, "notifications.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: {
      ...DEFAULT_STATE,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<NotificationState>),
    },
  };
}

async function saveNotificationFile(filePath: string, state: NotificationState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function listNotificationState(dataDir: string) {
  return (await loadNotificationFile(dataDir)).state;
}

export async function saveNotificationRoutes(dataDir: string, routes: NotificationRoute[]) {
  const loaded = await loadNotificationFile(dataDir);
  const next = {
    ...loaded.state,
    routes,
  };
  await saveNotificationFile(loaded.filePath, next);
  return next.routes;
}

export async function routeNotificationEvent(
  dataDir: string,
  eventName: string,
  payload: Record<string, unknown>,
  policy?: SecurityPolicy
) {
  const loaded = await loadNotificationFile(dataDir);
  const matched = loaded.state.routes.filter(
    (route) => route.enabled && eventName.startsWith(route.eventPrefix)
  );

  const deliveries: NotificationDelivery[] = [];
  for (const route of matched) {
    let status: NotificationDelivery["status"] = "logged";
    let detail = route.target;
    if (route.channel === "webhook" && route.target) {
      try {
        if (policy && !outboundAllowed(policy, route.target, "webhook")) {
          throw new Error("webhook target is not permitted by security policy");
        }
        const response = await fetch(route.target, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName,
            payload: policy?.redactSecrets ? redactSensitive(payload) : payload,
            deliveredAt: new Date().toISOString(),
          }),
        });
        status = response.ok ? "sent" : "failed";
        detail = response.ok ? route.target : await response.text();
      } catch (error) {
        status = "failed";
        detail = error instanceof Error ? error.message : String(error);
      }
    }
    deliveries.push({
      id: randomUUID(),
      routeId: route.id,
      eventName,
      payload,
      deliveredAt: new Date().toISOString(),
      status,
      detail,
    });
  }

  if (deliveries.length > 0) {
    loaded.state.deliveries.unshift(...deliveries);
    loaded.state.deliveries = loaded.state.deliveries.slice(0, 200);
    await saveNotificationFile(loaded.filePath, loaded.state);
  }

  return deliveries;
}
