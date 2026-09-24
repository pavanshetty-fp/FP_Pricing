import * as React from "react";
import { AlertTriangle, Check, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RecordSheet } from "../RecordSheet";
import { TokenMultiSelect } from "../TokenMultiSelect";
import { PendingStrip } from "../PendingStrip";
import { dateKeyOf, startOfDay } from "../data";
import { CUSTOMERS } from "../customers";
import {
  LOADING_ACCOUNTS,
  PRODUCTS,
  loadOptions,
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
  clashFor,
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
   * A ROW IS AN ACCOUNT, NOT A PRODUCT. One loading number usually carries
   * the whole load, so the default is a single row holding every product;
   * a second row exists only when some product has to load somewhere else.
   */
  loadRows: {
    products: string[];
    terminal: string;
    supplier: string;
    loadingAccount: string;
  }[];
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
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  /** For content that is itself a table — the card's edge is its edge. */
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="shrink-0 overflow-hidden rounded-md border border-fp-outline-1">
      <header className="flex items-center justify-between gap-3 border-b border-fp-outline-1 px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {aside}
      </header>
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </section>
  );
}

const DASH = "—";

type LoadRow = ProgramDraft["loadRows"][number];

/** Whether one account can carry every product on a row. */
const accountCarries = (name: string, products: string[]) => {
  const a = LOADING_ACCOUNTS.find((x) => x.name === name);
  return Boolean(a && products.every((pr) => a.products.includes(pr)));
};

/**
 * KEEPING THE ROWS AND THE PRODUCT LIST HONEST. Rows are keyed on the
 * account now, so a product added to the rule has to land somewhere — the
 * first row, because one number carrying everything is the normal case — and
 * a product taken off has to leave every row. An account that no longer
 * carries what is on its row stops being an answer and is cleared.
 */
function syncLoadRows(rows: LoadRow[], products: string[]): LoadRow[] {
  const kept = rows
    .map((r) => ({
      ...r,
      products: r.products.filter((pr) => products.includes(pr)),
    }))
    .filter((r) => r.products.length > 0);
  const assigned = new Set(kept.flatMap((r) => r.products));
  const missing = products.filter((pr) => !assigned.has(pr));
  const base: LoadRow[] =
    kept.length > 0
      ? kept
      : [{ products: [], terminal: "", supplier: "", loadingAccount: "" }];
  return base
    .map((r, i) =>
      i === 0 ? { ...r, products: [...r.products, ...missing] } : r
    )
    .map((r) =>
      r.loadingAccount && !accountCarries(r.loadingAccount, r.products)
        ? { ...r, loadingAccount: "", terminal: "", supplier: "" }
        : r
    );
}

/* ---------------------------------------------------------------------------
 * Step 2 — the sites, and what each one takes
 * ------------------------------------------------------------------------ */

