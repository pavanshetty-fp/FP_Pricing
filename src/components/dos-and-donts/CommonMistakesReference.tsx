import { Check, X, Truck } from "lucide-react";
import { Stack } from "@/components/typography";

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
    </Stack>
  );
}
