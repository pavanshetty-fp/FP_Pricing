import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { type StatusTone } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";
import { BoardWithBar } from "./ListToolbar";
import { DockedSheet } from "./RecordSheet";
import { BoardRowList, type BoardCard } from "./threepl/BrokerBoard";

/*
  LIST VIEW — ONE UNIT, EVERY BOARD MODULE (Pavan, 2026-10-29, after
  Dynamics 365's List view). Left: one sideways row of status pills (All plus
  every step, with counts; one at a time, All is the way back) over the
  records as rows, a rule, then the picked record's own sheet, docked
  (`DockedSheet`), keeping its scroll as the pick changes.

  The pills are neutral — outlined at rest, the grey pill when picked — and the
  picked row is the lightest grey; no status or brand colour here.
*/

export interface ListSplitItem {
  card: BoardCard;
  /** The status key the pills filter on. */
  status: string;
  /** What the row's chip says. */
  label: string;
  tone: StatusTone;
  when?: string;
  what?: string;
}

export function ListSplitView({
  barRef,
  items,
  steps,
  status,
  onStatusChange,
  selectedId,
  onSelect,
  onPending,
  whatIcon,
  renderDetail,
}: {
  barRef?: (el: HTMLDivElement | null) => void;
  /** Every record, in board order. */
  items: ListSplitItem[];
  /** The pills after All, in board order. */
  steps: { key: string; label: string }[];
  /** The picked pill — null is All. */
  status: string | null;
  onStatusChange: (status: string | null) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPending?: (card: BoardCard) => (() => void) | undefined;
  whatIcon?: LucideIcon;
  /** The picked record's sheet — rendered docked. */
  renderDetail: (id: string) => React.ReactNode;
}) {
  const shown = status ? items.filter((i) => i.status === status) : items;
  /* The pick, if it is still in the list; else the first row. */
  const picked = shown.find((i) => i.card.id === selectedId) ?? shown[0];
  const pills = [
    { key: null as string | null, label: "All", n: items.length },
    ...steps.map((s) => ({ ...s, n: items.filter((i) => i.status === s.key).length })),
  ];
  /* ONE BOX, LIKE THE TABLE AND THE BOARD (Pavan, 2026-10-29): the view bar
     across the top, then the list and the form side by side, a rule between. */
  return (
    <BoardWithBar barRef={barRef}>
      <div className="flex h-full min-h-0">
        <div className="flex w-80 shrink-0 flex-col border-r border-fp-outline-1">
          <div
            role="group"
            aria-label="Filter by status"
            className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-fp-outline-1 p-3 [scrollbar-width:thin]"
          >
            {pills.map(({ key, label, n }) => {
              const on = status === key;
              return (
                <button
                  key={key ?? "all"}
                  type="button"
                  aria-pressed={on}
                  disabled={n === 0 && !on}
                  onClick={() => onStatusChange(key)}
                  className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40"
                >
                  <Pill
                    className={cn(
                      "gap-1.5 transition-colors",
                      on
                        ? "font-medium text-foreground"
                        : "bg-transparent text-muted-foreground ring-1 ring-inset ring-fp-outline-1 hover:text-foreground hover:ring-fp-outline-2"
                    )}
                  >
                    {label} <span className="tabular-nums">{n}</span>
                  </Pill>
                </button>
              );
            })}
          </div>
          <div className="min-h-0 flex-1">
            <BoardRowList
              items={shown.map(({ card, label, tone, when, what }) => ({ card, status: label, tone, when, what }))}
              selectedId={picked?.card.id ?? null}
              onSelect={onSelect}
              onPending={onPending}
              whatIcon={whatIcon}
              hideStatus={status !== null}
            />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          {picked && <DockedSheet.Provider value>{renderDetail(picked.card.id)}</DockedSheet.Provider>}
        </div>
      </div>
    </BoardWithBar>
  );
}
