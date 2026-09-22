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
