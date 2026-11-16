#!/usr/bin/env node
/*
  THE RULES ARE LOCKED IN FP_Pricing (Pavan 2026-11-16; the same
  lock as FP_Service-Work, 2026-09-25).

  Design-system and Unified View rules — components, interactions, layout,
  content, the evals that check them, and this repo's own instructions — are
  owned by Pavan's FP-DS-2026 repo. Here they may be READ, never changed.
  Tweaks to screens are fine; changing a rule is not.

    npm run check:rules            fails if any locked file differs from the lock
    node scripts/rules-lock.mjs --update   (Pavan only) re-seal after he syncs rules

  The same list feeds the Claude Code guard in .claude/hooks/protect-rules.mjs.
*/
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const LOCKED = [
  "docs/ds",
  "docs/fpds",
  "docs/context",
  "docs/apply-design-system.md",
  "docs/unified-view/map.md",
  "docs/unified-view/1-components.md",
  "docs/unified-view/2-layouts.md",
  "docs/unified-view/3-interactions.md",
  "docs/unified-view/evals",
  "docs/unified-view/service",
  "docs/unified-view/3pl",
  "scripts/eval",
  "scripts/eval.mjs",
  "scripts/rules-lock.mjs",
  "CLAUDE.md",
  ".claude/settings.json",
  ".claude/hooks",
];
const LOCK_FILE = join(ROOT, "rules.lock.json");

function files(p) {
  const abs = join(ROOT, p);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return [p];
  return readdirSync(abs).flatMap((f) => files(join(p, f)));
}

const hashes = () =>
  Object.fromEntries(
    LOCKED.flatMap(files)
      .filter((f) => !f.includes("/results/"))
      .sort()
      .map((f) => [f, createHash("sha256").update(readFileSync(join(ROOT, f))).digest("hex").slice(0, 16)])
  );

if (process.argv.includes("--update")) {
  writeFileSync(LOCK_FILE, JSON.stringify(hashes(), null, 2) + "\n");
  console.log(`rules.lock.json sealed (${Object.keys(hashes()).length} files)`);
  process.exit(0);
}

const lock = JSON.parse(readFileSync(LOCK_FILE, "utf8"));
const now = hashes();
const changed = [
  ...Object.keys(now).filter((f) => lock[f] !== now[f]),
  ...Object.keys(lock).filter((f) => !(f in now)),
];
if (changed.length === 0) {
  console.log("Rules unchanged ✓");
  process.exit(0);
}
console.error("RULES CHANGED — not allowed in this repo. Undo these (tweaks to screens are fine; rules are Pavan's):");
for (const f of [...new Set(changed)]) console.error(`  ${relative(ROOT, join(ROOT, f))}`);
process.exit(1);
