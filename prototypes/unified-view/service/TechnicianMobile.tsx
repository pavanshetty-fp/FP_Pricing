import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  TECHNICIANS,
  blankServiceOrder,
  ticketFrom,
  type ServiceOrder,
  type WorkStatus,
} from "./work";
import { resolveShortfall, useServiceOrders } from "./store";
import { useServiceSettings } from "./settings";
import { JobsScreen, MenuDrawer, NewOrderScreen, TabBar, type HomeTab } from "./TechnicianHome";
import { TechnicianJob, type SplitRequest } from "./TechnicianJob";

/*
  ═══════════════════════════════════════════════════════════════════════════
  THE TECHNICIAN'S APP — a separate product, on a phone.
  ═══════════════════════════════════════════════════════════════════════════

  SEPARATE, AND THAT IS THE POINT (Pavan, 2026-09-23). It used to be a 400px
  panel that dispatch opened over the order sheet, which made it a feature of
  the dispatch screen. It is not: it is where a different person, holding a
  different device, standing in front of the asset, does their whole day. So
  it gets its own destination, its own shell, and its own list — the
  technician's jobs, not the one job dispatch happened to be looking at.

  ── THE FIVE RULES THIS APP IS BUILT ON ───────────────────────────────────

  The DS has no mobile section yet; these are what this screen settled, and
  they are candidates for one.

  1. ONE THING PER SCREEN. A phone has no room for a form and its context at
     once, so a screen asks one question and the answer moves you on. The
     desktop sheet's stack of sections would be a scroll nobody reaches the
     end of.
  2. THE ACT IS PINNED TO THE BOTTOM, FULL WIDTH. It is the one place a thumb
     reaches without regripping, and it is where the eye ends up anyway. The
     desktop rule — the primary is the next act and there is one — holds; what
     changes is where it sits.
  3. NOTHING DEPENDS ON HOVER. There is no hover on a phone. Every state a
     control has must be reachable by press, and anything the desktop app
     reveals on hover must be permanent here.
  4. TARGETS ARE 44px. Gloved hands, a truck cab, sunlight. `h-11` on
     everything pressable, and that is a floor rather than a preference.
  5. BACK IS IN THE HEADER, AND IT IS THE ONLY WAY BACK. A phone user does
     not have a browser chrome to escape with, so every screen past the list
     carries one.

  ── WHY A DEVICE FRAME ────────────────────────────────────────────────────

  It renders in a phone-shaped box in the middle of a desktop screen, because
  that is where it is being REVIEWED. Stretched to a monitor it would stop
  being the thing it is and start being a bad desktop page, and the first
  question anybody asked would be about the layout rather than the flow.
*/

/* ───────────────────────────────────────────────────────────── the flow ── */

const nowIso = () => new Date().toISOString();

/* ──────────────────────────────────────────────────────────── the parts ── */

/**
 * The app's own header. Title, and a back chevron on every screen but the
 * list — see rule 5.
 */
export function TopBar({
  title,
  subtitle,
  onBack,
  aside,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Right end of the bar — e.g. the ··· menu. */
  aside?: React.ReactNode;
}) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-fp-outline-1 bg-fp-surface-1a px-3 py-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </button>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-semibold text-foreground">
          {title}
        </span>
        {subtitle && (
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
      {aside}
    </header>
  );
}

/**
 * THE ACT, PINNED. Rule 2.
 *
 * `secondary` sits ABOVE the primary rather than beside it — two half-width
 * buttons on a phone are two targets neither of which is comfortable, and the
 * one that matters should be the one nearest the thumb.
 */
