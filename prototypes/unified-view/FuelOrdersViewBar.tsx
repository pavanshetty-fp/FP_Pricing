import * as React from "react";
import { Check, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Preset-view row.
 *
 * The interaction is the DS's finalized one, from the Data Action Control unit
 * (`data-action-control/DataActionControl.tsx`, rows 177–228) — NOT the
 * `PresetTabs` helper in `experiments/dac-rebuild`, which is archived
 * (`arc-rebuild-*` in App.tsx's ARCHIVE_KEYS) and only stubs view creation by
 * appending "View 1", "View 2" with no name and no state.
 *
 * What that means concretely:
 *   • "Default" is a reset control, not a tab — it restores the default state.
 *   • Creating a view opens a Dialog and the view is NAMED. A view captures the
 *     current search / sort / hidden columns / page size / delivery date, and
 *     selecting it restores them. A view that carries no state is just a label.
 *   • Each saved view has a `⋯` menu revealed on hover: Update view (only when
 *     the current state has drifted), Rename, Delete.
 *   • A brand dot next to the active tab marks unsaved drift.
 *   • Tabs are plain buttons with a `border-b-2` active underline — not the
 *     shadcn Tabs component, so the `⋯` control can sit inside the tab.
 */

/** The slice of screen state a saved view captures and restores. */
export interface ViewState {
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  pageSize: number;
  /** Delivery date as `YYYY-MM-DD` — views are date-scoped like everything else. */
  dateKey: string;
  /** Which column the "Search by column" tool is pointed at. */
  colScope: string;
  /** Its query. Captured so a saved view restores the narrowing it was built with. */
  colQuery: string;
}

export interface SavedView {
  id: string;
  name: string;
  state: ViewState;
}

/** Order-independent comparison, so drift detection can't be fooled by key order. */
export function viewStateKey(s: ViewState): string {
  return JSON.stringify({
    search: s.search,
    sortKey: s.sortKey,
    sortDir: s.sortDir,
    hidden: [...s.hidden].sort(),
    pageSize: s.pageSize,
    dateKey: s.dateKey,
    colScope: s.colScope,
    colQuery: s.colQuery,
  });
}

export interface FuelOrdersViewBarProps {
  views: SavedView[];
  /** `null` = the Default view is active. */
  activeId: string | null;
  /** Current state differs from the active view (or from default). */
  dirty: boolean;
  onApply: (id: string) => void;
  onResetToDefault: () => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onUpdate: (id: string) => void;
  onDelete: (id: string) => void;
  /** Primary CTA — rendered at the right end of this row. */
  onCreateOrder?: () => void;
}

const tabCls = (isActive: boolean) =>
  cn(
    "px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
    isActive
      ? "font-medium text-foreground"
      : "text-muted-foreground hover:text-foreground"
  );

/** Brand dot marking unsaved drift on the active tab. */
function DirtyDot() {
  return (
    <span
      className="ml-1.5 inline-block size-1.5 rounded-full bg-brand align-middle"
      aria-label="unsaved changes"
    />
  );
}

export function FuelOrdersViewBar({
  views,
  activeId,
  dirty,
  onApply,
  onResetToDefault,
  onCreate,
  onRename,
  onUpdate,
  onDelete,
  onCreateOrder,
}: FuelOrdersViewBarProps) {
  const [dialog, setDialog] = React.useState<{
    mode: "new" | "rename";
    id?: string;
    name: string;
  } | null>(null);

  const submit = () => {
    if (!dialog) return;
    const name = dialog.name.trim();
    if (!name) return;
    if (dialog.mode === "new") onCreate(name);
    else if (dialog.id) onRename(dialog.id, name);
    setDialog(null);
  };

  return (
    <>
      {/* -mx-4 -mt-4 cancels the content layer's 16px inset so the hairline spans
          the full panel width, as it does on the DS screen. */}
      <div className="-mx-4 -mt-4 flex shrink-0 items-center gap-1 border-b border-border px-3 py-0.5">
        <button
          type="button"
          onClick={onResetToDefault}
          className={cn(
            tabCls(activeId === null),
            "border-b-2",
            activeId === null ? "border-foreground" : "border-transparent"
          )}
        >
          Default
          {activeId === null && dirty && <DirtyDot />}
        </button>

        {views.map((v) => {
          const isActive = v.id === activeId;
          return (
            <div key={v.id} className="group/tab flex items-center pr-1">
              <button
                type="button"
                onClick={() => onApply(v.id)}
                className={cn(
                  tabCls(isActive),
                  "border-b-2",
                  isActive ? "border-foreground" : "border-transparent"
                )}
              >
                {v.name}
                {isActive && dirty && <DirtyDot />}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${v.name} options`}
                    className="ml-0.5 rounded p-0.5 text-muted-foreground opacity-0 outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/tab:opacity-100 data-[state=open]:opacity-100"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {isActive && dirty && (
                    <DropdownMenuItem onClick={() => onUpdate(v.id)}>
                      <Check /> Update view
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() =>
                      setDialog({ mode: "rename", id: v.id, name: v.name })
                    }
                  >
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(v.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setDialog({ mode: "new", name: "" })}
          className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Plus className="size-4" /> View
        </button>

        {/*
          Primary CTA, moved up here from the toolbar's right cluster so it sits
          on the preset-view row.

          `mr-1` is load-bearing: this row cancels the content layer's 16px inset
          with -mx-4 and re-pads at px-3 (12px) so its hairline spans the whole
          panel, which would leave the button 4px further right than the toolbar
          controls below it. The extra 4px puts both right edges on the same line.
        */}
        <Button size="sm" className="mr-1 ml-auto" onClick={onCreateOrder}>
          <Plus />
          Create Order
        </Button>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "rename" ? "Rename view" : "Save current view"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="fuel-view-name">View name</Label>
            <Input
              id="fuel-view-name"
              autoFocus
              value={dialog?.name ?? ""}
              onChange={(e) =>
                setDialog((d) => (d ? { ...d, name: e.target.value } : d))
              }
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. Unassigned today"
            />
            {dialog?.mode === "new" && (
              <p className="text-xs text-muted-foreground">
                Captures the current search, sort, visible columns, rows per page
                and delivery date.
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={submit} disabled={!dialog?.name.trim()}>
              {dialog?.mode === "rename" ? "Rename" : "Save view"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
