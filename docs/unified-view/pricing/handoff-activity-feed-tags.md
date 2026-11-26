# Handoff Spec: Activity feed — tags, change text, What changed

Branch `change-log-history` · commits `236fb5b`, `0ce8658` · 2026-11-25

## Overview

The Activity feed (Pricing › Change log › Activity feed) is a logbook: every
pricing change, who made it, how, and what it reached. This release makes the
**Action** tag and the **Change** text say exactly what happened, at the right
level:

- an **artifact** (a margin, fee, tax, adder, rate type or market in Pricing
  setup) is created, switched on or off, or edited;
- a **customer or ship-to** has its pricing set up, or artifacts assigned to
  it, taken off it, or replaced.

It also renames three columns, adds a header row and record links to a
change's **What changed** table, logs artifact creation, and removes the
Assignment column.

Prototype code: `prototypes/unified-view/pricing/` — `changeLog.ts` (tags,
change text), `ChangeSheet.tsx` (What changed, records table),
`activityFeed.ts` + `ActivityFeedScreen.tsx` (feed columns, filters),
`changeLogStore.ts` (logging).

## 1. Tags (the Action column)

One tag per change. Seven tags in all; **Deleted no longer exists** (setup
only deactivates).

| Level | Tag | When |
|---|---|---|
| Artifact | **Added** | The artifact is created in Pricing setup |
| Artifact | **Activated** | Its status goes Inactive → Active |
| Artifact | **Deactivated** | Its status goes Active → Inactive |
| Artifact | **Updated** | Its value, name, description, hubs, address or Today's pricing setting changes |
| Customer / ship-to | **Configured** | Pricing is set up on it for the first time |
| Customer / ship-to | **Assigned** | An artifact is put on it |
| Customer / ship-to | **Unassigned** | An artifact is taken off it |
| Customer / ship-to | **Updated** | An artifact is replaced, or a single value (rate type, market, base price) changes |

**Combining rules — one change with several edits:**

1. All edits share one tag → that tag.
2. They differ, and one is **Deactivated** → Deactivated; else one is
   **Activated** → Activated. A status change is never hidden behind Updated.
3. Otherwise → **Updated**.
4. A first-time setup is **Configured** for the whole change, even though it
   assigns several artifacts.
5. Reset to customer pricing, and an undo → **Updated**.

**Per row inside a change** (What changed rows, records table): each edit or
record carries its own tag by the same rules, except that a **Configured**
change's rows are each **Assigned** — the customer or ship-to is configured,
the artifact is assigned to it.

## 2. Change text (the Change column)

| Case | Format | Example |
|---|---|---|
| Assigned / Unassigned / Added | `{Artifact}: names` | Fees: Small Drop Fee |
| Replaced (list or single value) | `{Artifact}: before → after` | Tax: LA Parish Sales Tax → Federal Excise, TX State Excise |
| Nothing before | before is **Not set** | Rate type: Not set → OPIS Rack Avg |
| Artifact value edit | `{name}: before → after` | LA Parish Sales Tax: $0.0050 → $0.0350 |
| Artifact rename | `Name: before → after` | Name: Contractor Rack Margin → Contractor Margin |
| Artifact other field | `{name}: {field} before → after` | Lake Charles: hubs Lake Charles hub → Lake Charles hub, Sulphur hub |
| Activated / Deactivated | `{name}` | OPIS Rack High |
| Several edits | `{Artifact} {action}: …` joined by ` · ` | Tax assigned: LUST Fee · Fees unassigned: Delivery Fee · Margin updated: Standard Rack Margin → Fleet Contract Margin |
| Configured | `{Artifact} assigned: names` joined by ` · ` | Rate type assigned: OPIS Rack Avg · Market assigned: Houston · Fees assigned: Delivery Fee |
| Undo | `Undo: ` + the undone change's text | Undo: Market: Beaumont → Beaumont |

Rules:

- **Arrow:** always `→` (before → after), never ↔.
- **"Not set"** is the one word for an empty before or after (FPDS UX-167:
  one spelling per term). Never "NA", "None" or "—" inside change text.
- **Action words in text are lower case** after the artifact
  ("Tax assigned"), sentence case throughout.
- **Lists of names** past two show the first name and `+N`; pressing the
  underlined `+N` lists them all (feed and Customer & ship-to timeline).
- **Amounts** appear in a change's detail (What changed, records), not in the
  feed row: `Name: $0.0000` — a colon between name and value.

## 3. Feed table

| Column | Change |
|---|---|
| Entity | Renamed **Artifact** (column, filter, Group by) |
| Made by | Renamed **Change by** |
| Made via | Renamed **Change via** |
| Assignment | **Removed** (column, filter and Group by) |
| Action | Filter lists all seven tags in the order of the table above |

