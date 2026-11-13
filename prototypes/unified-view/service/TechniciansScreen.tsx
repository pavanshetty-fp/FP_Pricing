import * as React from "react";
import { HardHat } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import type { ListColumn } from "../ListTable";
import { ServiceListScreen } from "./ServiceListScreen";
import { TECHNICIANS, type ServiceOrder, type Technician } from "./work";
import { useServiceOrders } from "./store";
import { ACTIVE_KIND, kindTone } from "../statusKind";

/**
 * TECHNICIANS — who can take the work.
 *
 * A LIST, NOT A BOARD. A technician has no lifecycle; the questions asked of
 * this screen are "who covers meters", "who works out of Kern" and "how full
 * is somebody" — which are a filter, a filter and a number, all of them
 * columns.
 *
 * OPEN JOBS IS THE COLUMN THAT MAKES IT USEFUL. A roster with skills and a
 * phone number is a contact list; the count of work still on somebody is what
 * turns it into the thing you read before assigning the next job. It is
 * counted off the work orders rather than stored, because a stored count is a
 * number that goes stale the moment a job moves.
 *
 * NOT BUILT YET, named rather than faked: the technician's own day (their
 * jobs, in order, with travel between them), and adding or editing one.
 */

type TechColumnKey =
  | "name"
  | "base"
  | "skills"
  | "open"
  | "capacity"
  | "phone"
  | "status"
  | "actions";

const TECH_COLUMNS: ListColumn<TechColumnKey>[] = [
  { key: "name", label: "Technician", width: 130, sortable: true },
  { key: "base", label: "Base", width: 130, sortable: true },
  { key: "skills", label: "Skills", width: 220, sortable: true },
  /* COMPARED DOWN THE COLUMN, so right-aligned — these two are read against
     each other and against the rows above. */
  { key: "open", label: "Open jobs", width: 110, sortable: true },
  { key: "capacity", label: "Jobs / day", width: 110, sortable: true },
  { key: "phone", label: "Phone", width: 140, sortable: true },
  { key: "status", label: "Status", width: 100, sortable: true },
  { key: "actions", label: "", width: 44 },
];

/**
 * WORK STILL ON SOMEBODY.
 *
 * Assigned, under way, or stalled for a part — all three are jobs that are
 * still theirs. Anything past the visit belongs to a manager or to accounting,
 * and counting it here would make a technician look busy for work they
 * finished last week.
 */
function openJobsFor(rows: ServiceOrder[], id: string): number {
  return rows.filter(
    (r) =>
      r.technicianId === id &&
      (r.status === "Assigned" ||
        r.status === "Ongoing" ||
        r.status === "Parts pending")
  ).length;
}

/**
 * WHAT A COLUMN PRINTS, as text — what its filter box matches, because the
 * reader types what they read. Kept beside `renderCell` in meaning: change
 * what a cell shows and this follows.
 */
function techColumnText(t: Technician, key: TechColumnKey, openJobs: number): string {
  switch (key) {
    case "name":
      return t.name;
    case "base":
      return t.base;
    case "skills":
      return t.skills.join(" ");
    case "open":
      return String(openJobs);
    case "capacity":
      return String(t.dailyCapacity);
    case "phone":
      return t.phone;
    case "status":
      return t.active ? "Active" : "Inactive";
    default:
      return "";
  }
}

export function TechniciansScreen() {
  /* COUNTED OFF THE SHARED ORDERS (2026-09-24), so it moves as jobs move. */
  const [orders] = useServiceOrders();
  const open = React.useMemo(
    () => Object.fromEntries(TECHNICIANS.map((t) => [t.id, openJobsFor(orders, t.id)])),
    [orders]
  );

  const renderCell = (t: Technician, key: TechColumnKey): React.ReactNode => {
    switch (key) {
      case "name":
        return <span className="font-medium text-foreground">{t.name}</span>;
      case "base":
        return t.base;
      case "skills":
        /* CHIPS, BECAUSE THE QUESTION IS "CAN THEY DO X". A comma-joined
           sentence is read; a row of chips is scanned, which is what somebody
           picking a technician is doing. */
        return (
          <span className="flex flex-wrap items-center gap-1">
            {t.skills.map((s) => (
              <Pill key={s}>
                {s}
              </Pill>
            ))}
          </span>
        );
      case "open":
        return <span className="tabular-nums">{open[t.id] ?? 0}</span>;
      case "capacity":
        return <span className="tabular-nums">{t.dailyCapacity}</span>;
      case "phone":
        return <span className="tabular-nums text-muted-foreground">{t.phone}</span>;
      case "status":
        return (
          <StatusChip tone={kindTone(ACTIVE_KIND(t.active))}>
            {t.active ? "Active" : "Inactive"}
          </StatusChip>
        );
      default:
        return null;
    }
  };

  /* THE STANDARD LIST (Pavan, 2026-10-22) — views, Filters, chips, the view
     bar, like every table page. Skills filter by each skill. */
  return (
    <ServiceListScreen<Technician, TechColumnKey>
      rows={TECHNICIANS}
      columns={TECH_COLUMNS}
      rowId={(t) => t.id}
      renderCell={renderCell}
      sortValue={(t, key) =>
        key === "open" ? (open[t.id] ?? 0) : key === "capacity" ? t.dailyCapacity : key === "status" ? (t.active ? 0 : 1) : techColumnText(t, key, open[t.id] ?? 0)
      }
      valuesOf={(t, key) => (key === "skills" ? t.skills : undefined)}
      searchPlaceholder="Search technicians, bases, skills…"
      noun="technicians"
      icon={<HardHat />}
    />
  );
}
