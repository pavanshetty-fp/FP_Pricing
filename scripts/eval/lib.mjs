/*
  Shared plumbing for the eval checks.

  ONE SHAPE FOR EVERY FINDING, so the runner can sort, count and diff them
  without knowing what any individual check is about. A check is a function
  that returns `Finding[]`; it never prints and it never exits.
*/

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/* `fileURLToPath`, not `.pathname` — a repo checked out under a path with a
   space in it comes back percent-encoded otherwise, and this one is. */
export const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Every file under `dir` matching one of `exts`. */
export function files(dir, exts = [".tsx"], out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files(full, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

/** Every file under each of `roots` (repo-relative). */
export const filesUnder = (roots, exts) =>
  roots.flatMap((d) => files(join(ROOT, d), exts));

export const rel = (file) => relative(ROOT, file);
export const read = (file) => readFileSync(file, "utf8");

/**
 * A finding.
 *
 * `layer` is the eval set's own L1/L2 and it decides what happens next, not
 * how bad it is: **L1 has exactly one correct answer and may be fixed; L2 ends
 * in a decision.** A check that reports L1 for something with two defensible
 * answers is the worst thing a check can do, because it invites a script to
 * make a design decision.
 */
export const finding = (layer, file, line, what, rule) => ({
  layer,
  file: typeof file === "string" && file.startsWith("/") ? rel(file) : file,
  line,
  what,
  rule,
});

/**
 * Walk a file's lines and report on a regex.
 *
 * `skip` takes the whole line and returns true to ignore it — for the comment
 * that QUOTES the thing the rule forbids, which is otherwise the commonest
 * false positive in a codebase that documents itself this heavily.
 */
export function scanLines(file, re, make, skip) {
  const out = [];
  const lines = read(file).split("\n");
  lines.forEach((line, i) => {
    if (skip && skip(line)) return;
    re.lastIndex = 0;
    let m;
    if (re.global) {
      while ((m = re.exec(line)) !== null) out.push(make(m, i + 1, line));
    } else if ((m = re.exec(line)) !== null) {
      out.push(make(m, i + 1, line));
    }
  });
  return out;
}

/**
 * Is this line a comment?
 *
 * A DELIBERATELY BLUNT TEST. It catches `//`, ` *` and a line that opens a
 * block comment, which is every shape the comments in this repo take. It will
 * not catch a forbidden value inside a multi-line comment whose line begins
 * with a word — accepted, because the alternative is parsing TypeScript to
 * enforce a naming rule.
 */
export const isComment = (line) => /^\s*(\/\/|\/\*|\*)/.test(line);

/**
 * The source with every comment blanked out — `//…`, `/* … *\/` and JSX's
 * `{/* … *\/}` — keeping every newline, so a line number read off the result
 * is the line number in the file.
 *
 * WHY. This codebase explains itself in long capitalised comments that quote
 * the very props the parity checks look for ("NOT ON THE BOARD … showGroupBy").
 * A prop-presence check that reads comments reports a prop that is not there.
 * Strings are respected, so a URL's `//` is not taken for a comment.
 */
export function stripComments(src) {
  let out = "";
  let i = 0;
  let q = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (q) {
      out += c;
      if (c === "\\") { out += n ?? ""; i += 2; continue; }
      if (c === q) q = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { q = c; out += c; i += 1; continue; }
    if (c === "/" && n === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end < 0 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
      continue;
    }
    if (c === "/" && n === "/" && src[i - 1] !== ":") {
      const end = src.indexOf("\n", i);
      const stop = end < 0 ? src.length : end;
      out += " ".repeat(stop - i);
      i = stop;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/**
 * Every OPENING tag `<Tag …>` in `src` (pass comment-stripped source), with
 * the props it sets at its top level.
 *
 * `props` is a Map of prop name → raw value text (`true` for a bare flag such
 * as `boardView`). A spread (`{...savedViews}`) is recorded under `"..."`.
 * Nested JSX inside a prop's braces is skipped, so `filters={<ListFilters …/>}`
 * gives ListToolbar a `filters` prop and does not lend it ListFilters' props.
 */
export function openTags(src, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b`, "g");
  let m;
  while ((m = re.exec(src)) !== null) {
    let i = m.index + tag.length + 1;
    let depth = 0;
    let q = null;
    for (; i < src.length; i += 1) {
      const c = src[i];
      if (q) { if (c === "\\") { i += 1; continue; } if (c === q) q = null; continue; }
      if (c === "`" || (depth > 0 && (c === '"' || c === "'")) || (depth === 0 && (c === '"' || c === "'"))) { q = c; continue; }
      if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      else if (depth === 0 && c === ">") break;
    }
    const text = src.slice(m.index, i + 1);
    const props = new Map();
    let d = 0;
    let j = tag.length + 1;
    while (j < text.length) {
      const c = text[j];
      if (c === "{") {
        if (d === 0 && text.startsWith("{...", j)) props.set("...", true);
        d += 1; j += 1; continue;
      }
      if (c === "}") { d -= 1; j += 1; continue; }
      if (d === 0) {
        const mm = /^\s+([a-zA-Z][\w-]*)(=)?/.exec(text.slice(j));
        if (mm && /\s/.test(c)) {
          const name = mm[1];
          j += mm[0].length;
          if (!mm[2]) { props.set(name, true); continue; }
          /* read the value: "…" or {…} */
          if (text[j] === '"') {
            const end = text.indexOf('"', j + 1);
            props.set(name, text.slice(j + 1, end));
            j = end + 1;
          } else if (text[j] === "{") {
            let dd = 0; let k = j;
            for (; k < text.length; k += 1) {
              if (text[k] === "{") dd += 1;
              else if (text[k] === "}") { dd -= 1; if (dd === 0) break; }
            }
            props.set(name, text.slice(j, k + 1));
            j = k + 1;
          }
          continue;
        }
      }
      j += 1;
    }
    out.push({ index: m.index, line: src.slice(0, m.index).split("\n").length, text, props });
  }
  return out;
}

/** The 1-based line of a character offset. */
export const lineAt = (src, index) => src.slice(0, index).split("\n").length;

/** Which module a file belongs to, for the parity report. */
export function moduleOf(file) {
  const f = rel(file);
  if (/\/threepl\//.test(f)) return "3PL";
  if (/\/service\//.test(f)) return "Service Work";
  if (/Dashboard/.test(f)) return "Dashboards";
  if (/(Sales|Quote|OrderSheet|AssetOrder|Customer|Asset|ConfiguredForm|ProductTable|salesOrders|quotes)/.test(f)) return "Sales";
  return "Shared";
}
