---
name: g-agent-creator
description: Create fully functional standalone digital worker products that use a Flutter desktop/web shell, a Node/TypeScript agent core, Firebase Auth/Firestore/Storage, and GCloud Cloud Run. Use when Codex needs to create, scaffold, customize, or extend a production-ready autonomous computer agent that can handle coding, research, writing, operations, analysis, and general knowledge work end to end for a Flutter + Firebase + GCloud stack.
---

# G-Agent Creator

Build real digital workers, not toy demos. This skill generates a runnable monorepo from the bundled template, then adapts it to the requested product shape while staying inside the Flutter + Firebase + GCloud stack.

## Workflow

1. Confirm the requested agent shape.
   Default to:
   - Flutter shell for desktop + web
   - Node/TypeScript core runtime
   - Firebase Auth, Firestore, and Storage
   - Cloud Run for hosted remote execution
   - optional planner/executor/reviewer/researcher/operator subagents

2. Read the bundled references before generating:
   - `references/upstream-audit.md` for the end-to-end `cskill-agents` audit
   - `references/architecture-map.md` for which upstream patterns map to which subsystem
   - `references/flutter-firebase-gcloud.md` for stack-specific architecture defaults
   - `references/harness-blueprint-deep-dive.md` for the broader local harness corpus and the capability set it implies

3. Generate the agent project with:
   - `python scripts/create_agent.py "<agent name>"`
   Optional flags:
   - `--output-root "<path>"`
   - `--firebase-project-id "<project-id>"`
   - `--cloud-run-url "https://..."`
   - `--backend-port 4318`
   - `--force`

4. After generation, adapt the product instead of rewriting from scratch.
   Focus on:
   - shell UX and workflow
   - tool surface and safety policy
   - built-in agent roles in `agents/`
   - local runtime plugins in `plugins/`
   - local project skills in `skills/`
   - hook lifecycle in the core runtime
   - self-evolution behavior and learned skills in `skills/learned/`
   - environment bootstrap for fewer wasted early turns
   - provider setup
   - session/firestore schema refinements
   - deployment details

5. Validate the generated app.
   Minimum checks:
   - `npm install` in repo root
   - `npm run build:core`
   - `flutter pub get` in `apps/shell`
   - `flutter analyze`
   - run the local core, then confirm the shell can reach `/health`

## Default Product Shape

Use this unless the user asks for a different shape:

- Standalone agent app, not a Codex plugin
- General digital worker, not only a coding assistant
- Flutter shell in `apps/shell`
- Node runtime in `apps/core`
- Local desktop mode launches a local core process
- Web mode talks to a Cloud Run-hosted core
- Firebase Auth for users
- Firestore for sessions and messages
- Storage for large artifacts and persisted tool output
- OpenAI-first with OpenAI-compatible endpoint support
- Optional subagents for planning, execution, and review
- Additional built-in specialist roles for research, operations, and writing
- File-based agent catalog in `agents/`
- Local plugin runtime with dynamic tools and lifecycle hooks
- Local project skills folder for future skill-aware flows
- Self-evolving lane that can distill sessions into learned local skills
- Environment bootstrap snapshots inspired by benchmark harnesses

## What To Customize

Customize the generated app by product need rather than replacing the architecture:

- Add or remove tools in `apps/core/src/index.ts`
- Tighten safety rules before broadening shell access
- Tune the shell layout in `apps/shell/lib/main.dart`
- Expand auth providers only if the user explicitly needs them
- Add MCP or plugin surfaces after the base app works

## Guardrails

- Stay inside Flutter, Firebase, and GCloud unless the user explicitly overrides the stack.
- Prefer extending the bundled template over inventing a new project layout.
- Keep local and remote execution paths behaviorally aligned.
- Preserve the workspace-safety defaults unless the user asks for more permissive behavior.
- Do not copy upstream `cskill-agents` files into the generated app verbatim; use the architecture map and rewrite patterns into the new codebase.

## Resources

### `scripts/`

- `create_agent.py`: copies the bundled template repo, applies naming/config replacements, and writes a runnable agent project

### `references/`

- `upstream-audit.md`: full repo audit scope and source-of-truth files
- `architecture-map.md`: pattern-to-subsystem mapping used when adapting or extending the generated app
- `flutter-firebase-gcloud.md`: stack-specific guidance for local desktop mode and hosted web mode
- `harness-blueprint-deep-dive.md`: deep dive of the local harness corpus and the merged capability target

### `assets/`

- `templates/agent-studio/`: the bundled production template repo that becomes the generated agent app
