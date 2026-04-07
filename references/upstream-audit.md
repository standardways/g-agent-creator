# `cskill-agents` Audit

Reference repo:
`<local reference clone>/cskill-agents`

## Audit Scope

This skill was built after inspecting the full public distribution repo, including:

- root docs: `README.md`, `LEGAL.md`, `PROVENANCE.md`, `CONTRIBUTING.md`, `NOTICE`, `LICENSE`
- machine-readable catalog: `catalog/skills.json`
- human-readable catalog: `catalog/INDEX.md`
- agent install layouts:
  - `agents/codex/`
  - `agents/claude-code/`
- bundle manifests in `bundles/`
- install helpers in `scripts/`
- canonical public skills in `skills/`

## Verified Repo Facts

- canonical public skills: 108
- curated bundles: 19
- supported install targets: `codex`, `claude-code`
- install approach: copy selected `agents/<agent>/skills/<slug>` folders into the target skill directory

## Install Mechanics

The upstream repo does not ship a runtime. Its install scripts are simple distributors:

- `scripts/install-skill.ps1`
- `scripts/install-skill.sh`
- `scripts/install-bundle.ps1`
- `scripts/install-bundle.sh`

They validate the skill slug, choose a default destination such as `~/.codex/skills`, remove any previous copy of the same slug, and copy the selected skill directory into place.

## Bundle Families

The repo groups skills into these major bundle families:

- `starter`
- `command-surfaces`
- `tool-orchestration`
- `context-management`
- `multi-agent`
- `extensions-mcp`
- `safety-worktrees`
- `remote-bridge`
- `terminal-ui`
- `registry-bootstrap`
- `skill-discovery`
- `output-budgeting`
- `compaction-core`
- `memory-signals`
- `extension-sync`
- `bridge-privacy`
- `agent-lifecycle`
- `fork-integrity`
- `workspace-safety`

## Architecture Categories Present In The Repo

The upstream catalog covers eight practical architecture areas that matter for agent products:

- command surfaces and skill discovery
- tool orchestration and output control
- context management and compaction
- multi-agent execution and lifecycle
- extensions and MCP
- safety and worktrees
- remote and bridge transport
- terminal UI

## Source-Of-Truth Coverage For “Nothing Missed”

When this skill says the repo was audited end to end, the source of truth is:

1. `catalog/skills.json`
   This is the exhaustive machine-readable inventory for all 108 skills.
2. `catalog/INDEX.md`
   This is the exhaustive grouped index and category overview.
3. `bundles/*/bundle.yaml`
   These define the curated bundles and their exact membership.
4. `skills/*/SKILL.md`
   These are the canonical public instructions for each pattern.
5. `agents/codex/skills/*/SKILL.md`
   These show the installable Codex-compatible layout.

## Public-Safety Constraints Adopted By Agent Creator

The upstream repo is explicit about being method-level and public-safe. Agent Creator inherits these constraints:

- do not mirror third-party runtime code verbatim
- do not copy comments, prompts, tests, or assets from reviewed repos
- do not preserve raw internal path mirrors when generic wording works
- use upstream patterns as abstractions, then rewrite them into the generated app

## How Agent Creator Uses The Audit

Agent Creator does not copy the 108 upstream skills into generated projects. Instead it:

- uses the repo as a reference corpus
- maps selected skills to concrete runtime subsystems
- rewrites those patterns into a Flutter + Node + Firebase + GCloud product
- keeps the generated app standalone and runnable
