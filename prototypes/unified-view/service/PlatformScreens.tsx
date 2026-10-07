import * as React from "react";
import { BookOpen, CalendarClock, FileSignature, Gauge, Package, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { DATE_FMT } from "../data";
import type { ListColumn } from "../ListTable";
import { statusTones } from "../statusKind";
import { ServiceListScreen } from "./ServiceListScreen";
import {
  AGREEMENTS,
  COMPLIANCE,
  INVENTORY,
  MAINTENANCE_PLANS,
  PRICE_BOOK,
  performance,
  stockStatus,
  type AgreementRow,
  type AgreementStatus,
  type ComplianceItem,
  type ComplianceStatus,
  type InventoryRow,
  type MaintenancePlan,
  type PriceBookRow,
} from "./catalog";
import { useServiceSettings } from "./settings";
import { nextServiceOrderNo, setServiceOrders, useServiceOrders } from "./store";
import { TECHNICIANS, blankServiceOrder, money, orderTotal, syncPrimaryAsset } from "./work";

/*
  THE SERVICE PLATFORM'S OTHER SCREENS (Pavan and Deepika, 2026-09-24), after
  Anirudh's unified design. Each is the one list shape (`ServiceListScreen`);
  the data is in `catalog.ts`.
*/

const fmtKey = (k: string) => DATE_FMT.format(new Date(`${k}T00:00:00`));
const num = (n: number) => <span className="tabular-nums">{n}</span>;

/* ───────────────────────────────────────────────────────────── Price book */

type PbKey = "code" | "job" | "category" | "labor" | "parts" | "fee" | "rate" | "actions";
const PB_COLUMNS: ListColumn<PbKey>[] = [
  { key: "code", label: "Code", width: 140, sortable: true },
  { key: "job", label: "Job", width: 200, sortable: true },
  { key: "category", label: "Category", width: 220, sortable: true },
  { key: "labor", label: "Labour", width: 110, sortable: true, align: "right" },
  { key: "parts", label: "Parts", width: 240, sortable: true },
  { key: "fee", label: "Fee", width: 120, sortable: true, align: "right" },
  { key: "rate", label: "Flat rate", width: 130, sortable: true, align: "right" },
  { key: "actions", label: "", width: 44 },
];

/**
 * THE PRICE BOOK — per job type: the usual hours, the parts it needs, its fee
 * and what it comes to. Orders pull their parts and fees from here; the flat
 * rate is parts + fee + hours at the standard rate.
 */
export function PriceBookScreen() {
  return (
    <ServiceListScreen<PriceBookRow, PbKey>
      rows={PRICE_BOOK}
      columns={PB_COLUMNS}
      rowId={(r) => r.code}
      noun="jobs"
      icon={<BookOpen />}
      searchPlaceholder="Search jobs, codes, parts…"
      searchText={(r) => [r.code, r.job, r.category, ...r.parts].join(" ")}
      sortValue={(r, k) =>
        k === "labor" ? r.laborHours : k === "fee" ? r.fee : k === "rate" ? r.flatRate : k === "parts" ? r.parts.join(", ") : k === "code" ? r.code : k === "category" ? r.category : r.job
      }
      renderCell={(r, k) => {
        switch (k) {
          case "code":
            return <span className="font-medium tabular-nums">{r.code}</span>;
          case "job":
            return r.job;
          case "category":
            return r.category;
          case "labor":
            return <span className="tabular-nums">{r.laborHours} h</span>;
          case "parts":
            return r.parts.length ? r.parts.join(", ") : <span className="text-muted-foreground">—</span>;
          case "fee":
            return <span className="tabular-nums">{money(r.fee)}</span>;
          case "rate":
            return <span className="font-medium tabular-nums">{money(r.flatRate)}</span>;
          default:
            return null;
        }
      }}
    />
  );
}

/* ────────────────────────────────────────────────────────────────── Parts */

type StockStatus = "Stocked" | "Reorder";
/* STOCKED IS SIMPLY TRUE (info); REORDER IS SOMEBODY'S TURN (caution). */
const STOCK_TONE = statusTones<StockStatus>({ Stocked: "info", Reorder: "caution" });

type PtKey = "sku" | "part" | "bin" | "vendor" | "onHand" | "reorderAt" | "cost" | "status" | "actions";
const PT_COLUMNS: ListColumn<PtKey>[] = [
  { key: "sku", label: "SKU", width: 130, sortable: true },
  { key: "part", label: "Part", width: 220, sortable: true },
  { key: "bin", label: "Bin", width: 100, sortable: true },
  { key: "vendor", label: "Vendor", width: 160, sortable: true },
  { key: "onHand", label: "On hand", width: 110, sortable: true, align: "right" },
  { key: "reorderAt", label: "Reorder at", width: 120, sortable: true, align: "right" },
  { key: "cost", label: "Cost", width: 110, sortable: true, align: "right" },
  { key: "status", label: "Status", width: 130, sortable: true },
  { key: "actions", label: "", width: 44 },
];

/** PARTS AND INVENTORY — what is on the shelf, where, and when to reorder. */
export function PartsScreen() {
  return (
    <ServiceListScreen<InventoryRow, PtKey>
      rows={INVENTORY}
      columns={PT_COLUMNS}
      rowId={(r) => r.sku}
      noun="parts"
      icon={<Package />}
      searchPlaceholder="Search parts, SKUs, vendors…"
      searchText={(r) => [r.sku, r.part, r.bin, r.vendor].join(" ")}
      sortValue={(r, k) =>
        k === "onHand" ? r.onHand : k === "reorderAt" ? r.reorderAt : k === "cost" ? r.cost : k === "status" ? stockStatus(r) : String(r[k as "sku"] ?? "")
      }
      renderCell={(r, k) => {
        switch (k) {
          case "sku":
            return <span className="font-medium tabular-nums">{r.sku}</span>;
          case "part":
            return r.part;
          case "bin":
            return <span className="tabular-nums">{r.bin}</span>;
          case "vendor":
            return r.vendor;
          case "onHand":
            return num(r.onHand);
          case "reorderAt":
            return num(r.reorderAt);
          case "cost":
            return <span className="tabular-nums">{money(r.cost)}</span>;
          case "status":
            return <StatusChip tone={STOCK_TONE[stockStatus(r)]}>{stockStatus(r)}</StatusChip>;
          default:
            return null;
        }
      }}
    />
  );
}

/* ───────────────────────────────────────────────────────────── Agreements */

/* ACTIVE ASKS NOTHING (info); RENEWAL DUE IS SOMEBODY'S TURN (caution);
   LAPSED CHANGES THE PLAN — the visits are no longer covered (critical). */
const AGREEMENT_TONE = statusTones<AgreementStatus>({ Active: "info", "Renewal due": "caution", Lapsed: "critical" });

type AgKey = "no" | "kind" | "customer" | "asset" | "plan" | "visits" | "monthly" | "renews" | "status" | "actions";
const AG_COLUMNS: ListColumn<AgKey>[] = [
  { key: "no", label: "Agreement", width: 120, sortable: true },
  { key: "kind", label: "Type", width: 130, sortable: true },
  { key: "customer", label: "Customer", width: 200, sortable: true },
  { key: "asset", label: "Asset", width: 180, sortable: true },
  { key: "plan", label: "Plan", width: 200, sortable: true },
  { key: "visits", label: "Visits", width: 100, sortable: true, align: "right" },
  { key: "monthly", label: "Monthly", width: 110, sortable: true, align: "right" },
  { key: "renews", label: "Renews", width: 170, sortable: true },
  { key: "status", label: "Status", width: 140, sortable: true },
  { key: "actions", label: "", width: 44 },
];

/**
 * AGREEMENTS AND MEMBERSHIPS (Deepika, 2026-09-24) — a customer's plan (so
 * many visits a year for so much) or a master service agreement (a yearly fee
 * covering a schedule), against the asset it covers.
 */
export function AgreementsScreen() {
  return (
    <ServiceListScreen<AgreementRow, AgKey>
      rows={AGREEMENTS}
      columns={AG_COLUMNS}
      rowId={(r) => r.no}
      noun="agreements"
      icon={<FileSignature />}
      searchPlaceholder="Search agreements, customers, assets…"
      searchText={(r) => [r.no, r.kind, r.customer, r.asset, r.plan].join(" ")}
      sortValue={(r, k) =>
        k === "visits" ? r.visitsUsed / r.visitsIncluded : k === "monthly" ? r.monthly : k === "renews" ? r.renewsKey : String(r[k as "no"] ?? "")
      }
      renderCell={(r, k) => {
        switch (k) {
          case "no":
            return <span className="font-medium tabular-nums">{r.no}</span>;
          case "kind":
            return <Badge variant="secondary">{r.kind}</Badge>;
          case "customer":
            return r.customer;
          case "asset":
            return r.asset;
          case "plan":
            return r.plan;
          case "visits":
            return <span className="tabular-nums">{r.visitsUsed}/{r.visitsIncluded}</span>;
          case "monthly":
            return <span className="tabular-nums">{money(r.monthly)}</span>;
          case "renews":
            return (
              <span className="tabular-nums">
                {fmtKey(r.renewsKey)}
                {r.autoRenew && <span className="text-muted-foreground"> · auto</span>}
              </span>
            );
          case "status":
            return <StatusChip tone={AGREEMENT_TONE[r.status]}>{r.status}</StatusChip>;
          default:
            return null;
        }
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────── Maintenance */

/** Plans already raised this session — plan id → order number. */
const raised = new Map<string, string>();

type MpKey = "no" | "asset" | "customer" | "task" | "every" | "last" | "next" | "raise" | "actions";
const MP_COLUMNS: ListColumn<MpKey>[] = [
  { key: "no", label: "Plan", width: 110, sortable: true },
  { key: "asset", label: "Asset", width: 180, sortable: true },
  { key: "customer", label: "Customer", width: 200, sortable: true },
  { key: "task", label: "Task", width: 170, sortable: true },
  { key: "every", label: "Every", width: 100, sortable: true, align: "right" },
  { key: "last", label: "Last done", width: 140, sortable: true },
  { key: "next", label: "Next due", width: 140, sortable: true },
  /* EVERY COLUMN SORTS, as on 3PL (Pavan, 2026-10-07) — by the order a plan
     raised, so the plans still waiting on a visit gather at one end. */
  { key: "raise", label: "Visit", width: 150, sortable: true },
  { key: "actions", label: "", width: 44 },
];

/**
 * MAINTENANCE SCHEDULING — recurring work per asset. "Raise visit" makes a
 * REAL service order on the board (a draft for the dispatcher to assign),
 * carrying the customer, site, asset and task.
 */
export function MaintenanceScreen() {
  const cfg = useServiceSettings();
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const raise = (p: MaintenancePlan) => {
    let no = "";
    setServiceOrders((prev) => {
      no = nextServiceOrderNo(prev);
      const base = blankServiceOrder({ priceBook: cfg.priceBook, raisedBy: "Dana Whitfield", source: "Flagged inspection" });
      const order = syncPrimaryAsset({
        ...base,
        id: `so-mp-${no}`,
        orderNo: no,
        customer: p.customer,
        shipTo: p.shipTo,
        assets: [{ assetId: p.assetId, assetName: p.asset, assetType: p.assetType, workType: p.task, fault: `Scheduled maintenance · ${p.no}` }],
      });
      return [order, ...prev];
    });
    raised.set(p.id, no);
    bump();
    toast.success(`${no} raised`);
  };
  return (
    <ServiceListScreen<MaintenancePlan, MpKey>
      rows={MAINTENANCE_PLANS}
      columns={MP_COLUMNS}
      rowId={(r) => r.no}
      noun="plans"
      icon={<CalendarClock />}
      searchPlaceholder="Search plans, assets, customers…"
      searchText={(r) => [r.no, r.asset, r.customer, r.task].join(" ")}
      sortValue={(r, k) =>
        k === "every"
          ? r.everyMonths
          : k === "last"
            ? r.lastKey
            : k === "next"
              ? r.nextKey
              : k === "raise"
                ? (raised.get(r.id) ?? "")
                : String(r[k as "no"] ?? "")
      }
      renderCell={(r, k) => {
        switch (k) {
          case "no":
            return <span className="font-medium tabular-nums">{r.no}</span>;
          case "asset":
            return r.asset;
          case "customer":
            return r.customer;
          case "task":
            return r.task;
          case "every":
            return <span className="tabular-nums">{r.everyMonths} mo</span>;
          case "last":
            return <span className="tabular-nums">{fmtKey(r.lastKey)}</span>;
          case "next":
            return <span className="tabular-nums">{fmtKey(r.nextKey)}</span>;
          case "raise":
            return raised.has(r.id) ? (
              <span className="text-sm text-muted-foreground">Raised · {raised.get(r.id)}</span>
            ) : (
              <Button size="xs" variant="outline" onClick={() => raise(r)}>
                Raise visit
              </Button>
            );
          default:
            return null;
        }
      }}
    />
  );
}

/* ───────────────────────────────────────────────────────────── Compliance */

/* OK IS SIMPLY TRUE (info); DUE SOON IS SOMEBODY'S TURN (caution); OVERDUE
   CHANGES THE PLAN — the asset is out of certificate (critical). */
const COMPLIANCE_TONE = statusTones<ComplianceStatus>({ OK: "info", "Due soon": "caution", Overdue: "critical" });

type CpKey = "no" | "asset" | "customer" | "requirement" | "authority" | "last" | "due" | "status" | "actions";
const CP_COLUMNS: ListColumn<CpKey>[] = [
  { key: "no", label: "Item", width: 100, sortable: true },
  { key: "asset", label: "Asset", width: 180, sortable: true },
  { key: "customer", label: "Customer", width: 190, sortable: true },
  { key: "requirement", label: "Requirement", width: 230, sortable: true },
  { key: "authority", label: "Authority", width: 130, sortable: true },
  { key: "last", label: "Last cert", width: 140, sortable: true },
  { key: "due", label: "Due on", width: 140, sortable: true },
  { key: "status", label: "Status", width: 120, sortable: true },
  { key: "actions", label: "", width: 44 },
];

/**
 * LONG-CYCLE COMPLIANCE (Deepika, 2026-09-24) — tests an asset needs because
 * it stays at a customer for years.
 */
export function ComplianceScreen() {
  return (
    <ServiceListScreen<ComplianceItem, CpKey>
      rows={COMPLIANCE}
      columns={CP_COLUMNS}
      rowId={(r) => r.no}
      noun="items"
      icon={<ShieldCheck />}
      searchPlaceholder="Search assets, requirements, authorities…"
      searchText={(r) => [r.no, r.asset, r.customer, r.requirement, r.authority].join(" ")}
      sortValue={(r, k) => (k === "last" ? r.lastKey : k === "due" ? r.dueKey : String(r[k as "no"] ?? ""))}
      renderCell={(r, k) => {
        switch (k) {
          case "no":
            return <span className="font-medium tabular-nums">{r.no}</span>;
          case "asset":
            return r.asset;
          case "customer":
            return r.customer;
          case "requirement":
            return r.requirement;
          case "authority":
            return r.authority;
          case "last":
            return <span className="tabular-nums">{fmtKey(r.lastKey)}</span>;
          case "due":
            return <span className="tabular-nums">{fmtKey(r.dueKey)}</span>;
          case "status":
            return <StatusChip tone={COMPLIANCE_TONE[r.status]}>{r.status}</StatusChip>;
          default:
            return null;
        }
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────── Performance */

interface ScoreRow {
  id: string;
  name: string;
  base: string;
  skills: string[];
  open: number;
  fixRate: number;
  attachRate: number;
}

type ScKey = "name" | "base" | "skills" | "open" | "fix" | "attach" | "actions";
const SC_COLUMNS: ListColumn<ScKey>[] = [
  { key: "name", label: "Technician", width: 200, sortable: true },
  { key: "base", label: "Base", width: 180, sortable: true },
  { key: "skills", label: "Skills", width: 260, sortable: true },
  { key: "open", label: "Open jobs", width: 120, sortable: true, align: "right" },
  { key: "fix", label: "First-time fix", width: 140, sortable: true, align: "right" },
  { key: "attach", label: "Quote attach", width: 140, sortable: true, align: "right" },
  { key: "actions", label: "", width: 44 },
];

/** A figure with its label, for the row above the scorecard. */
function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-fp-outline-1 bg-fp-surface-1a px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/**
 * SERVICE PERFORMANCE — counted live off the SAME orders the board and the
 * phone use, so every finished job moves these numbers.
 */
export function PerformanceScreen() {
  const [rows] = useServiceOrders();
  const p = performance(rows);
  const invoiced = rows.filter((r) => r.invoiceCreated).reduce((s, r) => s + orderTotal(r), 0);
  const collected = rows.filter((r) => r.synced).reduce((s, r) => s + orderTotal(r), 0);
  const scores: ScoreRow[] = TECHNICIANS.map((t) => {
    const mine = rows.filter((r) => r.technicianId === t.id);
    const s = performance(mine);
    return { id: t.id, name: t.name, base: t.base, skills: t.skills, open: s.open, fixRate: s.firstTimeFix, attachRate: s.quoteAttach };
  });
  return (
    <ServiceListScreen<ScoreRow, ScKey>
      above={
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
          <Figure label="Open jobs" value={String(p.open)} />
          <Figure label="First-time fix rate" value={`${p.firstTimeFix}%`} />
          <Figure label="Quote attach rate" value={`${p.quoteAttach}%`} />
          <Figure label="Jobs finished" value={String(p.finished)} />
          <Figure label="Invoiced" value={money(invoiced)} />
          <Figure label="Synced to accounting" value={money(collected)} />
        </div>
      }
      rows={scores}
      columns={SC_COLUMNS}
      rowId={(r) => r.id}
      noun="technicians"
      icon={<Gauge />}
      searchPlaceholder="Search technicians, bases, skills…"
      searchText={(r) => [r.name, r.base, ...r.skills].join(" ")}
      sortValue={(r, k) =>
        k === "open" ? r.open : k === "fix" ? r.fixRate : k === "attach" ? r.attachRate : k === "skills" ? r.skills.join(", ") : k === "base" ? r.base : r.name
      }
      renderCell={(r, k) => {
        switch (k) {
          case "name":
            return <span className="font-medium text-foreground">{r.name}</span>;
          case "base":
            return r.base;
          case "skills":
            return (
              <span className="flex flex-wrap items-center gap-1">
                {r.skills.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </span>
            );
          case "open":
            return num(r.open);
          case "fix":
            return <span className="tabular-nums">{r.fixRate}%</span>;
          case "attach":
            return <span className="tabular-nums">{r.attachRate}%</span>;
          default:
            return null;
        }
      }}
    />
  );
}

