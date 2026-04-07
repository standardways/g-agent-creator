# Agent Harness Blueprint Deep Dive

This reference summarizes the harnesses under:

`<local agent-harness workspace>`

The goal is not to mirror their source trees. The goal is to identify the strongest reusable product ideas and make `G-Agent Creator` produce a standalone app that includes those ideas by default.

## Harness Inventory

### `codex` and `openai-codex`

Observed shape:

- Rust app server plus CLI surface
- dynamic tools
- plugin install/list/read/uninstall
- skill listing and skill config writes
- MCP OAuth and MCP server status tracking
- structured JSON-RPC protocol
- dynamic tool call notifications
- auth transport and app-server client/server split

What Agent Creator should absorb:

- explicit protocol surface between shell and core
- dynamic tool registry
- MCP server status and approval workflow
- plugin lifecycle as a first-class subsystem
- skill/config mutation endpoints

### `openclaw` and `openclaw-main`

Observed shape:

- personal assistant gateway, not only a coding CLI
- very large plugin/extension runtime
- strong gateway/session/security model
- desktop and mobile clients
- plugin SDK and protocol generation
- deep testing surface around channels, gateway, plugins, startup, and performance
- agent workspace, event stores, approvals, device/gateway auth

What Agent Creator should absorb:

- local and remote control-plane split
- event store and session status model
- gateway-safe transport contracts
- plugin/extension architecture
- approvals and trust prompts
- workspace-aware shell UX

### `hermes-agent` and `hermes-agent-src`

Observed shape:

- self-improving agent
- skills hub, optional skills, skills install/search/view flows
- plugin system with hooks and tool registration
- multi-platform gateway
- memory and session search
- cron/automation
- model routing and provider flexibility
- subagent/delegation tooling

What Agent Creator should absorb:

- local plugin hooks around tool and model calls
- built-in skill surface and future skill hub growth path
- memory/session persistence as a product feature, not an afterthought
- model/provider abstraction
- optional automations and delegation lanes

### `openclaude`

Observed shape:

- Claude-style terminal product with provider shims
- skills UI
- bridge UI
- MCP approval dialogs
- memory usage indicator
- session command surface

What Agent Creator should absorb:

- approval and bridge UX patterns
- skills browser/launcher concepts
- memory pressure visibility
- provider-agnostic backend wiring

### `oh-my-openagent`

Observed shape:

- plugin on top of OpenCode/OpenAgent-style runtime
- strong emphasis on orchestration, parallel work, background agents, and LSP/AST tools
- packaging for multiple target platforms

What Agent Creator should absorb:

- multi-agent orchestration lane
- capability-driven add-ons
- future room for LSP/AST tool packs

### `claw-code-parity`

Observed shape:

- Python and Rust clean-room parity effort
- explicit session, transcript, tool pool, hooks, MCP, plugins
- subsystem reference snapshots

What Agent Creator should absorb:

- transcript and session structure
- tool pool separation
- hooks and plugin seams
- subsystem snapshot style for architecture clarity

### `opencode`

Observed shape:

- app, desktop, console, SDK, and infra split
- strong session/workspace UX
- provider/model selection surfaces
- MCP selection UI
- context metrics and session caching
- workspace picker and session panel flows

What Agent Creator should absorb:

- multi-workspace UX
- session-centric shell architecture
- provider/model management UI
- context visibility surfaces

### `meta-harness-tbench2-artifact`

Observed shape:

- benchmark-oriented Python scaffold

What Agent Creator should absorb:

- reproducible evaluation lane
- simple benchmark entrypoint for regression testing

## Capability Set Agent Creator Should Own

After reviewing the harness corpus, the generated app should own these out of the box:

- standalone shell + core split
- workspace picker and multi-session UX
- built-in planner/executor/reviewer agent catalog
- local plugin system
- hook system around tool and model calls
- dynamic tool registry
- provider and model config UI
- Firestore-backed sessions and transcripts
- optional no-auth local mode
- remote/web backend mode
- approvals and safety boundaries
- MCP-ready architecture
- room for future automation and gateway channels
- self-evolution via learned local skills
- environment bootstrap to reduce wasted setup turns
- evaluation lane for regression testing generated agents
- prompt-compaction and token-discipline support
- approval and event-timeline surfaces
- richer plugin marketplace and config-import growth path

## Second-Wave Capability Gaps Found During Deeper Review

These are the remaining families repeatedly reinforced by the harness corpus:

- prompt caching and compaction discipline
- session prefetch and session trimming policies
- external agent-config detect/import flows
- plugin marketplace lifecycle and load-error handling
- explicit approval UX and approval response handling
- richer autonomous background task orchestration

Some of these are now partially integrated into Agent Creator, while others remain future growth areas.
- richer built-in tool/plugin packs for non-coding digital work

## What Stays Out Of Scope For The Default Template

These ideas belong in future packs, not the default generated app:

- dozens of messaging channels
- full mobile gateway stack
- every provider integration
- full marketplace/reconciliation engine
- complete self-improvement loop

The default template should be the smallest coherent app that still leaves obvious extension seams for those features.
