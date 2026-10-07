/*
  CHECK — dashboards, navigation and toasts match 3PL.
  `docs/unified-view/evals/6-3pl-guardrails.md` G49, G50, G52.
  Eval segment `6-3pl-guardrails`.

  WHAT IT ENFORCES, L1:
    G50 a module dashboard is built from DashboardParts (Panel · StatTile ·
        BarColumns · BarList · DASHBOARD_GROUND) — one dashboard vocabulary;
    G52 a module with a Dashboard keeps it FIRST in its rail and opens on its
        Orders page (`MODULE_LANDING`), as 3PL and Sales do.

  WHAT IT SURFACES, L2:
    G49 a toast with a description. The 2026-10-07 brief says toasts are
        title-only; `docs/unified-view/3-interactions.md` §2 still says
        "Title = the act, description = the consequence". Two documents
        disagree, so this is a decision for Pavan, not a fix for a script —
        every hit is listed so the decision can be taken with the count in
        front of it.
*/

import { join } from "node:path";
import { ROOT, filesUnder, read, rel, finding, stripComments } from "./lib.mjs";

export const name = "parity-shell";
export const segment = "6-3pl-guardrails";
export const rule = "docs/unified-view/evals/6-3pl-guardrails.md — dashboards · navigation · feedback";

const SCAN = ["prototypes/unified-view"];
const SKIP = /\/(TechnicianApp|TechnicianMobile|TechnicianHome|TechnicianJob|DashboardParts)\.tsx$/;

export function check() {
  const out = [];
  const add = (layer, file, line, what, id) =>
    out.push(finding(layer, typeof file === "string" && file.startsWith("prototypes") ? file : rel(file), line, what, `${id} · ${rule}`));

  for (const file of filesUnder(SCAN, [".tsx"])) {
    if (SKIP.test(file)) continue;
    const src = stripComments(read(file));
    const lines = src.split("\n");

    /* ── G50 · one dashboard vocabulary ──────────────────────────────── */
    if (/Dashboard\.tsx$/.test(file) && !/from\s+["'][./]+(?:\.\.\/)?DashboardParts["']/.test(src)) {
      add("L1", file, 1, "a module dashboard not built from DashboardParts", "G50");
    }

    /* ── G49 · a toast's second line warns of a consequence (Pavan,
       2026-10-07) — otherwise there is none. A script cannot read meaning,
       so this flags only the two shapes that are never a consequence: the
       line REPEATS a value (a bare name, number or field), or it is one of
       the stock restatements ("Awaiting quotation.", "The filtered list…").
       Anything else with a second line is left to the reader (L2 list in
       6-3pl-guardrails.md). */
    const FILLER = /(The filtered list|Awaiting quotation|Added to the|has been created|on the dispatch board|No fields were changed|fields updated|waiting to be assigned)/;
    lines.forEach((line, i) => {
      if (!/\btoast(?:\.\w+)?\(/.test(line)) return;
      const call = lines.slice(i, i + 12).join("\n");
      const end = call.indexOf(");");
      const body = end >= 0 ? call.slice(0, end) : call;
      const m = body.match(/\bdescription\s*:\s*([^\n]*)/);
      if (!m) return;
      const value = m[1].replace(/,\s*$/, "").trim();
      /* A BARE VALUE only if nothing continues it on the next line — a
         `cond ? "…" : "…"` split across lines is a choice of messages. */
      const after = body.slice(body.indexOf(m[0]) + m[0].length).trimStart();
      const continued = /^(\?|:|\+|&&|\|\|)/.test(after);
      const repeats =
        /^[\w.?]+$/.test(value) && !continued && !/^said\.description$/.test(value);
      if (repeats || FILLER.test(value)) {
        add("L1", file, i + 1,
          `toast second line ${repeats ? "repeats a value" : "restates the obvious"} — keep a second line only for a consequence`,
          "G49");
      }
    });
  }

  /* ── G52 · Dashboard first, module opens on Orders ─────────────────── */
  const uvPath = join(ROOT, "prototypes/unified-view/UnifiedView.tsx");
  const uv = stripComments(read(uvPath));
  const uvLines = uv.split("\n");
  const landing = uv.match(/MODULE_LANDING[^=]*=\s*\{([^}]*)\}/)?.[1] ?? "";
  const navs = [...uv.matchAll(/const (\w+_NAV): NavItem\[\] = \[([\s\S]*?)\n\];/g)];
  const modOf = [...uv.matchAll(/^\s*"?([\w-]+)"?:\s*(\w+_NAV),/gm)].map((m) => [m[1], m[2]]);
  for (const [mod, navName] of modOf) {
    const nav = navs.find((n) => n[1] === navName);
    if (!nav) continue;
    const keys = [...nav[2].matchAll(/key:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)].map((m) => ({ key: m[1], label: m[2] }));
    const navLine = uvLines.findIndex((l) => l.includes(`const ${navName}`)) + 1;
    const dash = keys.findIndex((k) => /dashboard/i.test(k.label));
    if (dash > 0) {
      add("L1", "prototypes/unified-view/UnifiedView.tsx", navLine, `${mod}: Dashboard is not first in the rail`, "G52");
    }
    const orders = keys.find((k) => /orders?$/i.test(k.label));
    if (dash === 0 && orders && !new RegExp(`["']?${mod}["']?\\s*:\\s*["']${orders.key}["']`).test(landing)) {
      add("L1", "prototypes/unified-view/UnifiedView.tsx", navLine, `${mod}: has a Dashboard but does not open on "${orders.label}" (MODULE_LANDING)`, "G52");
    }
  }
  return out;
}
