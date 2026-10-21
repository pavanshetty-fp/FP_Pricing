import * as React from "react";
import { Check, ChevronDown, MoreHorizontal, Plus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  /**
   * Column order as keys, outermost left. Part of the view because which two
   * columns sit side by side IS the view for anyone comparing them — a view
   * that restored the filters but not the arrangement would rebuild half the
   * thing. Empty means "as the table declares them".
   */
  columnOrder: string[];
  /** Reader-set column widths in px, by key. Empty means "as declared". */
  columnWidths: Record<string, number>;
  pageSize: number;
  /** Delivery date as `YYYY-MM-DD` — views are date-scoped like everything else. */
  dateKey: string;
  /** Which column the "Search by column" tool is pointed at. */
  colScope: string;
  /** Its query. Captured so a saved view restores the narrowing it was built with. */
  colQuery: string;
  /**
   * Active grouping dimensions, outermost first. ORDER IS SIGNIFICANT and is
   * compared as given — Status › Customer and Customer › Status are different
   * views, not the same one.
   */
  groupBy: string[];
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
    // Not sorted: the order of the dimensions is part of the state.
    groupBy: s.groupBy ?? [],
  });
}

export interface FuelOrdersViewBarProps {
  /**
   * Only the id and name are read here — the captured state is opaque to this
   * component, which is why Asset Orders and Customers can reuse the row with
   * their own state shapes.
   */
  views: { id: string; name: string }[];
  /**
   * BUILT-IN VIEWS, sitting FIRST, ruled off from Default and the saved ones.
   *
   * A saved view is something a reader MADE; a preset is something the business
   * already is. The businesses inside a line of service — fuel's transport and
   * tank wagon — are the second kind: a broker works one of them, all day, and
   * would otherwise rebuild the same filter every morning and save it under the
   * name it already has.
   *
   * They carry no `⋯` menu, because there is nothing to rename, update or
   * delete about a fact. Picking one is picking Default AND that narrowing, so
   * the two selections are one control and only one tab is ever underlined —
   * and picking one from inside a saved view drops that view.
   */
  presets?: { key: string; label: string }[];
  /** `null` = no preset; the Default tab owns the underline. */
  presetKey?: string | null;
  /** `null` clears the preset — the row sends it when a view takes over. */
  onPresetChange?: (key: string | null) => void;
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
  /**
   * A segmented scope control, seated at the right of this row ahead of the
   * actions. For a list that holds two KINDS of record rather than two filters
   * of one — fuel orders and asset orders take different forms and answer
   * different questions, so which of them you are looking at is a decision made
   * before anything else on the row applies.
   */
  segments?: { key: string; label: string }[];
  segmentValue?: string;
  onSegmentChange?: (key: string) => void;
  /** Primary CTA — rendered at the right end of this row. */
  onCreateOrder?: () => void;
  /**
   * Turns the CTA into a menu. A list whose Create means several DIFFERENT
   * records — a delivery, an asset out, an asset back — cannot express that in
   * one button: the three take different forms, so the choice has to be made
   * before the form opens rather than by a Type field inside it.
   *
   * Each option carries a `detail` because the names alone do not separate
   * them: "Asset Delivery" and "Asset Pickup" are one word apart and opposite.
   */
  createMenu?: {
    key: string;
    label: string;
    /** Optional — Sales' menu carries names only (Pavan, 2026-10-07). */
    detail?: string;
    /**
     * Turns the entry into a GROUP: its label and detail stop being a button
     * and become the heading over a radio list. Use it where one kind of thing
     * comes in two named variants — the variant is a property of the thing, not
     * a third kind, and a flat menu of near-identical names is where a one-word
     * difference gets misread.
     *
     * Choosing an entry ACTS in one click: `onCreateSelect` gets the
     * chosen key. Each entry starts its order; nothing is held selected.
     */
    choices?: { key: string; label: string; detail?: string }[];
  }[];
  onCreateSelect?: (key: string) => void;
  /** CTA label. Defaults to Fuel Orders' own verb. */
  ctaLabel?: string;
  /** Export — sits immediately left of the CTA. */
  onExport?: () => void;
}

