import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { BannerCallout, BannerInline } from "@/components/ui/banner";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

const MSG =
  "Power your workflow with a simple, flexible platform that helps teams move faster, collaborate better, and focus on what matters";

const CALLOUTS = [
  { status: "info" as const, text: MSG },
  { status: "caution" as const, text: "Make more happen" },
  { status: "warning" as const, text: "Make more happen" },
  { status: "success" as const, text: "Make more happen" },
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
      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/50"
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
 * Type 1 (BannerCallout) is a prominent solid-fill bar with a CTA or dismiss;
 * Type 2 (BannerInline) is a compact 32px alert whose status is carried by the
 * icon + text accent. In a screen both sit at the top of the content-layer
 * body, full width, below the page header.
 */
export function BannersDemo() {
  const [showDismiss, setShowDismiss] = React.useState(true);
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
        is a prominent solid-fill callout with an optional CTA (which can
        quick-filter the section) or a dismiss; <strong>Type 2</strong> is a
        compact inline alert whose status shows in the icon + text color.
      </p>

      {/* Type 1 — Callout */}
      <Stack space="title">
        <SectionHeading as="h3" title="Type 1 — Callout" />
        <p className="-mt-1 text-xs text-muted-foreground">
          Solid status fill, white text. With a CTA the action works as a quick
          filter on the section; without one it’s dismissible.
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
