/*
  CHECK — record sheets match 3PL.  `docs/unified-view/evals/6-3pl-guardrails.md`
  G21–G34 (record sheets). Eval segment `6-3pl-guardrails`.

  WHY A SCRIPT. The 3PL order sheet (`BrokerOrderSheet`) is the reference:
  create-then-autosave with the draft chip, no Save / Update / Cancel, a
  footer primary that is the next act and says why when it is dead, the ⋯
  menu for acts on the record, no step column, the 756 creation floor for the
  whole visit, and the shared SummaryCard + ActivityCard in the rail. Every one
  of those is a prop on `RecordSheet` or a shared component — so a sheet that
  drifts is a sheet that left a prop off or built its own block, and that is
  countable.

  WHAT IT ENFORCES, all L1:
    G22 a sheet that keeps a draft (useDraftSaveState) shows it (DraftStatusChip);
    G23 no Cancel (showCancel={false}) and no Save / Save Changes / Update
        button in a sheet's footer — "Save as Draft" is the one exception;
    G25 a first-level sheet whose primary can be dead (canSubmit) replaces the
        default primary — the default is `disabled`, which cannot say why;
    G27 no step column (stepColumn);
    G28 the retired `fill` prop (756 creation floor, gone 2026-10-15) is not passed;
    G29 a summary in the rail is SheetCards' SummaryCard, not a RailCard;
    G30 a record's history is SheetCards' ActivityCard, not a local list.

  WHAT IT DOES NOT DO. Whether a sheet needs a rail, a ⋯ menu, a discard
  confirm, or which words its primary should use — those are readings (L2),
  written up in the parity results file.
*/

import { filesUnder, read, rel, finding, stripComments, openTags } from "./lib.mjs";

export const name = "parity-sheets";
export const segment = "6-3pl-guardrails";
export const rule = "docs/unified-view/evals/6-3pl-guardrails.md — record sheets";

const SCAN = ["prototypes/unified-view"];
const SKIP = /\/(TechnicianApp|TechnicianMobile|TechnicianHome|TechnicianJob|RecordSheet|SheetCards)\.tsx$/;

export function check() {
  const out = [];
  const add = (file, line, what, id) =>
    out.push(finding("L1", rel(file), line, what, `${id} · ${rule}`));

  for (const file of filesUnder(SCAN, [".tsx"])) {
    if (SKIP.test(file)) continue;
    const raw = read(file);
    const src = stripComments(raw);
    const lines = src.split("\n");
    const sheets = openTags(src, "RecordSheet");
    const isSheetFile = sheets.length > 0 || /<SheetContent\b/.test(src);
    if (!isSheetFile) continue;

    /* ── G22 · a kept draft says so ──────────────────────────────────── */
    const draftAt = lines.findIndex((l) => /useDraftSaveState\s*\(/.test(l));
    if (draftAt >= 0 && !/<DraftStatusChip\b/.test(src)) {
      add(file, draftAt + 1, "the sheet keeps a draft but never shows the draft chip (DraftStatusChip)", "G22");
    }

    for (const t of sheets) {
      const p = t.props;
      const level2 = String(p.get("level") ?? "") === "{2}";

      /* ── G23 · Cancel comes off ──────────────────────────────────── */
      if (String(p.get("showCancel") ?? "") !== "{false}") {
        add(file, t.line, "footer still shows Cancel — pass showCancel={false}; Close is the exit", "G23");
      }

      /* ── G25 · a dead primary must be able to say why ───────────── */
      if (!level2 && p.has("canSubmit") && !p.has("footerPrimary") && !p.has("pending")) {
        add(file, t.line,
          "first-level sheet uses the default primary with canSubmit — it renders `disabled` and cannot say why; pass `pending` (the default primary then stays pressable and raises PendingStrip) or a footerPrimary that does the same",
          "G25");
      }

      /* ── G27 · no step column ────────────────────────────────────── */
      if (p.has("stepColumn") && String(p.get("stepColumn")) !== "{false}") {
        add(file, t.line, "step column switched on (stepColumn) — off in every module since 2026-10-07", "G27");
      }

      /* ── G28 · the 756 floor is gone; width follows content ──────── */
      if (p.has("fill")) {
        add(file, t.line, "`fill` passed — the 756 creation floor is gone (2026-10-15); width follows content", "G28");
      }
    }

    /* ── G23 · no Save / Update / Cancel button in a sheet footer ─────── */
    let inDialog = 0;
    lines.forEach((line, i) => {
      inDialog += (line.match(/<(?:Alert)?DialogContent\b/g) ?? []).length;
      inDialog -= (line.match(/<\/(?:Alert)?DialogContent>/g) ?? []).length;
      const label = line.trim();
      if (!/^(?:Save|Save [Cc]hanges|Update|Cancel)$/.test(label)) return;
      /* a confirm dialog's own answer is not a sheet footer */
      if (inDialog > 0) return;
      let open = -1;
      for (let j = i - 1; j >= Math.max(0, i - 10); j -= 1) {
        if (/<\/Button>/.test(lines[j])) break;
        if (/<Button\b/.test(lines[j])) { open = j; break; }
      }
      if (open < 0) return;
      add(file, i + 1, `sheet footer button reads "${label}" — the sheet autosaves; the primary is the next act (only "Save as Draft" may say Save)`, "G23");
    });

    /* ── G29 / G30 · shared summary and activity cards ───────────────── */
    lines.forEach((line, i) => {
      const rc = line.match(/<RailCard\b[^>]*title="([^"]+)"/);
      if (rc && /summary/i.test(rc[1])) {
        add(file, i + 1, `a bespoke "${rc[1]}" rail card — use SheetCards' SummaryCard`, "G29");
      }
      if (rc && /^activity$/i.test(rc[1])) {
        add(file, i + 1, "a bespoke Activity rail card — use SheetCards' ActivityCard", "G30");
      }
      if (/<ActivitySection\b/.test(line)) {
        add(file, i + 1, "history drawn with the old ActivitySection — use SheetCards' ActivityCard", "G30");
      }
    });
  }
  return out;
}