The same renames apply wherever these fields appear: a change's records
table, Customer & ship-to › Timeline (columns and filters), and a setup
record's History sheet (Change by filter).

The **Change events** summary figure's note reads `N direct · M inherited`
(was "assigned"; Assigned is now a tag with another meaning). Inherited = made
on customer pricing and flowing down to its ship-tos.

## 4. A change, opened — What changed

A bordered table at the top of the change sheet, above Impact.

| Column | Width | Content |
|---|---|---|
| Artifact | 140px | Fees, Tax, Margin, Adders, Rate type, Market |
| Action | 110px | The row's tag, as `Pill` (neutral) |
| Change | fills | before (muted) `→` after (foreground), or names |
| Records affected | auto, right-aligned | `N records` as a link; `—` when 0 |

- **Header row:** `bg-fp-table-header`, `text-sm font-medium
  text-muted-foreground`, `px-4 py-2`. Rows `px-4 py-2.5 text-sm`, divided
  `divide-border`; table `rounded-lg border border-border`.
- **Before values** are `text-muted-foreground`, after values
  `text-foreground`, so the new value reads as current.
- A change with no per-artifact edits (reset, undo) shows one row:
  Artifact `Pricing`, its tag, its change text, and its total records.

### Records affected link

| State | Behavior |
|---|---|
| Default | `text-foreground`, dotted underline (`decoration-current/50 decoration-dotted underline-offset-4`) |
| Hover | Underline turns solid |
| Focus | `ring-2 ring-ring/50` |
| Press | Opens the **Records affected** tab filtered to that artifact (filter chip `Artifact: Fees`), then scrolls the sheet so the tab is at the top |
| 0 records | Not a link — `—`, muted |

The scroll runs **after** the list applies the filter (≈250ms), because the
list re-renders on filter and would undo an earlier scroll. Use an instant
scroll; the target is the work area (`#change-records` in the prototype).

### Records affected tab

The tab formerly "Ship-to × product prices" is **Records affected**; the
Impact figure beside Customers / Ship-tos is renamed the same. A record is
one product at one ship-to.

Columns: Ship-to (address under it) · Customer · Product · **Artifact** ·
Action · Change. Action is the record's own tag (Assigned / Unassigned /
Updated; Assigned for every record of a Configured change). Change is
`before → after`, `Not set` for an empty side, amounts as `Name: $0.0000`.

## 5. Logging rules

| Event | Logged as | Reach (Customers / Ship-tos / Records) |
|---|---|---|
| Artifact created in setup | Added | none — `—` until assigned |
| Artifact switched on / off | Activated / Deactivated | every record using it (prices do not change) |
| Artifact renamed, described, hubs/address/Today's pricing changed | Updated | every record using it; a rename also reaches their open orders at the same price |
| Artifact value changed (margin rate, any rate kind) | Updated | every record using it, with price impact and repriced orders |
| Customer / ship-to set up | Configured | the records set up |
| Artifact put on / taken off / replaced | Assigned / Unassigned / Updated | the records it reached |

One change per sheet visit: edits made in one open sheet are one change,
rewritten as the sheet autosaves.

## Edge cases

- **Rename + deactivate in one visit** → Deactivated; the text lists both.
- **Bulk run that configures some records and assigns to others** → the
  change is **Assigned** (not every edit is a first-time setup, so not
  Configured; every edit assigns); if it also unassigns or replaces, Updated.
- **Replace with nothing before** → `Not set → names`.
- **Replace with the same set** (e.g. an undo that restores) → still
  `before → after`, even when equal.
- **Created artifact, never assigned** → Added, reach `—`; Records affected `—`.
- **Long names** → cells truncate with `…`; the full text is on hover
  (`title`). The feed's Change column caps at 280px; several edits wrap to a
  second line (first two on line one).
- **Empty filter result** → the list's existing empty state.

## Accessibility

- Records affected links are `<button>`s, reachable by Tab, activated by
  Enter / Space; their accessible name is the visible text (`26 records`).
- Tags are text (`Pill`), never colour alone.
- Before/after pairs read in order "before, arrow, after"; the arrow is a
  text character, so screen readers announce it.
- Moving focus is not required after the scroll; the filter chip is the
  first new control in reading order.

## Sample data (prototype)

Every tag has at least one sample within the default last-30-days window:
Added (Weekend Delivery Fee, ~27 days ago), Activated (River Access Adder),
Deactivated (OPIS Rack High), Updated (LA Parish Sales Tax value, Contractor
Margin rename, Lake Charles hubs, replacements), Configured (4 records, Priya
Nair, ~3 days ago), Assigned, Unassigned, and multi-edit Updated (today).

## Out of scope / open

- Setup pages for fees, taxes and adders are not built; their value edits
  will follow the same Updated rule.
- Responsive behavior is unchanged from the feed's existing list layout.
