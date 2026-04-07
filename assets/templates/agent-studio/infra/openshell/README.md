# OpenShell Hardening

This generated project can run with the default runtime stack, or with OpenShell as a hardened execution substrate.

## What OpenShell Is Used For

- isolated command execution
- default-deny outbound policy
- stronger separation between control plane and execution plane
- policy-as-code for filesystem, network, inference, and execution rules

## Typical Flow

1. Install OpenShell on the operator machine.
2. Review the generated policy files in `infra/openshell/policies/`.
3. Configure the `openshell` runtime profile in the shell or `apps/core/.local-data/runtime-profiles.json`.
4. Use the generated API or shell surfaces to:
   - check OpenShell status
   - generate/bootstrap policy files
   - apply policy to the sandbox
5. Mark the OpenShell backend as configured, approved, and active before using it for real execution.

## Notes

- The generated agent does not silently fall back to unrestricted local execution when `openshell_hardened` is selected.
- If OpenShell is unavailable, the backend reports a degraded but visible security state.
- The default generated project remains usable without OpenShell, using hardened deny-by-default policy in the native runtime.