export function ActionBar({
  label,
  onPress,
  disabled,
  secondary,
  onSecondary,
  note,
  iconAction,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: string;
  onSecondary?: () => void;
  note?: string;
  /** A small, filled, icon-only act beside the primary — e.g. navigation. */
  iconAction?: { icon: React.ReactNode; label: string; onPress: () => void };
}) {
  return (
    <div className="shrink-0 border-t border-fp-outline-1 bg-fp-surface-1a p-3">
      {note && (
        <p className="mb-2 text-center text-xs text-muted-foreground">{note}</p>
      )}
      <div className="flex flex-col gap-2">
        {secondary && (
          <Button
            variant="outline"
            className="h-11 w-full text-base"
            onClick={onSecondary}
          >
            {secondary}
          </Button>
        )}
        <div className="flex gap-2">
          <Button
            className="h-11 flex-1 text-base"
            disabled={disabled}
            onClick={onPress}
          >
            {label}
          </Button>
          {iconAction && (
            <Button
              variant="secondary"
              className="size-11 shrink-0 p-0 [&_svg]:size-5"
              aria-label={iconAction.label}
              onClick={iconAction.onPress}
            >
              {iconAction.icon}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** A labelled block of the job's facts. No card chrome — a phone has no room. */
export function Facts({
  items,
}: {
  items: { icon: React.ReactNode; label: string; value: React.ReactNode }[];
}) {
  return (
    <div className="flex flex-col divide-y divide-fp-outline-1">
      {items.map((f) => (
        <div key={f.label} className="flex items-start gap-3 py-3">
          <span className="mt-0.5 shrink-0 text-muted-foreground">{f.icon}</span>
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className="text-sm text-foreground">{f.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The body scroller — every screen past the header uses it. */
export const Body = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {children}
  </div>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-sm font-semibold text-foreground">{children}</h2>
);

/* THE LIST moved to `TechnicianHome.tsx` (2026-09-23) — with search, sort,
   filter, the tab bar and the menu. */

/* THE JOB moved to `TechnicianJob.tsx` (2026-09-24): assessment per line,
   quote and acknowledgement, work, complete — fully or partly. */

/* ───────────────────────────────────────────────────────────── the shell ── */

export function TechnicianMobile() {
  /* ITS OWN COPY OF THE JOBS. This app is a separate product and, in the real
     one, a separate client talking to the same API — so it keeps its own
     state rather than reaching into the dispatch screen's. What that costs is
     that changes here do not show up there, which is honest about what it is
     rather than pretending at a sync nothing behind this prototype does. */
  const cfg = useServiceSettings();
  const [tech, setTech] = React.useState(TECHNICIANS[0].id);
  /* THE SAME ORDERS AS THE DISPATCH BOARD (Pavan, 2026-09-24) — what the
     technician does here is what the dispatcher sees, and the other way
     round. Changes are logged under the technician's name. */
  const [orders, setShared] = useServiceOrders();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<HomeTab>("jobs");
  const [menuOpen, setMenuOpen] = React.useState(false);

  /* EVERY JOB ASSIGNED TO THEM (Pavan, 2026-09-23) — it used to stop at the
     first eight, a day's worth, which hid anything booked further out. The
     list screen sequences and filters them. */
  const jobs = React.useMemo(
    () => orders.filter((o) => o.technicianId === tech && o.status !== "Cancelled"),
    [orders, tech]
  );

  const open = orders.find((j) => j.id === openId) ?? null;
  /* ONE ONGOING JOB AT A TIME (Pavan, 2026-09-24) — the other it blocks. */
  const ongoing = jobs.find((j) => j.status === "Ongoing" && j.id !== openId);
  const technician = TECHNICIANS.find((t) => t.id === tech)!;
  /** Every phone write goes to the shared orders, logged as this technician. */
  const setOrders = (fn: (prev: ServiceOrder[]) => ServiceOrder[]) => setShared(fn, technician.name);

  const patch = (id: string, p: Partial<ServiceOrder>) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...p } : o)));

  /**
   * PARTLY DONE — PARTS MISSING (Pavan, 2026-09-24). The same two outcomes the
   * dispatch screen has, chosen by the technician in the moment:
   *   continue  a LINKED order: this one stays open (Parts pending), carrying
   *             the fitted quantities, with nobody on it until the next visit
   *   neworder  this one is completed; what is owed becomes a NEW order,
   *             linked back, starting from nothing but the owed parts
   */
  /**
   * PARTLY DONE — PARTS MISSING. The same three outcomes the dispatch screen
   * has (`resolveShortfall`), chosen by the technician in the moment.
   */
  const split = (job: ServiceOrder, req: SplitRequest) => {
    let said = { title: "", description: "" };
    setOrders((prev) => {
      const out = resolveShortfall(prev, job.id, { parts: req.parts, note: req.note, mode: req.mode, nativeBilling: cfg.nativeBilling });
      said = out;
      return out.rows;
    });
    if (said.title) toast.success(said.title, { description: said.description });
  };

  const nextOrderNo = () =>
    `SO-${Math.max(...orders.map((r) => Number(r.orderNo.slice(3)) || 0)) + 3}`;

  const blank = React.useCallback(
    () =>
      blankServiceOrder({
        priceBook: cfg.priceBook,
        raisedBy: technician.name,
        /* THE PERSON RAISING IT IS THE ONE WHO WILL DO IT, unless they say
           otherwise — and what they found it on is an inspection. */
        technicianId: technician.id,
        source: "Flagged inspection",
      }),
    [cfg.priceBook, technician]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6">
      {/* WHOSE PHONE THIS IS — a prototype affordance, not part of the app.
          It sits OUTSIDE the device frame so nobody mistakes it for a screen
          the technician would ever see. */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Signed in as</span>
        {TECHNICIANS.filter((t) => t.active).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTech(t.id);
              setOpenId(null);
            }}
            className={cn(
              "rounded-md px-2 py-1 text-xs transition-colors",
              t.id === tech
                ? "bg-chip text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* THE DEVICE. 390×844 — an iPhone's points, which is the narrowest
          screen this has to work on and therefore the one to design at.
          `relative` because the menu and the bottom sheets overlay INSIDE it. */}
      <div className="relative flex h-[844px] max-h-[calc(100vh-180px)] w-[390px] shrink-0 flex-col overflow-hidden rounded-[2.25rem] border-[10px] border-fp-outline-2 bg-fp-surface-1b shadow-2xl">
        {open ? (
          <TechnicianJob
            key={open.id}
            job={open}
            onBack={() => setOpenId(null)}
            onPatch={(p) => patch(open.id, p)}
            onSplit={(req) => split(open, req)}
            busyWith={ongoing?.orderNo}
            onCreateTicket={(req) => {
              const no = nextOrderNo();
              setOrders((prev) => [ticketFrom(open, req, no, technician.name), ...prev]);
              return no;
            }}
          />
        ) : (
          <>
            {tab === "jobs" ? (
              <JobsScreen
                jobs={jobs}
                technician={technician}
                onOpen={setOpenId}
                onMenu={() => setMenuOpen(true)}
              />
            ) : (
              <NewOrderScreen
                key={tech}
                blank={blank}
                onMenu={() => setMenuOpen(true)}
                onCreateDraft={(d) => {
                  const no = nextOrderNo();
                  const row = {
                    ...d,
                    id: `so-m-${no}`,
                    orderNo: no,
                    status: "Drafted" as WorkStatus,
                    audit: [{ at: nowIso(), by: technician.name, changes: ["Order created as a draft"] }],
                  };
                  setOrders((prev) => [row, ...prev]);
                  return { id: row.id, orderNo: no };
                }}
                onUpdate={(d) => setOrders((prev) => prev.map((o) => (o.id === d.id ? { ...d } : o)))}
                onCommit={(d) => {
                  setOrders((prev) =>
                    prev.map((o) =>
                      o.id === d.id
                        ? {
                            ...d,
                            status: "Assigned" as WorkStatus,
                            audit: [...o.audit, { at: nowIso(), by: technician.name, changes: ["Status: Drafted → Assigned"] }],
                          }
                        : o
                    )
                  );
                  toast.success(`${d.orderNo} created and assigned`);
                  setTab("jobs");
                }}
              />
            )}
            <TabBar tab={tab} onTab={setTab} />
          </>
        )}
        <MenuDrawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          technician={technician}
          onTab={(t) => {
            setOpenId(null);
            setTab(t);
          }}
        />
      </div>
    </div>
  );
}
