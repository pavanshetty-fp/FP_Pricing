import * as React from "react";
import { DeliveryWindowTimeline } from "../DeliveryWindowTimeline";
import { ChevronDown, Eye, Plus, Trash2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CELL, RecordSheet } from "../RecordSheet";
import { SheetSteps } from "@/components/side-sheet/parts";
import { Combobox } from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TokenMultiSelect } from "../TokenMultiSelect";
import { HangingAdd } from "../HangingAdd";
import {
  formatMinutes,
  parseWindow,
  TableCellCombobox,
  TableCellInput,
  TableCellSelect,
  TableRequiredLabel,
} from "@/components/form-layout";
import { TableRowRemove } from "@/components/form-layout/table-cells";
import { siteTank } from "./tankMonitors";
import { PendingStrip } from "../PendingStrip";
import { dateKeyOf, startOfDay } from "../data";
import { CUSTOMERS } from "../customers";
import {
  LOADING_ACCOUNTS,
  PRODUCTS,
  suppliersOf,
  terminalsOf,
  defaultLineCharges,
  type LoadingAccount,
  type OrderLine,
} from "./orders";
import { VENDORS } from "./vendors";
import { RuleRecommendations } from "./RuleRecommendations";
import { JOB_TYPES, type JobType } from "./orders";
import {
  RuleFrequencyPicker,
  blankFrequency,
  toSchedule,
  NextDeliveries,
  nextHits,
  type RuleFrequency,
} from "./RuleFrequency";
import {
  canServe,
  clashesFor,
  reachableTargets,
  siteByName,
  type ProgramTarget,
  type RecurringProgram,
} from "./recurringPrograms";

/*
  CREATING A PROGRAMME — two steps, and the order of them is the whole design.

  THE COMMON DETAILS COME FIRST BECAUSE THEY DECIDE THE SECOND STEP. The
  partner fixes which sites can be on the programme at all, and the product
  fixes which tanks at those sites are worth filling. Asking for customers
  first — the way every other create form in this app does — would mean
  offering a list and then taking half of it away, which is the one thing a
  picker must never do.

  SO THE STEPS ARE NOT "GENERAL THEN DETAIL". They are cause then effect, and
  the second step is genuinely unanswerable until the first is done. That is
  why step two is unreachable rather than merely empty.

  THE MANDATORY STRIP IS THE 3PL SHEET'S, not a new device: the footer act is
  dead until the record can exist, and the reason sits beside the button
  rather than on it.

  AUTOSAVE, AND STILL A CREATE ACT. The draft is kept from the first thing
  typed — close it and come back and it is as you left it — but a programme
  does not EXIST until somebody says so, because the moment it does it starts
  asking a partner to price lanes.
*/

export interface ProgramDraft {
  /**
   * WHAT THIS RULE IS CALLED. Defaults to its own code so the field is never
   * empty and never blocking — a rule can exist without anybody naming it —
   * and a reader running forty of them can rename the three they touch.
   */
  name: string;
  /**
   * BROKERAGE OR OUR OWN FLEET, and it is the first real question: a
   * first-party rule has no partner, so the partner gate and everything
   * downstream of it simply does not apply.
   */
  jobType: JobType;
  /**
   * EVERY PARTNER THE REQUEST GOES TO. A rule can be put out to several at
   * once — each lane it generates is offered to all of them and priced by
   * whoever answers — so the gate is the union of what they can reach.
   */
  vendorIds: string[];
  /** One rule can carry several products; the tanks offered follow them. */
  products: string[];
  /** Which of those go out as a winter blend — mapped per product, not per rule. */
  winterProducts: string[];
  frequency: RuleFrequency;
  loadOrder: boolean;
  /**
   * A ROW PER LOADING ACCOUNT (Pavan, 2026-09-25). An account carries several
   * products and may load from several terminals and suppliers, so the rule
   * picks accounts; the terminals, suppliers and products are the account's.
   */
  loadRows: { loadingAccount: string }[];
  startKey: string;
  signatureOnDelivery: boolean;
  targets: ProgramTarget[];
}

/** `P-` plus five digits. Shown in the name field from the first render. */
export function newProgramCode(): string {
  return `P-${Math.floor(20_000 + Math.random() * 79_999)}`;
}

