# Figma asks — open gaps in the FP DS 2026 library

Each entry is a **precise** ask: what to add, why the code cannot source it
today, and what the code does in the meantime. The rule is *tokens, never raw
hex*, so anything on this list is a place the code is currently carrying a value
the library does not hold. Keep the list short by closing items, not by dropping
them.

File: `PxzKUl6emRr8QQ5Nb0vlwT` (FP DS 2026)

---

## 1. An overlay-tier rim token

**Ask:** one colour variable for the rim of elements that float *over their own
content* — the bulk-action bar today, dialogs and popovers next. It needs a value
per theme, and the two are not the same token.

**Why the code cannot source it.** There is no overlay rim in the library, and no
single existing token works in both themes. Measured against the bar's real
backdrop (selected rows, `--accent`):

| rim candidate | FP-dark | Light |
|---|---|---|
| `--fp-outline-1` | `[12,13,14]` | `[24,20,15]` |
| `--fp-outline-2` | `[45,40,32]` | **`[0,0,0]`** — identical to `--accent` |
| `--border` | `[12,13,14]` | **`[3,3,3]`** — near-invisible |

`--fp-outline-2` is byte-identical to `--accent` in the light column, so the
strongest dark rim is the weakest possible light one.

**What the code does meanwhile.** `border-fp-outline-1 dark:border-fp-outline-2`
— a `dark:` variant over two real tokens. One library variable would replace it.

**Same gap, second property: an overlay *surface* token.** The fill has the same
problem as the rim — the value wanted is "the top of the surface ladder", and no
single token expresses it: light tops out at `#ffffff` (`--fp-surface-1a`), dark
at `#2a2f37` (`--fp-card-1`). The code carries
`bg-fp-surface-1a dark:bg-fp-card-1`. One `--fp-surface-overlay` variable would
replace both that and the rim variant.

**Not an ask: the shadow scale.** An earlier revision escalated the dark shadow
alpha to 55% because the library's 10% separates by only `[4,5,5]` on a dark
surface. That was the wrong fix. Black on a dark surface has almost no range, so
a shadow can never be the separator there — **on dark, elevation is a lighter rim;
the shadow is ambient depth.** With the rim above carrying separation,
`--shadow-fp-overlay` is now the library's `shadow/xl` verbatim (black @10%, both
themes). The shadow scale was correct for light all along and needs no change.

*(Related: the library ships `shadow/sm`, `/lg`, `/xl` and **no `shadow/md`** — any
rule naming `--shadow-md` names a token this DS does not have.)*

---

## 2. Pastel badge hues

**Ask:** a pastel palette — fill + a foreground dark enough to carry text on it —
starting with the blue and amber pairs already in use, and ideally a green and a
rose so the set is usable beyond two categories.

**Why the code cannot source it.** The library was searched for "pastel"; it has
no pastel variants. The badge palette is all solid or soft-tint.

**What the code does meanwhile.** `--pastel-blue` / `--pastel-amber` (+
`-foreground`) are carried in `src/index.css` under a `KNOWN GAP` marker. They
came from a prototype where a designer picked them, so they have provenance, but
they are not library values. No third or fourth pastel has been added precisely
because inventing more hexes would deepen the gap. Both current pairs measure
AAA (7.65:1, 7.09:1).

---

## 3. Light-column status colours that can carry text

**Ask:** darker light-mode values for `--status-success`, `--status-processing`
and `--status-failed`, or a paired `-foreground` per status.

**Why this is a real defect, not a preference.** The DS requires contrast ≥ WCAG
AA in both themes. The current light values cannot meet it when the status colour
is used as *text*:

| treatment | FP-dark | Light |
|---|---|---|
| `StatusChip` text/success | 7.18 ✓ | **3.30 ✗** |
| `StatusChip` text/processing | 7.62 ✓ | **3.19 ✗** |
| `StatusChip` soft/success | 6.04 ✓ | **2.96 ✗** |
| `StatusChip` soft/processing | 6.38 ✓ | **2.86 ✗** |
| `StatusChip` soft/failed | 5.15 ✓ | **4.13 ✗** |

This is **not** introduced by `StatusChip` — the shipped `destructive` Badge
variant already fails identically at 4.13 in light, using the same
`bg-*/10 text-*` recipe.

**What the code does meanwhile.** The failures are recorded in
`ui/status-chip.tsx`, in `ui/6-execute.md`, and surfaced in the gallery page
itself, with the guidance: prefer the `dot` treatment on light surfaces (its
label stays `foreground`, so it measures 20.5:1 there) and reserve `text` / `soft`
for FP-dark or for the `failed` / `neutral` tones.

---

## 4. A 4px step on the radius ramp — or a decision not to have one

**Ask:** either add a 4px step to the radius scale (`21322:119`, currently
`xs 2 · sm 6 · md 8 · lg 10 · xl 14`) or confirm that 4px is off-system.

**Why it came up.** A prototype used a raw `rounded-[4px]` on the preset-row CTA.
Raw values in a base component propagate to everything downstream.

**What the code does meanwhile.** The CTA uses `rounded-sm` (6px), the nearest
on-scale step. Nothing is blocked; this is a scale question, not a defect.
