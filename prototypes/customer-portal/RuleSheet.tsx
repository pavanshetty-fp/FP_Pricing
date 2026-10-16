import * as React from "react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SheetField, SheetSection, SheetSteps } from "@/components/side-sheet/parts";
import { TimeWindowSlider } from "@/components/form-layout/TimeWindowSlider";
import { CELL, RecordSheet } from "../unified-view/RecordSheet";
import { HangingAdd } from "../unified-view/HangingAdd";
import { PendingStrip, type PendingItem } from "../unified-view/PendingStrip";
import { RuleFrequencyPicker } from "../unified-view/threepl/RuleFrequency";
import { DateButton, LinesTable } from "./OrderRequestSheet";
import { SHIP_TOS, blankLine, dateOfKey, todayKey } from "./orders";
import {
  LEAD_DAYS,
  OFF_DAYS,
  blankRule,
  ruleDayLabel,
  runDates,
  saveRule,
  type OffDays,
  type PortalRule,
} from "./portalRules";

/*
  CREATE (OR EDIT) A RECURRING RULE (Pavan, 2026-10-16) — one scroll, three
  sections, the rings stepper following it, as 3PL's Create recurring rule:

    1 Rule and schedule   name, the ship-to (one per rule), the 3PL frequency
                          picker, start, end after N deliveries, the window,
                          and the next four deliveries it will make
    2 What to deliver     the tanks table (multi-pick), instructions
    3 How orders are made lead days, weekends and holidays, the PO, reminders

  Nothing is gated: fill in any order; Create rule is live once the name, the
  ship-to, a day and a product are there. Editing changes only dates whose
  orders are not yet made.
*/

const SECTIONS = ["Rule and schedule", "What to deliver", "How orders are made"] as const;

