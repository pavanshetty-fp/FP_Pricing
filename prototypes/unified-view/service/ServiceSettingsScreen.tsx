import * as React from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_SETTINGS,
  SETTINGS_PROFILES,
  applyServiceProfile,
  setServiceSetting,
  useServiceSettings,
  type ServiceSettings,
} from "./settings";

/**
 * THE SERVICE MODULE'S SWITCH POINTS.
 *
 * NOT PREFERENCES. Each of these turns a whole step of the flow on or off —
 * whether there is a field app at all, whether a job is quoted before it is
 * done, whether a manager signs it off, whether an invoice writes itself. The
 * descriptions say what happens in BOTH positions, because a switch whose
 * off-state is unstated is one nobody dares move.
 *
 * WHY IT IS HERE AND NOT IN THE APP'S SETTINGS. The global Settings page will
 * govern several modules and has been held back pending that; these belong to
 * this module, so they sit inside it.
 */

function SwitchRow({
  title,
  description,
  checked,
  onChange,
  nested,
  disabled,
  disabledNote,
}: {
  title: string;
  description: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  /** A switch that only means anything while its parent is on. */
  nested?: boolean;
  disabled?: boolean;
  disabledNote?: string;
}) {
  const id = React.useId();
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-8 border-b border-fp-outline-1 py-4 last:border-b-0",
        /* THE INDENT AND THE RULE ARE THE ONLY THINGS SAYING "UNDER" — the
           same device the column and card-field menus use. */
        nested && "ml-2 border-l border-fp-outline-1 py-3 pl-5",
        disabled && "opacity-50"
      )}
    >
      <div className="max-w-xl">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {title}
        </Label>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {disabled && disabledNote && (
          <p className="mt-1 text-sm text-muted-foreground">{disabledNote}</p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}

function sameSettings(a: ServiceSettings, b: ServiceSettings) {
  return (Object.keys(a) as (keyof ServiceSettings)[]).every((k) => a[k] === b[k]);
}

export function ServiceSettingsScreen() {
  const cfg = useServiceSettings();
  const activeProfile = SETTINGS_PROFILES.find((p) => sameSettings(cfg, p.settings));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="max-w-4xl pb-8">
          <p className="text-sm text-muted-foreground">
            These are not preferences. Each one turns a whole step of the flow on
            or off, and the board, the order sheet and the field app change
            with them.
          </p>

          {/* THE TWO ENDS OF THE RANGE, as one click each. Eight switches is
              eight decisions; the two configurations the module was shaped
              around are worth being able to reach without making all eight. */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {SETTINGS_PROFILES.map((p) => (
              <Button
                key={p.key}
                variant={activeProfile?.key === p.key ? "default" : "outline"}
                onClick={() => applyServiceProfile(p.settings)}
              >
                {p.name}
              </Button>
            ))}
            <span className="text-sm text-muted-foreground">
              {activeProfile
                ? activeProfile.detail
                : "A configuration of your own — neither named profile."}
            </span>
          </div>

          <div className="mt-6 rounded-lg border border-fp-outline-1 bg-fp-surface-1a px-5">
            {/* FIRST, BECAUSE IT DECIDES WHETHER THERE IS A FIELD STEP AT ALL.
                Everything below it describes what happens to work once it has
                been recorded; this one says WHO records it and where. */}
            <SwitchRow
              title="Service technician app"
              description="On: assigned orders flow to the technician's field app for on-site completion — arrive, quote, then do it now or defer for a part. Off: handled by hand from the order sheet — dispatch records the completed work, with no field app and no on-site quote."
              checked={cfg.techApp}
              onChange={(v) => setServiceSetting("techApp", v)}
            />
            <SwitchRow
              nested
              disabled={!cfg.techApp}
              disabledNote="A quote can only be sent from the field, so this needs the technician app."
              title="Field quoting"
              description="On: before starting, the technician sends the customer a quote — parts plus fees — for approval on site. Off: no quote step; work starts straight from dispatch and everything settles on the invoice afterwards."
              checked={cfg.fieldQuote}
              onChange={(v) => setServiceSetting("fieldQuote", v)}
            />
            <SwitchRow
              title="Native billing"
              description="On: the invoice writes itself the moment a job is approved — parts, actual labour, mileage and fees. Off: the costs are still captured, but somebody raises the invoice by hand. Either way it reaches accounting on a batch sync afterwards, not in real time."
              checked={cfg.nativeBilling}
              onChange={(v) => setServiceSetting("nativeBilling", v)}
            />
            <SwitchRow
              title="Service cost feeds asset payback"
              description="On: what a job costs rolls into the asset's return picture. Off: service is not part of how an asset's payback is worked out."
              checked={cfg.roiFeed}
              onChange={(v) => setServiceSetting("roiFeed", v)}
            />
            <SwitchRow
              title="Manager approval required"
              description="On: finished work waits in Needs approval for a service manager to sign it off before it can be billed. Off: it approves itself the moment the technician submits, and the lane is never used."
              checked={cfg.managerApproval}
              onChange={(v) => setServiceSetting("managerApproval", v)}
            />
            <SwitchRow
              title="Price book"
              description="On: choosing a work type brings its usual parts and a suggested fee with it, as editable lines rather than silently. Off: parts and fees are typed by hand, or handled by product codes in the ERP."
              checked={cfg.priceBook}
              onChange={(v) => setServiceSetting("priceBook", v)}
            />
            <SwitchRow
              title="Portal intake"
              description="On: customers can raise a job themselves, and 'Portal request' is offered as an intake source. Off: every job is keyed here, from a call, a rep, or a flagged inspection."
              checked={cfg.portalIntake}
              onChange={(v) => setServiceSetting("portalIntake", v)}
            />
            {/* THE ONE SETTING THAT IS A CHOICE, NOT A SWITCH (Pavan,
                2026-09-23). It had no control at all — the value existed, four
                screens read it, and nobody could change it, which is the
                quietest way for a setting to be wrong everywhere at once.

                TWO OPTIONS, SPELLED OUT, because the difference is not a
                degree of the same thing: one keeps a single reference for one
                fault, the other makes the second visit a piece of work in its
                own right. A toggle labelled "linked" would make the reader
                guess which. */}
            <div className="flex flex-col gap-3 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium text-foreground">
                  When a visit cannot fit everything
                </p>
                <p className="text-sm text-muted-foreground">
                  The work that happened stays on the order, with the labour it
                  took. Where the parts still owed go is this choice.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {(
                  [
                    [
                      "suborder",
                      "A sub-order under the same number",
                      "SO-1045-2. One fault, one reference, two visits — the customer rings about SO-1045 and it is all the same conversation.",
                    ],
                    [
                      "neworder",
                      "A new order of its own",
                      "Its own number, linked back. Right where the second visit is scheduled, staffed and invoiced as separate work.",
                    ],
                  ] as const
                ).map(([key, title, detail]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setServiceSetting("returnMode", key)}
                    className={cn(
                      "flex items-start gap-3 rounded-md border p-3 text-left transition-colors",
                      cfg.returnMode === key
                        ? "border-primary bg-accent"
                        : "border-fp-outline-1 hover:bg-accent/50"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                        cfg.returnMode === key
                          ? "border-primary"
                          : "border-fp-outline-2"
                      )}
                    >
                      {cfg.returnMode === key && (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm text-foreground">{title}</span>
                      <span className="text-xs text-muted-foreground">
                        {detail}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* A NUMBER AMONG SWITCHES, and it belongs here anyway (Pavan,
                2026-09-23). It answers the same kind of question the switches
                do — what does this yard assume, so nobody has to type it —
                and a settings page that sent one default somewhere else would
                be a second place to look. */}
            <div className="flex items-start justify-between gap-6 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium text-foreground">
                  Standard trip
                </p>
                <p className="text-sm text-muted-foreground">
                  Pre-filled as the mileage on every new job, and editable on
                  any of them. Zero leaves the field empty, which is the right
                  answer where no two jobs are the same distance.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={cfg.defaultMileage === 0 ? "" : cfg.defaultMileage}
                  placeholder="0"
                  onChange={(e) =>
                    setServiceSetting(
                      "defaultMileage",
                      Math.max(0, Number(e.target.value) || 0)
                    )
                  }
                  className="w-24 tabular-nums"
                  aria-label="Standard trip in miles"
                />
                <span className="text-sm text-muted-foreground">mi</span>
              </div>
            </div>
          </div>

          {/* THE ONE RULE THAT IS NOT A SWITCH, said where the switches are —
              it is what half of them are about. */}
          <div className="mt-6 rounded-lg border border-fp-outline-1 bg-fp-card-1 p-5">
            <p className="text-sm font-medium text-foreground">Quote and invoice</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              A quote is parts and the predefined fee, sent and approved on site{" "}
              <em>before</em> the work starts. An invoice is raised{" "}
              <em>after</em> it and may come to more — actual labour hours,
              mileage, and anything extra the job turned out to need. The gap
              between the two is not an error, and both stay on the order so a
              customer can be shown either.
            </p>
          </div>

          {!sameSettings(cfg, DEFAULT_SETTINGS) && (
            <div className="mt-5">
              <Button
                variant="ghost"
                onClick={() => applyServiceProfile(DEFAULT_SETTINGS)}
              >
                Reset to defaults
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
