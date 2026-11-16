#!/usr/bin/env node
/*
  CLAUDE CODE GUARD — stops any edit to a locked rule file in
  FP_Pricing (Pavan, 2026-11-16; as FP_Service-Work). Runs before Edit / Write / MultiEdit / NotebookEdit.
  The locked list is the one in scripts/rules-lock.mjs.
*/
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const LOCKED = [
  "docs/ds/",
  "docs/fpds/",
  "docs/context/",
  "docs/apply-design-system.md",
  "docs/unified-view/map.md",
  "docs/unified-view/1-components.md",
  "docs/unified-view/2-layouts.md",
  "docs/unified-view/3-interactions.md",
  "docs/unified-view/evals/",
  "docs/unified-view/service/",
  "docs/unified-view/3pl/",
  "scripts/eval/",
  "scripts/eval.mjs",
  "scripts/rules-lock.mjs",
  "rules.lock.json",
  "CLAUDE.md",
  ".claude/settings.json",
  ".claude/hooks/",
];

let input = "";
try {
  input = readFileSync(0, "utf8");
} catch {
  process.exit(0);
}
let path = "";
try {
  const data = JSON.parse(input);
  path = data?.tool_input?.file_path ?? data?.tool_input?.notebook_path ?? "";
} catch {
  process.exit(0);
}
if (!path) process.exit(0);
const rel = relative(ROOT, resolve(path)).replaceAll("\\", "/");
if (rel.startsWith("..")) process.exit(0);
if (LOCKED.some((l) => (l.endsWith("/") ? rel.startsWith(l) : rel === l))) {
  console.error(
    `BLOCKED: ${rel} is a locked rule file. In FP_Service-Work, design-system and Unified View rules (components, interactions, layout, content, evals) can't be changed — only screens can be tweaked within them. Tell the user which rule their request would change, and suggest they raise it with Pavan.`
  );
  process.exit(2);
}
process.exit(0);