export function RuleSheet({
  rule,
  seed,
  open,
  onOpenChange,
}: {
  /** The rule to edit; null to create one. */
  rule: PortalRule | null;
  /** A new rule started from a recommendation — filled in. */
  seed?: Partial<PortalRule> | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const editing = rule !== null;
  const [draft, setDraft] = React.useState<PortalRule>(() => rule ?? blankRule());
  const [focusRow, setFocusRow] = React.useState<number | undefined>();
  const [step, setStep] = React.useState(1);
  React.useEffect(() => {
    if (open) {
      setDraft(rule ? structuredClone(rule) : { ...blankRule(), ...(seed ?? {}) });
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule?.id]);
  const set = <K extends keyof PortalRule>(k: K, v: PortalRule[K]) => setDraft((d) => ({ ...d, [k]: v }));

  /* THE STEPS FOLLOW THE SCROLL (as 3PL's rule). */
  const goTo = (n: number) => {
    setStep(n);
    document.getElementById(`prule-step-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  React.useEffect(() => {
    if (!open) return;
    let body: HTMLElement | null = null;
    const spy = () => {
      if (!body) return;
      const top = body.getBoundingClientRect().top + 24;
      let at = 1;
      for (const n of [1, 2, 3]) {
        const el = document.getElementById(`prule-step-${n}`);
        if (el && el.getBoundingClientRect().top <= top) at = n;
      }
      setStep(at);
    };
    const t = window.setTimeout(() => {
      body = document.getElementById("prule-step-1")?.closest<HTMLElement>(".overflow-auto") ?? null;
      const last = document.getElementById("prule-step-3");
      if (body && last) last.style.minHeight = `${body.clientHeight - 32}px`;
      body?.addEventListener("scroll", spy, { passive: true });
      spy();
    }, 60);
    return () => {
      window.clearTimeout(t);
      body?.removeEventListener("scroll", spy);
    };
  }, [open]);

  const site = SHIP_TOS.find((s) => s.name === draft.shipTo);
  const daysPicked =
    draft.frequency.basis === "date"
      ? draft.frequency.dates.length > 0
      : draft.frequency.repeat === "cycle"
        ? (draft.frequency.cycleWeeks ?? []).some((w) => w.length > 0)
        : draft.frequency.dayMode === "daily" || draft.frequency.days.length > 0;
  const pending: PendingItem[] = [
    !draft.name.trim() && { key: "name", label: "Name the rule", target: "prule-step-1" },
    !draft.shipTo && { key: "ship", label: "Choose the ship-to", target: "prule-step-1" },
    !daysPicked && { key: "days", label: "Pick the days", target: "prule-step-1" },
    !draft.lines.some((l) => l.product) && { key: "lines", label: "Add a tank and its product", target: "prule-step-2" },
  ].filter(Boolean) as PendingItem[];
  const next = runDates(draft, 120).filter((d) => !d.skipped).slice(0, 4);
  const unused = site?.assets.find((a) => !draft.lines.some((l) => l.assetId === a.id));

  return (
    <RecordSheet
      /* WIDTH FROM ITS CONTENT — the frequency unit is the widest thing. */
      fit={{ tables: [[360 + 60 + 340 + 32], [CELL.flag, CELL.name, CELL.name, CELL.number, CELL.bin]] }}
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      editTitle=""
      createTitle={editing ? `Edit ${draft.ruleNo}` : "Create recurring rule"}
      createAction={editing ? "Save rule" : "Create rule"}
      showCancel={false}
      pending={pending}
      footerBanner={<PendingStrip pending={pending} clearLabel={editing ? "Ready to save" : "Ready to create"} />}
      onSubmit={() => {
        saveRule({ ...draft, name: draft.name.trim() }, !editing);
        toast.success(editing ? `${draft.ruleNo} saved` : `${draft.ruleNo} created — its orders arrive as drafts`);
        onOpenChange(false);
      }}
      steps={
        <SheetSteps
          variant="rings"
          steps={SECTIONS.map((label, i) => ({ value: String(i + 1), label }))}
          value={String(step)}
          onValueChange={(v) => goTo(Number(v))}
        />
      }
    >
      <section id="prule-step-1" className="flex scroll-mt-4 flex-col gap-10">
        <SheetSection title="The rule">
          <div className="grid grid-cols-2 gap-6">
            <SheetField label="Rule name" required>
              <Input value={draft.name} placeholder="e.g. Hub A weekly diesel" onChange={(e) => set("name", e.target.value)} />
            </SheetField>
            <SheetField label="Ship-to" required>
              <Combobox
                className="w-full"
                value={draft.shipTo}
                options={SHIP_TOS.map((s) => s.name)}
                placeholder="Select ship-to"
                onValueChange={(v) =>
                  setDraft((d) => {
                    const s = SHIP_TOS.find((x) => x.name === v);
                    const kept = d.lines.filter((l) => s?.assets.some((a) => a.id === l.assetId));
                    return {
                      ...d,
                      shipTo: v,
                      lines: kept.length ? kept : [blankLine()],
                      po: { ...d.po, number: d.po.number || (s?.poNumber ?? "") },
                    };
                  })
                }
              />
            </SheetField>
          </div>
        </SheetSection>

        <SheetSection title="Frequency">
          <RuleFrequencyPicker value={draft.frequency} onChange={(f) => set("frequency", f)} />
        </SheetSection>

        <SheetSection title="Runs">
          <div className="grid grid-cols-2 gap-6">
            <SheetField label="Starts" required>
              <DateButton
                label="Starts"
                value={draft.startKey}
                onChange={(k) => set("startKey", k)}
                placeholder="Select date"
                from={dateOfKey(todayKey()) ?? new Date()}
              />
            </SheetField>
            <SheetField label="Ends after">
              <div className="relative">
                <Input
                  inputMode="numeric"
                  value={draft.endAfter ?? ""}
                  placeholder="—"
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                    set("endAfter", n > 0 ? n : null);
                  }}
                  className="pr-20"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  deliveries
                </span>
              </div>
            </SheetField>
          </div>
          <TimeWindowSlider
            label="Delivery window"
            required
            start={draft.windowStart}
            end={draft.windowEnd}
            onChange={(a, b) => setDraft((d) => ({ ...d, windowStart: a, windowEnd: b }))}
          />
          {/* THE NEXT FOUR IT WILL MAKE — said before it is saved. */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Next 4 deliveries</span>
            <div className="grid grid-cols-4 gap-2">
              {next.length === 0 ? (
                <span className="col-span-4 text-sm text-muted-foreground">Pick the days to see them.</span>
              ) : (
                next.map((d) => {
                  const l = ruleDayLabel(d.key);
                  return (
                    <div key={d.key} className="flex flex-col rounded-md border border-fp-outline-1 px-3 py-2">
                      <span className="text-sm text-foreground">{l.title}</span>
                      <span className="text-xs text-muted-foreground">{l.description}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </SheetSection>
      </section>

      <section id="prule-step-2" className="flex scroll-mt-4 flex-col gap-10">
        <SheetSection
          title="What to deliver"
          flush
          hanging={
            unused ? (
              <HangingAdd
                label="Add tank or asset"
                onClick={() => {
                  setFocusRow(draft.lines.length);
                  set("lines", [...draft.lines, blankLine()]);
                }}
              />
            ) : undefined
          }
        >
          {draft.shipTo ? (
            <LinesTable lines={draft.lines} shipTo={draft.shipTo} focusRow={focusRow} onChange={(lines) => set("lines", lines)} />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Choose the ship-to above to add its tanks.</p>
          )}
        </SheetSection>
        <SheetSection title="Instructions">
          <Textarea
            aria-label="Instructions"
            value={draft.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            className="min-h-20"
          />
        </SheetSection>
      </section>

      <section id="prule-step-3" className="flex scroll-mt-4 flex-col gap-10">
        <SheetSection title="How orders are made">
          <div className="grid grid-cols-2 gap-6">
            <SheetField label="Make each order">
              <Combobox
                className="w-full"
                value={`${draft.leadDays} days before`}
                options={LEAD_DAYS.map((n) => `${n} days before`)}
                searchThreshold={99}
                onValueChange={(v) => v && set("leadDays", Number(v.split(" ")[0]))}
              />
            </SheetField>
            <SheetField label="On a weekend or holiday">
              <Combobox
                className="w-full"
                value={OFF_DAYS.find((o) => o.value === draft.offDays)!.label}
                options={OFF_DAYS.map((o) => o.label)}
                searchThreshold={99}
                onValueChange={(v) => {
                  const o = OFF_DAYS.find((x) => x.label === v);
                  if (o) set("offDays", o.value as OffDays);
                }}
              />
            </SheetField>
            <SheetField label="PO number">
              <div className="flex flex-col gap-2">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={draft.po.mode}
                  onValueChange={(v) => v && set("po", { ...draft.po, mode: v as "standing" | "each" })}
                  aria-label="PO number"
                  className="h-7 w-fit"
                >
                  <ToggleGroupItem value="standing" className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium">
                    One standing PO
                  </ToggleGroupItem>
                  <ToggleGroupItem value="each" className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium">
                    Each order asks
                  </ToggleGroupItem>
                </ToggleGroup>
                {draft.po.mode === "standing" && (
                  <Input
                    value={draft.po.number}
                    placeholder="Enter PO number"
                    aria-label="Standing PO number"
                    onChange={(e) => set("po", { ...draft.po, number: e.target.value })}
                  />
                )}
              </div>
            </SheetField>
            <SheetField label="Reminders">
              <label className="flex min-h-9 w-fit cursor-pointer items-center gap-2.5 text-sm text-foreground">
                Tell me as each order is made
                <Switch checked={draft.remind} onCheckedChange={(on) => set("remind", on)} />
              </label>
            </SheetField>
          </div>
        </SheetSection>
      </section>
    </RecordSheet>
  );
}
