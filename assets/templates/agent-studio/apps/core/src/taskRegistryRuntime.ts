import type { AutomationJob } from "./automationRuntime.js";
import type { BackgroundJob } from "./jobRuntime.js";
import type { TodoItem } from "./todoRuntime.js";
import type { WorkflowMission } from "./workflowRuntime.js";

export type UnifiedTaskRecord = {
  id: string;
  kind: "todo" | "background_job" | "automation" | "workflow_mission";
  title: string;
  status: string;
  ownerId?: string | null;
  sessionId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  detail?: string;
  source: Record<string, unknown>;
};

function compareNewest(left: UnifiedTaskRecord, right: UnifiedTaskRecord) {
  const leftTs = left.updatedAt ?? left.createdAt ?? "";
  const rightTs = right.updatedAt ?? right.createdAt ?? "";
  return rightTs.localeCompare(leftTs);
}

export function buildUnifiedTaskRegistry(input: {
  todos: TodoItem[];
  jobs: BackgroundJob[];
  automations: AutomationJob[];
  workflowMissions: WorkflowMission[];
}) {
  const records: UnifiedTaskRecord[] = [
    ...input.todos.map((item) => ({
      id: item.id,
      kind: "todo" as const,
      title: item.title,
      status: item.status,
      ownerId: item.ownerId,
      createdAt: item.createdAt,
      updatedAt: item.createdAt,
      detail: "Manual task queue item",
      source: item as unknown as Record<string, unknown>,
    })),
    ...input.jobs.map((job) => ({
      id: job.id,
      kind: "background_job" as const,
      title: job.title,
      status: job.status,
      ownerId: job.ownerId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      detail: job.result ? String(job.result).slice(0, 240) : "Background execution job",
      source: job as unknown as Record<string, unknown>,
    })),
    ...input.automations.map((job) => ({
      id: job.id,
      kind: "automation" as const,
      title: job.title,
      status: job.enabled ? "scheduled" : "disabled",
      ownerId: job.ownerId,
      createdAt: job.lastRunAt ?? job.nextRunAt,
      updatedAt: job.nextRunAt,
      detail: `Every ${job.intervalMinutes} minutes · next ${job.nextRunAt}`,
      source: job as unknown as Record<string, unknown>,
    })),
    ...input.workflowMissions.map((mission) => ({
      id: mission.id,
      kind: "workflow_mission" as const,
      title: mission.title,
      status: mission.status,
      sessionId: mission.sessionId,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
      detail: [
        `Preset ${mission.workflowId}`,
        mission.lane ? `Lane ${mission.lane}` : "",
        mission.dependsOnIds && mission.dependsOnIds.length > 0
          ? `Depends on ${mission.dependsOnIds.join(", ")}`
          : "",
        mission.detail ?? "",
      ].filter(Boolean).join(" · "),
      source: mission as unknown as Record<string, unknown>,
    })),
  ].sort(compareNewest);

  return {
    records,
    summary: {
      total: records.length,
      queued: records.filter((record) => ["pending", "queued", "created", "scheduled"].includes(record.status)).length,
      running: records.filter((record) => ["running", "in_progress"].includes(record.status)).length,
      completed: records.filter((record) => ["completed", "succeeded"].includes(record.status)).length,
      failed: records.filter((record) => ["failed", "cancelled", "timed_out", "lost"].includes(record.status)).length,
    },
  };
}
