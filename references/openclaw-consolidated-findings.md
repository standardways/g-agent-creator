# OpenClaw Consolidated Findings

This note consolidates the high-value findings from the OpenClaw docs audit and the remote source audit.

## Strongest Patterns

- Gateway-first control plane with explicit handshake and message envelopes
- Manifest-first plugin system with required config schema
- Plugin slots for exclusive capability owners like `memory` and `contextEngine`
- Context engine as a first-class runtime contract
- Session tools and cross-session orchestration with scoped visibility
- Unified task registry with owner, flow, delivery, and cancellation policy
- Fail-closed install and config validation
- Doctor diagnostics driven by plugin contracts
- Prompt assembly with prompt modes, stable prefixes, and bootstrap truncation
- Delivery policy and history normalization distinct from raw event logs

## Gaps It Exposed In Agent Creator

Before the latest integration pass, Agent Creator lacked or under-modeled:

- a pluggable context engine
- manifest-first plugin validation
- plugin diagnostics/doctor reporting
- explicit runtime security and dangerous-config auditing
- stronger prompt assembly and truncation control

## What Agent Creator Now Owns

The current template now includes:

- a selected context engine with config and health visibility
- manifest-first local runtime plugin validation with required `configSchema`
- doctor diagnostics covering plugin, runtime, security, and context-engine findings
- stricter security policy and OpenShell hardening lanes

## Still Useful Future Ideas

These remain good future targets if more parity is wanted:

- session visibility scopes (`self`, `tree`, `agent`, `all`)
- unified task registry replacing separate jobs/todos/workflows views
- richer delivery normalization and chunking
- schema-driven settings UI instead of multiple hand-built forms
- plugin install security scanning for imported third-party plugins
