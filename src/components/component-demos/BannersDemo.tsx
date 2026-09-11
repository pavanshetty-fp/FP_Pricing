import * as React from "react";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import {
  BannerCallout,
  BannerInline,
  bannerSoftAction,
} from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

const MSG =
  "Power your workflow with a simple, flexible platform that helps teams move faster, collaborate better, and focus on what matters";

const CALLOUTS = [
  { status: "info" as const, text: MSG },
  { status: "caution" as const, text: "Make more happen" },
  { status: "warning" as const, text: "Make more happen" },
  { status: "success" as const, text: "Make more happen" },
];

/* The soft set — one per status, each a single line with one action, which is
   the shape the variant is actually for. */
const SOFTS = [
  { status: "info" as const, title: "11 orders waiting on a driver" },
  { status: "caution" as const, title: "3 sites below reorder level" },
  { status: "warning" as const, title: "2 deliveries missed their window" },
  { status: "success" as const, title: "18 orders invoiced this morning" },
];

const INLINES = [
  { status: "default" as const },
  { status: "caution" as const },
  { status: "warning" as const },
  { status: "success" as const },
];

/** The Type-1 CTA — "Action Button" with a trailing arrow and a ⌘K hint. */
function CalloutAction() {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-fp-banner-foreground outline-none transition-colors hover:bg-fp-banner-foreground/15 focus-visible:ring-2 focus-visible:ring-white/50"
    >
      Action Button
      <ArrowRight className="size-4" />
      <KbdGroup>
        <Kbd className="bg-fp-surface-1b text-muted-foreground">⌘K</Kbd>
      </KbdGroup>
    </button>
  );
}

/**
 * Banners showcase — Figma "Banners" (28149:1712). Two FP custom components:
 * Type 1 (BannerCallout) is a prominent status bar with a CTA or dismiss — a
 * solid fill in light, a near-black tint of the same hue with a coloured rim in
 * dark;
 * Type 2 (BannerInline) is a compact 32px alert whose status is carried by the
 * icon + text accent. In a screen both sit at the top of the content-layer
 * body, full width, below the page header.
 */
export function BannersDemo() {
  const [showDismiss, setShowDismiss] = React.useState(true);
  const [softOpen, setSoftOpen] = React.useState(true);
  const [inlineOpen, setInlineOpen] = React.useState<Record<string, boolean>>({
    default: true,
    caution: true,
    warning: true,
    success: true,
  });

  return (
    <Stack space="section" className="max-w-3xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        Full-width banners for section-level messages. <strong>Type 1</strong>{" "}
        is a prominent status callout with an optional CTA (which can
        quick-filter the section) or a dismiss; <strong>Type 2</strong> is a
        compact inline alert whose status shows in the icon + text color.
      </p>

      {/* Type 1 — Callout */}
      <Stack space="title">
        <SectionHeading as="h3" title="Type 1 — Callout" />
        <p className="-mt-1 text-xs text-muted-foreground">
          A solid status fill in light; in dark the fill drops to the near-black
          950 of its hue and the status moves to a 1px rim, because a saturated
          bar on a dark ground is the loudest thing on the page whatever it has
          to say. With a CTA the action works as a quick filter on the section;
          without one it’s dismissible.
        </p>
        <Stack space="body">
          {/* Info — with CTA (2-line message) */}
          <BannerCallout status="info" action={<CalloutAction />}>
            {MSG}
          </BannerCallout>
          {/* Short single-line statuses */}
          {CALLOUTS.slice(1).map((c) => (
            <BannerCallout key={c.status} status={c.status} action={<CalloutAction />}>
              {c.text}
            </BannerCallout>
          ))}
          {/* Dismissible (no CTA) */}
          {showDismiss && (
            <BannerCallout status="info" onDismiss={() => setShowDismiss(false)}>
              This is without a CTA and a banner that can be dismissed by
              clicking on the ✕ icon.
            </BannerCallout>
          )}
          {!showDismiss && (
            <button
              type="button"
              onClick={() => setShowDismiss(true)}
              className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Restore dismissed banner
            </button>
          )}
        </Stack>
      </Stack>

      {/* Type 1, soft — the low-volume form */}
      <Stack space="title">
        <SectionHeading as="h3" title="Type 1 — Soft callout" />
        <p className="-mt-1 text-xs text-muted-foreground">
          The same component at a tenth of the volume: a 10% wash of the status
          accent with a 30% rim, for a message that sits inside a working screen
          all day rather than announcing itself once. One line, everything
          centred on it, and the action is a raised tile — white in light,
          near-black in dark — because an outline button vanishes into a wash.
          The wash and the rim are alphas of the same accent the inline alert
          uses, so a soft banner and the inline beside it cannot drift apart.
        </p>
        <Stack space="body">
          {SOFTS.map((b) => (
            <BannerCallout
              key={b.status}
              status={b.status}
              variant="soft"
              title={b.title}
              action={
                <Button variant="outline" size="sm" className={bannerSoftAction}>
                  Show orders
                </Button>
              }
            />
          ))}
          {/* Same anatomy with a count and a dismiss, to show the three
              trailing slots can hold more than one thing. */}
          {softOpen ? (
            <BannerCallout
              status="warning"
              variant="soft"
              icon={<TriangleAlert />}
              title="2 deliveries missed their window"
              count={2}
              action={
                <Button variant="outline" size="sm" className={bannerSoftAction}>
                  Show orders
                </Button>
              }
              onDismiss={() => setSoftOpen(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setSoftOpen(true)}
              className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Restore dismissed banner
            </button>
          )}
        </Stack>
      </Stack>

      {/* Type 2 — Inline alert */}
      <Stack space="title">
        <SectionHeading as="h3" title="Type 2 — Inline alert" />
        <p className="-mt-1 text-xs text-muted-foreground">
          Compact 32px bar on the Card surface; status is the icon + text
          accent. Dismissible.
        </p>
        <Stack space="body">
          {INLINES.map((b) =>
            inlineOpen[b.status] ? (
              <BannerInline
                key={b.status}
                status={b.status}
                onDismiss={() =>
                  setInlineOpen((s) => ({ ...s, [b.status]: false }))
                }
              >
                Make more happen
              </BannerInline>
            ) : null
          )}
          {INLINES.some((b) => !inlineOpen[b.status]) && (
            <button
              type="button"
              onClick={() =>
                setInlineOpen({
                  default: true,
                  caution: true,
                  warning: true,
                  success: true,
                })
              }
              className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Restore dismissed alerts
            </button>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
