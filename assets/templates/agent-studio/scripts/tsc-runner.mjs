import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let tscPath = null;
try {
  tscPath = require.resolve("typescript/bin/tsc");
} catch {
  tscPath = null;
}

if (!tscPath) {
  console.error("Could not locate TypeScript compiler from generated workspace.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [tscPath, ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