function TargetEditor({
  target,
  products,
  onChange,
  onRemove,
}: {
  target: ProgramTarget;
  products: string[];
  onChange: (next: ProgramTarget) => void;
  onRemove: () => void;
}) {
  const site = siteByName(target.shipTo);
  /* ONLY THE TANKS THAT TAKE ONE OF THIS RULE'S PRODUCTS. A site's other tanks
     are real but have nothing to do with this rule, and offering them invites
     one that puts diesel in a lube skid. */
  const tanks = (site?.assets ?? []).filter((a) =>
    products.includes(a.product)
  );
  const chosen = new Map(target.lines.map((l) => [l.asset, l]));

  const toggle = (asset: string, product: string, on: boolean) => {
    const next = on
      ? [
          ...target.lines,
          {
            asset,
            product,
            gal: null,
            topOff: true,
            charges: defaultLineCharges(),
          } as OrderLine,
        ]
      : target.lines.filter((l) => l.asset !== asset);
    onChange({ ...target, lines: next });
  };

  const setLine = (asset: string, patch: Partial<OrderLine>) =>
    onChange({
      ...target,
      lines: target.lines.map((l) =>
        l.asset === asset ? { ...l, ...patch } : l
      ),
    });

  return (
    <div className="border-b border-fp-outline-1 p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-foreground">
            {target.shipTo}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {target.customer.title} · {target.city}, {target.state}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${target.shipTo}`}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>

      {tanks.length === 0 ? (
        /* A SITE WITH NO MATCHING TANK IS STILL A LEGITIMATE TARGET — product
           can go into a bulk tank the asset register has never named. It says
           so rather than looking broken. */
        <p className="mt-3 rounded-md bg-fp-card-1 px-3 py-2 text-xs text-muted-foreground">
          No matching tank recorded at this site. It will be delivered as one
          bulk line, topped off.
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-md border border-fp-outline-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fp-outline-1 bg-fp-table-header">
                <th className="w-9 px-3 py-2" />
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Asset
                </th>
                <th className="w-[130px] px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                  Quantity (gal)
                </th>
                <th className="w-[100px] px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Top off
                </th>
              </tr>
            </thead>
            <tbody>
              {tanks.map((a) => {
                const line = chosen.get(a.name);
                const on = Boolean(line);
                return (
                  <tr
                    key={a.name}
                    className="border-b border-fp-outline-1 last:border-0"
                  >
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={on}
                        aria-label={`Include ${a.name}`}
                        onCheckedChange={(v) =>
                          toggle(a.name, a.product, v === true)
                        }
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "text-sm",
                          on ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {a.name}
                      </span>
                      {/* WITH SEVERAL PRODUCTS ON THE RULE the tank's own
                          product has to be on the row — "Main Bulk" alone no
                          longer says which of them it takes. */}
                      {products.length > 1 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {a.product}
                        </span>
                      )}
                      {a.rental && (
                        <Badge variant="secondary" className="ml-2">
                          Rental
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        className="h-8 text-right tabular-nums"
                        type="number"
                        inputMode="numeric"
                        placeholder="—"
                        aria-label={`Quantity for ${a.name}`}
                        disabled={!on || line?.topOff}
                        value={line?.gal ?? ""}
                        onChange={(e) =>
                          setLine(a.name, {
                            gal:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Checkbox
                        checked={line?.topOff ?? false}
                        disabled={!on}
                        aria-label={`Top off ${a.name}`}
                        onCheckedChange={(v) =>
                          setLine(a.name, {
                            topOff: v === true,
                            gal: v === true ? null : (line?.gal ?? null),
                          })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  all: RecurringProgram[];
  onCreate: (draft: ProgramDraft) => void;
}) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [draft, setDraft] = React.useState<ProgramDraft>(blankProgramDraft);
  const [picking, setPicking] = React.useState(false);
  const [q, setQ] = React.useState("");

  /* THE DRAFT SURVIVES A CLOSE, but a fresh Create starts clean — reopening
     onto somebody else's half-built programme is worse than losing it. */
  React.useEffect(() => {
    if (open) return;
    setStep(1);
    setQ("");
    setPicking(false);
  }, [open]);

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

  /** Accounts carrying EVERY product on the row — one number, one load. */
  const accountsFor = (products: string[]) =>
    products.length > 0 ? (loadOptions(products).accounts as string[]) : [];

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

  /* "Same date every month" is answered by its dates, not the day badges. */
  const daysPicked =
    draft.frequency.repeat === "monthly" && draft.frequency.monthlyMode === "everyMonth"
      ? (draft.frequency.monthDates ?? []).length > 0
      : draft.frequency.dayMode === "daily" || draft.frequency.days.length > 0;

  /* EVERY PRODUCT HAS TO LOAD SOMEWHERE. With rows keyed on the account
     rather than the product, a product can now fall off the table entirely —
     so the check is coverage, not just a filled-in cell. */
  const assignedProducts = new Set(draft.loadRows.flatMap((l) => l.products));
  const loadDone =
    !draft.loadOrder ||
    (draft.products.length > 0 &&
      draft.products.every((p) => assignedProducts.has(p)) &&
      draft.loadRows.every(
        (l) => l.products.length > 0 && Boolean(l.loadingAccount)
      ));

  const stepOneDone =
    (firstParty || draft.vendorIds.length > 0) &&
    draft.products.length > 0 &&
    daysPicked &&
    loadDone;

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
    { key: "days", label: "Pick the days it runs", done: daysPicked },
    {
      key: "account",
      label: "Choose a loading account",
      done: loadDone,
    },
    {
      key: "sites",
      label: "Add at least one ship-to",
      done: draft.targets.length > 0,
    },
    {
      key: "lines",
      label: "Say what each site takes",
      done:
        draft.targets.length > 0 &&
        draft.targets.every((t) => t.lines.length > 0),
    },
  ].filter((p) => !p.done);

  const canCreate = pending.length === 0;

  const addSite = (shipTo: string) => {
    const r = reachable.find((x) => x.shipTo === shipTo);
    if (!r) return;
    /* TANKS FOR ANY OF THE RULE'S PRODUCTS. With two products on a rule, a
       site's diesel tank and its unleaded tank are both in scope. */
    const tanks = r.site.assets.filter((a) =>
      draft.products.includes(a.product)
    );
    set("targets", [
      ...draft.targets,
      {
        id: `draft-${shipTo}`,
        customer: r.customer,
        shipTo,
        city: r.site.city,
        state: r.site.state,
        /* EVERY MATCHING TANK IS TICKED BY DEFAULT, topped off. It is what
           somebody adding a site almost always means, and unticking one is
           cheaper than finding and ticking three. */
        lines:
          tanks.length > 0
            ? tanks.map((a) => ({
                asset: a.name,
                product: a.product,
                gal: null,
                topOff: true,
                rental: a.rental,
                charges: defaultLineCharges(),
              }))
            : [
                {
                  asset: "Bulk tank",
                  product: draft.products[0] ?? "",
                  gal: null,
                  topOff: true,
                  charges: defaultLineCharges(),
                },
              ],
        window: { start: "8:00 AM", end: "12:00 PM" },
        poc: "",
        instructions: "",
        poNumber: "",
        vendorPrice: null,
        customerPrice: null,
        state_: "Draft",
        serviceable: true,
      },
    ]);
  };

  const alreadyOn = new Set(draft.targets.map((t) => t.shipTo));
  const options = reachable
    .filter((r) => !alreadyOn.has(r.shipTo))
    .filter(
      (r) =>
        !q.trim() ||
        `${r.customer.title} ${r.shipTo} ${r.site.city}`
          .toLowerCase()
          .includes(q.trim().toLowerCase())
    );

  return (
    <RecordSheet
      size="xwide"
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      editTitle="Programme"
      createTitle="Create recurring rule"
      createAction="Create rule"
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
            Create rule
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
        <PendingStrip pending={pending} clearLabel="Ready to create" />
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

          <Card title="Products">
            {/* TOKENS, because a rule can carry more than one product and a
                select cannot say so. The same control the order sheet uses for
                tags — pick from a list, each choice becomes a chip you can
                take off again. */}
            <TokenMultiSelect
              options={PRODUCTS}
              value={draft.products}
              addLabel="Add products"
              searchPlaceholder="Search products…"
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
                  loadRows: d.loadOrder ? syncLoadRows(d.loadRows, next) : [],
                  targets: [],
                }))
              }
            />

            {/* WINTER BLEND IS MAPPED PER PRODUCT, not per rule. One rule can
                carry diesel and unleaded, and only one of them takes an
                additive — a single order-level tick would additive both. */}
            {draft.products.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">
                  Winter blend
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {draft.products.map((prod) => {
                    const on = draft.winterProducts.includes(prod);
                    return (
                      <button
                        key={prod}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          set(
                            "winterProducts",
                            on
                              ? draft.winterProducts.filter((w) => w !== prod)
                              : [...draft.winterProducts, prod]
                          )
                        }
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          on
                            ? "bg-primary text-primary-foreground"
                            : "bg-fp-card-1 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {prod}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* THE LOAD ORDER. A ROW IS ONE LOADING NUMBER, and it carries as
              many of the rule's products as that account can — which is the
              usual case: one number, one load, several products on the truck.
              A second row exists only because some product has to load
              somewhere the first account cannot reach. */}
          <Card
            title="Load order"
            flush={draft.loadOrder && draft.loadRows.length > 0}
          >
            <div
              className={cn(
                draft.loadOrder && draft.loadRows.length > 0 && "p-4 pb-0"
              )}
            >
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
                <Checkbox
                  checked={draft.loadOrder}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      loadOrder: v === true,
                      loadRows:
                        v === true ? syncLoadRows([], d.products) : [],
                    }))
                  }
                />
                We buy the product — this rule carries a load order
              </label>
            </div>

            {draft.loadOrder &&
              (draft.products.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Choose a product first.
                </p>
              ) : (
                <div className="mt-4 overflow-hidden border-t border-fp-outline-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-fp-outline-1 bg-fp-table-header">
                        {["Products", "Loading account", "Terminal", "Supplier"].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                            >
                              {h}
                            </th>
                          )
                        )}
                        <th className="w-10 px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {draft.loadRows.map((row, i) => {
                        /* A PRODUCT LOADS ONCE. What the other rows have
                           taken is not on offer here, so the table cannot be
                           made to say two accounts carry the same gallon. */
                        const taken = new Set(
                          draft.loadRows.flatMap((l, j) =>
                            j === i ? [] : l.products
                          )
                        );
                        const offer = draft.products.filter(
                          (pr) => !taken.has(pr)
                        );
                        const accounts = accountsFor(row.products);
                        return (
                          <tr
                            key={i}
                            className="border-b border-fp-outline-1 align-top last:border-0"
                          >
                            <td className="px-3 py-2">
                              <TokenMultiSelect
                                options={offer}
                                value={row.products}
                                addLabel="Add products"
                                searchPlaceholder="Search products…"
                                onChange={(next) =>
                                  set(
                                    "loadRows",
                                    draft.loadRows.map((l, j) =>
                                      j === i
                                        ? accountCarries(l.loadingAccount, next)
                                          ? { ...l, products: next }
                                          : {
                                              ...l,
                                              products: next,
                                              loadingAccount: "",
                                              terminal: "",
                                              supplier: "",
                                            }
                                        : l
                                    )
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              {row.products.length > 0 &&
                              accounts.length === 0 ? (
                                /* NO ONE NUMBER COVERS THE ROW. It is a real
                                   dead end rather than an empty list, so it
                                   says so where the answer would go. */
                                <span className="flex items-center gap-1.5 py-1.5 text-xs text-status-failed">
                                  <AlertTriangle className="size-3.5" />
                                  No account carries all of these
                                </span>
                              ) : (
                                <Select
                                  value={row.loadingAccount}
                                  onValueChange={(v) => {
                                    const a = LOADING_ACCOUNTS.find(
                                      (x) => x.name === v
                                    );
                                    set(
                                      "loadRows",
                                      draft.loadRows.map((l, j) =>
                                        j === i
                                          ? {
                                              ...l,
                                              loadingAccount: v,
                                              terminal: a?.terminal ?? "",
                                              supplier: a?.supplier ?? "",
                                            }
                                          : l
                                      )
                                    );
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Choose an account" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {accounts.map((a) => (
                                      <SelectItem key={a} value={a}>
                                        {a}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </td>
                            <td className="px-3 py-3.5 text-muted-foreground">
                              {row.terminal || DASH}
                            </td>
                            <td className="px-3 py-3.5 text-muted-foreground">
                              {row.supplier || DASH}
                            </td>
                            <td className="px-3 py-2">
                              {draft.loadRows.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Remove this loading account"
                                  onClick={() =>
                                    set(
                                      "loadRows",
                                      /* ITS PRODUCTS GO BACK ON THE FIRST ROW
                                         rather than off the rule — removing an
                                         account is not removing a product. */
                                      syncLoadRows(
                                        draft.loadRows.filter(
                                          (_, j) => j !== i
                                        ),
                                        draft.products
                                      )
                                    )
                                  }
                                >
                                  <Trash2 />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* NOTHING LEFT TO SPLIT, SO NOTHING TO PRESS. Once every
                      product has its own account there is no further split to
                      make, and a dead button with no reason beside it is worse
                      than no button. */}
                  {draft.loadRows.length < draft.products.length && (
                  <div className="border-t border-fp-outline-1 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        set("loadRows", [
                          ...draft.loadRows,
                          {
                            products: [],
                            terminal: "",
                            supplier: "",
                            loadingAccount: "",
                          },
                        ])
                      }
                    >
                      <Plus />
                      Add a loading account
                    </Button>
                  </div>
                  )}
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

          <Card
            title={`Ship-tos — ${draft.targets.length}`}
            aside={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPicking((p) => !p)}
              >
                <Plus />
                Add ship-to
              </Button>
            }
          >
            {picking && (
              <div className="mb-4 overflow-hidden rounded-md border border-fp-outline-1">
                <div className="relative border-b border-fp-outline-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search sites…"
                    className="border-0 pl-8 focus-visible:ring-0"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {options.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {q
                        ? "Nothing matches inside this partner's area."
                        : "Every site this partner can reach is already added."}
                    </p>
                  ) : (
                    options.map((o) => {
                      const clash = clashFor(
                        o.shipTo,
                        draft.products,
                        "new",
                        all
                      );
                      return (
                        <div
                          key={o.shipTo}
                          className="flex items-center justify-between gap-3 border-b border-fp-outline-1 px-3 py-2.5 last:border-0"
                        >
                          <div className="flex min-w-0 flex-col leading-tight">
                            <span className="truncate text-sm text-foreground">
                              {o.shipTo}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {o.customer.title} · {o.site.city}, {o.site.state}
                            </span>
                            {clash && (
                              <span className="mt-1 flex items-center gap-1.5 text-xs text-status-failed">
                                <AlertTriangle className="size-3" />
                                Already on {clash.programNo} for{" "}
                                {draft.products.join(" + ")}
                              </span>
                            )}
                          </div>
                          <Button
                            variant={clash ? "outline" : "default"}
                            size="sm"
                            onClick={() => addSite(o.shipTo)}
                          >
                            Add
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {draft.targets.length === 0 ? (
              <p className="rounded-md border border-dashed border-fp-outline-1 px-4 py-8 text-center text-sm text-muted-foreground">
                No ship-tos yet. {reachable.length} sites are on offer.
              </p>
            ) : (
              <div className="-m-4 mt-0 overflow-hidden">
                {draft.targets.map((t, i) => (
                  <TargetEditor
                    key={t.id}
                    target={t}
                    products={draft.products}
                    onChange={(next) =>
                      set(
                        "targets",
                        draft.targets.map((x, j) => (j === i ? next : x))
                      )
                    }
                    onRemove={() =>
                      set(
                        "targets",
                        draft.targets.filter((_, j) => j !== i)
                      )
                    }
                  />
                ))}
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
