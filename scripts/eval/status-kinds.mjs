/*
  CHECK — a status is coloured by its KIND.  `docs/ds/ui/2-rules.md` §10b.
  Eval segment `1-components.md`.

  WHY A SCRIPT. The rule was set on the service board on 2026-09-23 and the
  same afternoon an audit found "Assigned" green in sales, amber in 3PL and
  blue in service — three authors each reaching for a swatch. Every one of
  those maps looked reasonable in its own file. What catches it is refusing
  the swatch altogether.

  WHAT IT ENFORCES, all L1 — there is one correct answer to each:
    · no `StatusChip` in Unified View names a DS tone directly
      (`tone="processing"`, `? "failed" :`) — it says a kind, through
      `kindTone()` or a map built by `statusTones()`;
    · no map is typed in tones (`Record<X, StatusTone>` with a literal body,
      or the `"success" | "processing" | …` union) outside `statusKind.ts`.

  WHAT IT DOES NOT DO. Whether a status is REALLY `caution` rather than
  `info` is a reading of what the reader has to do next — L2, answered in
  `docs/unified-view/1-components.md` §Status kinds, never by this script.

  The technician's mobile app is out of scope until the web app is done
  (Pavan, 2026-09-23), so its files are skipped, not passed.
*/

import { filesUnder, read, rel, finding, isComment } from "./lib.mjs";

export const name = "status-kinds";
export const segment = "1-components";
export const rule = "docs/ds/ui/2-rules.md §10b — a status is coloured by its kind";

const SCAN = ["prototypes/unified-view"];
const SKIP = /(statusKind\.ts|TechnicianApp\.tsx|TechnicianMobile\.tsx)$/;
const TONES = '"(?:processing|failed|success)"';

const PATTERNS = [
  {
    re: new RegExp(`tone=(?:${TONES}|\\{[^}]*\\?\\s*${TONES})`),
    what: "a chip names a DS tone — say the kind: kindTone(\"caution\")",
  },
  {
    re: /Record<[^>]*,\s*StatusTone>\s*=\s*\{/,
    what: "a status map typed in tones — declare kinds with statusTones({...})",
  },
  {
    re: /"success"\s*\|\s*"processing"/,
    what: "the tone union spelled out — the type is StatusKind",
  },
];

export function check() {
  const out = [];
  for (const file of filesUnder(SCAN, [".ts", ".tsx"])) {
    if (SKIP.test(file)) continue;
    const lines = read(file).split("\n");
    lines.forEach((line, i) => {
      if (isComment(line)) return;
      for (const p of PATTERNS) {
        if (p.re.test(line)) out.push(finding("L1", rel(file), i + 1, p.what, rule));
      }
    });
  }
  return out;
}
