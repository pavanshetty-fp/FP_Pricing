# UI · Common mistakes (❌ / ✅)

Anti-patterns for the visual surface, each pointing back to [`2-rules.md`](2-rules.md).
(The in-app **Do's and Don'ts → Common Mistakes** page renders these as visual pairs.)

- **Brand color** — ❌ `bg-[#fa6400]` · ✅ `bg-brand`. Hardcoded hex breaks theming (Light/FP) and drifts from the palette.
- **Primary CTA** — ❌ `bg-brand` as the default primary button · ✅ `bg-primary text-primary-foreground`. `bg-brand` (orange) is a special accent, only when specified.
- **Status color** — ❌ a saturated `bg-status-success` block (incl. a highlighted "best" cell) · ✅ the soft tint `bg-status-success/10 text-status-success`.
- **Content layer** — ❌ an outer `border` · ✅ no border + `shadow-fp-surface` to lift it.
- **Radius** — ❌ `rounded-[5px]` · ✅ the scale: `rounded-md` (buttons/inputs), `rounded-lg` (cards).
- **Icons** — ❌ Tabler / Hugeicons / Phosphor / Remix / emoji · ✅ `lucide-react` only.
- **Light mock** — ❌ copy the white cards / a foreign palette · ✅ re-map every color to FP tokens (dark-primary). Translate, don't trace.
- **Recolouring an `outline` Button** — ❌ `hover:bg-status-success` alone · ✅ name the dark half too: `hover:bg-status-success dark:hover:bg-status-success`. The `outline` variant ships `dark:hover:bg-input/50`; that is the same specificity and stacks LATER, so in dark it wins and the fill never changes colour — while `hover:text-*-foreground` still applies, landing near-black text on the variant's own grey fill. The symptom is a hover state **less readable than the resting one**. (Found 2026-09-22 on Finalize vendor.)
- **A sticky bar in the surface it sits on** — ❌ `bg-popover` on a bar inside a `bg-popover` sheet · ✅ a step away from it (`bg-fp-card-1`). Opaque is not the same as distinguishable: nothing scrolls through it, but nothing says it is pinned either, and its top rule reads as one more row rule. (Found 2026-09-22 on the pricing totals bar.)
