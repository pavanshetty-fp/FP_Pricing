#!/usr/bin/env node
/*
  `npm run eval:boxed-tables` — the one segment, on its own.

  A THIN WRAPPER SINCE 2026-09-22. The check itself lives in
  `scripts/eval/boxed-tables.mjs` so the runner can hold it alongside the
  others; this file stays because §10f and the layouts eval both name this
  command, and a documented command that stops working is worse than one that
  was never written.
*/
import { check, rule } from "./eval/boxed-tables.mjs";

const findings = check();
if (findings.length === 0) {
  console.log(`✓ boxed table unit — no findings (${rule})`);
  process.exit(0);
}
console.log(`\n✗ boxed table unit — ${findings.length} finding${findings.length === 1 ? "" : "s"} (${rule})\n`);
for (const f of findings) {
  console.log(`  ${f.file}:${f.line}`);
  console.log(`    ${f.what}`);
  console.log(`    ${f.rule}\n`);
}
process.exit(1);
