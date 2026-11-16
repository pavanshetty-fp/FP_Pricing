# pricing-work — start here

This branch is for building the **Pricing** module. It is a branch of Pavan's
FP-DS-2026 repo (github.com/pavanshetty-fp/FP-DS-2026, branch `pricing-work`).
The app opens on Pricing; every other module is still there to read from.

Every change Pavan makes on `main` (design system, shared components, other
modules) is merged into this branch when he pushes, so `git pull` before you
start each day.

## One-time setup

1. Accept the GitHub invite to **pavanshetty-fp/FP-DS-2026**.
2. Install Git, Node.js 20+, and Claude Code (the Claude desktop app's Code tab,
   or `npm install -g @anthropic-ai/claude-code`).
3. Download the branch:

```bash
git clone -b pricing-work git@github.com:pavanshetty-fp/FP-DS-2026.git FP-Pricing
cd FP-Pricing
npm install
```

## Run it

```bash
npm run dev:unified        # opens on Pricing
npm run eval               # the design-system checks
npm run check:rules        # confirms no rule file was changed
```

## Read before changing anything

1. `CLAUDE.md` — the rules Claude Code follows here (the same apply to you).
2. `docs/fpds/` — the design system. Every rule applies.
3. `docs/unified-view/pricing/PRD.md` — the product; fill it in as decisions
   are made.

## Where the code goes

- Pricing screens: `prototypes/unified-view/pricing/`.
- The Pricing menu entries: the `pricing` entry of `MODULE_NAV` in `prototypes/unified-view/UnifiedView.tsx`
  (today Pricing has no pages, so it shows "not built").
- Shared pieces (lists, side sheets, tables, pickers) live in `src/components/`
  and `prototypes/unified-view/`; reuse them. Changing them changes every
  module, so keep such changes small and say so when handing back.

## Handing work back

Commit to `pricing-work` (or a branch off it) and tell Pavan, or open a pull
request into `main`. He reviews it and decides what comes back.