const tabCls = (isActive: boolean) =>
  cn(
    /* `self-end` IS THE WHOLE POINT OF THE ACTIVE RULE. The row is
       `items-center` and its height is set by the taller right cluster, so a
       centred tab floated a couple of pixels clear of the hairline and its 2px
       underline read as a second, parallel line. Bottom-aligned, the two meet:
       the tab's rule lands on the divider with nothing between them. */
    "self-end px-3 py-2 text-xs whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
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
  presets,
  presetKey = null,
  onPresetChange,
  onCreate,
  onRename,
  onUpdate,
  onDelete,
  segments,
  segmentValue,
  onSegmentChange,
  onCreateOrder,
  createMenu,
  onCreateSelect,
  onExport,
  ctaLabel = "Create Order",
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
    /* Creating activates the new view, so it clears the business for the same
       reason applying one does. */
    if (dialog.mode === "new") {
      onPresetChange?.(null);
      onCreate(name);
    }
    else if (dialog.id) onRename(dialog.id, name);
    setDialog(null);
  };

  return (
    <>
      {/* -mx-4 -mt-4 cancels the content layer's 16px inset so the hairline spans
          the full panel width, as it does on the DS screen. */}
      {/* NO BOTTOM PADDING. The active tab's 2px rule has to LAND ON the row's
          hairline — that is what makes it read as a tab and not as an underline
          floating above a line. The row used to keep 2px under the tabs, which
          left a hairline gap between the two rules and made the whole tab strip
          look one notch high. Everything on the right measures its own distance
          from the divider with `self-end` + a margin, so those margins carry
          the 2px that came out of here. */}
      <div className="-mx-4 -mt-4 flex shrink-0 items-center gap-1 border-b border-border px-3 pt-0.5">
        {/* THE BUSINESSES COME FIRST, then a rule, then the views.

            They are two different kinds of thing and the row was reading as one
            list of six. A preset is WHICH BUSINESS this is — a fact about the
            work, true before anyone opened the screen; a view is a narrowing
            somebody MADE and can rename or delete. Ordering the facts first and
            ruling them off says which half of the row you are in, and puts the
            thing a broker changes least often where it is easiest to find.

            DEFAULT IS STILL THE RESTING STATE — it holds the underline when no
            business and no view is on, and it is the first thing after the
            rule, which is where the reader's eye lands once they are past the
            facts. */}
        {presets?.map((p) => (
          <button
            key={p.key}
            type="button"
            /* A PRESET IS DEFAULT PLUS A NARROWING, so picking one from inside
               a saved view drops the view as well. The row used to hide the
               presets while a view was active rather than answer this; hidden
               controls are a worse answer than a stated rule. */
            onClick={() => {
              if (activeId !== null) onResetToDefault();
              onPresetChange?.(p.key);
            }}
            className={cn(
              tabCls(presetKey === p.key),
              "border-b-2",
              presetKey === p.key ? "border-foreground" : "border-transparent"
            )}
          >
            {p.label}
          </button>
        ))}

        {presets && presets.length > 0 && (
          <span aria-hidden className="mx-2 mb-2 h-5 w-px shrink-0 self-end bg-border" />
        )}

        <button
          type="button"
          onClick={onResetToDefault}
          className={cn(
            tabCls(activeId === null && presetKey === null),
            "border-b-2",
            activeId === null && presetKey === null
              ? "border-foreground"
              : "border-transparent"
          )}
        >
          Default
          {activeId === null && presetKey === null && dirty && <DirtyDot />}
        </button>

        {views.map((v) => {
          const isActive = v.id === activeId;
          return (
            /* The wrapper is the flex child, so the alignment lives here —
               `tabCls`'s own `self-end` cannot reach past it. */
            <div key={v.id} className="group/tab flex items-end self-end pr-1">
              <button
                type="button"
                /* A VIEW AND A BUSINESS ARE MUTUALLY EXCLUSIVE, because only
                   one tab in this row can hold the underline and a narrowing
                   nobody can see is the thing Default exists to prevent. A
                   saved view does not capture the business — `ViewState` has no
                   field for it — so taking a view means leaving the business,
                   the same way picking a business leaves the view. */
                onClick={() => {
                  onPresetChange?.(null);
                  onApply(v.id);
                }}
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
          /* Not a tab — it has no rule to land, so it keeps 4px off the
             hairline rather than sitting on it. */
          className="mb-1 ml-1 inline-flex items-center gap-1 self-end rounded-md px-2 py-1 text-xs text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Plus className="size-4" /> View
        </button>

        {/*
          Primary CTA, moved up here from the toolbar's right cluster so it sits
          on the preset-view row.

          `size="xs"` — the DS step below `sm` (h-6/24px vs h-8/32px). This row
          carries text tabs, not controls, so the 32px button sat heavy on it.

          `rounded-[4px]` is OFF the DS radius scale, which runs
          xs 2px / sm 6px / md 8px / lg 10px — there is no 4px step. Asked for
          directly, so it stands as a literal, but it is the one raw value in
          this file. FOLLOW-UP: either add a 4px step to the radius scale in
          src/index.css and swap this for the token, or move the button to
          `rounded-sm` (6px). A decision to make here, not a Figma round-trip.

          `mr-1` is load-bearing: this row cancels the content layer's 16px inset
          with -mx-4 and re-pads at px-3 (12px) so its hairline spans the whole
          panel, which would leave the button 4px further right than the toolbar
          controls below it. The extra 4px puts both right edges on the same line.

          `self-end mb-3` sets the gap to the hairline. The row is
          `items-center`, so the button opts out of centring and measures from the
          bottom instead; 12px of margin puts exactly 12px between the button's
          lower edge and the divider. (It was 10 + the row's own 2px of bottom
          padding, until the tabs took that padding away so their rule could land
          on the hairline.)
        */}
        {/* THE SCOPE, THEN SPACE, THEN THE ACTIONS. The segments choose WHICH
            list this is; the buttons act on it. A 20px gap says they are not
            the same kind of control (a rule did, until 2026-10-05). It takes the `ml-auto` so the whole right cluster sits
            right; the CTA below no longer needs it. */}
        {segments && segments.length > 0 && (
          <>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={segmentValue}
              /* Radix emits "" when the active item is pressed again. A scope is
                 never empty — ignore the deselect so one segment stays chosen. */
              onValueChange={(next) => next && onSegmentChange?.(next)}
              aria-label="Order kind"
              className="mb-2.5 ml-auto h-7 self-end"
            >
              {segments.map((seg) => (
                <ToggleGroupItem
                  key={seg.key}
                  value={seg.key}
                  className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium"
                >
                  {seg.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {/* SPACE, NOT A RULE (Pavan, 2026-10-05): 12px here plus the
                row's 4px gap each side — 20px between the scope and the CTA. */}
            <span aria-hidden className="w-3 shrink-0" />
          </>
        )}

        {/* NO HANDLER, NO BUTTON. A list without a create flow — Vendors, where
            a carrier is onboarded through a contract rather than typed into a
            table — should not carry a CTA that does nothing when pressed. The
            `ml-auto` moves to the Export button below so the right cluster
            still sits right. */}
        {createMenu && createMenu.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="xs"
                className={cn(
                  "mb-3 self-end rounded-[4px]",
                  !segments?.length && "ml-auto"
                )}
              >
                <Plus />
                {ctaLabel}
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              {createMenu.map((o, i) =>
                o.choices?.length ? (
                  <React.Fragment key={o.key}>
                    {i > 0 && <DropdownMenuSeparator />}
                    {/* The group's own name is a HEADING, not a button — the
                        entries below it are the choice. Plain entries, no
                        radios (Pavan, 2026-10-05): each one STARTS an order,
                        so there is no selection for a dot to hold. */}
                    <DropdownMenuLabel className="flex flex-col items-start gap-0.5 py-2 font-normal">
                      <span className="text-sm font-medium text-foreground">
                        {o.label}
                      </span>
                      {o.detail && (
                        <span className="text-xs text-muted-foreground">{o.detail}</span>
                      )}
                    </DropdownMenuLabel>
                    {o.choices.map((c) => (
                      <DropdownMenuItem
                        key={c.key}
                        className="flex-col items-start gap-0.5 py-2"
                        onSelect={() => onCreateSelect?.(c.key)}
                      >
                        <span className="text-sm text-foreground">{c.label}</span>
                        {c.detail && (
                          <span className="text-xs text-muted-foreground">
                            {c.detail}
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </React.Fragment>
                ) : (
                  <DropdownMenuItem
                    key={o.key}
                    className="flex-col items-start gap-0.5 py-2"
                    onSelect={() => onCreateSelect?.(o.key)}
                  >
                    <span className="text-sm font-medium text-foreground">{o.label}</span>
                    {o.detail && (
                      <span className="text-xs text-muted-foreground">{o.detail}</span>
                    )}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          onCreateOrder && (
            <Button
              size="xs"
              className={cn(
                "mb-3 self-end rounded-[4px]",
                !segments?.length && "ml-auto"
              )}
              onClick={onCreateOrder}
            >
              <Plus />
              {ctaLabel}
            </Button>
          )
        )}

        {/*
          Export, moved down from the page header so both actions for this list
          sit together. `icon-xs` (24px) matches the CTA's height, and the same
          self-end/mb-3 puts them on one baseline.

          It is the rightmost item, so it carries the `mr-1` that keeps this row
          aligned with the toolbar below: the row cancels the content layer's
          16px inset with -mx-4 and re-pads at px-3, so without the extra 4px the
          trailing control would sit proud of every toolbar control under it.
        */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Export"
              onClick={onExport}
              className={cn(
                "mr-1 mb-3 self-end",
                // Takes over pushing the right cluster right when there is no CTA.
                onCreateOrder || createMenu || segments?.length ? "ml-1.5" : "ml-auto"
              )}
            >
              <Upload />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export</TooltipContent>
        </Tooltip>
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
