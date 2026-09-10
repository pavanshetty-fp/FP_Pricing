import { cn } from "@/lib/utils";
import { Stack, SectionHeading } from "@/components/typography";

/*
  Visual Reference — Foundations. The token scales that aren't components:
  Color, Typography, Radius, and Spacing & Rhythm. Everything renders from the
  real tokens/utilities, so it's theme-accurate and copy-paste-able.
*/

/* ── Color ─────────────────────────────────────────────────────────────── */
// Literal utility strings so Tailwind's JIT includes them.
const SEMANTIC = [
  { name: "brand", cls: "bg-brand" },
  { name: "primary", cls: "bg-primary" },
  { name: "secondary", cls: "bg-secondary" },
  { name: "accent", cls: "bg-accent" },
  { name: "selected", cls: "bg-selected" },
  { name: "selected-foreground", cls: "bg-selected-foreground" },
  { name: "muted", cls: "bg-muted" },
  { name: "destructive", cls: "bg-destructive" },
  { name: "foreground", cls: "bg-foreground" },
  { name: "muted-foreground", cls: "bg-muted-foreground" },
  { name: "border", cls: "bg-border" },
  { name: "input", cls: "bg-input" },
  { name: "ring", cls: "bg-ring" },
];
const STATUS = [
  { name: "status-success", cls: "bg-status-success" },
  { name: "status-processing", cls: "bg-status-processing" },
  { name: "status-failed", cls: "bg-status-failed" },
  { name: "status-pink", cls: "bg-status-pink" },
  { name: "verified", cls: "bg-verified" },
];

function Swatch({ name, cls }: { name: string; cls: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("size-9 shrink-0 rounded-md border border-fp-outline-1", cls)} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm text-foreground">{name}</span>
        <code className="text-[11px] text-muted-foreground">{cls}</code>
      </span>
    </div>
  );
}

/* ── Typography ────────────────────────────────────────────────────────── */
const HEADINGS = [
  { cls: "text-heading-xl", meta: "text-heading-xl · 60px" },
  { cls: "text-heading-lg", meta: "text-heading-lg · 48px" },
  { cls: "text-heading-md", meta: "text-heading-md · 36px" },
  { cls: "text-heading-sm", meta: "text-heading-sm · 24px" },
];
const BODY = [
  { cls: "text-base", meta: "text-base · 16px" },
  { cls: "text-sm", meta: "text-sm · 14px" },
  { cls: "text-xs", meta: "text-xs · 12px" },
];

function Specimen({ sample, cls, meta, weight }: { sample: string; cls: string; meta: string; weight?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-fp-outline-1 pb-3">
      <span className={cn(cls, weight, "truncate text-foreground")}>{sample}</span>
      <code className="shrink-0 text-[11px] text-muted-foreground">{meta}</code>
    </div>
  );
}

/* ── Radius ────────────────────────────────────────────────────────────── */
const RADII = [
  { cls: "rounded-xs", px: "2px" },
  { cls: "rounded-sm", px: "6px" },
  { cls: "rounded-md", px: "8px" },
  { cls: "rounded-lg", px: "10px" },
  { cls: "rounded-xl", px: "14px" },
  { cls: "rounded-2xl", px: "18px" },
  { cls: "rounded-3xl", px: "22px" },
  { cls: "rounded-4xl", px: "26px" },
];

/* ── Spacing ───────────────────────────────────────────────────────────── */
const STEPS = [
  { cls: "gap-1", w: "w-1", px: "4px" },
  { cls: "gap-2", w: "w-2", px: "8px" },
  { cls: "gap-3", w: "w-3", px: "12px" },
  { cls: "gap-4", w: "w-4", px: "16px" },
  { cls: "gap-6", w: "w-6", px: "24px" },
];
const NAMED = [
  { name: "container-padding-x", w: "w-container-padding-x", px: "24px" },
  { name: "section-title-gap-sm", w: "w-section-title-gap-sm", px: "16px" },
  { name: "section-title-gap-md", w: "w-section-title-gap-md", px: "20px" },
  { name: "section-title-gap-xl", w: "w-section-title-gap-xl", px: "24px" },
  { name: "section-padding-y", w: "w-section-padding-y", px: "96px" },
];

/* ── Rhythm ────────────────────────────────────────────────────────────── */
// Stack `space` steps (typography/rhythm.tsx) — vertical gaps between blocks.
const RHYTHM = [
  { name: "section", gap: "gap-24", px: "96px", use: "between content sections" },
  { name: "title", gap: "gap-6", px: "24px", use: "eyebrow / heading → block" },
  { name: "heading", gap: "gap-4", px: "16px", use: "title → supporting body (upper)" },
  { name: "body", gap: "gap-3", px: "12px", use: "within a group (lower)" },
  { name: "pair", gap: "gap-0.5", px: "2px", use: "value ↔ label" },
];

function Bar({ w }: { w: string }) {
  return <div className={cn("h-3 rounded-sm bg-brand", w)} />;
}

