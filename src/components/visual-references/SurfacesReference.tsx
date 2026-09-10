import { Stack, SectionHeading } from "@/components/typography";

/*
  Visual Reference — Surfaces & Elevation. Renders the FP surface ladder as a
  live nested diagram so a prompter can see how background → rail → drawer →
  content layer → card → inner card stack, each labeled with its token/utility.
  Every box uses the real token, so it's theme-accurate in Light and FP.
*/

/** A token label chip shown on a live surface. */
function Tag({ token, util }: { token: string; util: string }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 text-xs">
      <span className="font-medium text-foreground">{token}</span>
      <code className="rounded bg-fp-card-1 px-1 py-0.5 text-[11px] text-muted-foreground">
        {util}
      </code>
    </span>
  );
}

const LAYERS: { token: string; util: string; role: string }[] = [
  { token: "background", util: "bg-background", role: "Full app background = Surface Base. The rail sits flush on it." },
  { token: "rail", util: "bg-rail", role: "Tier-1 icon rail (52px). Flush with the background, no shadow." },
  { token: "sidebar / drawer", util: "bg-sidebar", role: "Tier-2 nav drawer (256px). Separates from the ground by value, no shadow." },
  { token: "fp-surface-1b", util: "bg-fp-surface-1b", role: "Content layer. rounded-md, no outer border, no shadow." },
  { token: "card", util: "bg-card", role: "Card / raised panel and every field (= Surface 1a). One step under the content layer — it separates by value, not by its border." },
  { token: "fp-card-1", util: "bg-fp-card-1", role: "Elevated inner card (a card inside a card, e.g. a Kanban lane)." },
];

export function SurfacesReference() {
  return (
    <Stack space="section" className="max-w-3xl overflow-auto pb-10">
      <div>
        <p className="text-sm text-muted-foreground">
          The FP look is a <strong>stack of surfaces</strong> that step in
          lightness. Compose every screen from these — and
          drive the color from the token, never a raw hex. Toggle the theme
          (top-right) to see the same ladder in Light and FP.
        </p>
      </div>

      {/* Live nested ladder */}
      <Stack space="title">
        <SectionHeading as="h3" title="The surface ladder (live)" />
        <div className="rounded-lg bg-background p-4">
          <Tag token="background" util="bg-background" />
          <div className="mt-3 flex gap-2">
            <div className="flex w-13 shrink-0 items-start justify-center rounded-md bg-rail py-3 text-center text-[10px] text-muted-foreground">
              rail
            </div>
            <div className="flex w-44 shrink-0 flex-col gap-2 rounded-lg bg-sidebar p-3">
              <Tag token="sidebar" util="bg-sidebar" />
              <span className="text-[11px] text-muted-foreground">drawer · no shadow</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-md bg-fp-surface-1b p-4">
              <Tag token="fp-surface-1b" util="bg-fp-surface-1b" />
              <span className="-mt-2 text-[11px] text-muted-foreground">
                content layer · no outer border, no shadow
              </span>
              <div className="rounded-lg border border-fp-outline-1 bg-card p-4">
                <Tag token="card" util="bg-card" />
                <div className="mt-3 rounded-md bg-fp-card-1 p-3">
                  <Tag token="fp-card-1" util="bg-fp-card-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Stack>

      {/* Legend / rules */}
      <Stack space="title">
        <SectionHeading as="h3" title="Each layer" />
        <div className="overflow-hidden rounded-lg border border-fp-outline-1">
          {LAYERS.map((l, i) => (
            <div
              key={l.token}
              className={`flex items-start gap-4 px-4 py-3 ${i > 0 ? "border-t border-fp-outline-1" : ""}`}
            >
              <span className="mt-0.5 size-8 shrink-0 rounded-md border border-fp-outline-1" style={surfaceStyle(l.util)} />
              <div className="min-w-0 flex-1">
                <Tag token={l.token} util={l.util} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {l.role}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Elevation: nothing in the shell casts one. The drawer and the content
          layer separate from the app ground by VALUE — the ground is the tinted
          surface-base in both themes, so each layer already reads as a step up
          from it, and a shadow on top of a real value step is a second answer
          to a question already answered.{" "}
          <code className="text-foreground">shadow-fp-surface</code> is kept for
          things that genuinely float over content: a hovered card, a popover.
        </p>
      </Stack>
    </Stack>
  );
}

/** The swatch box uses the utility's own class via a data attribute would be
    cleaner, but inline mapping keeps it dependency-free for the legend. */
function surfaceStyle(util: string): React.CSSProperties {
  const map: Record<string, string> = {
    "bg-background": "var(--background)",
    "bg-rail": "var(--rail)",
    "bg-sidebar": "var(--sidebar)",
    "bg-fp-surface-1b": "var(--fp-surface-1b)",
    "bg-card": "var(--card)",
    "bg-fp-card-1": "var(--fp-card-1)",
  };
  return { background: map[util] };
}
