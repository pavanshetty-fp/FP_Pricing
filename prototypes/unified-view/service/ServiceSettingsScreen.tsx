import * as React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TableCellSelect,
  TableRequiredLabel,
} from "@/components/form-layout/table-cells";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SETTINGS,
  SETTINGS_PROFILES,
  applyServiceProfile,
  setServiceSetting,
  useServiceSettings,
  type ReturnMode,
  type ServiceSettings,
} from "./settings";

/**
 * THE SERVICE MODULE'S SWITCH POINTS — a Setting · Value table (2026-10-07).
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

/* A SETTING · VALUE TABLE, CHECKBOXES NOT SWITCHES (Pavan, 2026-10-07 — ux
   §Tables): the Sales Preferences table's shape, full width. A settings page
   is the one place where saying what an option does is the content, so each
   setting keeps its line under the name. Nothing is added or removed here, so
   there is no add and no delete column. */
const TH = "px-3 py-2.5 text-left";
const ROW = "border-b border-border last:border-b-0";

function SettingRow({
  title,
  description,
  value,
  cell,
  nested,
  disabled,
}: {
  title: string;
  description: React.ReactNode;
  value: React.ReactNode;
  /** The value is a table cell control that fills the cell. */
  cell?: boolean;
  /** A setting that only means anything while its parent is on. */
  nested?: boolean;
  disabled?: boolean;
}) {
  return (
    <tr className={ROW}>
      <td className={cn("px-3 py-3 align-top", nested && "pl-9", disabled && "opacity-50")}>
        <p className="text-sm text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </td>
      <td className={cell ? "relative p-0" : "px-3 py-3 align-top"}>{value}</td>
    </tr>
  );
}

const RETURN_MODES: { key: ReturnMode; label: string; detail: string }[] = [
  {
    key: "rollover",
    label: "Roll over to the next day",
    detail:
      "The same order, same technician, the next day. It stays Assigned and shows Parts pending.",
  },
  {
    key: "neworder",
    label: "Complete it; the rest is a linked order",
    detail:
      "This order is complete. The rest becomes a new Open order with no technician or date, carrying the notes, linked both ways.",
  },
  {
    key: "queue",
    label: "Complete it; queue the rest",
    detail:
      "This order is complete. The rest waits in the queue as a Parts pending order for the dispatcher. No link.",
  },
];

function sameSettings(a: ServiceSettings, b: ServiceSettings) {
  return (Object.keys(a) as (keyof ServiceSettings)[]).every((k) => a[k] === b[k]);
}

