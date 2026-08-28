import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/*
  Settings page archetype — the fourth of the source app's five page shapes, and
  the one the DS has no composed pattern for yet.

  Anatomy: a left section nav (Tier-3, inside the content layer — it is NOT the
  Tier-2 sidebar, which this workspace does not have) + one section panel at a
  time. Sections switch rather than scroll: with a handful of short sections a
  scroll-spy costs more than it returns, and switching keeps the save footer
  bound to exactly the fields on screen.

  DS FOLLOW-UP: nothing here is Profile- or Settings-specific. If a second app
  needs a settings page, this belongs beside `form-layout/` in the DS as
  `SettingsLayout`, with the section list as its only required prop.
*/

export interface SettingsSection {
  key: string;
  label: string;
  icon?: React.ReactNode;
  /** Section heading shown above the panel. Defaults to `label`. */
  title?: string;
  /** One line under the heading saying what the section governs. */
  description?: string;
  content: React.ReactNode;
}

export interface SettingsPageProps {
  sections: SettingsSection[];
  /** Enables the save footer. Left out, the page is read-only. */
  onSave?: () => void;
  /** Save is live only when something changed. */
  dirty?: boolean;
  onDiscard?: () => void;
}

export function SettingsPage({
  sections,
  onSave,
  dirty = false,
  onDiscard,
}: SettingsPageProps) {
  const [activeKey, setActiveKey] = React.useState(sections[0]?.key ?? "");
  const active =
    sections.find((s) => s.key === activeKey) ?? sections[0] ?? null;
  if (!active) return null;

  return (
    <div className="flex min-h-0 flex-1 gap-6">
      {/* Section nav — 200px, its own scroll, no surface of its own: the
          content layer is already a panel and a second fill would stack.
          Suppressed at one section: a nav with a single destination is chrome
          that decides nothing. */}
      {sections.length > 1 && (
      <nav
        aria-label="Settings sections"
        className="flex w-50 shrink-0 flex-col gap-1 overflow-y-auto"
      >
        {sections.map((s) => {
          const on = s.key === active.key;
          return (
            <button
              key={s.key}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => setActiveKey(s.key)}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4",
                on
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {s.icon}
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </nav>
      )}

      {/* Panel — one section. Capped at 640px so form rows stay readable on a
          full-width content layer; the cap is the DS's narrow-sheet width plus
          its two 40px gutters, not a new number. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex max-w-160 flex-col gap-6 pb-2">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-foreground">
                {active.title ?? active.label}
              </h2>
              {active.description && (
                <p className="text-sm text-muted-foreground">
                  {active.description}
                </p>
              )}
            </div>
            {active.content}
          </div>
        </div>

        {/* The footer belongs to the form column, so its rule stops where the
            fields do — a full-width rule under a 640px column read as a page
            divider with the buttons floating in the middle of it. */}
        {onSave && (
          <div className="max-w-160 shrink-0 pt-4">
            <Separator className="mb-4" />
            <div className="flex items-center justify-end gap-3">
              {onDiscard && (
                <Button variant="outline" disabled={!dirty} onClick={onDiscard}>
                  Discard
                </Button>
              )}
              <Button disabled={!dirty} onClick={onSave}>
                Save changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
