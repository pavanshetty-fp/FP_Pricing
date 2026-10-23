# FPDS — the build protocol

Every builder, person or AI (Lovable, Cursor, Claude, anything else), follows these
steps in order for every screen or change. The protocol is what makes the output come
out the same as the Unified View and the Customer Portal; skipping a step is how
screens drift.

## The five checks before anything is drawn

**L1 · Classify the request.** Write down, in one line each:
- the **page type** — list · board · map · record sheet (create / edit / view) ·
  dashboard · settings · directory record · portal page · something else;
- the **module** — 3PL · Sales · Service Work · Pricing · Lease · Customer Portal · new;
- the **audience** — tenant (every module except the Customer Portal) or customer
  (Customer Portal only — UX rules, Audience);
- the **record** it is about (order, customer, asset, part, invoice…), and whether that
  record already appears anywhere (`06-pages.md`).

**L2 · Match a template.** Look the page type up in `05-templates.md` and
`register.json` (`layer: "template"`, `contexts`). A list of anything is the
**List page**; a create/edit of anything is the **Record sheet** — even if the record is
new to the product. A template matches when its *Use when* describes the job, not when
the data is the same.

**L3 · Match every region to a unit.** Walk the template's regions (view row, toolbar,
chip shelf, view bar, table/board/map, sheet sections, rail…) and name the unit for
each from `units/`. Read each unit's *Use when / Don't use when* — a unit that says
"don't use when" for this job does not match.

**L4 · Try to compose.** For anything still unmatched, try to build it from existing
units, molecules and atoms **with their documented options only**: new columns, new
facets, new card fields, new statuses mapped to the existing kinds, new sections in a
record sheet, new rows in a lines table, a new dashboard tile — all of these are
*configuration*, not new design, and are allowed. Composition is not allowed to add a
new look (a color, a size, a shape, a layout) or a new behavior (a gesture, a state,
a motion) that no card describes.

**L5 · Check the rules.** Read the composed result against `07-ux-rules.md` and
`08-interaction-rules.md`. If it would break a rule, it is not a match.

Only a region that fails **all five** checks is a gap. Everything else gets built.

## When something is a gap

Build every region that passed. For the region that did not, do **not** invent a
design. Put this message where the region would be (and in the reply), word for word,
with the four fields filled in:

> **This unit needs a tweak in design/new design. Please contact the owner to get a
> design for this gap, pavanshetty@fleetpanda.com.**
>
> - **Use case:** <what the user is trying to do, in their words>
> - **Missing component:** <the region / unit / behavior that has no design>
> - **Closest existing:** <the nearest unit or template, and why it does not fit>
> - **Checks run:** L1 <page type, module, audience> · L2 <template tried> ·
>   L3 <units tried> · L4 <composition tried> · L5 <rule it would break>

A partial gap is still a gap: a list page whose table needs a cell type that does not
exist gets the whole list built, with the message in place of that one cell.

Two things are **never** gaps — they are always answered from the docs:
- a new record, module or field on an existing page type (L2/L4 cover it);
- a screen size, theme or accessibility level (Foundations cover it).

## Areas not designed yet

Until they are written, these are answered with the gap message (field *Missing
component* names the area): **UX copy** beyond the rules in `07-ux-rules.md`, **empty
pages and empty states** beyond the Empty-state molecule, **highlight units** beyond the
Alert banner and status/awaiting pills, and **illustrations** (see `09-later.md`).

## After building

Run the checks in `evals/README.md` that apply (`fpds-*` always; the repo's `npm run
eval` when working in this repo). A failing check is fixed, not explained.
