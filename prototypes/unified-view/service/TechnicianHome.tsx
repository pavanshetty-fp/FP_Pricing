import * as React from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  LogOut,
  Menu,
  PlusCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/ui/status-chip";
import { TableRowRemove } from "@/components/form-layout/table-cells";
import { TimeWindowSlider } from "@/components/form-layout/TimeWindowSlider";
import { DATE_FMT } from "../data";
import { statusTones } from "../statusKind";
import {
  ACTIVE_TECHNICIANS,
  INTAKE_SOURCES,
  PRIORITIES,
  SERVICE_CUSTOMERS,
  WORK_TYPE_NAMES,
  assetsAt,
  createdAtOf,
  money,
  shipTosOf,
  syncPrimaryAsset,
  technicianById,
  type ServiceOrder,
  type Technician,
} from "./work";

/*
  ═══════════════════════════════════════════════════════════════════════════
  THE TECHNICIAN APP'S HOME — the jobs list, the new order, and the shell
  around them (Pavan, 2026-09-23).
  ═══════════════════════════════════════════════════════════════════════════

  SAME UI AS THE WEB, MOBILE WHERE IT HAS TO BE. The chips, status tones,
  inputs, calendar and slider are the DS's. What changes is only what a phone
  changes:

  · NAVIGATION is a bottom TAB BAR (the thumb's reach) plus a HAMBURGER for
    everything that is not a daily destination.
  · A CHOICE opens a BOTTOM SHEET inside the phone, never a desktop popover —
    a popover sized for a mouse is a target sized for nobody.
  · SORT AND FILTER live in one sheet behind one button, and what is applied
    shows as removable chips under the search bar.
  · THE ACT IS PINNED to the bottom, full width (rule 2 of the app).

  Everything overlays INSIDE the device frame (`absolute`), because the
  frame is the screen — a portal to the page body would cover the desktop.
*/

/* ─────────────────────────────────────────────────────── the shell parts ── */

/** The home header: the menu on the left, the screen's name beside it. */
export function HomeHeader({
  title,
  subtitle,
  onMenu,
  aside,
}: {
  title: string;
  subtitle?: string;
  onMenu: () => void;
  aside?: React.ReactNode;
}) {
  return (
    <header className="flex shrink-0 items-center gap-1 border-b border-fp-outline-1 bg-fp-surface-1a px-2 py-2">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="flex size-11 shrink-0 items-center justify-center rounded-md text-foreground active:bg-accent"
      >
        <Menu className="size-5" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-semibold text-foreground">{title}</span>
        {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {aside}
    </header>
  );
}

export type HomeTab = "jobs" | "new";

/**
 * THE TAB BAR. Two destinations, because a technician's day has two: the
 * jobs they are sent, and the job they find. Anything else is in the menu.
 */
export function TabBar({ tab, onTab }: { tab: HomeTab; onTab: (t: HomeTab) => void }) {
  const items: { key: HomeTab; label: string; icon: React.ReactNode }[] = [
    { key: "jobs", label: "My jobs", icon: <ClipboardList className="size-5" /> },
    { key: "new", label: "New order", icon: <PlusCircle className="size-5" /> },
  ];
  return (
    <nav className="grid shrink-0 grid-cols-2 border-t border-fp-outline-1 bg-fp-surface-1a pb-2">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onTab(it.key)}
          aria-current={tab === it.key ? "page" : undefined}
          className={cn(
            "relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-accent",
            tab === it.key ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {/* The active mark is the brand's, as on the web's tabs. */}
          {tab === it.key && (
            <span aria-hidden className="absolute top-0 h-0.5 w-10 rounded-full bg-primary" />
          )}
          {it.icon}
          {it.label}
        </button>
      ))}
    </nav>
  );
}

