import { Check, X, Truck } from "lucide-react";
import { Stack, Eyebrow } from "@/components/typography";

/*
  Visual Reference — Common Mistakes. Side-by-side ❌ wrong / ✅ right pairs for
  the errors the accuracy contract forbids. The most direct way to correct AI
  output at the source: show the anti-pattern next to the token-correct version.
*/

function Pair({
  title,
  why,
  wrong,
  right,
}: {
  title: string;
  why: string;
  wrong: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-fp-outline-1 bg-card p-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <p className="mt-1 text-xs text-muted-foreground">{why}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <span className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-destructive">
            <X className="size-3.5" /> Wrong
          </span>
          {wrong}
        </div>
        <div className="rounded-md border border-status-success/40 bg-status-success/5 p-3">
          <span className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-status-success">
            <Check className="size-3.5" /> Right
          </span>
          {right}
        </div>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="mt-2 block rounded bg-fp-card-1 px-2 py-1 text-[11px] text-muted-foreground">
      {children}
    </code>
  );
}

export function CommonMistakesReference() {
  return (
    <Stack space="section" className="max-w-3xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        The accuracy contract forbids a few specific things. Here they are as
        ❌ / ✅ pairs — the fastest way to keep prompt-built output on-system.
      </p>

      <Stack space="body">
        <Eyebrow>Tokens &amp; components</Eyebrow>
        {/* 1 — raw hex vs token */}
        <Pair
          title="Brand color: raw hex vs token"
          why="Hardcoded hex breaks theming (Light/FP) and drifts from the palette. Always use the token utility."
          wrong={
            <>
              <div className="h-9 rounded-md" style={{ background: "#fa6400" }} />
              <Code>{`bg-[#fa6400]`}</Code>
            </>
          }
          right={
            <>
              <div className="h-9 rounded-md bg-brand" />
              <Code>{`bg-brand`}</Code>
            </>
          }
        />

        {/* 2 — primary CTA is neutral, not brand */}
        <Pair
          title="Primary CTA: neutral, not brand"
          why="The primary CTA is the neutral bg-primary — near-white in FP, near-black in Light. bg-brand (orange) is a special accent: use it only where a brand emphasis is specifically called for, not as the default CTA."
          wrong={
            <>
              <button className="h-9 w-full rounded-md bg-brand text-sm font-medium text-brand-foreground">
                Primary action
              </button>
              <Code>{`bg-brand  /* not the default CTA */`}</Code>
            </>
          }
          right={
            <>
              <button className="h-9 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground">
                Primary action
              </button>
              <Code>{`bg-primary text-primary-foreground`}</Code>
            </>
          }
        />

        {/* 3 — icon set */}
        <Pair
          title="Icons: any set vs Lucide only"
          why="Only lucide-react is allowed. Never Tabler / Hugeicons / Phosphor / Remix or one-off SVGs."
          wrong={
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-md border border-destructive/40 text-lg">
                🚚
              </span>
              <span className="text-xs text-muted-foreground">emoji / other set</span>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-md border border-fp-outline-1 text-foreground">
                <Truck className="size-4" />
              </span>
              <Code>{`import { Truck } from "lucide-react"`}</Code>
            </div>
          }
        />

        {/* 4 — content layer border */}
        <Pair
          title="Content layer: outer border vs shadow"
          why="The content layer has NO outer border — it lifts off the background with shadow-fp-surface instead."
          wrong={
            <div className="h-16 rounded-md border-2 border-fp-outline-2 bg-fp-surface-1b p-2 text-[11px] text-muted-foreground">
              border-2 …
            </div>
          }
          right={
            <div className="h-16 rounded-md bg-fp-surface-1b p-2 text-[11px] text-muted-foreground shadow-fp-surface">
              shadow-fp-surface
            </div>
          }
        />

        {/* 5 — arbitrary radius vs scale */}
        <Pair
          title="Radius: arbitrary vs the scale"
          why="Corners come from the ramp (sm 6 · md 8 · lg 10 · xl 14). Buttons/inputs land on md; cards on lg."
          wrong={
            <div className="flex items-center gap-2">
              <div className="size-10 bg-brand" style={{ borderRadius: "5px" }} />
              <Code>{`rounded-[5px]`}</Code>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-md bg-brand" />
              <Code>{`rounded-md`}</Code>
            </div>
          }
        />
      </Stack>

      <Stack space="body">
        <Eyebrow>Layout &amp; hierarchy</Eyebrow>

        {/* 6 — full-bleed page vs AppShell (L1 / L2) */}
        <Pair
          title="Page frame: full-bleed vs the AppShell"
          why="Every screen lives in the shell (rail + drawer + content layer) with ONE 48px header stack. Don't build a full-bleed page or stack a second top-bar — collapse title, breadcrumb, tabs, and toolbar into the header. (L1 · L2)"
          wrong={
            <div className="space-y-1">
              <div className="h-4 rounded-sm bg-fp-card-1" />
              <div className="h-4 rounded-sm bg-fp-card-1" />
              <div className="h-10 rounded-sm border border-dashed border-destructive/50" />
              <Code>{`full-bleed · 2 stacked top-bars`}</Code>
            </div>
          }
          right={
            <div className="flex gap-1">
              <div className="w-2 rounded-sm bg-fp-card-1" />
              <div className="w-4 rounded-sm bg-fp-card-1" />
              <div className="flex-1 space-y-1 rounded-sm bg-fp-surface-1a p-1">
                <div className="h-3 rounded-[3px] bg-fp-card-1" />
                <div className="h-6 rounded-[3px] border border-fp-outline-1" />
              </div>
            </div>
          }
        />

        {/* 7 — saturated fill vs soft tint (H3) */}
        <Pair
          title="Status color: saturated fill vs soft tint"
          why="Status is shown with the soft-tint pattern (bg-status-*/10 + text-status-*), never a saturated block that fights the surface. Same rule for a highlighted 'best' cell. (H3)"
          wrong={
            <>
              <div className="flex h-9 items-center justify-center rounded-md bg-status-success text-xs font-medium text-status-foreground">
                Best $2.4489
              </div>
              <Code>{`bg-status-success  /* solid fill */`}</Code>
            </>
          }
          right={
            <>
              <div className="flex h-9 items-center justify-center rounded-md bg-status-success/10 text-xs font-medium text-status-success">
                Best $2.4489
              </div>
              <Code>{`bg-status-success/10 text-status-success`}</Code>
            </>
          }
        />

        {/* 8 — elevation step (H2) */}
        <Pair
          title="Elevation: skip a step vs step once"
          why="Nesting moves up exactly one surface (surface-1b → card → fp-card-1). Don't stack two fills of the same weight — that flattens the hierarchy and the inner element disappears. (H2)"
          wrong={
            <div className="rounded-md bg-card p-2">
              <div className="flex h-10 items-center justify-center rounded-[3px] bg-card text-[11px] text-muted-foreground">
                same fill on same fill
              </div>
            </div>
          }
          right={
            <div className="rounded-md bg-card p-2">
              <div className="flex h-10 items-center justify-center rounded-[3px] bg-fp-card-1 text-[11px] text-foreground">
                steps up one level
              </div>
            </div>
          }
        />

        {/* 9 — emphasis budget (H3) */}
        <Pair
          title="Emphasis budget: many CTAs vs one"
          why="One primary action per view; everything else is secondary / outline / ghost. A wall of filled buttons has no hierarchy — spend emphasis, don't sprinkle it. (H3)"
          wrong={
            <div className="flex flex-wrap gap-2">
              <div className="h-8 rounded-md bg-primary px-3 text-xs leading-8 text-primary-foreground">Save</div>
              <div className="h-8 rounded-md bg-primary px-3 text-xs leading-8 text-primary-foreground">Publish</div>
              <div className="h-8 rounded-md bg-primary px-3 text-xs leading-8 text-primary-foreground">Export</div>
            </div>
          }
          right={
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-8 rounded-md bg-primary px-3 text-xs leading-8 text-primary-foreground">Publish</div>
              <div className="h-8 rounded-md border border-fp-outline-1 px-3 text-xs leading-8 text-foreground">Save</div>
              <div className="h-8 rounded-md px-3 text-xs leading-8 text-muted-foreground">Export</div>
            </div>
          }
        />

        {/* 10 — density via slots (H4) */}
        <Pair
          title="Dense rows: crammed vs fixed slots"
          why="A data-dense row is a fixed set of ordered slots (identity · data grid · viz · action). Extra data extends a slot; it never drops an unaligned element into the row. (H4)"
          wrong={
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-destructive/40 p-2">
              <span className="h-3 w-10 rounded-[3px] bg-fp-card-1" />
              <span className="h-3 w-6 rounded-[3px] bg-fp-card-1" />
              <span className="h-3 w-8 rounded-[3px] bg-fp-card-1" />
              <span className="h-3 w-5 rounded-[3px] bg-fp-card-1" />
              <span className="h-3 w-9 rounded-[3px] bg-fp-card-1" />
              <span className="h-3 w-4 rounded-[3px] bg-fp-card-1" />
            </div>
          }
          right={
            <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 rounded-md border border-fp-outline-1 p-2">
              <span className="h-4 rounded-[3px] bg-fp-card-1" />
              <span className="h-4 rounded-[3px] bg-fp-card-1" />
              <span className="h-4 w-8 rounded-[3px] border border-fp-outline-1" />
            </div>
          }
        />
      </Stack>

      <Stack space="body">
        <Eyebrow>Header stack</Eyebrow>

        {/* 11 — full stack on a trivial screen (L5) */}
        <Pair
          title="Header stack: full stack vs earn each unit"
          why="Each header unit earns its place. Don't ship breadcrumb + tabs + a heavy toolbar on a three-row list because the template has them — match the header to the screen's complexity. (L5)"
          wrong={
            <div className="space-y-1.5 rounded-md border border-destructive/40 p-2">
              <div className="h-3 w-24 rounded-[3px] bg-fp-card-1" />
              <div className="flex gap-1"><span className="h-2 w-5 rounded-[2px] bg-fp-card-1" /><span className="h-2 w-5 rounded-[2px] bg-fp-card-1" /></div>
              <div className="flex gap-2 pt-0.5">
                <span className="h-2.5 w-7 rounded-[2px] bg-foreground/60" /><span className="h-2.5 w-7 rounded-[2px] bg-fp-card-1" /><span className="h-2.5 w-7 rounded-[2px] bg-fp-card-1" /><span className="h-2.5 w-7 rounded-[2px] bg-fp-card-1" /><span className="h-2.5 w-7 rounded-[2px] bg-fp-card-1" /><span className="h-2.5 w-7 rounded-[2px] bg-fp-card-1" /><span className="h-2.5 w-7 rounded-[2px] bg-fp-card-1" />
              </div>
              <div className="flex items-center gap-1 rounded-[4px] border border-fp-outline-1 p-1">
                <span className="h-3 w-10 rounded-[2px] bg-fp-card-1" /><span className="h-3 w-10 rounded-[2px] bg-fp-card-1" /><span className="h-3 w-10 rounded-[2px] bg-fp-card-1" />
              </div>
              <div className="space-y-1 pt-0.5"><div className="h-1.5 rounded-full bg-fp-card-1" /><div className="h-1.5 rounded-full bg-fp-card-1" /></div>
            </div>
          }
          right={
            <div className="space-y-1.5 rounded-md border border-status-success/40 p-2">
              <div className="h-3 w-24 rounded-[3px] bg-fp-card-1" />
              <div className="flex items-center gap-1 rounded-[4px] border border-fp-outline-1 p-1">
                <span className="h-3 w-10 rounded-[2px] bg-fp-card-1" /><span className="flex-1" /><span className="h-3 w-8 rounded-[2px] bg-primary" />
              </div>
              <div className="space-y-1 pt-0.5"><div className="h-1.5 rounded-full bg-fp-card-1" /><div className="h-1.5 rounded-full bg-fp-card-1" /></div>
            </div>
          }
        />

        {/* 12 — breadcrumb depth (L2) */}
        <Pair
          title="Breadcrumb: one level vs a real trail"
          why="Show a breadcrumb only ≥2 levels deep, with every crumb a navigable ancestor and the last one static. A one-item crumb on a top-level screen is noise. (L2)"
          wrong={
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-foreground">Dashboard</span>
              <Code>{`one crumb — nothing to climb`}</Code>
            </div>
          }
          right={
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              Tables <span>/</span> Sub Menu 2 <span>/</span> <span className="text-foreground">Sub Menu 2d</span>
            </div>
          }
        />

        {/* 13 — tabs vs nav / lone tab (L5) */}
        <Pair
          title="Tabs: navigation & lone tabs vs facets"
          why="Tabs are mutually-exclusive facets of ONE dataset. Don't use them to jump between different pages (that's nav), and don't render a single tab that offers no choice. (L5)"
          wrong={
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="border-b-2 border-foreground pb-1 text-foreground">Orders</span>
              <span className="pb-1 text-muted-foreground">Settings</span>
              <span className="pb-1 text-muted-foreground">Reports</span>
              <Code>{`tabs = different pages`}</Code>
            </div>
          }
          right={
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="border-b-2 border-foreground pb-1 text-foreground">All</span>
              <span className="pb-1 text-muted-foreground">Active</span>
              <span className="pb-1 text-muted-foreground">Failed</span>
              <Code>{`facets of one table`}</Code>
            </div>
          }
        />

        {/* 14 — toolbar relevance + emphasis (L3) */}
        <Pair
          title="Toolbar: over-tooled vs right-sized"
          why="Show only the controls the data supports; filters left, view + ONE neutral primary action right. Don't pile on search + filters + group by for a trivial list, or field two filled CTAs. (L3)"
          wrong={
            <div className="flex items-center gap-1.5 rounded-md border border-destructive/40 p-2">
              <span className="h-6 w-14 rounded-[5px] bg-fp-card-1" />
              <span className="h-6 w-12 rounded-[5px] bg-fp-card-1" />
              <span className="h-6 w-14 rounded-[5px] bg-fp-card-1" />
              <span className="flex-1" />
              <span className="h-6 w-12 rounded-[5px] bg-primary" />
              <span className="h-6 w-12 rounded-[5px] bg-primary" />
            </div>
          }
          right={
            <div className="flex items-center gap-1.5 rounded-md border border-status-success/40 p-2">
              <span className="h-6 w-24 rounded-[5px] border border-fp-outline-1" />
              <span className="flex-1" />
              <span className="h-6 w-12 rounded-[5px] border border-fp-outline-1" />
              <span className="h-6 w-14 rounded-[5px] bg-primary" />
            </div>
          }
        />
      </Stack>
    </Stack>
  );
}
