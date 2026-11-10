# Working agreements — how Pavan works, and the routines

> **Load this when:** at the start of any working session; before replying, before adding UI, before "push it" / "sync it", when Pavan points out a miss. **Not for:** design rules themselves (`design-system.md`) or business facts (the domain docs).
> **Sources:** global `~/.claude/CLAUDE.md`; memory notes `feedback_communication`, `feedback_no_unrequested_ui`, `feedback_push_it`, `feedback_service_repos`, `feedback_miss_patterns`, `feedback_ds_sourcing_rule`, `feedback_ui_rules`, `feedback_uv_source_of_truth`. **Last updated:** 2026-11-08.

## In one paragraph

Pavan is a designer, not an engineer. Replies are short and plain, in Done · Pending · Doubts. Build only what he asked for; anything extra becomes a question. Verify every change in the browser preview before saying it's done. When he points out a miss, log it and, if possible, build a check so it can't come back. "Push it" and "sync it" are fixed routines.

## Replies

- **Three sections, in order: Done · Pending · Doubts.** "Answer" replaces Done when answering a question. Skip a section only when it is empty, and say so in one line. A yes/no or one-line fact needs no headings.
- **Plain language.** No field names, function names, file paths or code in prose unless he has to act on them. For a gap: what happens today → where it breaks (an example) → what I'd do → one question.
- **Questions live in Doubts**, each with a recommended option. Doubts hold only genuine decisions blocking what he asked — no cleanup or wording suggestions he didn't ask for.
- **One point at a time** when walking a change list; he answers a batch, then says "execute". "On hold" = build nothing until he releases it.
- Don't raise cross-module differences (a domain choice); only flag inconsistency inside a module or against a design-system rule.
- Show screens in the browser pane; screenshot files sent to him don't reach him.

## Building

- **No unrequested UI.** No helper text, sub-labels, "Note:" hints, extra badges or read-outs. Allowed text: a STATE ("This partner has not priced the order") or a CONSEQUENCE warning.
- **The code is the source of truth for visuals.** Tokens only, never raw hex; prefer an existing token → a step on an existing ramp → a value derived from two tokens → a new value with its reasoning written beside it. Never read colors or pixels off screenshots. Figma only when he asks.
- **The Unified View is the source of truth** for designs; other modules reuse its units.
- **A new instruction beats an older written rule** — follow it, update the rule, say so.
- **Pick the closest existing pattern** before a generic component.
- **Verify before reporting:** every stage the screen appears in, light AND dark, a blank AND a filled row; grep leftovers after a sweep; `git diff --stat` after a scripted edit.
- **Clip check before reporting any layout change** (2026-11-10, M-047): run `scripts/eval/clip-check.browser.js` in the preview on every screen the change can reach — every module page, every view of the list, folded and open states, open sheets. It lists any control, heading or rule a clipping box cuts; it must return nothing. Also on every "push it".
- **Retired designs** get a dated archive doc (what, why kept, why removed, last commit) — indexed in `docs/fpds/10-archive.md`.

## The misses log

The moment Pavan points out something that should already have been right (or something breaks): add an entry to `docs/fpds/evals/misses.json` (next M-id, date, title, where, foundBy, pattern, why, check), build the guard in `scripts/eval/guards.mjs` when it can be scripted, run `npm run misses` and `npm run eval`. Goal: the weekly count falls to 0.

## "Push it"

Run without asking, then report:

1. Update docs where the session's decisions live (design-system docs, Unified View docs, module READMEs, `docs/context/` when domain facts changed).
2. Clip check (`scripts/eval/clip-check.browser.js`) across every module page in the preview — must be clean. Then `node scripts/fpds/build.mjs` · `bash docs/ds/build-bundle.sh` · `npm run misses`.
3. Checks: `npx tsc -p tsconfig.app.json --noEmit` · `npm run eval` (baseline 7 findings; revert the dated results file if only its commit hash changed) · eslint on changed files.
4. Builds: `npm run build:unified`, `build:single`, `build:portal`, `build:reference`; copy `dist-unified/index.html` → `../FP-DS-2026-unified-view.html`, `dist-single` → `../FP-DS-2026.html`, `dist-portal` → `../FP-DS-2026-customer-portal.html`, `dist-reference` → `../FP-DS-2026-design-reference.html`; the "Board views - versions.html" copy from the unified build with its title changed.
5. Commit on `main` (end with the Co-Authored-By line) and `git push origin main`.
6. Republish the design reference artifact and send the unified-view HTML.
7. **DocsHub:** add a version entry at the top of `docs/fpds/CHANGELOG.md` (next vX.Y · date · commit · plain bullets), rebuild `build:reference`, commit; then republish the design reference, unified view and portal builds to the same DocsHub links (folder "Design System"; IDs in memory `reference_docshub`).
8. If Service Work files changed, ask in Doubts whether to sync — never sync silently.

## "Sync it" (FP_Service-Work)

Only when he says so: `git switch service-work-handoff && git merge main` → `node scripts/rules-lock.mjs --update` and commit → `npm run build:service` → `git push service service-work-handoff:main` → `bash scripts/bundle-service.sh` → `git switch main`; log the sync in memory. Rules are locked in FP_Service-Work (tweaks only). Customer Portal work never triggers the sync question.