/** The menu, from the left, over the app. Who is signed in, and the rest. */
export function MenuDrawer({
  open,
  onClose,
  technician,
  onTab,
}: {
  open: boolean;
  onClose: () => void;
  technician: Technician;
  onTab: (t: HomeTab) => void;
}) {
  if (!open) return null;
  const item = "flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-foreground active:bg-accent";
  return (
    <div className="absolute inset-0 z-40 flex">
      <div className="flex h-full w-[82%] flex-col border-r border-fp-outline-1 bg-fp-surface-1a">
        <div className="flex flex-col gap-0.5 border-b border-fp-outline-1 px-4 pt-6 pb-4">
          <span className="text-base font-semibold text-foreground">{technician.name}</span>
          <span className="text-xs text-muted-foreground">
            {technician.base} · {technician.skills.join(" · ")}
          </span>
        </div>
        <div className="flex flex-col gap-1 p-2">
          <button type="button" className={item} onClick={() => { onTab("jobs"); onClose(); }}>
            <ClipboardList className="size-4 text-muted-foreground" /> My jobs
          </button>
          <button type="button" className={item} onClick={() => { onTab("new"); onClose(); }}>
            <PlusCircle className="size-4 text-muted-foreground" /> New order
          </button>
        </div>
        <div className="mt-auto border-t border-fp-outline-1 p-2">
          <button
            type="button"
            className={item}
            onClick={() => {
              onClose();
              toast("Sign-out is not part of the prototype");
            }}
          >
            <LogOut className="size-4 text-muted-foreground" /> Sign out
          </button>
        </div>
      </div>
      <button type="button" aria-label="Close menu" onClick={onClose} className="flex-1 bg-black/50" />
    </div>
  );
}

/**
 * A BOTTOM SHEET, inside the phone. The mobile form of a popover and of a
 * dialog: it rises from where the thumb is, and a tap above it dismisses.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  full,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Nearly the whole screen — for writing, not choosing. */
  full?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("bg-black/50", full ? "h-10 shrink-0" : "min-h-16 flex-1")}
      />
      <div
        className={cn(
          "flex flex-col rounded-t-2xl border-t border-fp-outline-1 bg-fp-surface-1a",
          full ? "min-h-0 flex-1" : "max-h-[85%]"
        )}
      >
        <div className="flex justify-center pt-2">
          <span aria-hidden className="h-1 w-10 rounded-full bg-fp-outline-2" />
        </div>
        <div className="flex items-center justify-between px-4 pt-2 pb-3">
          <span className="text-base font-semibold text-foreground">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 items-center justify-center rounded-md text-muted-foreground active:bg-accent"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
        {footer && <div className="shrink-0 border-t border-fp-outline-1 p-3">{footer}</div>}
      </div>
    </div>
  );
}

/** One choice from a list, in a bottom sheet. It searches past a handful. */
function PickerSheet({
  open,
  onClose,
  title,
  options,
  value,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: string[];
  value: string;
  onPick: (v: string) => void;
}) {
  const [q, setQ] = React.useState("");
  React.useEffect(() => {
    if (!open) setQ("");
  }, [open]);
  const shown = options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {options.length > 7 && (
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-11 pl-9" />
        </div>
      )}
      <div className="flex flex-col">
        {shown.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              onPick(o);
              onClose();
            }}
            className="flex h-11 items-center justify-between rounded-md px-2 text-left text-sm text-foreground active:bg-accent"
          >
            <span className="truncate">{o}</span>
            {o === value && <Check className="size-4 shrink-0" />}
          </button>
        ))}
        {shown.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No matches.</p>}
      </div>
    </BottomSheet>
  );
}

/* ─────────────────────────────────────────────────────────── the jobs ── */

type SortKey = "execution" | "priority" | "created";
type DateFilter = "any" | "today" | "tomorrow" | "week" | "day";

interface JobFilters {
  sort: SortKey;
  date: DateFilter;
  day: Date | null;
  customers: string[];
  shipTos: string[];
}

const NO_FILTERS: JobFilters = { sort: "execution", date: "any", day: null, customers: [], shipTos: [] };

const SORT_LABEL: Record<SortKey, string> = {
  execution: "Date of execution",
  priority: "Priority",
  created: "Date created",
};
const DATE_LABEL: Record<Exclude<DateFilter, "day">, string> = {
  any: "Any date",
  today: "Today",
  tomorrow: "Tomorrow",
  week: "Next 7 days",
};

/**
 * THE TECHNICIAN'S FOUR STATUSES (Pavan, 2026-09-24). The order has more
 * stages than a technician needs; on the phone every order is one of these,
 * and the tabs are exactly these — "Ongoing", never a second word for it.
 */
export type TechStatus = "Yet to start" | "Ongoing" | "Parts pending" | "Completed";

export function techStatusOf(o: ServiceOrder): TechStatus {
  if (o.status === "Ongoing") return "Ongoing";
  if (o.status === "Parts pending" || o.status === "Linked order") return "Parts pending";
  if (o.status === "Drafted" || o.status === "Assigned" || o.status === "Yet to start") return "Yet to start";
  return "Completed";
}

