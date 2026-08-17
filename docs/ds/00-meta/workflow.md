# Building & extending the DS — workflow

For working on **the DS repo itself** (translating a Figma frame, porting a
primitive, adding a demo, packaging). For *adopting* the DS in a prototype, see
[`setup.md`](setup.md).

**Repo:** `…/FP DS 2026/FP-DS-2026/` · **shadcn clone (port source):**
`…/ui/apps/v4/registry/new-york-v4/ui/` · **Figma key:** `PxzKUl6emRr8QQ5Nb0vlwT`
· dev server base `/FP-DS-2026/` (launch.json name `fp-ds-2026`).

## The loop
Pull a Figma frame → analyze (template vs component page) → build from the shadcn
clone → wire an entry point → verify in the live preview → package.

## 1. Pull from Figma — REST, never the MCP
The MCP's deep reads blow past 600 MB on this file. Token at `…/FP DS 2026/.figma_token`
(read into a shell var, never print).
```bash
TOKEN=$(cat "/Users/pavanshetty/Documents/FP DS 2026/.figma_token")
curl -s -H "X-Figma-Token: $TOKEN" \
  "https://api.figma.com/v1/files/PxzKUl6emRr8QQ5Nb0vlwT/nodes?ids=27610:58823&depth=4" -o /tmp/node.json
```
- URL `node-id=27610-58823` → `ids=27610:58823` (dash→colon). **Always cap `&depth=`** (2–4 to map, 5–6 for a subtree).
- Parse JSON for `type`/`name`/dims/`characters` (text labels carry spec values). For colors, read `fills[].color` (rgb 0–1) + `opacity` → hex.
- **Render images** via `/v1/images/...&format=png&scale=2`; the Read tool can't open >~2000px — lower scale or split with PIL; render child frames, not the whole canvas.

## 2. Analyze
- **Layout templates** = structural blueprints (a close estimate, not a pixel contract).
- **Component pages** = building blocks; variant chosen by data meaning, not hardcoded.
- **Reference mocks are often light/foreign** — recreate in FP tokens, dark-primary. Translate, don't trace.

## 3. Build — compose first, port what's missing
Port a primitive from the clone (near-verbatim): drop `"use client"`; keep
`data-slot` + `cn()`; add `border-border` where upstream relied on a default;
rewrite `@/registry/new-york-v4/ui/x` → `@/components/ui/x`; export from
`src/components/ui/index.ts`. Some need a dep (`cmdk`, `input-otp`, `sonner`,
`recharts`) — **confirm before installing**. Icons Lucide only; if a glyph isn't
in Lucide, inline an SVG with `currentColor`.

**Component-demo (common case):** most single component pages map to an existing
primitive — add `component-demos/<Name>Demo.tsx`, export it, and register in
`App.tsx`'s `COMPONENT_PAGES`. No `ui/` change.

## 4. Wire an entry point
Existing patterns: action-bar CTA → full-screen view; per-row actions menu → side
sheet; hover trigger → HoverCard; a demo/nav screen. Register new screens in
`App.tsx` `SCREENS` + `ORDER`.

## 5. Verify — every time
```bash
npx tsc -b --noEmit
npx eslint <changed paths>   # the *Variants export warning is pre-existing
npm run build                # a >500kB chunk advisory is not an error
```
Then exercise it in the **live preview** (reload `http://localhost:5173/FP-DS-2026/`,
drive the UI, screenshot, check console). Never assert a change works without
observing it.

**Headless-preview gotchas:** Radix triggers need `pointerdown→pointerup→click`
(synthetic `.click()` won't open them); Hover/Tooltip can't be faked — verify
structurally; controlled inputs need the native setter + `input` event;
`requestAnimationFrame` is paused in the backgrounded tab (prefer a CSS keyframe
whose default state is the resting position); reads right after a click see
pre-render state (re-read after React flushes).

## 6. Package
`npm run build:single` → self-contained `dist-single/index.html` → copy to
`FP-DS-2026-preview.html`. Refresh the `.skill` and share zip on any token/rule
change. Verify the single file by serving over a throwaway `python -m http.server`.

## Git
- **Canonical remote:** `origin` → `git@github.com:pavanshetty-fp/FP-DS-2026.git`
  (public), over **SSH** (key `~/.ssh/id_ed25519`); `main` tracks `origin/main`.
- Commits go straight to `main` (the established solo-repo pattern — no branches).
- **Commit/push only when the user asks.** End commit messages with
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Historical note: the old `pavanshetty-rgb/FP-DS-2026` remote is **superseded** —
  `pavanshetty-fp/FP-DS-2026` is now the live home.
- GitHub Pages scaffolding (Vite `base: /FP-DS-2026/`, an Actions workflow) is
  committed.