export function ServiceSettingsScreen() {
  const cfg = useServiceSettings();
  const activeProfile = SETTINGS_PROFILES.find((p) => sameSettings(cfg, p.settings));
  type Flag = { [K in keyof ServiceSettings]: ServiceSettings[K] extends boolean ? K : never }[keyof ServiceSettings];
  const check = (key: Flag, label: string, disabled?: boolean) => (
    <Checkbox
      checked={cfg[key]}
      disabled={disabled}
      aria-label={label}
      onCheckedChange={(v) => setServiceSetting(key, v === true)}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* THE FULL CONTENT WIDTH (Pavan, 2026-10-07): no max-width cap. */}
        <div className="pb-8">
          <p className="text-sm text-muted-foreground">
            These are not preferences. Each one turns a whole step of the flow on
            or off, and the board, the order sheet and the field app change
            with them.
          </p>

          {/* THE TWO ENDS OF THE RANGE, as one click each. Eight settings is
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

          {/* T2 — the table is its own box, on the page, not in a card. */}
          <div
            data-table-variant="T2"
            className="mt-6 overflow-x-auto rounded-md border border-fp-outline-1"
          >
            <table className="w-full min-w-[720px] table-fixed border-collapse">
              <colgroup>
                <col />
                <col className="w-[32%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-fp-table-header">
                  <th className={TH}>
                    <TableRequiredLabel>Setting</TableRequiredLabel>
                  </th>
                  <th className={TH}>
                    <TableRequiredLabel>Value</TableRequiredLabel>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* FIRST, BECAUSE IT DECIDES WHETHER THERE IS A FIELD STEP AT
                    ALL. Everything below it describes what happens to work
                    once it has been recorded; this one says WHO records it. */}
                <SettingRow
                  title="Service technician app"
                  description="On: assigned orders flow to the technician's field app for on-site completion — arrive, quote, then do it now or defer for a part. Off: handled by hand from the order sheet — dispatch records the completed work, with no field app and no on-site quote."
                  value={check("techApp", "Service technician app")}
                />
                <SettingRow
                  nested
                  disabled={!cfg.techApp}
                  title="Field quoting"
                  description={
                    cfg.techApp
                      ? "On: before starting, the technician sends the customer a quote — parts plus fees — for approval on site. Off: no quote step; work starts straight from dispatch and everything settles on the invoice afterwards."
                      : "A quote can only be sent from the field, so this needs the technician app."
                  }
                  value={check("fieldQuote", "Field quoting", !cfg.techApp)}
                />
                <SettingRow
                  title="Native billing"
                  description="On: the invoice writes itself the moment a job is approved — parts, actual labor and fees. Off: the costs are still captured, but somebody raises the invoice by hand. Either way it reaches accounting on a batch sync afterwards, not in real time."
                  value={check("nativeBilling", "Native billing")}
                />
                <SettingRow
                  title="Service cost feeds asset payback"
                  description="On: what a job costs rolls into the asset's return picture. Off: service is not part of how an asset's payback is worked out."
                  value={check("roiFeed", "Service cost feeds asset payback")}
                />
                <SettingRow
                  title="Manager approval required"
                  description="On: finished work waits in Needs approval for a service manager to sign it off before it can be billed. Off: it approves itself the moment the technician submits, and the lane is never used."
                  value={check("managerApproval", "Manager approval required")}
                />
                <SettingRow
                  title="Price book"
                  description="On: choosing a work type brings its usual parts and a suggested fee with it, as editable lines rather than silently. Off: parts and fees are typed by hand, or handled by product codes in the ERP."
                  value={check("priceBook", "Price book")}
                />
                <SettingRow
                  title="Portal intake"
                  description="On: customers can raise a job themselves, and 'Portal request' is offered as an intake source. Off: every job is keyed here, from a call, a rep, or a flagged inspection."
                  value={check("portalIntake", "Portal intake")}
                />
                {/* THE ONE SETTING THAT IS A CHOICE, NOT A YES/NO (Pavan,
                    2026-09-23) — a dropdown in its value cell (2026-10-07). */}
                <SettingRow
                  title="When a visit cannot fit everything"
                  description={
                    RETURN_MODES.find((m) => m.key === cfg.returnMode)?.detail
                  }
                  cell
                  value={
                    <TableCellSelect
                      value={
                        RETURN_MODES.find((m) => m.key === cfg.returnMode)?.label ?? ""
                      }
                      options={RETURN_MODES.map((m) => m.label)}
                      searchThreshold={99}
                      aria-label="When a visit cannot fit everything"
                      onChange={(v) => {
                        const m = RETURN_MODES.find((x) => x.label === v);
                        if (m) setServiceSetting("returnMode", m.key);
                      }}
                    />
                  }
                />
              </tbody>
            </table>
          </div>

          {/* THE ONE RULE THAT IS NOT A SETTING, said where the settings are —
              it is what half of them are about. */}
          <div className="mt-6 rounded-lg border border-fp-outline-1 bg-fp-card-1 p-5">
            <p className="text-sm font-medium text-foreground">Quote and invoice</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              A quote is parts and the predefined fee, sent and approved on site{" "}
              <em>before</em> the work starts. An invoice is raised{" "}
              <em>after</em> it and may come to more — actual labour hours
              and anything extra the job turned out to need. The gap
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
