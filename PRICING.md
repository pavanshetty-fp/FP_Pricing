# FP_Pricing — start here

This repo is for building the **Pricing** module. It is a copy of Pavan's
FP-DS-2026 prototype, split off on 2026-11-16. The app opens on Pricing; every
other module is still there to read from.

Every change Pavan makes in FP-DS-2026 (design system, shared components,
other modules) is synced into this repo when he pushes, so `git pull` before
you start each day.

## One-time setup

1. Accept the GitHub invite to **pavanshetty-fp/FP_Pricing**.
2. Install Git, Node.js 20+, and Claude Code (the Claude desktop app's Code tab,
   or `npm install -g @anthropic-ai/claude-code`).
3. Download the branch:

```bash
git clone git@github.com:pavanshetty-fp/FP_Pricing.git
cd FP_Pricing
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

Work on a branch of this repo and open a pull request, or tell Pavan what is
ready. He reviews it and decides what goes back into FP-DS-2026.
