export type ApprovalRequest = {
  id: string | number;
  method: string;
  params: Record<string, unknown>;
  createdAt: string;
};

export type ApprovalPresentation = ApprovalRequest & {
  kind: "command" | "network" | "file_change" | "patch" | "permissions" | "generic";
  title: string;
  detail: string;
  availableDecisions: string[];
};

export class ApprovalStore {
  private items = new Map<string, ApprovalRequest>();

  upsert(request: ApprovalRequest) {
    this.items.set(String(request.id), request);
  }

  list() {
    return [...this.items.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  resolve(id: string | number) {
    const key = String(id);
    const item = this.items.get(key) ?? null;
    this.items.delete(key);
    return item;
  }
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function presentApproval(request: ApprovalRequest): ApprovalPresentation {
  const params = request.params ?? {};
  const availableDecisions =
    asStringArray(params.availableDecisions) ||
    asStringArray(params.available_decisions);
  const method = request.method.toLowerCase();

  if (method.includes("commandexecutionrequestapproval") || method.includes("execcommandapproval")) {
    const command = typeof params.command === "string" ? params.command : "";
    const cwd = typeof params.cwd === "string" ? params.cwd : "";
    const reason = typeof params.reason === "string" ? params.reason : "";
    const network = params.networkApprovalContext ?? params.network_approval_context;
    const detail = [
      command ? `Command: ${command}` : "",
      cwd ? `Working directory: ${cwd}` : "",
      reason ? `Reason: ${reason}` : "",
      network ? `Network context: ${JSON.stringify(network, null, 2)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    return {
      ...request,
      kind: network ? "network" : "command",
      title: network ? "Network approval request" : "Command approval request",
      detail: detail || "Command execution needs approval.",
      availableDecisions: availableDecisions.length > 0
        ? availableDecisions
        : ["accept", "accept_for_session", "decline", "cancel"],
    };
  }

  if (method.includes("filechangerequestapproval")) {
    const changes = params.changes ?? params.fileChanges ?? params.file_changes;
    return {
      ...request,
      kind: "file_change",
      title: "File change approval request",
      detail: changes ? JSON.stringify(changes, null, 2) : "File changes need approval.",
      availableDecisions: availableDecisions.length > 0
        ? availableDecisions
        : ["accept", "accept_for_session", "decline", "cancel"],
    };
  }

  if (method.includes("applypatchapproval")) {
    return {
      ...request,
      kind: "patch",
      title: "Patch approval request",
      detail: JSON.stringify(params, null, 2),
      availableDecisions: availableDecisions.length > 0 ? availableDecisions : ["accept", "decline", "cancel"],
    };
  }

  if (method.includes("permissionsrequestapproval")) {
    return {
      ...request,
      kind: "permissions",
      title: "Permissions approval request",
      detail: JSON.stringify(params, null, 2),
      availableDecisions: availableDecisions.length > 0 ? availableDecisions : ["accept", "decline", "cancel"],
    };
  }

  return {
    ...request,
    kind: "generic",
    title: request.method,
    detail: JSON.stringify(params, null, 2),
    availableDecisions: availableDecisions.length > 0 ? availableDecisions : ["accept", "decline"],
  };
}
