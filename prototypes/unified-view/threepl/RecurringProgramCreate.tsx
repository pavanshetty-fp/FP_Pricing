import * as React from "react";
import { Check, ChevronDown, Eye, Plus, Trash2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RecordSheet } from "../RecordSheet";
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
  TimeWindowSlider,
  formatMinutes,
  parseWindow,
  TableCellCombobox,
  TableCellInput,
  TableCellSelect,
  TableRequiredLabel,
} from "@/components/form-layout";
import { TableRowRemove } from "@/components/form-layout/table-cells";
import { PendingStrip } from "../PendingStrip";
import { dateKeyOf, startOfDay } from "../data";
import { CUSTOMERS } from "../customers";
import {
  LOADING_ACCOUNTS,
  PRODUCTS,
  suppliersOf,
  terminalsOf,
  defaultLineCharges,
  type OrderLine,
} from "./orders";
import { VENDORS } from "./vendors";
import { JOB_TYPES, type JobType } from "./orders";
import {
  RuleFrequencyPicker,
  blankFrequency,
  toSchedule,
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
    loadOrder: true,
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
      <header className="flex items-center justify-between gap-3 border-b border-fp-outline-1 px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {aside}
      </header>
      <div className={flush ? undefined : "p-4"}>{children}</div>
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
 * own table: Top off · Asset · Product · Qty, with Add asset hanging off it.
 * The product list is the rule's products only; picking a known asset fills
 * its product, the same as on an order.
 */
function TargetEditor({
  target,
  products,
  onChange,
}: {
  target: ProgramTarget;
  products: string[];
  onChange: (next: ProgramTarget) => void;
}) {
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
            <colgroup>
              <col className="w-[92px]" />
              <col className="w-[34%]" />
              <col className="w-[30%]" />
              <col />
              <col className="w-[52px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-fp-table-header">
                <th className="px-3 py-2.5 text-left">
                  <TableRequiredLabel>Top off</TableRequiredLabel>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <TableRequiredLabel>Asset</TableRequiredLabel>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <TableRequiredLabel required>Product</TableRequiredLabel>
                </th>
                <th className="px-3 py-2.5 text-right">
                  <TableRequiredLabel>Qty (gal)</TableRequiredLabel>
                </th>
                <th aria-hidden />
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
                    <td className="px-3">
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
                    </td>
                    <td className="relative p-0">
                      {asset?.rental && (
                        <span className="pointer-events-none absolute top-1/2 right-8 z-10 -translate-y-1/2">
                          <Badge variant="secondary">Rental</Badge>
                        </span>
                      )}
                      <TableCellCombobox
                        value={line.asset}
                        options={assetOptions}
                        taken={target.lines.map((l) => l.asset)}
                        placeholder={target.shipTo ? "Select asset" : "Select a ship-to first"}
                        disabled={!target.shipTo}
                        creatable
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
                      />
                    </td>
                    <td className="relative p-0">
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
                        placeholder={line.topOff ? "Top-off" : "0"}
                        disabled={line.topOff}
                        numeric
                        suffix="gal"
                        aria-label={`Gallons for line ${i + 1}`}
                        onChange={(v) =>
                          setLine(i, {
                            gal: Number(v.replace(/[^0-9]/g, "")) || null,
                          })
                        }
                      />
                    </td>
                    <td className="relative p-0 text-center">
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
}) {
  const editing = initial !== null;
  const [step, setStep] = React.useState<1 | 2>(1);
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
  React.useEffect(() => {
    if (open) {
      if (initial) {
        setDraft((d) => {
          parked.current = d;
          return initial;
        });
        setWinterOn(initial.winterProducts.length > 0);
      }
      return;
    }
    setStep(1);
    if (parked.current) {
      const back = parked.current;
      parked.current = null;
      setDraft(back);
      setWinterOn(back.winterProducts.length > 0);
    }
  }, [open, initial]);

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

  const stepOneDone =
    (firstParty || draft.vendorIds.length > 0) &&
    draft.products.length > 0 &&
    daysPicked;

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
  /* Step 2 never opens on nothing: the first tab is there, blank. */
  React.useEffect(() => {
    if (step === 2 && draft.targets.length === 0) addTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, draft.targets.length]);
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
      size="xwide"
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      editTitle="Programme"
      createTitle={editing ? `Edit ${initial?.name ?? "rule"}` : "Create recurring rule"}
      createAction={editing ? "Save rule" : "Create rule"}
      showCancel={false}
      canSubmit={canCreate}
      onSubmit={() => onCreate(draft)}
      footerPrimary={
        step === 1 ? (
          /* STEP TWO IS UNREACHABLE, NOT EMPTY. The partner decides which
             sites exist and the product decides which tanks matter, so there
             is genuinely nothing to show until both are answered. */
          <Button disabled={!stepOneDone} onClick={() => setStep(2)}>
            Next — ship-tos and assets
          </Button>
        ) : (
          <Button disabled={!canCreate} onClick={() => { onCreate(draft); onOpenChange(false); }}>
            {editing ? "Save rule" : "Create rule"}
          </Button>
        )
      }
      /* SIGNATURE LIVES IN THE BOTTOM BAR. It is a property of every delivery
         rather than a question about the rule, and a card of its own for one
         checkbox was a section heading doing no work. */
      footerAside={
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
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
        <PendingStrip pending={pending} clearLabel={editing ? "Ready to save" : "Ready to create"} />
      }
      steps={
        <div className="flex items-center gap-1 py-2">
          {(
            [
              [1, "Common details"],
              [2, "Ship-tos and assets"],
            ] as const
          ).map(([n, label]) => (
            <button
              key={n}
              type="button"
              disabled={n === 2 && !stepOneDone}
              onClick={() => setStep(n)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                step === n
                  ? "bg-chip text-foreground"
                  : "text-muted-foreground hover:text-foreground",
                n === 2 && !stepOneDone && "pointer-events-none opacity-50"
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-xs tabular-nums",
                  n === 1 && stepOneDone
                    ? "bg-status-success text-status-foreground"
                    : step === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-fp-card-1 text-muted-foreground"
                )}
              >
                {n === 1 && stepOneDone ? <Check className="size-3" /> : n}
              </span>
              {label}
            </button>
          ))}
        </div>
      }
    >
      {step === 1 ? (
        <>
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
                      className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
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
          <Card title="Frequency">
            <RuleFrequencyPicker
              value={draft.frequency}
              onChange={(f) => set("frequency", f)}
            />
          </Card>

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
                      <th className="w-9 px-3 py-2" />
                      {["Partner", "Base", "Covers", "Sites in range", "Safety"].map(
                        (h, k) => (
                          <th
                            key={h}
                            className={cn(
                              "whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground",
                              k >= 3 && "text-right"
                            )}
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
                            "cursor-pointer border-b border-fp-outline-1 last:border-0 hover:bg-fp-row-hover",
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
                          <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                            {/* THE ONLY NUMBER THAT MATTERS HERE. A partner who
                                reaches two of your sites is a different
                                proposition from one who reaches nine, and it
                                is the fact a name cannot carry. */}
                            {reachCount(v.id)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
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

            {/* THE INSTRUCTION, ONLY WHILE THE CHIPS ARE A PICKER (Pavan,
                2026-10-01) — with the toggle on, a chip click means something
                new, and nothing else on screen says so. */}
            {winterOn && draft.products.length > 0 && (
              <p className="px-4 pb-4 text-xs text-muted-foreground">
                Click on all products that you want to be considered as winter
                blends.
              </p>
            )}

            {/* WINTER BLEND IS MAPPED PER PRODUCT, not per rule — one rule
                can carry diesel and unleaded and only one takes an additive.
                The toggle turns the chips above into the picker. */}
            {draft.products.length > 0 && (
              <div className="border-t border-fp-outline-1 p-4">
                <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-foreground">
                  <Switch
                    checked={winterOn}
                    onCheckedChange={(on) => {
                      setWinterOn(on);
                      if (on) setWinterFlash((n) => n + 1);
                      if (!on) set("winterProducts", []);
                    }}
                  />
                  Mark as winter blend
                </label>
              </div>
            )}
          </Card>

          {/* THE LOAD ORDER, BY ACCOUNT (Pavan, 2026-09-25). Pick a loading
              account; its terminals, suppliers and products follow, read-only.
              Products not on this rule show disabled. Not the delivery
              order's per-product table: a rule is drawn up by account. */}
          <Card
            title="Load order"
            flush={draft.loadOrder && draft.products.length > 0}
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
            {/* NO "WE BUY THE PRODUCT" TICK (Pavan, 2026-09-25) — a rule
                always carries a load order. */}
            {draft.loadOrder &&
              (draft.products.length === 0 ? (
                <p className="text-sm text-muted-foreground">
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
                          <TableRequiredLabel>Loading Account</TableRequiredLabel>
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
                                options={offer}
                                placeholder="Account"
                                autoFocus={newLoadRow === i}
                                aria-label={`Loading account ${i + 1}`}
                                onChange={(v) => setLoadAccount(i, v)}
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

        </>
      ) : (
        <>
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-fp-outline-1 bg-fp-surface-1b px-3 py-2.5 text-sm">
            <span className="text-foreground">{partnerLabel}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground">
              {draft.products.join(" + ")}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground">{schedule.label}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setStep(1)}
            >
              Change
            </Button>
          </div>

          <Card title={`Ship-tos — ${draft.targets.filter((t) => t.shipTo).length}`} flush>
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
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-4">
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
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="mb-1.5 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Remove this ship-to"
                    onClick={() => removeTab(activeTarget.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {/* THE DELIVERY WINDOW, PER SHIP-TO (Pavan, 2026-10-01) — the
                    same slider the Delivery Order uses. An overlap with
                    another rule at this ship-to is said here, as it is
                    picked, and again in Conflicts below. */}
                {(() => {
                  const w =
                    parseWindow(`${activeTarget.window.start} – ${activeTarget.window.end}`) ??
                    [8 * 60, 12 * 60];
                  const overlaps = activeTarget.shipTo
                    ? clashesFor(
                        activeTarget.shipTo,
                        {
                          assets: [],
                          window: activeTarget.window,
                          schedule,
                          startKey: draft.startKey,
                          endKey: draft.frequency.endKey,
                          skip: activeTarget.skip,
                        },
                        "new",
                        all
                      ).filter((c) => c.window)
                    : [];
                  return (
                    <div className="flex flex-col gap-1.5">
                      <TimeWindowSlider
                        label="Delivery Window"
                        required
                        disabled={!activeTarget.shipTo}
                        start={w[0]}
                        end={w[1]}
                        onChange={(a, b) =>
                          setTarget(activeTarget.id, {
                            window: { start: formatMinutes(a), end: formatMinutes(b) },
                          })
                        }
                        aria-label="Delivery window"
                      />
                      {overlaps.length > 0 && (
                        <span className="text-xs text-fp-banner-accent-caution">
                          Overlaps{" "}
                          {overlaps
                            .map(
                              (c) =>
                                `${c.program.programNo} (${c.window!.start} – ${c.window!.end})`
                            )
                            .join(", ")}{" "}
                          at this ship-to.
                        </span>
                      )}
                    </div>
                  );
                })()}
                <TargetEditor
                  target={activeTarget}
                  products={draft.products}
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
                                <TableRequiredLabel>Assets · Products</TableRequiredLabel>
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
          </Card>

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
    </RecordSheet>
  );
}

/** Whether a partner could still reach a site — used when a rule is saved. */
export const stillServiceable = (vendorId: string, shipTo: string) => {
  const v = VENDORS.find((x) => x.id === vendorId);
  const s = siteByName(shipTo);
  return Boolean(v && s && canServe(v, s));
};
