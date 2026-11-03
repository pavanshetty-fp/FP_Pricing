# FPDS — Archive

Designs Pavan built, compared and retired. Each is kept so it can come back
exactly as it was: what it was, why it went, and the commit that restores it.
**Nothing here is in use** — build from the units and templates, never from
this page. Full write-ups are in `docs/archive/` and `docs/ds/ui/archive/`
(each is its own page in the design reference under Archive).

| Date | What | Status today | Restore | Write-up |
|---|---|---|---|---|
| 2026-10-06 | **Step column** — the stepped form's left-hand step list | Off in every module; code kept (`form-steps.tsx`), `stepColumn` per sheet | Remove `stepColumn={false}` | `docs/ds/ui/archive/step-column.md` |
| 2026-10-06 | **Two-layer navigation** — 52px rail + drawer | Kept in code behind `NAV_STYLE` in `UnifiedView.tsx`; the one-panel sidebar is current | Set `NAV_STYLE = "two-layer"` | `app-shell` card |
| 2026-10-25 | **Board V1–V3** — the first board comparison (V4 chosen) | Archived | `git show e389e2e` | `docs/archive/board-versions-2026-10-25.md` |
| 2026-10-27 | **Quoting on the 3PL board** — Quoting lane, quotes unit on cards | Off; the dispatcher enters vendors' details | `git show 60e2b71` | `docs/archive/3pl-board-quoting-2026-10-27.md` |
| 2026-11-02 | **Board V1, V1.1, V2.1, V3** (second comparison), then **V2** | Archived; `BoardV2` (V1 card) is the one board | `git show 3ca7a27`, `8e9ec6c` | `docs/archive/board-versions-2026-11-02.md` |
| 2026-11-02 | **3PL Recurring V1 and V2** | Reachable from Recurring Orders › Archive; V1.1 is current | In the app | UX-127 |
| 2026-11-03 | **Asset 360 log V1/V2 and details V1/V2** | Archived; Log V3 + Details V3 chosen | `git show 9dbd7cc` | `docs/archive/asset-360-versions-2026-11-03.md` |
