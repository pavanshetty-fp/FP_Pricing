/*
  FPDS — READING THE SPEC CARDS.

  The docs are the source of truth: every atom, molecule, unit and template is a
  card in `docs/fpds/`, and its id line says what it is and where its code is:

      `id: unit.view-bar` · `layer: unit` · `code: a.tsx, b.tsx` · `registry: fpds-view-bar`

  This module finds every card, its title, id line, sections and "Use when"
  text, so the register, the registry, the checks and the reference page all
  read the same thing.
*/

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const DOCS = join(ROOT, "docs/fpds");

/** The sections every card has, in this order (`_spec-card-template.md`). */
export const SECTIONS = [
  "Purpose",
  "Use when / Don't use when",
  "Anatomy",
  "Look",
  "States",
  "Interactions",
  "Outcomes",
  "Data contract",
  "Rules",
  "Do / Don't",
  "Checks",
  "Reference",
];

function mdFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) mdFiles(full, out);
    else if (name.endsWith(".md") && !name.startsWith("_") && name !== "FPDS.md" && !full.includes("/install/")) out.push(full);
  }
  return out;
}

const ID_LINE = /`id:\s*([a-z]+\.[a-z0-9-]+)`\s*·\s*`layer:\s*([a-z]+)`\s*·\s*`code:\s*([^`]*)`\s*·\s*`registry:\s*([a-z0-9-]+)`/;

/**
 * Every card in the docs. A card is a heading followed (within three lines)
 * by an id line; its sections are the headings one level below it.
 */
export function readCards() {
  const cards = [];
  for (const file of mdFiles(DOCS)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      const m = line.match(ID_LINE);
      if (!m) return;
      /* The title is the nearest heading above the id line. */
      let t = i - 1;
      while (t >= 0 && !/^#{1,3}\s/.test(lines[t])) t--;
      if (t < 0) return;
      const level = lines[t].match(/^(#+)/)[1].length;
      const title = lines[t].replace(/^#+\s*/, "").trim();
      /* Its body runs to the next heading at its own level or above. */
      let end = i + 1;
      while (end < lines.length && !new RegExp(`^#{1,${level}}\\s`).test(lines[end])) end++;
      const body = lines.slice(i + 1, end);
      const sections = [];
      const text = {};
      let cur = null;
      for (const l of body) {
        const h = l.match(new RegExp(`^#{${level + 1}}\\s+(.*)`));
        if (h) {
          cur = h[1].trim();
          sections.push(cur);
          text[cur] = "";
        } else if (cur) text[cur] += l + "\n";
      }
      cards.push({
        id: m[1],
        layer: m[2],
        /* Notes in brackets — "(BoardWithBar, cardFields)" — are for people. */
        code: m[3]
          .replace(/\([^)]*\)/g, "")
          .split(/[,+·]/)
          .map((s) => s.trim())
          .filter(Boolean),
        registry: m[4],
        title,
        file: relative(ROOT, file),
        line: i + 1,
        sections,
        text,
      });
    });
  }
  return cards;
}
