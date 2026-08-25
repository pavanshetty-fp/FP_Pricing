# Token provenance — values decided in code, and what they derive from

**Figma sourcing is not a precondition.** Design values are decided here, in the
token layer. This file is a *provenance register*, not a request queue: it records
which values were chosen in the repo and what each one derives from, so a later
reader can tell a considered decision from a guess. Nothing on this list is
blocked, and nothing here should stop work.

What still holds, from the constitution: **tokens, never raw hex.** A value
belongs in `src/index.css`, defined for **both** themes — that rule is about
having one place to change it, and was never about Figma.

Preference order when a value is needed:

1. an existing token;
2. a step on a ramp the palette already sits on (the light status colours are
   Tailwind `*-600`, so `*-700` is on-ramp, not invention);
3. a value derived from two existing tokens — a composite, a midpoint;
4. a considered new value, with the reasoning written beside it.

Then **measure the result** rather than asserting it. Round-trip to Figma
(`PxzKUl6emRr8QQ5Nb0vlwT`) only when Pavan says it is required.

---

## 1. Overlay tier — rim and surface are `dark:` pairs

The bulk-action bar floats over its own content, and neither its rim nor its fill
can be one token, because the value wanted is "the top of the surface ladder" and
the two themes disagree about which token that is:

| | FP-dark | Light |
|---|---|---|
| rim | `--fp-outline-2` `[45,40,32]` | `--fp-outline-1` `[24,20,15]` |
| fill | `--fp-card-1` | `--fp-surface-1a` (`#ffffff`) |

`--fp-outline-2` is byte-identical to `--accent` in light, so the strongest dark
rim is the weakest possible light one. Hence
`border-fp-outline-1 dark:border-fp-outline-2` and
`bg-fp-surface-1a dark:bg-fp-card-1`.

**Derivation:** all four are existing tokens; only the pairing is new. A single
`--fp-surface-overlay` / `--fp-rim-overlay` pair would collapse both `dark:`
variants — worth doing whenever someone wants to, here or in Figma.

**Settled, not open: the shadow.** An earlier revision escalated the dark shadow
alpha to 55% because 10% black separates by only `[4,5,5]` on a dark surface.
That was the wrong fix — black on dark has almost no range, so a shadow can never
be the separator there. **On dark, elevation is a lighter rim; the shadow is
ambient depth.** With the rim carrying separation, `--shadow-fp-overlay` is the
library's `shadow/xl` geometry at 10% in both themes.

*(Aside: the library ships `shadow/sm`, `/lg`, `/xl` and no `shadow/md` — any rule
naming `--shadow-md` names a token this DS has never had.)*

---

## 2. Pastel hues — `--pastel-blue`, `--pastel-amber`

Chosen in a prototype and carried verbatim. Both pairs measure AAA against their
own foregrounds (7.65:1 and 7.09:1).

**Derivation:** picked by eye, then measured. Extending the set (green, rose, …)
is a one-line change per pair — match how these were built, a light tint with a
foreground dark enough to clear AA on it, and **measure the pair before adding
it** rather than eyeballing a hex.

---

## 3. Light status colours — `text` fixed, `soft` is large-text only

The light `--status-success` / `--status-processing` values moved one step down
their own ramp (green-600 → green-700, amber-600 → amber-700) because they failed
AA as *text*. Green and amber are far lighter than red/pink/blue at the same
step, which is why only those two needed it.

| treatment | FP-dark | Light |
|---|---|---|
| `text/success` | 7.18 | 3.30 → **5.02** ✓ |
| `text/processing` | 7.62 | 3.19 → **5.02** ✓ |
| `text/failed` | 5.91 | 4.83 ✓ |
| `soft/success` | 6.04 | 2.96 → 4.38 — large text only |
| `soft/processing` | 6.38 | 2.86 → 4.39 — large text only |
| `soft/failed` | 5.15 | 4.13 — large text only |

**Still open, and fixable here.** A 10% tint of the label's own hue lifts the
background faster than it darkens the text, so `soft` lands at ~4.4 rather than
4.5. Darkening the token further would fix the pill but make the dot and the
`text` label heavier than they should be. The real fix is for the tint to **stop
being a straight alpha of the label colour** — a fixed tint plus a foreground
measured against it, the way the pastel pairs are built. `soft/failed` is
unchanged because `--status-failed` stays aligned with `--destructive`, and the
`destructive` Badge variant ships the same recipe, so both move together.

Until then: `dot` and `text` are safe on light; `soft` is large-text only.

---

## 4. Radius ramp has no 4px step

The ramp is `xs 2 · sm 6 · md 8 · lg 10 · xl 14`. A prototype wanted a raw
`rounded-[4px]` on the preset-row CTA; it uses `rounded-sm` (6px) instead, the
nearest on-scale step, because a raw literal in a base component propagates
downstream.

**Open question, not a blocker:** add a 4px step or confirm 4px is off-system.
Either can be decided here.