export function FoundationsReference() {
  return (
    <Stack space="section" className="max-w-3xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        The token scales that aren't components — color, type, radius, and
        spacing/rhythm. Everything here is driven by the real tokens, so it's
        exact in Light and FP. Build with these; don't invent values.
      </p>

      {/* Color */}
      <Stack space="title">
        <SectionHeading as="h3" title="Color tokens" />
        <p className="-mt-1 text-xs text-muted-foreground">Semantic</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SEMANTIC.map((c) => (
            <Swatch key={c.name} {...c} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Status</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STATUS.map((c) => (
            <Swatch key={c.name} {...c} />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Surface colors (background, rail, drawer, content, card) live on the{" "}
          <strong>Surfaces &amp; Elevation</strong> screen.
        </p>
      </Stack>

      {/* Typography */}
      <Stack space="title">
        <SectionHeading as="h3" title="Typography" />
        <p className="-mt-1 text-xs text-muted-foreground">
          Display ramp — <code>font-semibold</code>, Geist.
        </p>
        <div className="flex flex-col gap-3">
          {HEADINGS.map((h) => (
            <Specimen key={h.cls} sample="Ag" cls={h.cls} meta={h.meta} weight="font-semibold" />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Body ramp</p>
        <div className="flex flex-col gap-3">
          {BODY.map((b) => (
            <Specimen key={b.cls} sample="The quick brown fox" cls={b.cls} meta={b.meta} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Weights</p>
        <div className="flex flex-wrap gap-6">
          <span className="text-lg font-normal text-foreground">Regular 400</span>
          <span className="text-lg font-medium text-foreground">Medium 500</span>
          <span className="text-lg font-semibold text-foreground">Semibold 600</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Patterns — <code>tabular-nums</code> for aligned figures; muted label
          under a foreground value.
        </p>
        <div className="flex gap-8">
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl font-semibold tabular-nums text-foreground">16,431</span>
            <span className="text-xs text-muted-foreground">Page views</span>
          </div>
          <div className="flex flex-col gap-0.5 text-right tabular-nums">
            <span className="text-sm text-foreground">1,240.00</span>
            <span className="text-sm text-foreground">98.50</span>
            <span className="text-sm text-foreground">7,300.75</span>
          </div>
        </div>
      </Stack>

      {/* Radius */}
      <Stack space="title">
        <SectionHeading as="h3" title="Radius" />
        <div className="flex flex-wrap gap-5">
          {RADII.map((r) => (
            <div key={r.cls} className="flex flex-col items-center gap-2">
              <div className={cn("size-14 border-2 border-brand bg-brand/15", r.cls)} />
              <code className="text-center text-[11px] leading-tight text-muted-foreground">
                {r.cls}
                <br />
                {r.px}
              </code>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Buttons &amp; inputs land on <code>rounded-md</code> (8); cards on{" "}
          <code>rounded-lg</code> (10).
        </p>
      </Stack>

      {/* Spacing & Rhythm */}
      <Stack space="title">
        <SectionHeading as="h3" title="Spacing & Rhythm" />

        <p className="-mt-1 text-xs text-muted-foreground">Step scale</p>
        <div className="flex flex-col gap-2">
          {STEPS.map((s) => (
            <div key={s.cls} className="flex items-center gap-3">
              <code className="w-40 shrink-0 text-[11px] text-muted-foreground">{s.cls} · {s.px}</code>
              <Bar w={s.w} />
            </div>
          ))}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">Named FP spacing</p>
        <div className="flex flex-col gap-2">
          {NAMED.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <code className="w-52 shrink-0 text-[11px] text-muted-foreground">{s.name} · {s.px}</code>
              <Bar w={s.w} />
            </div>
          ))}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Vertical rhythm — the <code>Stack</code> <code>space</code> steps
          (gap between stacked blocks)
        </p>
        <div className="flex flex-col gap-4">
          {RHYTHM.map((r) => (
            <div key={r.name} className="flex items-start gap-3">
              <code className="w-40 shrink-0 pt-1 text-[11px] text-muted-foreground">
                {r.name} · {r.px}
              </code>
              <div className="min-w-0 flex-1">
                <div className={cn("flex flex-col", r.gap)}>
                  <div className="h-4 rounded-sm bg-fp-card-1" />
                  <div className="h-4 rounded-sm bg-fp-card-1" />
                </div>
                <span className="mt-1 block text-[11px] text-muted-foreground">{r.use}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Horizontal rhythm — inline gaps &amp; the layout laws
        </p>
        <div className="flex flex-col gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex gap-3">
              <span className="h-8 w-16 rounded-md bg-fp-card-1" />
              <span className="h-8 w-16 rounded-md bg-fp-card-1" />
            </div>
            <code>gap-3 (12px) — between buttons/controls</code>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <span className="h-6 w-10 rounded-md bg-fp-card-1" />
              <span className="h-6 w-10 rounded-md bg-fp-card-1" />
              <span className="h-6 w-10 rounded-md bg-fp-card-1" />
            </div>
            <code>gap-2 (8px) — dense toolbars / tag rows</code>
          </div>
          <p>
            Layout laws: <code>8px</code> gap between shell panels (rail ↔ drawer
            ↔ content) + <code>8px</code> outer margin; <code>16px</code> inset
            inside the content-layer body. (See Surfaces &amp; Elevation.)
          </p>
        </div>
      </Stack>
    </Stack>
  );
}
