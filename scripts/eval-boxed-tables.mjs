#!/usr/bin/env node
/*
  EVAL — the boxed table unit.  `docs/ds/ui/2-rules.md` §10f

  The countable half of the layouts segment: every rule below has exactly one
  correct answer, so a script can hold it and nobody has to remember it during
  review. Layer 1 in the eval set's terms — it reports, it never rewrites.

  WHY A SCRIPT AND NOT A CHECKLIST LINE. This shape was got wrong in nine
  places across four sheets before anybody noticed, and each one looked fine
  on its own screen. What catches it is scanning all of them at once.

  Run: npm run eval:boxed-tables
*/

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/* `fileURLToPath`, not `.pathname` — a repo checked out under a path with a
   space in it comes back percent-encoded otherwise, and this one is. */
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCAN = ["prototypes/unified-view", "src/components"];

/** Every .tsx under the scanned roots. */
function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files(full, out);
    else if (name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** The component this line sits in — from its `function` to the next one. */
const enclosing = (lines, i) => {
  let start = 0;
  for (let j = i; j >= 0; j -= 1) {
    if (/^(?:export )?function \w+/.test(lines[j])) { start = j; break; }
  }
  let end = lines.length;
  for (let j = i + 1; j < lines.length; j += 1) {
    if (/^(?:export )?function \w+/.test(lines[j])) { end = j; break; }
  }
  return lines.slice(start, end).join("\n");
};

const findings = [];
const report = (file, line, what, rule) =>
  findings.push({ file: relative(ROOT, file), line, what, rule });

/** A className string on or just above this line, if there is one. */
const nearbyClass = (lines, i, back = 6) => {
  for (let j = i; j >= Math.max(0, i - back); j -= 1) {
    const m = lines[j].match(/className=(?:"([^"]*)"|\{cn\(([^)]*)\))/);
    if (m) return m[1] ?? m[2] ?? "";
  }
  return "";
};

/** A border on every side — the wrapper's own rim, not a single divider. */
const isRim = (cls) =>
  /\bborder\b(?!-[trblxy]\b)(?!-\d)(?!-collapse)/.test(cls) &&
  !/\bborder-(?:t|b|l|r|x|y)\b/.test(cls);

for (const file of SCAN.flatMap((d) => files(join(ROOT, d)))) {
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");

  lines.forEach((line, i) => {
    const n = i + 1;

    /* 1. A TABLE INSIDE A RIM. The box's edge is the table's edge.
          Look from the line ABOVE: the table's own className is not the
          wrapper's, and reading it instead was how this check came up empty
          against a wrapper that plainly had a rim. */
    if (line.includes("<table")) {
      const cls = nearbyClass(lines, i - 1);
      if (isRim(cls) && /rounded/.test(cls)) {
        report(file, n, "table wrapped in its own bordered box", "§10f — the table is flush; the box's edge is its edge");
      }
    }

    /* 2. A FULL-WIDTH ADD BAND. The add hangs off the card instead.
          READ THE STRIP, THEN LOOK FOR THE ADD INSIDE IT — not the other way
          round. Starting from the "Add …" line and searching back found the
          BUTTON's own className every time and never the strip's, which is
          how a live violation sat here unreported. */
    const cls = (line.match(/className="([^"]*)"/) ?? [])[1] ?? "";
    if (/\bborder-t\b/.test(cls) && (/\bw-full\b/.test(cls) || /\bpx-\d/.test(cls))) {
      const inside = lines.slice(i, i + 22).join("\n");
      if (/>\s*Add [a-z]|\bAdd [a-z][a-z ]*<\/|\/>\s*Add [a-z]/.test(inside)) {
        report(file, n, "Add control on a full-width band inside the card", "§10f — it hangs off the bottom-left corner, outside");
      }
    }

    /* 3. AN OUTLINED ADD. It takes the table's header tint instead. */
    if (/rounded-b(?:r)?-md/.test(line) && /border-[rb]\b/.test(line) && /Add|add/.test(src.slice(src.indexOf(line), src.indexOf(line) + 400))) {
      report(file, n, "hanging add drawn with a border rather than a fill", "§10f — filled with the table's header tint");
    }

    /* 4. A TABLE'S EMPTY STATE DRAWN AS A DASHED BOX. Padded text instead.
          Only inside a component that actually renders a table — a dashed box
          around a LIST is a different thing and not this rule's business. */
    if (/border-dashed/.test(line) && /px-4 py-6/.test(line)) {
      if (/<table\b/.test(enclosing(lines, i))) {
        report(file, n, "a table's empty state drawn as a dashed box inside the card", "§10f — an empty table is padded text");
      }
    }
  });

  /* 5. A SECTION WHOSE BODY IS A TABLE BUT IS NOT FLUSH. */
  const sectionOpens = [...src.matchAll(/<SheetSection\b([\s\S]{0,400}?)>/g)];
  for (const m of sectionOpens) {
    const props = m[1];
    if (/\bflush\b/.test(props)) continue;
    /* STOP AT THIS SECTION'S OWN END. A fixed lookahead ran past the close
       and found the NEXT section's table, reporting a section that holds no
       table at all — which is how a check loses the reader's trust faster
       than missing something does. */
    let after = src.slice(m.index + m[0].length, m.index + m[0].length + 4000);
    const ownEnd = after.search(/<\/SheetSection>|<SheetSection\b/);
    if (ownEnd !== -1) after = after.slice(0, ownEnd);
    if (/<table\b|<SheetTable\b|<AttachmentTable\b/.test(after)) {
      const n = src.slice(0, m.index).split("\n").length;
      report(file, n, "SheetSection holds a table but is not `flush`", "§10f — the section goes flush for a table");
    }
  }
}

/* ─────────────────────────────────────────────────────────────── report ── */

if (findings.length === 0) {
  console.log("✓ boxed table unit — no findings (§10f)");
  process.exit(0);
}

console.log(`\n✗ boxed table unit — ${findings.length} finding${findings.length === 1 ? "" : "s"} (§10f)\n`);
for (const f of findings) {
  console.log(`  ${f.file}:${f.line}`);
  console.log(`    ${f.what}`);
  console.log(`    ${f.rule}\n`);
}
process.exit(1);
