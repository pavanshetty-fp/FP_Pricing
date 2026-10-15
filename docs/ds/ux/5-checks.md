# UX · Checks

Verifiable assertions derived from [`2-rules.md`](2-rules.md). Part of the
[`00-meta/conformance.md`](../00-meta/conformance.md) ship-gate.

- [ ] Screen is in the AppShell: one global top bar (Tier-0) + a compact content header (breadcrumb-as-title, no divider); no page-owned/duplicate top-bar. (L1/L2)
- [ ] Content zones in order: header → toolbar → summary → data. (L4)
- [ ] Header units earn their place — breadcrumb only if nested, tabs only for real facets, toolbar only if the data needs it; no placeholder units. (L5)
- [ ] Tabs are facets of one dataset, not navigation between pages. (L5)
- [ ] Composition nests in levels; elevation steps once per level. (H1/H2)
- [ ] One primary group / one primary action per view. (H3)
- [ ] Dense rows are fixed ordered slots, not crammed elements. (H4)
- [ ] Related units grouped by proximity; intra-group gap < inter-group gap.
- [ ] Every side sheet with an editable field autosaves, shows the draft chip, and has no Save / Update / Cancel. (S1)
- [ ] The sheet's footer primary is the next act, labelled as an act. (S2)
- [ ] Every optional picker has its empty choice first ("No asset", "No technician"); required pickers have none. (Forms)
- [ ] A draft record's footer may show *Save as Draft* as the outline secondary left of the commit act; nowhere else is there a Save. (Forms)
- [ ] A blocked primary is disabled, with the reason on the press rather than beside it. (S2)
- [ ] A two-column sheet keeps everything editable left and everything derived right, with the 340px rail sticky. (S3)
- [ ] Sheet width follows the content: `form` 600 · `fit` from the tables' columns · `full` only for the intense forms; per step. (S3)
- [ ] Every sheet and nested drawer clamps to `100vw − 56px`. (S3)
- [ ] Every CREATION sheet has no right rail; its width follows the same content rule (no 756 floor).
- [ ] The strip above the footer shows one outstanding item at a time, under a fixed subject, and each item reaches its section. (S4)