export function blankProgramDraft(): ProgramDraft {
  return {
    name: newProgramCode(),
    jobType: "Brokerage",
    vendorIds: [],
    products: [],
    winterProducts: [],
    frequency: blankFrequency(),
    /* OFF UNTIL ASKED FOR (Pavan, 2026-10-16). */
    loadOrder: false,
    loadRows: [],
    startKey: dateKeyOf(startOfDay(new Date())),
    signatureOnDelivery: false,
    targets: [],
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Card({
  title,
  aside,
  flush,
  hanging,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  /** For content that is itself a table — the card's edge is its edge. */
  flush?: boolean;
  /** The add that hangs off the card's bottom-left — DS ui §10f. */
  hanging?: React.ReactNode;
  children: React.ReactNode;
}) {
  const card = (
    <section
      className={cn(
        "shrink-0 overflow-hidden rounded-md border border-fp-outline-1",
        hanging && "rounded-bl-none"
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-3",
          children ? "border-b border-fp-outline-1" : undefined
        )}
      >
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {aside}
      </header>
      {children ? <div className={flush ? undefined : "p-4"}>{children}</div> : null}
    </section>
  );
  return hanging ? (
    <div className="flex shrink-0 flex-col">
      {card}
      <div className="flex w-full items-center justify-between gap-4">
        {hanging}
      </div>
    </div>
  ) : (
    card
  );
}

/* ---------------------------------------------------------------------------
 * Step 2 — the sites, and what each one takes
 * ------------------------------------------------------------------------ */

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/** A blank line — the product filled in when the rule has only one. */
const blankLine = (products: string[]): OrderLine => ({
  asset: "",
  product: products.length === 1 ? products[0] : "",
  gal: null,
  topOff: true,
  charges: defaultLineCharges(),
});

/**
 * ONE SHIP-TO, AND WHAT IT TAKES (Pavan, 2026-10-01) — the Delivery Order's
 * own table: Asset · Product · Top off · Qty, with Add asset hanging off it.
 * The product list is the rule's products only; picking a known asset fills
 * its product, the same as on an order.
 */
function TargetEditor({
  target,
  products,
  accounts,
  onChange,
}: {
  target: ProgramTarget;
  products: string[];
  /** The rule's loading accounts, when it creates load orders — each line
      then picks its account and supplier (Pavan, 2026-10-16). */
  accounts: LoadingAccount[] | null;
  onChange: (next: ProgramTarget) => void;
}) {
  const loads = accounts !== null && accounts.length > 0;
  const allTop = target.lines.length > 0 && target.lines.every((l) => l.topOff);
  const someTop = target.lines.some((l) => l.topOff);
  const site = siteByName(target.shipTo);
  const siteAssets = site?.assets ?? [];
  /* The site's tanks that take one of the rule's products come first. */
  const assetOptions = [
    ...new Set(
      [
        ...siteAssets.filter((a) => products.includes(a.product)),
        ...siteAssets.filter((a) => !products.includes(a.product)),
      ].map((a) => a.name)
    ),
  ];
  const [focusLine, setFocusLine] = React.useState<number | null>(null);
  /** Does this asset at the ship-to report its level? */
  const hasMonitor = (name: string) => {
    const a = siteAssets.find((x) => x.name === name);
    return a ? siteTank(target.shipTo, a.name, a.product, a.rental, a.monitor).monitor : true;
  };

  const setLine = (i: number, patch: Partial<OrderLine>) =>
    onChange({
      ...target,
      lines: target.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)),
    });
  const addLine = () => {
    setFocusLine(target.lines.length);
    onChange({ ...target, lines: [...target.lines, blankLine(products)] });
  };
  const removeLine = (i: number) =>
    onChange({ ...target, lines: target.lines.filter((_, j) => j !== i) });

  return (
    <div className="flex flex-col gap-2">

      <div className="flex flex-col">
        <div
          data-table-variant="T2"
          className="overflow-hidden rounded-md rounded-bl-none border border-fp-outline-1"
        >
          <table className="w-full table-fixed border-collapse">
            {/* AS THE DELIVERY ORDER (Pavan, 2026-11-12): QTY AND TOP OFF
                RIGHT AFTER THE PRODUCT, then the load's account and supplier;
                ticks left-aligned under the select-all (2026-11-13); the bin a sticky
                layer at the right edge. */}
            <colgroup>
              <col className={loads ? "w-[22%]" : "w-[34%]"} />
              <col className={loads ? "w-[18%]" : "w-[30%]"} />
              <col />
              {/* TOP OFF FITS ITS HEADER — as the delivery order. */}
              <col className="w-[96px]" />
              {loads && <col className="w-[18%]" />}
              {loads && <col className="w-[16%]" />}
              <col className="w-[52px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-fp-table-header">
                <th className="px-3 py-2.5 text-left">
                  <TableRequiredLabel>Asset</TableRequiredLabel>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <TableRequiredLabel required>Product</TableRequiredLabel>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <TableRequiredLabel>Qty (gal)</TableRequiredLabel>
                </th>
                {/* TOP OFF, THEN ITS SELECT-ALL; every row's tick sits under
                    this one (Pavan, 2026-10-16). */}
                <th className="px-3 py-2.5 text-left" data-qty-after-product>
                  <span className="flex items-center gap-2">
                    <Checkbox
                      checked={allTop ? true : someTop ? "indeterminate" : false}
                      aria-label="Top off every line"
                      onCheckedChange={(c) =>
                        onChange({
                          ...target,
                          lines: target.lines.map((l) => ({
                            ...l,
                            topOff: c === true,
                            gal: c === true ? null : l.gal,
                          })),
                        })
                      }
                    />
                    <TableRequiredLabel>Top off</TableRequiredLabel>
                  </span>
                </th>
                {loads && (
                  <th className="px-3 py-2.5 text-left">
                    <TableRequiredLabel>Loading account</TableRequiredLabel>
                  </th>
                )}
                {loads && (
                  <th className="px-3 py-2.5 text-left">
                    <TableRequiredLabel>Supplier</TableRequiredLabel>
                  </th>
                )}
                <th aria-hidden className="sticky right-0 z-10 border-l border-border bg-fp-table-header" />
              </tr>
            </thead>
            <tbody>
              {target.lines.map((line, i) => {
                const asset = siteAssets.find((a) => a.name === line.asset);
                return (
                  <tr
                    key={i}
                    className="group/row h-11 border-b border-border last:border-b-0"
                  >
                    <td className="relative p-0">
                      {asset?.rental && (
                        <span className="pointer-events-none absolute top-1/2 right-8 z-10 -translate-y-1/2">
                          <Pill>Rental</Pill>
                        </span>
                      )}
                      <TableCellCombobox
                        value={line.asset}
                        options={assetOptions}
                        taken={target.lines.map((l) => l.asset)}
                        placeholder={target.shipTo ? "Select asset" : "Select a ship-to first"}
                        disabled={!target.shipTo}
                        creatable
                        /* AS THE DELIVERY ORDER (Pavan, 2026-10-26) — only a
                           tank without a monitor carries a tag; the tabs
                           narrow the list first. */
                        optionTag={(name) => (hasMonitor(name) ? null : <Pill className="shrink-0">No monitor</Pill>)}
                        groups={[
                          { label: "Tank monitor", has: (name) => hasMonitor(name) },
                          { label: "No tank monitor", has: (name) => !hasMonitor(name) },
                        ]}
                        autoFocus={i === focusLine}
                        aria-label={`Asset for line ${i + 1}`}
                        onChange={(name) => {
                          const known = siteAssets.find((a) => a.name === name);
                          setLine(i, {
                            asset: name,
                            /* A known tank's product, if the rule carries it. */
                            product:
                              known && products.includes(known.product)
                                ? known.product
                                : line.product,
                            rental: known?.rental ?? false,
                          });
                        }}
                        /* SEVERAL AT ONCE MAKES ROWS, FROM ANY ROW (DS ui §10f;
                           2026-10-26): the row's own asset opens ticked —
                           kept, the row stays and the rest are added under it. */
                        multiple={{
                          onApply: (names) => {
                            const lines = [...target.lines];
                            const keeps = Boolean(line.asset) && names.includes(line.asset);
                            const rest = keeps ? names.filter((n) => n !== line.asset) : names;
                            lines.splice(
                              i,
                              1,
                              ...(keeps ? [line] : []),
                              ...rest.map((name) => {
                                const known = siteAssets.find((a) => a.name === name);
                                return {
                                  ...blankLine(products),
                                  topOff: line.topOff,
                                  asset: name,
                                  product: known && products.includes(known.product) ? known.product : line.product,
                                  rental: known?.rental ?? false,
                                };
                              })
                            );
                            onChange({ ...target, lines });
                          },
                        }}
                      />
                    </td>
                    <td className="relative p-0">
                      {/* ONE VALUE — the product going into this line's asset, not a row of its own (DS ui §10f). */}
                      <TableCellSelect
                        value={line.product}
                        options={products}
                        placeholder="Select product"
                        aria-label={`Product for line ${i + 1}`}
                        onChange={(v) => setLine(i, { product: v })}
                      />
                    </td>
                    <td className="relative p-0">
                      <TableCellInput
                        value={
                          line.topOff ? "" : line.gal != null ? String(line.gal) : ""
                        }
                        placeholder={line.topOff ? "Top off" : "0"}
                        disabled={line.topOff}
                        numeric
                        aria-label={`Gallons for line ${i + 1}`}
                        onChange={(v) =>
                          setLine(i, {
                            gal: Number(v.replace(/[^0-9]/g, "")) || null,
                          })
                        }
                      />
                    </td>
                    <td className="px-3">
                      <span className="flex justify-start">
                      <Checkbox
                        checked={Boolean(line.topOff)}
                        onCheckedChange={(c) =>
                          setLine(i, {
                            topOff: c === true,
                            gal: c === true ? null : line.gal,
                          })
                        }
                        aria-label={`Top off ${line.asset || `line ${i + 1}`}`}
                      />
                      </span>
                    </td>
                    {loads && (() => {
                      /* THE ACCOUNTS THAT CARRY THIS LINE'S PRODUCT, then
                         that account's suppliers. */
                      const fit = accounts!.filter((a) => !line.product || a.products.includes(line.product));
                      const acc = accounts!.find((a) => a.name === line.loadingAccount);
                      return (
                        <>
                          <td className="relative p-0">
                            {/* ONE VALUE — the account this line loads on, not a row of its own (DS ui §10f). */}
                            <TableCellSelect
                              value={line.loadingAccount ?? ""}
                              options={fit.map((a) => a.name)}
                              placeholder={fit.length ? "Select account" : "No account carries it"}
                              disabled={fit.length === 0}
                              aria-label={`Loading account for ${line.asset || `line ${i + 1}`}`}
                              onChange={(v) => {
                                const a = accounts!.find((x) => x.name === v);
                                setLine(i, { loadingAccount: v, supplier: a ? suppliersOf(a)[0] : undefined });
                              }}
                            />
                          </td>
                          <td className="relative p-0">
                            {/* ONE VALUE — the supplier this line loads from, not a row of its own (DS ui §10f). */}
                            <TableCellSelect
                              value={line.supplier ?? ""}
                              options={acc ? suppliersOf(acc) : []}
                              placeholder={acc ? "Select supplier" : "Account first"}
                              disabled={!acc}
                              aria-label={`Supplier for ${line.asset || `line ${i + 1}`}`}
                              onChange={(v) => setLine(i, { supplier: v })}
                            />
                          </td>
                        </>
                      );
                    })()}
                    <td className="sticky right-0 z-10 border-l border-border bg-popover p-0 text-center">
                      <TableRowRemove
                        aria-label={`Remove ${line.asset || `line ${i + 1}`}`}
                        disabled={target.lines.length === 1}
                        onRemove={() => removeLine(i)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex w-full items-center">
          <HangingAdd label="Add asset" onClick={addLine} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * The create sheet
 * ------------------------------------------------------------------------ */

export function RecurringProgramCreate({
  open,
  onOpenChange,
  all,
  onCreate,
  initial = null,
  seed = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  all: RecurringProgram[];
  onCreate: (draft: ProgramDraft) => void;
  /**
   * EDIT A RULE THAT HAS NOT MADE AN ORDER YET (Pavan, 2026-10-01). The same
   * form, filled in from the rule; saving replaces it. The half-built create
   * draft is put aside while editing and comes back afterwards.
   */
  initial?: ProgramDraft | null;
  /**
   * A NEW RULE STARTED FROM A RECOMMENDATION (Pavan, 2026-10-06): its
   * frequency, and one ship-to tab per site it fits — each under its own
   * customer, since a recommendation spans customers (2026-10-07). Its
   * common details go into step 1 as they would by hand: products, vendors,
   * load order on or off and its loading accounts (Pavan, 2026-10-07).
   */
  seed?: {
    frequency: RuleFrequency;
    products: string[];
    vendorIds: string[];
    loadOrder: boolean;
    loadingAccounts: string[];
    targets: { customer: { title: string; description: string }; shipTo: string }[];
  } | null;
}) {
  const editing = initial !== null;
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  /*
    ONE SCROLL, THE STEPS FOLLOW IT (Pavan, 2026-10-16). The three sections
    sit one under another; the track marks the one at the top of the view,
    and pressing a step scrolls to it. Nothing is gated — fill in any order.
  */
  const goTo = (n: 1 | 2 | 3) => {
    setStep(n);
    document.getElementById(`rule-step-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  React.useEffect(() => {
    if (!open) return;
    let body: HTMLElement | null = null;
    const spy = () => {
      if (!body) return;
      /* A section is current once its top has reached the top of the view.
         The last one is at least a view tall, so every section can get
         there. */
      const top = body.getBoundingClientRect().top + 24;
      let at: 1 | 2 | 3 = 1;
      for (const n of [1, 2, 3] as const) {
        const el = document.getElementById(`rule-step-${n}`);
        if (el && el.getBoundingClientRect().top <= top) at = n;
      }
      setStep(at);
    };
    /* The sheet mounts its body a frame after it opens. */
    const t = window.setTimeout(() => {
      body = document.getElementById("rule-step-1")?.closest<HTMLElement>(".overflow-auto") ?? null;
      const last = document.getElementById("rule-step-3");
      if (body && last) last.style.minHeight = `${body.clientHeight - 32}px`;
      body?.addEventListener("scroll", spy, { passive: true });
      spy();
    }, 50);
    return () => {
      window.clearTimeout(t);
      body?.removeEventListener("scroll", spy);
    };
  }, [open]);
  const [draft, setDraft] = React.useState<ProgramDraft>(blankProgramDraft);
  /* MARK AS WINTER BLEND (Pavan, 2026-09-25). On, the product chips above
     become pickable and the picked ones get a blue outline. Starts on when
     the draft already carries winter products. */
  const [winterOn, setWinterOn] = React.useState(
    () => draft.winterProducts.length > 0
  );
  /* Bumped when winter blend turns on — the chips blink once (Pavan,
     2026-10-01) to say they are now the thing to click. */
  const [winterFlash, setWinterFlash] = React.useState(0);

  /* THE DRAFT SURVIVES A CLOSE, but a fresh Create starts clean — reopening
     onto somebody else's half-built programme is worse than losing it. */
  const parked = React.useRef<ProgramDraft | null>(null);
  /** A recommendation's ship-tos, waiting for step 2 — see `seed`. */
  const seedSites = React.useRef<
    { customer: { title: string; description: string }; shipTo: string }[] | null
  >(null);
  React.useEffect(() => {
    if (open) {
      if (initial) {
        setDraft((d) => {
          parked.current = d;
          return initial;
        });
        setWinterOn(initial.winterProducts.length > 0);
      } else if (seed) {
        /* The half-built create draft is put aside, as for an edit. The
           frequency goes in now; the SITES wait for step 2, because picking
           a partner or a product in step 1 rightly empties the ship-tos. */
        setDraft((d) => {
          parked.current = d;
          return {
            ...blankProgramDraft(),
            frequency: seed.frequency,
            products: seed.products,
            vendorIds: seed.vendorIds,
            loadOrder: seed.loadOrder,
            loadRows: seed.loadingAccounts.map((loadingAccount) => ({ loadingAccount })),
          };
        });
        seedSites.current = seed.targets;
        setWinterOn(false);
      }
      return;
    }
    setStep(1);
    seedSites.current = null;
    if (parked.current) {
      const back = parked.current;
      parked.current = null;
      setDraft(back);
      setWinterOn(back.winterProducts.length > 0);
    }
  }, [open, initial, seed]);

  const set = <K extends keyof ProgramDraft>(k: K, v: ProgramDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const vendors = VENDORS.filter((v) => draft.vendorIds.includes(v.id));
  /** "Redline Carriers" · "Redline Carriers and 2 more" — never a bare count. */
  const partnerLabel =
    vendors.length === 0
      ? "the partner"
      : vendors.length === 1
        ? vendors[0].name
        : `${vendors[0].name} and ${vendors.length - 1} more`;
  const schedule = toSchedule(draft.frequency);
  /* FIRST PARTY MEANS NO PARTNER, so there is no gate: we are the haulier,
     and every ship-to is reachable because reaching it is our problem. */
  const firstParty = draft.jobType === "Transportation";

  const reachable = React.useMemo(() => {
    if (firstParty)
      return CUSTOMERS.flatMap((c) =>
        c.shipTos
          .map((name) => ({
            customer: { title: c.name, description: c.erpId },
            shipTo: name,
            site: siteByName(name),
          }))
          .filter(
            (r): r is {
              customer: typeof r.customer;
              shipTo: string;
              site: NonNullable<typeof r.site>;
            } => Boolean(r.site)
          )
      );
    /* THE UNION, NOT THE INTERSECTION. Putting a lane out to three partners
       is how a site only one of them reaches gets covered at all — asking
       for a site every one of them can serve would make each extra partner
       shrink the book instead of widening it. */
    const seen = new Set<string>();
    return vendors.flatMap((v) =>
      reachableTargets(v).filter((r) =>
        seen.has(r.shipTo) ? false : (seen.add(r.shipTo), true)
      )
    );
  }, [firstParty, vendors]);

  /** Partners who can take work at all. The table lists these. */
  const eligible = React.useMemo(
    () => VENDORS.filter((v) => v.active && v.approvedForAssignment),
    []
  );
  const reachCount = React.useCallback(
    (id: string) => {
      const v = VENDORS.find((x) => x.id === id);
      return v ? reachableTargets(v).length : 0;
    },
    []
  );

  /* The Date tab is answered by its dates, not the day badges. */
  const daysPicked =
    draft.frequency.basis === "date"
      ? (draft.frequency.dates ?? []).length > 0
      : draft.frequency.repeat === "cycle"
        ? (draft.frequency.cycleWeeks ?? []).some((w) => w.length > 0)
        : (draft.frequency.dayMode === "daily" || draft.frequency.days.length > 0) &&
        /* Monthly by week needs at least one week ticked. */
        (draft.frequency.repeat !== "monthly" ||
          (draft.frequency.monthWeeks ?? [1]).length > 0);

  /* A ROW PER ACCOUNT. There is always at least one row to pick into. */
  const loadRows =
    draft.loadRows.length > 0 ? draft.loadRows : [{ loadingAccount: "" }];
  const accountOf = (name: string) =>
    LOADING_ACCOUNTS.find((a) => a.name === name);
  const setLoadAccount = (i: number, name: string) =>
    set(
      "loadRows",
      loadRows.map((r, j) => (j === i ? { loadingAccount: name } : r))
    );
  /* [the new row's index] — its account cell takes the cursor (§10f Rows). */
  const [newLoadRow, setNewLoadRow] = React.useState<number | null>(null);
  /* THE LOADING ACCOUNT IS OPTIONAL (Pavan, 2026-10-01). A rule can be
     created without one; a blank row is simply not saved. */

  /* THREE STEPS (Pavan, 2026-10-16): the rule and its frequency · partners,
     products and the load order · ship-tos and assets. */
  const stepOneDone = daysPicked;
  const stepTwoDone =
    stepOneDone && (firstParty || draft.vendorIds.length > 0) && draft.products.length > 0;

  const pending = [
    {
      key: "vendor",
      label: "Choose at least one partner",
      done: firstParty || draft.vendorIds.length > 0,
    },
    {
      key: "product",
      label: "Choose at least one product",
      done: draft.products.length > 0,
    },
    {
      key: "days",
      label:
        draft.frequency.basis === "date"
          ? "Pick the dates it runs"
          : "Pick the days it runs",
      done: daysPicked,
    },
    {
      key: "sites",
      label:
        draft.targets.length > 1
          ? "Pick a customer and ship-to on every tab"
          : "Add at least one ship-to",
      done:
        draft.targets.length > 0 && draft.targets.every((t) => Boolean(t.shipTo)),
    },
    {
      key: "lines",
      label: "Say what each site takes",
      done:
        draft.targets.length > 0 &&
        draft.targets.every(
          (t) => t.lines.length > 0 && t.lines.every((l) => Boolean(l.product))
        ),
    },
  ].filter((p) => !p.done);

  const canCreate = pending.length === 0;

  /* WHAT CLASHES AT A SHIP-TO, IN WORDS — "Tuesdays", "the 5th and 20th".
     A Date rule is answered in dates of the month, a Days rule in weekdays. */
  const byDate = draft.frequency.basis === "date";
  const plural = (n: number) =>
    ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][n];
  const nth = (n: number) =>
    `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
  const skipKeys = (dates: Date[]) =>
    byDate
      ? [...new Set(dates.map((d) => d.getDate()))].sort((a, b) => a - b)
      : [...new Set(dates.map((d) => d.getDay()))].sort((a, b) => a - b);

  /* ONE TAB PER CUSTOMER AND SHIP-TO (Pavan, 2026-10-01). A tab starts
     blank — customer, then ship-to, then what it takes — and "+" adds the
     next one on the same rule. */
  const [tabId, setTabId] = React.useState<string | null>(null);
  const blankTarget = (): ProgramTarget => ({
    id: `draft-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    customer: { title: "", description: "" },
    shipTo: "",
    city: "",
    state: "",
    lines: [blankLine(draft.products)],
    window: { start: "8:00 AM", end: "12:00 PM" },
    poc: "",
    instructions: "",
    poNumber: "",
    vendorPrice: null,
    customerPrice: null,
    state_: "Draft",
    serviceable: true,
  });
  const addTab = () => {
    const t = blankTarget();
    setDraft((d) => ({ ...d, targets: [...d.targets, t] }));
    setTabId(t.id);
  };
  /* Step 2 never opens on nothing: the first tab is there, blank — or, for a
     rule started from a recommendation, one tab per ship-to it fits. */
  React.useEffect(() => {
    if (stepTwoDone && draft.targets.length === 0 && seedSites.current) {
      const seeded = seedSites.current;
      seedSites.current = null;
      const tabs = seeded.map(({ customer, shipTo }, i) => {
        const site = siteByName(shipTo);
        return {
          ...blankTarget(),
          id: `draft-seed-${Date.now()}-${i}`,
          customer,
          shipTo,
          city: site?.city ?? "",
          state: site?.state ?? "",
        };
      });
      setDraft((d) => ({ ...d, targets: tabs }));
      setTabId(tabs[0]?.id ?? null);
      return;
    }
    if (stepTwoDone && draft.targets.length === 0) addTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepTwoDone, draft.targets.length]);
  const activeTarget =
    draft.targets.find((t) => t.id === tabId) ?? draft.targets[0] ?? null;
  const setTarget = (id: string, patch: Partial<ProgramTarget>) =>
    setDraft((d) => ({
      ...d,
      targets: d.targets.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  const removeTab = (id: string) => {
    const at = draft.targets.findIndex((t) => t.id === id);
    const rest = draft.targets.filter((t) => t.id !== id);
    setDraft((d) => ({ ...d, targets: d.targets.filter((t) => t.id !== id) }));
    setTabId(rest[Math.max(0, at - 1)]?.id ?? null);
  };
  const customerOptions = [...new Set(reachable.map((r) => r.customer.title))];

  return (
    <RecordSheet
      /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15), per step. Step 1: partners
         = check, partner name, base pick, covers pick, sites in range, safety
         status; loading accounts = account name, terminals, suppliers,
         products (picks), bin. Step 2: lines = Top off, asset name, product
         pick, qty, bin; conflicts = rule name, frequency (days ≈ pick),
         assets · products text, window date, action (≈ number). */
      /* ONE SCROLL, SO THE WIDEST OF EVERYTHING (Pavan, 2026-10-16): the
         frequency unit; partners; loading accounts; the ship-to lines (with
         the load-order columns when on); conflicts. */
      fit={{
        tables: [
          [360 + 60 + 340 + 32],
          [CELL.check, CELL.name, CELL.pick, CELL.pick, CELL.number, CELL.status],
          [CELL.name, CELL.pick, CELL.pick, CELL.pick, CELL.bin],
          draft.loadOrder
            ? [CELL.name, CELL.pick, CELL.pick, CELL.pick, CELL.number, 104, CELL.bin]
            : [CELL.name, CELL.pick, CELL.number, 104, CELL.bin],
          [CELL.name, CELL.pick, CELL.text, CELL.date, CELL.number],
        ],
      }}
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      editTitle="Program"
      createTitle={editing ? `Edit ${initial?.name ?? "rule"}` : "Create recurring rule"}
      createAction={editing ? "Save rule" : "Create rule"}
      showCancel={false}
      canSubmit={canCreate}
      onSubmit={() => onCreate(draft)}
      /* ONE ACT (Pavan, 2026-10-16): fill the sections in any order; Create
         is live once what is required is there, and the pending strip says
         what is not. */
      footerPrimary={
        <Button disabled={!canCreate} onClick={() => { onCreate(draft); onOpenChange(false); }}>
          {editing ? "Save rule" : "Create rule"}
        </Button>
      }
      /* SIGNATURE LIVES IN THE BOTTOM BAR. It is a property of every delivery
         rather than a question about the rule, and a card of its own for one
         checkbox was a section heading doing no work. */
      footerAside={
        <label className="flex items-center gap-2.5 text-sm text-foreground">
          <Checkbox
            checked={draft.signatureOnDelivery}
            onCheckedChange={(v) => set("signatureOnDelivery", v === true)}
          />
          Signature required on delivery
        </label>
      }
      /* THE PENDING STRIP GOES WHERE EVERY OTHER FLOW PUTS IT — above the
         footer and outside the scroll, so the reason the act is dead is
         visible whenever the act is. */
      footerBanner={
        <div className="flex flex-col gap-2.5">
          {/* PINNED ABOVE CREATE (Pavan, 2026-10-16 — as the portal's rule). */}
          <NextDeliveries keys={nextHits(draft.frequency)} />
          <PendingStrip pending={pending} clearLabel={editing ? "Ready to save" : "Ready to create"} />
        </div>
      }
      /* THE DS STEPS — the same track as a record's stage (Pavan,
         2026-10-16). */
      steps={
        <SheetSteps
          /* THE RINGS STEPPER (Pavan, 2026-10-16 — after a reference). */
          variant="rings"
          steps={[
            { value: "1", label: "Rule and frequency" },
            { value: "2", label: "Partners and products" },
            { value: "3", label: "Ship-tos and assets" },
          ]}
          value={String(step)}
          onValueChange={(v) => goTo(Number(v) as 1 | 2 | 3)}
        />      }
    >
      <section id="rule-step-1" className="flex scroll-mt-4 flex-col gap-10">
          {/* THE RULE ITSELF — what it is called, who runs it, and how often.
              These three come first because every one of them changes what
              the rest of the form asks: the job type decides whether there is
              a partner at all, and the frequency is the thing that cannot be
              changed for one site afterwards. */}
          <Card title="The rule">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Rule name">
                <Input
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder={newProgramCode()}
                />
              </Field>
              {/* A RADIO, not a select — the same control the order sheet
                  uses for the same question, because there are two answers and
                  the one in force should be readable without opening
                  anything. */}
              <Field label="Job type">
                <RadioGroup
                  className="flex h-9 items-center gap-6"
                  value={draft.jobType}
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      jobType: v as JobType,
                      /* SWITCHING WHO RUNS IT EMPTIES BOTH. The partner is
                         meaningless on our own fleet, and a site chosen under
                         a partner's area was chosen for a reason that has
                         just stopped applying. */
                      vendorIds: [],
                      targets: [],
                    }))
                  }
                >
                  {JOB_TYPES.map((j) => (
                    <label
                      key={j}
                      htmlFor={`jt-${j}`}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <RadioGroupItem id={`jt-${j}`} value={j} />
                      {j}
                    </label>
                  ))}
                </RadioGroup>
              </Field>
            </div>
          </Card>

          {/* THE BADGES ARE THE PREVIEW. A second copy of the same seven
              letters beside the picker was the screen reading itself back, and
              the start date is not part of how often something happens — it
              is when the rule begins, which belongs with the rule. */}
          <Card
            title="Frequency"
            /* RECOMMENDATIONS, IN THE UNIT THEY FILL (Pavan, 2026-10-06) —
               but not on a rule already started from one: that rule is the
               recommendation being reviewed (Pavan, 2026-10-07). */
            aside={
              seed ? undefined : (
                <RuleRecommendations
                  onApply={(r) => set("frequency", { ...r.frequency, endKey: draft.frequency.endKey })}
                />
              )
            }
          >
            <RuleFrequencyPicker
              value={draft.frequency}
              onChange={(f) => set("frequency", f)}
            />
          </Card>
      </section>
      <section id="rule-step-2" className="flex scroll-mt-4 flex-col gap-10">
          {!firstParty && (
            <Card
              title="The partners"
              aside={
                draft.vendorIds.length > 0 ? (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {draft.vendorIds.length} chosen · {reachable.length} sites
                  </span>
                ) : undefined
              }
              flush
            >
              {/* A TABLE, NOT A DROPDOWN — the same shape the order sheet uses
                  to pick a partner, and for the same reason: this is the
                  biggest decision on the form and the things that decide it
                  are facts about each partner. A list of names in a select
                  asks somebody to already know which one covers Texas.

                  TICKS, NOT A RADIO. The request goes to everyone ticked, so
                  the column is a checkbox column and the sites the rule can
                  cover are the union of their areas. */}
              <div className="max-h-[320px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-fp-table-header">
                    <tr className="border-b border-fp-outline-1">
                      <th className="w-9 px-3 py-2 text-left" />
                      {["Partner", "Base", "Covers", "Sites in range", "Safety"].map(
                        (h) => (
                          <th
                            key={h}
                            className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {eligible.map((v) => {
                      const on = draft.vendorIds.includes(v.id);
                      return (
                        <tr
                          key={v.id}
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              vendorIds: on
                                ? d.vendorIds.filter((x) => x !== v.id)
                                : [...d.vendorIds, v.id],
                              /* DROPPING A PARTNER CAN DROP SITES. Which of
                                 the chosen ship-tos survive depends on whose
                                 area they were in, so the book is rebuilt
                                 rather than quietly left wrong. */
                              targets: [],
                            }))
                          }
                          className={cn(
                            "border-b border-fp-outline-1 last:border-0 hover:bg-fp-row-hover",
                            on && "bg-fp-row-selected"
                          )}
                        >
                          <td className="px-3 py-2.5">
                            <Checkbox
                              checked={on}
                              aria-label={v.name}
                              onCheckedChange={() =>
                                setDraft((d) => ({
                                  ...d,
                                  vendorIds: on
                                    ? d.vendorIds.filter((x) => x !== v.id)
                                    : [...d.vendorIds, v.id],
                                  targets: [],
                                }))
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-foreground">
                            {v.name}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {v.base}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {v.serviceAreaType === "zip"
                              ? `${v.coveredZips.length} zips`
                              : v.serviceStates.join(", ") || "—"}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-foreground">
                            {/* THE ONLY NUMBER THAT MATTERS HERE. A partner who
                                reaches two of your sites is a different
                                proposition from one who reaches nine, and it
                                is the fact a name cannot carry. */}
                            {reachCount(v.id)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                            {v.safetyScore}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* FLUSH (Pavan, 2026-09-24): the Add products unit runs edge to
              edge, with no card padding round it. */}
          <Card title="Products" flush>
            {/* TOKENS, because a rule can carry more than one product and a
                select cannot say so. The same control the order sheet uses for
                tags — pick from a list, each choice becomes a chip you can
                take off again. */}
            <TokenMultiSelect
              options={PRODUCTS}
              value={draft.products}
              addLabel="Add products"
              searchPlaceholder="Search products…"
              flush
              highlighted={winterOn ? draft.winterProducts : []}
              highlightLabel="Winter blend"
              flashKey={winterFlash}
              onChipClick={
                winterOn
                  ? (prod) =>
                      set(
                        "winterProducts",
                        draft.winterProducts.includes(prod)
                          ? draft.winterProducts.filter((w) => w !== prod)
                          : [...draft.winterProducts, prod]
                      )
                  : undefined
              }
              onChange={(next) =>
                setDraft((d) => ({
                  ...d,
                  products: next,
                  /* THE THREE THINGS DOWNSTREAM OF PRODUCT FOLLOW IT.
                     Winter blend is mapped per product, the load rows have to
                     cover every product, and a site's tanks were picked
                     against the old set. */
                  winterProducts: d.winterProducts.filter((w) =>
                    next.includes(w)
                  ),
                  targets: [],
                }))
              }
            />

            {/* WINTER BLEND IS MAPPED PER PRODUCT, not per rule — one rule
                can carry diesel and unleaded and only one takes an additive.
                The toggle turns the chips above into the picker. */}
            {draft.products.length > 0 && (
              <div className="flex flex-col gap-1 border-t border-fp-outline-1 p-4">
                {/* THE WORD, THEN THE SWITCH; the instruction right under it,
                    only while the chips are a picker (Pavan, 2026-10-16). */}
                <label className="flex w-fit items-center gap-2.5 text-sm text-foreground">
                  Mark as winter blend
                  <Switch
                    checked={winterOn}
                    onCheckedChange={(on) => {
                      setWinterOn(on);
                      if (on) setWinterFlash((n) => n + 1);
                      if (!on) set("winterProducts", []);
                    }}
                  />
                </label>
                {winterOn && (
                  <p className="text-xs text-muted-foreground">
                    Click on all products that you want to be considered as winter
                    blends.
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* THE LOAD ORDER, BY ACCOUNT (Pavan, 2026-09-25). Pick a loading
              account; its terminals, suppliers and products follow, read-only.
              Products not on this rule show disabled. Not the delivery
              order's per-product table: a rule is drawn up by account. */}
          <Card
            title="Load order"
            /* AN OPTION, OFFERED LIKE "ADD PRODUCTS" (Pavan, 2026-10-16): off,
               the card holds one "Create load order" act; on, the loading
               accounts, and a bin here takes the load order away again. */
            flush
            aside={
              draft.loadOrder ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove the load order"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDraft((d) => ({ ...d, loadOrder: false, loadRows: [] }))}
                    >
                      <Trash2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove the load order</TooltipContent>
                </Tooltip>
              ) : undefined
            }
            hanging={
              /* NOTHING LEFT TO ADD, OR A BLANK ROW ALREADY — no add. */
              draft.loadOrder &&
              draft.products.length > 0 &&
              loadRows.every((r) => r.loadingAccount) &&
              loadRows.length < LOADING_ACCOUNTS.length ? (
                <HangingAdd
                  label="Add loading account"
                  onClick={() => {
                    setNewLoadRow(loadRows.length);
                    set("loadRows", [...loadRows, { loadingAccount: "" }]);
                  }}
                />
              ) : undefined
            }
          >
            {!draft.loadOrder && (
              <button
                type="button"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    loadOrder: true,
                    loadRows: d.loadRows.length === 0 ? [{ loadingAccount: "" }] : d.loadRows,
                  }))
                }
                className="flex min-h-11 w-full items-center justify-center gap-1 px-4 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-fp-surface-1a focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
              >
                <Plus className="size-4" />
                Create load order
              </button>
            )}
            {draft.loadOrder &&
              (draft.products.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Choose a product first.
                </p>
              ) : (
                <div>
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[26%]" />
                      <col />
                      <col />
                      <col className="w-[34%]" />
                      <col className="w-[52px]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border bg-fp-table-header">
                        <th className="px-3 py-2.5 text-left">
                          <TableRequiredLabel>Loading account</TableRequiredLabel>
                        </th>
                        <th className="px-3 py-2.5 text-left">
                          <TableRequiredLabel>Terminals</TableRequiredLabel>
                        </th>
                        <th className="px-3 py-2.5 text-left">
                          <TableRequiredLabel>Suppliers</TableRequiredLabel>
                        </th>
                        <th className="px-3 py-2.5 text-left">
                          <TableRequiredLabel>Products</TableRequiredLabel>
                        </th>
                        <th aria-hidden />
                      </tr>
                    </thead>
                    <tbody>
                      {loadRows.map((row, i) => {
                        const account = accountOf(row.loadingAccount);
                        /* AN ACCOUNT IS PICKED ONCE — the other rows' are not
                           on offer here. */
                        const taken = new Set(
                          loadRows.flatMap((r, j) =>
                            j === i || !r.loadingAccount ? [] : [r.loadingAccount]
                          )
                        );
                        const offer = LOADING_ACCOUNTS.map((a) => a.name).filter(
                          (n) => !taken.has(n)
                        );
                        return (
                          <tr
                            key={i}
                            className="group/row border-b border-border align-top last:border-b-0"
                          >
                            <td className="relative h-11 p-0">
                              <TableCellSelect
                                value={row.loadingAccount}
                                options={row.loadingAccount ? offer : LOADING_ACCOUNTS.map((a) => a.name)}
                                placeholder="Account"
                                autoFocus={newLoadRow === i}
                                aria-label={`Loading account ${i + 1}`}
                                onChange={(v) => setLoadAccount(i, v)}
                                /* SEVERAL AT ONCE MAKES ROWS, FROM ANY ROW (DS ui §10f; Pavan 2026-10-26) — the row's own value opens ticked; kept, the row stays as it is;
                                   accounts on other rows show ticked and locked. */
                                multiple={{
                                  taken: [...taken].filter((t) => t !== row.loadingAccount),
                                  onApply: (names) => {
                                    const next = [...loadRows];
                                    next.splice(i, 1, ...names.map((n) => (n === row.loadingAccount ? row : { loadingAccount: n })));
                                    set("loadRows", next);
                                  },
                                }}
                              />
                            </td>
                            {/* READ-ONLY: what the account loads from, every
                                one of them. */}
                            <td className="px-3 py-3 text-sm text-foreground">
                              {account
                                ? terminalsOf(account).map((t) => (
                                    <span key={t} className="block">
                                      {t}
                                    </span>
                                  ))
                                : null}
                            </td>
                            <td className="px-3 py-3 text-sm text-foreground">
                              {account
                                ? suppliersOf(account).map((t) => (
                                    <span key={t} className="block">
                                      {t}
                                    </span>
                                  ))
                                : null}
                            </td>
                            {/* EVERY PRODUCT THE ACCOUNT CARRIES. Those not on
                                this rule are shown but disabled. */}
                            <td className="px-3 py-2.5">
                              {account && (
                                <span className="flex flex-wrap gap-1.5">
                                  {account.products.map((pr) => {
                                    const onRule = draft.products.includes(pr);
                                    return (
                                      <span
                                        key={pr}
                                        aria-disabled={!onRule || undefined}
                                        className={cn(
                                          "inline-flex items-center rounded-md border border-border bg-fp-surface-1b px-1.5 py-0.5 text-sm",
                                          onRule
                                            ? "text-foreground"
                                            : "text-muted-foreground opacity-50"
                                        )}
                                      >
                                        {pr}
                                      </span>
                                    );
                                  })}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {/* THE LAST ROW STAYS — a load order needs one
                                  account (§10f Rows). */}
                              {loadRows.length > 1 && (
                                <TableRowRemove
                                  aria-label={`Remove ${row.loadingAccount || `loading account ${i + 1}`}`}
                                  onRemove={() =>
                                    set(
                                      "loadRows",
                                      loadRows.filter((_, j) => j !== i)
                                    )
                                  }
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
          </Card>

      </section>
      <section id="rule-step-3" className="flex scroll-mt-4 flex-col gap-10">
          {!stepTwoDone ? (
            /* NOTHING TO PLACE YET — the partners decide which ship-tos
               exist, the products which tanks matter. Said, not blocked. */
            <p className="py-2 text-sm text-muted-foreground">
              Choose partners and products above to add ship-tos.
            </p>
          ) : (
          <>
          {/* ONE BOX ROUND THE SHIP-TOS AND ALL UNDER EACH, NO HEADER (Pavan,
              2026-10-16). */}
          <div className="shrink-0 overflow-hidden rounded-md border border-fp-outline-1">
            <div className="flex items-center gap-1 border-b border-fp-outline-1 px-2 pt-2">
              <Tabs
                value={activeTarget?.id ?? ""}
                onValueChange={setTabId}
                className="min-w-0"
              >
                <TabsList variant="line" className="h-9 max-w-full justify-start overflow-x-auto">
                  {draft.targets.map((t) => (
                    <TabsTrigger key={t.id} value={t.id} className="flex-none px-3">
                      {t.shipTo || "New ship-to"}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Add another customer and ship-to"
                className="mb-1 shrink-0"
                onClick={addTab}
              >
                <Plus />
              </Button>
            </div>

            {activeTarget && (
              <div className="flex flex-col gap-4 p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] items-start gap-4">
                  <Field label="Customer">
                    <Combobox
                      value={activeTarget.customer.title}
                      options={customerOptions}
                      placeholder="Select customer"
                      className="w-full"
                      searchPlaceholder="Search customers…"
                      onValueChange={(title) => {
                        const r = reachable.find((x) => x.customer.title === title);
                        /* A NEW CUSTOMER CLEARS THE SHIP-TO — it was theirs. */
                        setTarget(activeTarget.id, {
                          customer: r?.customer ?? { title, description: "" },
                          shipTo: "",
                          city: "",
                          state: "",
                          lines: [blankLine(draft.products)],
                          skip: undefined,
                        });
                      }}
                    />
                  </Field>
                  <Field label="Ship-to">
                    <Combobox
                      value={activeTarget.shipTo}
                      disabled={!activeTarget.customer.title}
                      options={reachable
                        .filter(
                          (r) =>
                            r.customer.title === activeTarget.customer.title &&
                            /* One tab per ship-to. */
                            (r.shipTo === activeTarget.shipTo ||
                              !draft.targets.some((t) => t.shipTo === r.shipTo))
                        )
                        .map((r) => ({
                          value: r.shipTo,
                          description: `${r.site.city}, ${r.site.state}`,
                        }))}
                      placeholder={
                        activeTarget.customer.title
                          ? "Select ship-to"
                          : "Select a customer first"
                      }
                      searchPlaceholder="Search ship-tos…"
                      className="w-full"
                      onValueChange={(shipTo) => {
                        const r = reachable.find((x) => x.shipTo === shipTo);
                        if (!r) return;
                        setTarget(activeTarget.id, {
                          shipTo,
                          city: r.site.city,
                          state: r.site.state,
                          lines: [blankLine(draft.products)],
                          skip: undefined,
                        });
                      }}
                    />
                  </Field>
                  {/* THE DELIVERY WINDOW, PER SHIP-TO (Pavan, 2026-10-01) — IN THE TOP ROW,
                      ITS LAST COLUMN (Pavan, 2026-10-16) — the
                      same slider the Delivery Order uses. An overlap with
                      another rule at this ship-to is said here, as it is
                      picked, and again in Conflicts below. */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="mt-6 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Remove this ship-to"
                    onClick={() => removeTab(activeTarget.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {/* THE SHARED DELIVERY TIMELINE, PER SHIP-TO (Pavan, 2026-10-20)
                    — the window and its preferred times, under the row. An
                    overlap with another rule here is said in Conflicts. */}
                {(() => {
                  const w =
                    parseWindow(`${activeTarget.window.start} – ${activeTarget.window.end}`) ??
                    [8 * 60, 12 * 60];
                  return (
                    <DeliveryWindowTimeline
                      label="Delivery window & preferred time"
                      required
                      disabled={!activeTarget.shipTo}
                      start={w[0]}
                      end={w[1]}
                      onWindowChange={(a, b) =>
                        setTarget(activeTarget.id, {
                          window: { start: formatMinutes(a), end: formatMinutes(b) },
                          preferred: (activeTarget.preferred ?? [])
                            .map((p) => ({ start: Math.max(p.start, a), end: Math.min(p.end, b) }))
                            .filter((p) => p.end - p.start >= 30),
                        })
                      }
                      preferred={activeTarget.preferred ?? []}
                      onPreferredChange={(p) => setTarget(activeTarget.id, { preferred: p })}
                    />
                  );
                })()}
                <TargetEditor
                  target={activeTarget}
                  products={draft.products}
                  accounts={
                    draft.loadOrder
                      ? loadRows
                          .map((r) => LOADING_ACCOUNTS.find((a) => a.name === r.loadingAccount))
                          .filter((a): a is LoadingAccount => Boolean(a))
                      : null
                  }
                  onChange={(next) => setTarget(activeTarget.id, next)}
                />
                {(() => {
                  if (!activeTarget.shipTo) return null;
                  /* EVERY CLASH, SKIPPED OR NOT — a skipped day stays so it
                     can be undone where it was made. Compared on what THIS
                     ship-to takes, else on the rule's products. */
                  const clashes = clashesFor(
                    activeTarget.shipTo,
                    {
                      assets: activeTarget.lines.map((l) => l.asset).filter(Boolean),
                      window: activeTarget.window,
                      schedule,
                      startKey: draft.startKey,
                      endKey: draft.frequency.endKey,
                    },
                    "new",
                    all
                  );
                  if (clashes.length === 0) return null;
                  const skipped = new Set(
                    byDate
                      ? activeTarget.skip?.monthDays ?? []
                      : activeTarget.skip?.weekdays ?? []
                  );
                  const keyOf = (d: Date) => (byDate ? d.getDate() : d.getDay());
                  const short = (d: Date) =>
                    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  /* ONE ROW PER CONFLICTING RULE (Pavan, 2026-10-01). Its
                     days say "every Tuesday" when it clashes on every Tuesday
                     this rule runs, or the dates when only some of them. */
                  const rows = clashes.map((c) => {
                    const keys = skipKeys(c.dates);
                    const days = keys.map((k) => {
                      const mine = c.mineDates.filter((d) => keyOf(d) === k);
                      const hit = c.dates.filter((d) => keyOf(d) === k);
                      const every = hit.length === mine.length;
                      const name = byDate ? `the ${nth(k)}` : plural(k);
                      return {
                        key: k,
                        every,
                        label: every
                          ? byDate
                            ? `Every month on ${name}`
                            : `Every ${name.slice(0, -1)}`
                          : `${hit.slice(0, 3).map(short).join(", ")}${hit.length > 3 ? ` +${hit.length - 3}` : ""}`,
                      };
                    });
                    return { program: c.program, assets: c.assets, window: c.window, days, keys };
                  });
                  const setSkipMany = (keys: number[], on = true) => {
                    const cur = byDate
                      ? activeTarget.skip?.monthDays ?? []
                      : activeTarget.skip?.weekdays ?? [];
                    const next = on
                      ? [...new Set([...cur, ...keys])].sort((x, y) => x - y)
                      : cur.filter((x) => !keys.includes(x));
                    setTarget(activeTarget.id, {
                      skip: {
                        weekdays: byDate ? activeTarget.skip?.weekdays ?? [] : next,
                        monthDays: byDate ? next : activeTarget.skip?.monthDays ?? [],
                      },
                    });
                  };
                  /* THE CLASH, MARKED QUIETLY (Pavan, 2026-10-01) — coloured
                     text, no fills: the unit should not shout. */
                  const hl = "text-fp-banner-accent-caution";
                  const Days = ({ runs, clash, label }: { runs: number[]; clash: number[]; label: string }) =>
                    byDate || runs.length === 0 ? (
                      <span className="text-foreground">{label}</span>
                    ) : (
                      <span className="flex flex-col gap-0.5">
                        {/* THE WEEK AS LETTERS: faint = not run, plain = run,
                            yellow and underlined = the clash. */}
                        <span className="flex gap-1.5 text-xs font-medium tracking-wide">
                          {WEEKDAY_LETTERS.map((l, i) => (
                            <span
                              key={i}
                              className={cn(
                                "w-2.5 text-center",
                                clash.includes(i)
                                  ? "text-fp-banner-accent-caution underline decoration-2 underline-offset-4"
                                  : runs.includes(i)
                                    ? "text-foreground"
                                    : "text-muted-foreground/35"
                              )}
                            >
                              {l}
                            </span>
                          ))}
                        </span>
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </span>
                    );
                  const Lines = ({
                    lines,
                    clash,
                  }: {
                    lines: { asset: string; product: string }[];
                    clash: string[];
                  }) => (
                    <span className="flex flex-col gap-1">
                      {lines.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        lines.map((l, i) => (
                          <span key={i} className="text-foreground">
                            <span className={cn(clash.includes(l.asset) && hl)}>
                              {l.asset || "No asset"}
                            </span>
                            <span className="text-muted-foreground"> · {l.product || "—"}</span>
                          </span>
                        ))
                      )}
                    </span>
                  );
                  /* THE EYE — what exactly collides, on hover. */
                  const Why = ({ text }: { text: string }) => (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={text}
                          className="ml-1.5 inline-flex shrink-0 align-middle text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <Eye className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">{text}</TooltipContent>
                    </Tooltip>
                  );
                  const dayNames = (keys: number[]) => {
                    const xs = keys.map((k) => (byDate ? `the ${nth(k)}` : plural(k)));
                    return xs.length <= 1
                      ? (xs[0] ?? "")
                      : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
                  };
                  /* PENDING ON THE OTHER RULE — "stop it here on these days". */
                  const othersOff = (programId: string, keys: number[]) => {
                    const o = activeTarget.othersSkip?.find((x) => x.programId === programId);
                    const have = byDate ? o?.monthDays ?? [] : o?.weekdays ?? [];
                    return keys.every((k) => have.includes(k));
                  };
                  const setOthersSkip = (programId: string, keys: number[], on: boolean) => {
                    const rest = (activeTarget.othersSkip ?? []).filter((x) => x.programId !== programId);
                    setTarget(activeTarget.id, {
                      othersSkip: on
                        ? [
                            ...rest,
                            {
                              programId,
                              weekdays: byDate ? [] : keys,
                              monthDays: byDate ? keys : [],
                            },
                          ]
                        : rest,
                    });
                  };
                  return (
                    /* CONFLICTS, AS A TABLE (Pavan, 2026-10-01). Each clash is
                       two rows — the other rule, then this one — so the two
                       can be read against each other, with exactly what
                       collides marked. One Resolve for the pair. */
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-foreground">
                        Conflicts
                      </span>
                      <div
                        data-table-variant="T2"
                        className="overflow-hidden rounded-md border border-fp-banner-accent-caution/20"
                      >
                        <table className="w-full table-fixed border-collapse text-sm">
                          <colgroup>
                            <col className="w-[13%]" />
                            <col className="w-[25%]" />
                            <col />
                            <col className="w-[19%]" />
                            <col className="w-[112px]" />
                          </colgroup>
                          <thead>
                            <tr className="border-b border-fp-banner-accent-caution/20 bg-fp-banner-accent-caution/5">
                              <th className="px-3 py-2.5 text-left">
                                <TableRequiredLabel>Rule</TableRequiredLabel>
                              </th>
                              <th className="px-3 py-2.5 text-left">
                                <TableRequiredLabel>Frequency</TableRequiredLabel>
                              </th>
                              <th className="px-3 py-2.5 text-left">
                                <TableRequiredLabel>Assets · products</TableRequiredLabel>
                              </th>
                              <th className="px-3 py-2.5 text-left">
                                <TableRequiredLabel>Window</TableRequiredLabel>
                              </th>
                              <th className="px-3 py-2.5 text-left">
                                <TableRequiredLabel>Action</TableRequiredLabel>
                              </th>
                            </tr>
                          </thead>
                          {rows.map((r) => {
                            const p = r.program;
                            const theirs = p.targets.find((t) => t.shipTo === activeTarget.shipTo);
                            const clashAssets = r.assets.map((a) => a.asset);
                            const offHere = r.keys.every((k) => skipped.has(k));
                            const offThere = othersOff(p.id, r.keys);
                            const off = offHere || offThere;
                            const dayLabel = r.days.map((d) => d.label).join(" · ");
                            return (
                              <tbody
                                key={p.id}
                                className="border-b border-fp-banner-accent-caution/15 last:border-b-0"
                              >
                                <tr className="align-top">
                                  <td className="px-3 pt-3 pb-1.5">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-default whitespace-nowrap text-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-4">
                                          {p.programNo}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-64">
                                        <span className="flex flex-col gap-0.5">
                                          <span className="font-medium">
                                            {p.programNo} · {p.schedule.label}
                                          </span>
                                          <span className="opacity-80">{p.schedule.cadence}</span>
                                          <span className="opacity-80">{p.products.join(" + ")}</span>
                                        </span>
                                      </TooltipContent>
                                    </Tooltip>
                                  </td>
                                  <td className="px-3 pt-3 pb-1.5">
                                    <Days
                                      runs={p.schedule.days}
                                      clash={byDate ? [] : r.keys}
                                      label={byDate ? dayLabel : p.schedule.label}
                                    />
                                  </td>
                                  <td className="px-3 pt-3 pb-1.5">
                                    <Lines
                                      lines={(theirs?.lines ?? []).map((l) => ({ asset: l.asset, product: l.product }))}
                                      clash={clashAssets}
                                    />
                                  </td>
                                  <td className="px-3 pt-3 pb-1.5">
                                    <span className={cn("text-foreground", r.window && hl)}>
                                      {theirs?.window.start} – {theirs?.window.end}
                                    </span>
                                  </td>
                                  <td rowSpan={2} className="px-3 py-3 align-middle">
                                    {off ? (
                                      <span className="flex flex-col items-start gap-1">
                                        <span className="text-xs text-muted-foreground">
                                          {offHere ? "This rule skips" : `${p.programNo} skips`}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="-ml-1.5 h-7 px-1.5"
                                          onClick={() =>
                                            offHere
                                              ? setSkipMany(r.keys, false)
                                              : setOthersSkip(p.id, r.keys, false)
                                          }
                                        >
                                          <Undo2 />
                                          Undo
                                        </Button>
                                      </span>
                                    ) : (
                                      /* RESOLVE (Pavan, 2026-10-01) — the ways
                                         out live behind it; one for now. */
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            Resolve
                                            <ChevronDown />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-72">
                                          <DropdownMenuItem
                                            className="flex-col items-start gap-0.5"
                                            onSelect={() => setSkipMany(r.keys)}
                                          >
                                            <span>Don&apos;t run this rule on {dayNames(r.keys)}</span>
                                            <span className="text-xs text-muted-foreground">
                                              At this ship-to only.
                                            </span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="flex-col items-start gap-0.5"
                                            onSelect={() => setOthersSkip(p.id, r.keys, true)}
                                          >
                                            <span>Stop {p.programNo} on {dayNames(r.keys)}</span>
                                            <span className="text-xs text-muted-foreground">
                                              At this customer and ship-to only — {p.programNo} keeps
                                              running everywhere else. Applied when this rule is created.
                                            </span>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </td>
                                </tr>
                                <tr className="align-top">
                                  <td className="px-3 pt-1.5 pb-3 text-muted-foreground">
                                    This rule
                                  </td>
                                  <td className="px-3 pt-1.5 pb-3">
                                    <span className="flex items-start">
                                      <Days
                                        runs={schedule.days}
                                        clash={byDate ? [] : r.keys}
                                        label={byDate ? dayLabel : schedule.label}
                                      />
                                      <Why
                                        text={`Frequency conflict — both rules deliver to this ship-to on ${dayNames(r.keys)}.`}
                                      />
                                    </span>
                                  </td>
                                  <td className="px-3 pt-1.5 pb-3">
                                    <span className="flex items-start">
                                      <Lines
                                        lines={activeTarget.lines.map((l) => ({ asset: l.asset, product: l.product }))}
                                        clash={clashAssets}
                                      />
                                      {r.assets.length > 0 && (
                                        <Why
                                          text={`Asset conflict — both rules fill ${r.assets
                                            .map((a) => `${a.asset} (${a.product})`)
                                            .join(", ")} on ${dayNames(r.keys)}.`}
                                        />
                                      )}
                                    </span>
                                  </td>
                                  <td className="px-3 pt-1.5 pb-3">
                                    <span className="flex items-start">
                                      <span className={cn("text-foreground", r.window && hl)}>
                                        {activeTarget.window.start} – {activeTarget.window.end}
                                      </span>
                                      {r.window && (
                                        <Why
                                          text={`Scheduling window conflict — ${activeTarget.window.start} – ${activeTarget.window.end} overlaps ${p.programNo}'s ${r.window.start} – ${r.window.end} on ${dayNames(r.keys)}.`}
                                        />
                                      )}
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            );
                          })}
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* WHAT HAPPENS ON CREATE, SAID BEFORE THE PRESS. A rule that
              quietly started asking a partner for prices would be a surprise
              the first time and a habit of not reading afterwards. */}
          <p className="shrink-0 rounded-md bg-fp-card-1 px-3 py-2.5 text-xs text-muted-foreground">
            On create, every ship-to goes on as a <strong>draft lane</strong> —
            nothing is delivered and nothing is priced until {partnerLabel}{" "}
            has quoted and accepted each one.
            Lanes go live individually.
          </p>
          </>
          )}
      </section>
    </RecordSheet>
  );
}

/** Whether a partner could still reach a site — used when a rule is saved. */
export const stillServiceable = (vendorId: string, shipTo: string) => {
  const v = VENDORS.find((x) => x.id === vendorId);
  const s = siteByName(shipTo);
  return Boolean(v && s && canServe(v, s));
};
