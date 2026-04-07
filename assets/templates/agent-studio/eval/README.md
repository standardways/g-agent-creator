# Evaluation Harness

This folder contains a minimal benchmark lane inspired by `meta-harness-tbench2-artifact`.

Use it to regression-test the generated agent against a small suite of representative tasks:

```powershell
node scripts/evaluate_agent.mjs
```

Set `AGENT_BACKEND_URL` when the backend is not running on the default local port.