/** The status-kind rule (DS §10b): waiting is amber, under way is blue, done is green. */
const TECH_STATUS_TONE = statusTones<TechStatus>({
  "Yet to start": "neutral",
  Ongoing: "info",
  "Parts pending": "caution",
  Completed: "success",
});

const STATUS_TABS: { key: string; label: string; status: TechStatus | null }[] = [
  { key: "all", label: "All", status: null },
  { key: "yet", label: "Yet to start", status: "Yet to start" },
  { key: "ongoing", label: "Ongoing", status: "Ongoing" },
  { key: "parts", label: "Parts pending", status: "Parts pending" },
  { key: "done", label: "Completed", status: "Completed" },
];

const PRIORITY_RANK: Record<string, number> = { Urgent: 0, High: 1, Normal: 2 };
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

function dayHeading(key: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${key}T00:00:00`);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return weekdayFmt.format(d);
}

function matchesDate(o: ServiceOrder, f: JobFilters): boolean {
  if (f.date === "any") return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (f.date === "today") return o.dateKey === dayKey(today);
  if (f.date === "tomorrow") {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return o.dateKey === dayKey(t);
  }
  if (f.date === "week") {
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    return o.dateKey >= dayKey(today) && o.dateKey <= dayKey(end);
  }
  return f.day ? o.dateKey === dayKey(f.day) : true;
}

/** The chips under the search bar — each applied filter, removable. */
function appliedChips(f: JobFilters, set: (f: JobFilters) => void) {
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (f.date !== "any")
    chips.push({
      key: "date",
      label: f.date === "day" && f.day ? DATE_FMT.format(f.day) : DATE_LABEL[f.date as Exclude<DateFilter, "day">],
      clear: () => set({ ...f, date: "any", day: null }),
    });
  f.customers.forEach((c) =>
    chips.push({ key: `c-${c}`, label: c, clear: () => set({ ...f, customers: f.customers.filter((x) => x !== c) }) })
  );
  f.shipTos.forEach((s) =>
    chips.push({ key: `s-${s}`, label: s, clear: () => set({ ...f, shipTos: f.shipTos.filter((x) => x !== s) }) })
  );
  return chips;
}

/**
 * EVERY JOB ASSIGNED TO THIS TECHNICIAN, in the order they will be done —
 * grouped by the day of the work while sorted that way, because a technician
 * reads their list as "today, then tomorrow". Search, sort and filter sit
 * above it; what is applied is always visible as chips.
 */
export function JobsScreen({
  jobs,
  technician,
  onOpen,
  onMenu,
}: {
  jobs: ServiceOrder[];
  technician: Technician;
  onOpen: (id: string) => void;
  onMenu: () => void;
}) {
  const [statusTab, setStatusTab] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState<JobFilters>(NO_FILTERS);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const shown = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const inTab = STATUS_TABS.find((t) => t.key === statusTab)?.status;
    const list = jobs.filter(
      (o) =>
        (!inTab || techStatusOf(o) === inTab) &&
        (!q ||
          o.orderNo.toLowerCase().includes(q) ||
          o.customer.toLowerCase().includes(q) ||
          o.shipTo.toLowerCase().includes(q)) &&
        matchesDate(o, filters) &&
        (filters.customers.length === 0 || filters.customers.includes(o.customer)) &&
        (filters.shipTos.length === 0 || filters.shipTos.includes(o.shipTo))
    );
    const exec = (o: ServiceOrder) => o.scheduledAt ?? `${o.dateKey}T23:59`;
    return list.sort((a, b) =>
      filters.sort === "priority"
        ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || exec(a).localeCompare(exec(b))
        : filters.sort === "created"
          ? createdAtOf(b).localeCompare(createdAtOf(a))
          : exec(a).localeCompare(exec(b))
    );
  }, [jobs, query, filters, statusTab]);

  const chips = appliedChips(filters, setFilters);
  const activeCount = chips.length + (filters.sort !== "execution" ? 1 : 0);

  /* Grouped by day only while sorted by the day — any other order would cut
     the groups up into the same heading repeated. */
  const groups: { key: string; items: ServiceOrder[] }[] =
    filters.sort === "execution"
      ? shown.reduce<{ key: string; items: ServiceOrder[] }[]>((acc, o) => {
          const last = acc[acc.length - 1];
          if (last && last.key === o.dateKey) last.items.push(o);
          else acc.push({ key: o.dateKey, items: [o] });
          return acc;
        }, [])
      : [{ key: "", items: shown }];

  return (
    <>
      <HomeHeader
        title="My jobs"
        subtitle={`${jobs.length} assigned · ${technician.name}`}
        onMenu={onMenu}
      />
      {/* STATUS TABS — each with its count, the active one underlined in the
          brand colour as the web's tabs are. Scrolls sideways on a narrow phone. */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-fp-outline-1 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STATUS_TABS.map((t) => {
          const n = t.status ? jobs.filter((j) => techStatusOf(j) === t.status).length : jobs.length;
          const on = statusTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => setStatusTab(t.key)}
              className={cn(
                "relative flex h-11 shrink-0 items-center gap-1.5 px-2.5 text-sm whitespace-nowrap",
                on ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {t.label}
              <span className="text-xs tabular-nums text-muted-foreground">{n}</span>
              {on && <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>
      <div className="flex shrink-0 flex-col gap-2 border-b border-fp-outline-1 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order #, customer or ship-to"
              aria-label="Search jobs"
              className="h-11 pl-9"
            />
          </div>
          <Button
            variant="outline"
            className="relative size-11 shrink-0 p-0"
            aria-label="Sort and filter"
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </div>
        {(chips.length > 0 || filters.sort !== "execution") && (
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.sort !== "execution" && (
              <span className="flex h-8 shrink-0 items-center rounded-full bg-chip px-3 text-xs text-foreground">
                Sorted by {SORT_LABEL[filters.sort].toLowerCase()}
              </span>
            )}
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.clear}
                aria-label={`Remove ${c.label}`}
                className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-chip pr-2 pl-3 text-xs text-foreground active:bg-accent"
              >
                {c.label}
                <X className="size-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => (
          <section key={g.key || "all"} className="flex flex-col gap-2">
            {g.key && (
              <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {dayHeading(g.key)} · {g.items.length}
              </h2>
            )}
            {g.items.map((j) => (
              <JobCard key={j.id} job={j} onOpen={() => onOpen(j.id)} />
            ))}
          </section>
        ))}
        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {jobs.length === 0 ? "No jobs assigned to you." : "No jobs match."}
            </p>
            {jobs.length > 0 && (
              <Button
                variant="outline"
                className="h-11"
                onClick={() => {
                  setQuery("");
                  setFilters(NO_FILTERS);
                  setStatusTab("all");
                }}
              >
                Clear search and filters
              </Button>
            )}
          </div>
        )}
      </div>

      <SortFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        jobs={jobs}
        filters={filters}
        onApply={setFilters}
        countFor={(f) =>
          jobs.filter(
            (o) =>
              matchesDate(o, f) &&
              (f.customers.length === 0 || f.customers.includes(o.customer)) &&
              (f.shipTos.length === 0 || f.shipTos.includes(o.shipTo))
          ).length
        }
      />
    </>
  );
}

function JobCard({ job, onOpen }: { job: ServiceOrder; onOpen: () => void }) {
  const detail = [job.assetName, job.fault].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex items-start gap-3 rounded-lg border border-fp-outline-1 bg-fp-surface-1a p-3 text-left active:bg-accent",
        job.completedAt && job.status !== "Parts pending" && "opacity-60"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium tabular-nums text-foreground">
            {job.scheduledAt ? timeFmt.format(new Date(job.scheduledAt)) : "Any time"}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">{job.orderNo}</span>
          <span className="ml-auto flex items-center gap-1.5">
            {job.priority !== "Normal" && (
              <Badge variant={job.priority === "Urgent" ? "destructive" : "secondary"}>{job.priority}</Badge>
            )}
            <StatusChip tone={TECH_STATUS_TONE[techStatusOf(job)]} variant="soft">
              {techStatusOf(job)}
            </StatusChip>
          </span>
        </div>
        <span className="truncate text-sm font-medium text-foreground">{job.customer}</span>
        <span className="truncate text-xs text-muted-foreground">{job.shipTo}</span>
        {detail && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

/**
 * SORT AND FILTER, ONE SHEET. Edited as a draft and applied together — on a
 * phone, a list that re-sorts under every tap is a list you lose your place
 * in. The button says how many jobs the choice will show before you commit.
 */
function SortFilterSheet({
  open,
  onClose,
  jobs,
  filters,
  onApply,
  countFor,
}: {
  open: boolean;
  onClose: () => void;
  jobs: ServiceOrder[];
  filters: JobFilters;
  onApply: (f: JobFilters) => void;
  countFor: (f: JobFilters) => number;
}) {
  const [f, setF] = React.useState(filters);
  React.useEffect(() => {
    if (open) setF(filters);
  }, [open, filters]);

  const customers = Array.from(new Set(jobs.map((j) => j.customer))).sort();
  const shipTos = Array.from(
    new Set(jobs.filter((j) => f.customers.length === 0 || f.customers.includes(j.customer)).map((j) => j.shipTo))
  ).sort();
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const n = countFor(f);

  const pill = (on: boolean) =>
    cn(
      "flex h-9 items-center rounded-full border px-3 text-sm",
      on ? "border-foreground bg-foreground text-background" : "border-fp-outline-1 text-foreground active:bg-accent"
    );
  const Heading = ({ children }: { children: React.ReactNode }) => (
    <h3 className="pt-4 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase first:pt-0">
      {children}
    </h3>
  );
  const CheckRow = ({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="flex h-11 items-center justify-between rounded-md px-2 text-left text-sm text-foreground active:bg-accent"
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded border",
          on ? "border-foreground bg-foreground text-background" : "border-fp-outline-2"
        )}
      >
        {on && <Check className="size-3.5" />}
      </span>
    </button>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Sort and filter"
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" className="h-11" onClick={() => setF(NO_FILTERS)}>
            Clear all
          </Button>
          <Button
            className="h-11 flex-1 text-base"
            onClick={() => {
              onApply(f);
              onClose();
            }}
          >
            Show {n} {n === 1 ? "job" : "jobs"}
          </Button>
        </div>
      }
    >
      <Heading>Sort by</Heading>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
          <button key={k} type="button" className={pill(f.sort === k)} onClick={() => setF({ ...f, sort: k })}>
            {SORT_LABEL[k]}
          </button>
        ))}
      </div>

      <Heading>Date</Heading>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(DATE_LABEL) as Exclude<DateFilter, "day">[]).map((k) => (
          <button
            key={k}
            type="button"
            className={pill(f.date === k)}
            onClick={() => setF({ ...f, date: k, day: null })}
          >
            {DATE_LABEL[k]}
          </button>
        ))}
        <button
          type="button"
          className={pill(f.date === "day")}
          onClick={() => setF({ ...f, date: "day", day: f.day ?? new Date() })}
        >
          <CalendarDays className="mr-1.5 size-4" />
          {f.date === "day" && f.day ? DATE_FMT.format(f.day) : "Pick a date"}
        </button>
      </div>
      {f.date === "day" && (
        <div className="mt-2 flex justify-center rounded-lg border border-fp-outline-1">
          <Calendar
            mode="single"
            selected={f.day ?? undefined}
            onSelect={(d) => d && setF({ ...f, day: d })}
          />
        </div>
      )}

      <Heading>Customer</Heading>
      <div className="flex flex-col">
        {customers.map((c) => (
          <CheckRow
            key={c}
            label={c}
            on={f.customers.includes(c)}
            onToggle={() => {
              const next = toggle(f.customers, c);
              /* A SHIP-TO BELONGS TO A CUSTOMER — deselecting one drops its
                 sites from the filter too, or the list would silently stay
                 narrowed by a site the reader can no longer see ticked. */
              const sites = new Set(
                jobs.filter((j) => next.length === 0 || next.includes(j.customer)).map((j) => j.shipTo)
              );
              setF({ ...f, customers: next, shipTos: f.shipTos.filter((s) => sites.has(s)) });
            }}
          />
        ))}
      </div>

      <Heading>Ship-to</Heading>
      <div className="flex flex-col">
        {shipTos.map((s) => (
          <CheckRow key={s} label={s} on={f.shipTos.includes(s)} onToggle={() => setF({ ...f, shipTos: toggle(f.shipTos, s) })} />
        ))}
      </div>
    </BottomSheet>
  );
}

/* ───────────────────────────────────────────────────── the new order ── */

/** A labelled field whose value is chosen, not typed — a row that opens a sheet. */
function ChoiceField({
  label,
  required,
  value,
  placeholder,
  disabled,
  onPress,
}: {
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onPress}
        className="flex h-11 items-center justify-between rounded-md border border-input bg-transparent px-3 text-left text-sm active:bg-accent disabled:opacity-50 dark:bg-input/30"
      >
        <span className={cn("truncate", value ? "text-foreground" : "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}

const Group = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

type Picker =
  | { kind: "source" }
  | { kind: "customer" }
  | { kind: "shipTo" }
  | { kind: "tech" }
  | { kind: "asset"; i: number }
  | { kind: "workType"; i: number }
  | null;

/**
 * THE NEW ORDER, ON THE PHONE — every field the dispatcher's form has
 * (Pavan, 2026-09-23): intake, customer and site, schedule, technician,
 * assets, parts and fees. The technician is filled in as themself.
 *
 * SAME DRAFT RULE AS THE WEB. The first real change saves it as a Drafted
 * order; "Create new order" is dead until customer, ship-to and technician
 * are in, the line above it names what is missing, and the press makes it
 * Assigned.
 */
export function NewOrderScreen({
  blank,
  onMenu,
  onCreateDraft,
  onUpdate,
  onCommit,
}: {
  blank: () => ServiceOrder;
  onMenu: () => void;
  /** First real change — returns the saved row's number. */
  onCreateDraft: (d: ServiceOrder) => { id: string; orderNo: string };
  onUpdate: (d: ServiceOrder) => void;
  onCommit: (d: ServiceOrder) => void;
}) {
  const [draft, setDraft] = React.useState<ServiceOrder>(blank);
  const [saved, setSaved] = React.useState<{ id: string; orderNo: string } | null>(null);
  const [picker, setPicker] = React.useState<Picker>(null);
  const [dateOpen, setDateOpen] = React.useState(false);

  /* Side effects OUTSIDE the state updater — an updater may run twice, and
     that would file two drafts. */
  const change = (fn: (d: ServiceOrder) => ServiceOrder) => {
    let next = fn(draft);
    if (!saved) {
      const row = onCreateDraft(next);
      setSaved(row);
      next = { ...next, id: row.id, orderNo: row.orderNo };
    } else onUpdate(next);
    setDraft(next);
  };

  const missing = [
    !draft.customer && "Choose a customer",
    !draft.shipTo && "Choose a ship-to site",
    !draft.technicianId && "Assign a technician",
  ].filter(Boolean) as string[];

  const startMin = draft.scheduledAt
    ? new Date(draft.scheduledAt).getHours() * 60 + new Date(draft.scheduledAt).getMinutes()
    : 9 * 60;
  const siteAssets = draft.shipTo ? assetsAt(draft.shipTo) : [];

  const setAsset = (i: number, patch: Partial<ServiceOrder["assets"][number]>) =>
    change((d) => syncPrimaryAsset({ ...d, assets: d.assets.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));

  const pickerProps = (() => {
    if (!picker) return null;
    switch (picker.kind) {
      case "source":
        return { title: "Intake source", options: [...INTAKE_SOURCES], value: draft.source, onPick: (v: string) => change((d) => ({ ...d, source: v as ServiceOrder["source"] })) };
      case "customer":
        return {
          title: "Customer",
          options: SERVICE_CUSTOMERS,
          value: draft.customer,
          onPick: (v: string) =>
            change((d) =>
              v === d.customer
                ? d
                : syncPrimaryAsset({
                    ...d,
                    customer: v,
                    shipTo: "",
                    assets: d.assets.map((a) => ({ ...a, assetId: "", assetName: "", assetType: "" })),
                  })
            ),
        };
      case "shipTo":
        return {
          title: "Ship-to",
          options: shipTosOf(draft.customer),
          value: draft.shipTo,
          onPick: (v: string) =>
            change((d) =>
              v === d.shipTo
                ? d
                : syncPrimaryAsset({ ...d, shipTo: v, assets: d.assets.map((a) => ({ ...a, assetId: "", assetName: "", assetType: "" })) })
            ),
        };
      case "tech":
        return {
          title: "Technician",
          options: ACTIVE_TECHNICIANS.map((t) => t.name),
          value: technicianById(draft.technicianId)?.name ?? "",
          onPick: (v: string) => change((d) => ({ ...d, technicianId: ACTIVE_TECHNICIANS.find((t) => t.name === v)?.id ?? null })),
        };
      case "asset": {
        const i = picker.i;
        return {
          title: "Asset",
          options: siteAssets.map((a) => a.name).filter((n) => !draft.assets.some((x, j) => j !== i && x.assetName === n)),
          value: draft.assets[i]?.assetName ?? "",
          onPick: (v: string) => {
            const a = siteAssets.find((x) => x.name === v);
            setAsset(i, { assetId: a?.id ?? "", assetName: v, assetType: a?.type ?? "" });
          },
        };
      }
      case "workType": {
        const i = picker.i;
        return { title: "Work type", options: WORK_TYPE_NAMES, value: draft.assets[i]?.workType ?? "", onPick: (v: string) => setAsset(i, { workType: v }) };
      }
    }
  })();

  const lineInput = "h-11";

  return (
    <>
      <HomeHeader
        title={saved ? `New order · ${saved.orderNo}` : "New order"}
        subtitle={saved ? "Drafted · Draft saved" : undefined}
        onMenu={onMenu}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Group title="Intake">
          <ChoiceField label="Intake source" required value={draft.source} placeholder="Choose" onPress={() => setPicker({ kind: "source" })} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              Priority<span className="text-destructive"> *</span>
            </span>
            {/* THREE CHOICES, ALL VISIBLE — a segmented row is one tap where
                a picker is two. */}
            <div className="grid grid-cols-3 gap-1 rounded-md bg-chip p-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={draft.priority === p}
                  onClick={() => change((d) => ({ ...d, priority: p }))}
                  className={cn(
                    "h-10 rounded text-sm",
                    draft.priority === p ? "bg-fp-surface-1a font-medium text-foreground shadow-xs" : "text-muted-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </Group>

        <Group title="Customer details">
          <ChoiceField label="Customer" required value={draft.customer} placeholder="Choose a customer" onPress={() => setPicker({ kind: "customer" })} />
          <ChoiceField
            label="Ship-to"
            required
            value={draft.shipTo}
            placeholder={draft.customer ? "Choose a site" : "Choose a customer first"}
            disabled={!draft.customer}
            onPress={() => setPicker({ kind: "shipTo" })}
          />
        </Group>

        <Group title="Schedule">
          <ChoiceField
            label="Scheduled date"
            value={draft.scheduledAt ? DATE_FMT.format(new Date(draft.scheduledAt)) : ""}
            placeholder="Choose a date"
            onPress={() => setDateOpen(true)}
          />
          <TimeWindowSlider
            label="Scheduling window"
            start={startMin}
            end={draft.windowEndMin ?? startMin + 180}
            onChange={(s, e) =>
              change((d) => {
                const at = d.scheduledAt ? new Date(d.scheduledAt) : new Date();
                at.setHours(Math.floor(s / 60), s % 60, 0, 0);
                return { ...d, scheduledAt: at.toISOString(), windowEndMin: e };
              })
            }
          />
        </Group>

        <Group title="Technician">
          <ChoiceField
            label="Assigned to"
            value={technicianById(draft.technicianId)?.name ?? ""}
            placeholder="Unassigned"
            onPress={() => setPicker({ kind: "tech" })}
          />
        </Group>

        <Group
          title="Assets"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() =>
                change((d) => ({ ...d, assets: [...d.assets, { assetId: "", assetName: "", assetType: "", workType: WORK_TYPE_NAMES[0], fault: "" }] }))
              }
            >
              <PlusCircle className="size-4" /> Add asset
            </Button>
          }
        >
          {draft.assets.map((a, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-lg border border-fp-outline-1 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Asset {i + 1}</span>
                {draft.assets.length > 1 && (
                  <TableRowRemove
                    layout="inline"
                    aria-label={`Remove ${a.assetName || `asset ${i + 1}`}`}
                    onRemove={() => change((d) => syncPrimaryAsset({ ...d, assets: d.assets.filter((_, j) => j !== i) }))}
                  />
                )}
              </div>
              <ChoiceField
                label="Asset"
                value={a.assetName}
                placeholder={draft.shipTo ? "Choose an asset" : "Choose a site first"}
                disabled={!draft.shipTo}
                onPress={() => setPicker({ kind: "asset", i })}
              />
              <ChoiceField label="Work type" value={a.workType} placeholder="Choose" onPress={() => setPicker({ kind: "workType", i })} />
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Reported fault</span>
                <Textarea
                  value={a.fault}
                  placeholder="What the customer described"
                  onChange={(e) => setAsset(i, { fault: e.target.value })}
                  className="min-h-20"
                />
              </div>
            </div>
          ))}
        </Group>

        <Group
          title="Parts"
          action={
            <Button variant="ghost" size="sm" className="h-9" onClick={() => change((d) => ({ ...d, parts: [...d.parts, { name: "", qty: 1, cost: 0 }] }))}>
              <PlusCircle className="size-4" /> Add part
            </Button>
          }
        >
          {draft.parts.length === 0 && <p className="text-sm text-muted-foreground">No parts on this job.</p>}
          {draft.parts.map((p, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-fp-outline-1 p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={p.name}
                  placeholder="Part"
                  aria-label={`Part ${i + 1}`}
                  onChange={(e) => change((d) => ({ ...d, parts: d.parts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))}
                  className={cn(lineInput, "flex-1")}
                />
                <TableRowRemove
                  layout="inline"
                  aria-label={`Remove ${p.name || `part ${i + 1}`}`}
                  onRemove={() => change((d) => ({ ...d, parts: d.parts.filter((_, j) => j !== i) }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  inputMode="numeric"
                  value={String(p.qty)}
                  aria-label={`Quantity of ${p.name || `part ${i + 1}`}`}
                  onChange={(e) => change((d) => ({ ...d, parts: d.parts.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 } : x)) }))}
                  className={cn(lineInput, "tabular-nums")}
                />
                <Input
                  inputMode="decimal"
                  value={String(p.cost)}
                  aria-label={`Unit cost of ${p.name || `part ${i + 1}`}`}
                  onChange={(e) => change((d) => ({ ...d, parts: d.parts.map((x, j) => (j === i ? { ...x, cost: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 } : x)) }))}
                  className={cn(lineInput, "tabular-nums")}
                />
              </div>
              <span className="text-right text-xs tabular-nums text-muted-foreground">{money(p.qty * p.cost)}</span>
            </div>
          ))}
        </Group>

        <Group
          title="Fees"
          action={
            <Button variant="ghost" size="sm" className="h-9" onClick={() => change((d) => ({ ...d, fees: [...d.fees, { name: "", amount: 0 }] }))}>
              <PlusCircle className="size-4" /> Add fee
            </Button>
          }
        >
          {draft.fees.length === 0 && <p className="text-sm text-muted-foreground">No fees on this job.</p>}
          {draft.fees.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={f.name}
                placeholder="Fee"
                aria-label={`Fee ${i + 1}`}
                onChange={(e) => change((d) => ({ ...d, fees: d.fees.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))}
                className={cn(lineInput, "flex-1")}
              />
              <Input
                inputMode="decimal"
                value={String(f.amount)}
                aria-label={`Amount of ${f.name || `fee ${i + 1}`}`}
                onChange={(e) => change((d) => ({ ...d, fees: d.fees.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 } : x)) }))}
                className={cn(lineInput, "w-24 tabular-nums")}
              />
              <TableRowRemove
                layout="inline"
                aria-label={`Remove ${f.name || `fee ${i + 1}`}`}
                onRemove={() => change((d) => ({ ...d, fees: d.fees.filter((_, j) => j !== i) }))}
              />
            </div>
          ))}
        </Group>
      </div>

      {/* THE ACT, PINNED — with what it is waiting on said above it. */}
      <div className="shrink-0 border-t border-fp-outline-1 bg-fp-surface-1a p-3">
        <p className={cn("mb-2 text-center text-xs", missing.length ? "text-fp-banner-accent-caution" : "text-status-success")}>
          {missing.length ? `Pending · ${missing[0]}` : "All details are collected. Create new order."}
        </p>
        <Button
          className="h-11 w-full text-base"
          disabled={missing.length > 0}
          onClick={() => {
            onCommit(draft);
            setDraft(blank());
            setSaved(null);
          }}
        >
          Create new order
        </Button>
      </div>

      {pickerProps && (
        <PickerSheet open onClose={() => setPicker(null)} {...pickerProps} />
      )}
      <BottomSheet open={dateOpen} onClose={() => setDateOpen(false)} title="Scheduled date">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={draft.scheduledAt ? new Date(draft.scheduledAt) : undefined}
            onSelect={(d) => {
              if (!d) return;
              change((x) => {
                const prev = x.scheduledAt ? new Date(x.scheduledAt) : null;
                const at = new Date(d);
                at.setHours(prev?.getHours() ?? 9, prev?.getMinutes() ?? 0, 0, 0);
                return { ...x, scheduledAt: at.toISOString(), dateKey: dayKey(at) };
              });
              setDateOpen(false);
            }}
          />
        </div>
      </BottomSheet>
    </>
  );
}
