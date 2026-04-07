# Architecture Map

Use this map when adapting the generated agent template.

## Command And Skill Registry

Primary upstream patterns:

- `portable-skill-loader-progressive-disclosure`
- `project-root-scoped-local-skill-loading`
- `memoized-command-source-aggregation`
- `feature-gated-command-registry-loading`
- `skill-registry-composition-and-feature-gating`

Use these when:

- expanding the generated tool registry
- adding local skills or prompt commands
- introducing MCP or plugin discovery
- keeping startup time predictable

## Tool Orchestration

Primary upstream patterns:

- `concurrency-safe-tool-batching`
- `ordered-streaming-tool-execution`
- `progress-first-tool-emission`
- `idempotent-tool-result-persistence`
- `preview-first-large-output-messages`

Use these when:

- tool calls need progress events
- multiple read-only tools can run in parallel
- long outputs need artifact persistence
- the shell UI needs stable ordered progress

## Context, Memory, And Sessions

Primary upstream patterns:

- `conversation-engine-persistent-session-state`
- `api-round-message-grouping`
- `largest-first-context-shedding`
- `reserved-summary-output-budget`
- `turn-scoped-memory-prefetch-with-disposal`
- `session-memory-first-compaction`

Use these when:

- Firestore-backed sessions grow over time
- long tool outputs threaten prompt size
- the app needs resumable conversations
- subagents need clean context handoff

## Subagents And Lifecycle

Primary upstream patterns:

- `prompt-context-handoff-for-agent-runtime`
- `permission-overlay-inheritance`
- `additive-agent-tool-surface-construction`
- `agent-specific-mcp-server-initialization`
- `lifecycle-scoped-resource-cleanup`
- `append-only-sidechain-transcripts`

Use these when:

- adding planner/executor/reviewer workers
- isolating worker context and permissions
- persisting worker transcripts
- cleaning up worker-owned resources

## Extensions And MCP

Primary upstream patterns:

- `three-layer-extension-sync`
- `background-marketplace-reconciliation`
- `plugin-only-agent-surface-gating`
- `mcp-skill-vs-prompt-discovery-filtering`

Use these when:

- the generated app grows into an extension host
- MCP server lifecycle becomes dynamic
- remote installs need background reconciliation

## Remote Transport

Primary upstream patterns:

- `shared-system-init-shape-parity`
- `privacy-redacted-repl-bridge-system-init`
- `transport-error-normalization-and-retry-policy`
- `user-invocable-capability-serialization`

Use these when:

- keeping desktop-local and Cloud Run remote modes aligned
- exposing a safe remote capability surface
- normalizing reconnection or stream failures

## Workspace Safety

Primary upstream patterns:

- `declarative-read-only-command-allowlists`
- `required-argument-aware-flag-validation`
- `case-normalized-sensitive-path-guards`
- `dangerous-config-file-protection`
- `canonical-worktree-path-normalization`

Use these when:

- broadening shell command coverage
- allowing write tools inside a workspace
- protecting secrets, dotfiles, and user config

## What Agent Creator Generates By Default

The bundled template already applies these ideas in a simplified standalone form:

- explicit tool registry
- guarded shell execution
- artifact persistence for oversized tool output
- session persistence adapters
- optional subagent stages
- separate desktop-local and remote-web execution paths
