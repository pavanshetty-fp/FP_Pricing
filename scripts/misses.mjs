#!/usr/bin/env node
/* `npm run misses` — regenerate docs/fpds/evals/misses.md from misses.json. */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./eval/lib.mjs";
import { render } from "./eval/misses.mjs";
writeFileSync(join(ROOT, "docs/fpds/evals/misses.md"), render() + "\n");
console.log("wrote docs/fpds/evals/misses.md");
