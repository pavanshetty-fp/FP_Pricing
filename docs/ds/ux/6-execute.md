# UX · Execute

How to build the structure the UX rules describe. Code idioms for the shell + zones.

## AppShell skeleton
```tsx
// 8px gaps + 8px outer margin (spacing law). Rail flush, drawer + content float.
<div className="flex h-screen gap-2 p-2 bg-background">
  <nav className="w-13 shrink-0 bg-rail" />                        {/* 52px rail */}
  <aside className="w-64 shrink-0 rounded-lg bg-sidebar shadow-fp-surface" /> {/* drawer */}
  <main className="flex-1 min-w-0 rounded-md bg-fp-surface-1b shadow-fp-surface
                   overflow-hidden flex flex-col">                 {/* content layer — no border */}
    {/* header stack + zones */}
  </main>
</div>
```
The repo's implementation is `src/components/app-shell/` + `navigation-drawer/`;
the nav registry is `App.tsx` (`SCREENS` + `ORDER`).

## Header stack (L2) — compact, fixed order
The Tier-0 global top bar (brand · global search · account) sits above the whole
shell. The **content-layer header is compact**: the breadcrumb IS the title (no
`text-2xl` title line, no bottom divider); tabs/toolbar pull up ~12px beneath.
```tsx
<div className="px-4 py-1">                       {/* compact header — no divider */}
  <Breadcrumb />                                  {/* the breadcrumb doubles as the title */}
</div>
{facets && <Tabs className="-mt-3.5" />}          {/* pulled up ~12px; only for real facets */}
{/* then the toolbar zone below */}
```

## Toolbar (L3) — filters left, one primary right
```tsx
<div className="flex items-center gap-2 p-4">
  <div className="flex items-center gap-2">{/* search · filters · group-by */}</div>
  <div className="flex-1" />
  {/* view switches */} <Button>Publish</Button>   {/* neutral bg-primary, single primary */}
</div>
```

## Zone order (L4)
Stack, in order, with a consistent gap between and 16px inset within:
`header → toolbar → summary/insight band → data region`.

## Five levels (H1) — pick the level, its container follows
| Level | Container |
|---|---|
| Region | `bg-fp-surface-1b` (the content layer) |
| Group | `bg-card` + `border-fp-outline-1`, radius `lg` |
| Compound-row | a fixed grid of ordered slots |
| Atom | a token-driven control |

Step elevation once (H2): `surface-1b → card → fp-card-1`. Never nest same-weight fills.

## Compound row (H4) — fixed slots
```tsx
// each row uses the SAME column template so slots align down the table
<div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
  {/* identity · data grid · viz · action */}
</div>
```

Reference implementations: `tables-layout/`, `form-layout/`, `kanban-board/`,
`dashboard/`.
