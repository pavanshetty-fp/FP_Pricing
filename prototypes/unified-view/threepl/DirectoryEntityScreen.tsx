import * as React from "react";
import { toast } from "sonner";
import { Archive, CheckCircle2, Download, Tag, XCircle } from "lucide-react";
import type { BulkAction } from "@/components/tables-layout";
import { DirectoryList, type DirectoryColumn, type DirectoryFacet } from "./DirectoryList";
import {
  DirectoryRecordSheet,
  type RecordReadSection,
} from "./DirectoryRecordSheet";
import type { FormSectionDef } from "./directoryFormTypes";
import { writeUrl } from "./directoryUrl";
import type { AuditEvent, RecordStatus } from "./directoryCore";
import type { GroupDim } from "@/components/tables-layout";

/*
  A list, and a sheet over it. For one entity.

  THE DS'S RECORD INTERACTION IS THE SIDE SHEET — `RecordSheet`, as
  `CustomerSheet` uses it. The record IS the form: `mode` decides whether the
  header reads Edit or Create, the body carries the fields, and the footer
  carries Save Changes. There is no separate full-page detail and no separate
  editor, because that would be a second pattern doing the same job, and the
  list would stop being visible behind the thing you opened from it.

  WHY THIS IS ONE COMPONENT AND NOT FOUR. The traffic is identical on every
  entity: a row opens the sheet, saving closes it, creating prepends a record,
  archiving flips a status. Written four times, the fourth copy is the one
  where a cancelled create leaves a half-made record in the list.

  WHAT AN ENTITY STILL SUPPLIES is everything genuinely about ITS records —
  columns, cells, facets, the form's fields, what the sheet shows below them,
  and what "archive" means for it.

  STATE LIVES HERE, at the top of the entity. A saved edit has to be visible on
  the list behind the sheet, and the only way to make that true without a store
  is to own the array in one place. Real screens would refetch; this prototype
  mutates its own copy and keeps the audit trail honest about it.

  BACK BEHAVES. Opening a record pushes a history entry, so the browser's Back
  closes the sheet — the one navigation people try without being told.
*/

export interface EntityConfig<Row, K extends string> {
  /** `customers`, `vendors` — the URL's `entity`, and the params namespace. */
  urlKey: string;
  /** Breadcrumb and heading: "Customers". */
  parentLabel: string;
  /** One record: "customer", "vendor", "product", "asset". */
  noun: string;
  nounPlural?: string;
  rowId: (row: Row) => string;
  nameOf: (row: Row) => string;

  columns: DirectoryColumn<K>[];
  renderCell: (row: Row, key: K) => React.ReactNode;
  matches: (row: Row, q: string) => boolean;
  searchFields: { key: string; label: string; text: (row: Row) => string }[];
  searchPlaceholder: string;
  sortRows: (rows: Row[], sort: { key: K; dir: "asc" | "desc" } | null) => Row[];
  dimensions: GroupDim<Row>[];
  facets: DirectoryFacet<Row>[];
  measureOf?: (row: Row) => number;
  measureUnit?: string;
  formatTotal?: (total: number) => string;
  emptyIcon: React.ReactNode;
  exportRow: (row: Row) => Record<string, string | number>;

  /* ── the sheet ── */
  /** The chips beside the sheet's title — status, and what blocks this record. */
  headerAsideOf: (row: Row) => React.ReactNode;
  /** Everything the sheet shows but does not edit, below the form's sections. */
  readSectionsOf: (row: Row, go: Navigator) => RecordReadSection[];

  /* ── the form ── */
  formSections: FormSectionDef<Row>[];
  /** A blank record, for Create. Given a fresh id. */
  blank: (id: string) => Row;
  /** Reads and writes the shared lifecycle field, whatever it is called here. */
  statusField: {
    get: (row: Row) => RecordStatus;
    set: (row: Row, next: RecordStatus) => Row;
  };
  auditOf: (row: Row) => AuditEvent[];
  withAudit: (row: Row, entry: AuditEvent) => Row;
  /** Verbs beyond archive that this entity's selection supports. */
  extraBulkActions?: (
    selected: Row[],
    apply: (fn: (row: Row) => Row, message: string) => void
  ) => BulkAction[];
}

/** Cross-entity jumps a record page can make. */
export interface Navigator {
  openCustomer: (id: string) => void;
  openVendor: (id: string) => void;
  openProduct: (id: string) => void;
  openAsset: (id: string) => void;
}

/** The sheet is open on a record, open on a new one, or closed. */
type Sheet = { kind: "record"; id: string } | { kind: "create" } | null;

export interface DirectoryEntityScreenProps<Row, K extends string> {
  config: EntityConfig<Row, K>;
  rows: Row[];
  onRowsChange: (next: Row[]) => void;
  navigate: Navigator;
  /** Open this record on mount — a jump from another entity, or a deep link. */
  focusId?: string | null;
  onFocusHandled?: () => void;
  canWrite?: boolean;
  /** The list's total, for the page header. */
  onTotalChange?: (label: string | null) => void;
}

/** The audit entry a save writes. One per save, listing what actually moved. */
function auditFor<Row>(
  before: Row,
  after: Row,
  sections: FormSectionDef<Row>[],
  actor: string
): AuditEvent | null {
  const changes: string[] = [];
  sections.forEach((s) =>
    s.fields.forEach((f) => {
      const a = f.get(before);
      const b = f.get(after);
      if (a === b) return;
      const show = (v: unknown) =>
        v === null || v === undefined || v === "" ? "empty" : String(v);
      changes.push(`${f.label}: ${show(a)} → ${show(b)}`);
    })
  );
  if (changes.length === 0) return null;
  return {
    id: `au-${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    by: actor,
    action: "Updated",
    changes,
  };
}

export function DirectoryEntityScreen<Row, K extends string>({
  config,
  rows,
  onRowsChange,
  navigate,
  focusId,
  onFocusHandled,
  canWrite = true,
  onTotalChange,
}: DirectoryEntityScreenProps<Row, K>) {
  const [sheet, setSheet] = React.useState<Sheet>(null);
  const seq = React.useRef(0);

  /* A jump from another entity's sheet opens this entity's sheet on that
     record — the list is behind it either way, which is the point. */
  React.useEffect(() => {
    if (!focusId) return;
    setSheet({ kind: "record", id: focusId });
    onFocusHandled?.();
  }, [focusId, onFocusHandled]);

  const record =
    sheet?.kind === "record" ? rows.find((r) => config.rowId(r) === sheet.id) ?? null : null;

  /* A BLANK RECORD IS MADE ONCE PER OPEN, not on every render — remade each
     time, the sheet's draft would reset under the reader's hands. */
  const blank = React.useMemo(
    () => (sheet?.kind === "create" ? config.blank(`${config.urlKey.slice(0, 2)}-new-${(seq.current += 1)}`) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sheet?.kind === "create"]
  );

  const openRecord = (row: Row) => {
    const id = config.rowId(row);
    setSheet({ kind: "record", id });
    /* PUSH, not replace: Back should close the sheet, and that is the one
       navigation nobody has to be told about. */
    writeUrl({ entity: config.urlKey, record: id }, { push: true });
  };

  const closeSheet = () => {
    setSheet(null);
    writeUrl({ record: null });
  };

  const replaceRow = (id: string, fn: (row: Row) => Row) =>
    onRowsChange(rows.map((r) => (config.rowId(r) === id ? fn(r) : r)));

  const applyToMany = (ids: string[], fn: (row: Row) => Row, message: string) => {
    const set = new Set(ids);
    onRowsChange(rows.map((r) => (set.has(config.rowId(r)) ? fn(r) : r)));
    toast.success(message);
  };

  const plural = config.nounPlural ?? `${config.noun}s`;
  const Noun = config.noun[0].toUpperCase() + config.noun.slice(1);

  const submit = (draft: Row) => {
    if (sheet?.kind === "create") {
      onRowsChange([draft, ...rows]);
      toast.success(`${Noun} created`, { description: config.nameOf(draft) });
      closeSheet();
      return;
    }
    if (!record) return;
    const entry = auditFor(record, draft, config.formSections, "Dana Whitfield");
    const next = entry ? config.withAudit(draft, entry) : draft;
    replaceRow(config.rowId(next), () => next);
    /* A save that changed nothing says so rather than claiming a save — the
       audit trail stays clean and nobody goes looking for the diff. */
    if (entry) {
      toast.success("Changes saved", {
        description:
          entry.changes.length === 1 ? entry.changes[0] : `${entry.changes.length} fields updated`,
      });
    } else {
      toast.info("Nothing to save", { description: "No fields were changed." });
    }
    closeSheet();
  };

  const initial = sheet?.kind === "create" ? blank : record;

  return (
    <>
      <DirectoryList<Row, K>
        rows={rows}
        columns={config.columns}
        rowId={config.rowId}
        renderCell={config.renderCell}
        matches={config.matches}
        searchFields={config.searchFields}
        searchPlaceholder={config.searchPlaceholder}
        sortRows={config.sortRows}
        dimensions={config.dimensions}
        facets={config.facets}
        noun={config.noun}
        nounPlural={config.nounPlural}
        measureOf={config.measureOf}
        measureUnit={config.measureUnit}
        formatTotal={config.formatTotal}
        emptyIcon={config.emptyIcon}
        onOpenRow={openRecord}
        openLabel={(r) => `Open ${config.noun} ${config.nameOf(r)}`}
        urlKey={config.urlKey}
        canWrite={canWrite}
        onTotalChange={onTotalChange}
        exportRow={config.exportRow}
        onCreate={() => setSheet({ kind: "create" })}
        createLabel={`Add New ${Noun}`}
        bulkActions={(selected, clear) => {
          const ids = selected.map(config.rowId);
          const allArchived = selected.every((r) => config.statusField.get(r) === "archived");
          return [
            {
              key: "export",
              label: "Export selection",
              icon: <Download />,
              onSelect: () => {
                toast.success(
                  `${selected.length} ${selected.length === 1 ? config.noun : plural} exported`
                );
                clear();
              },
            },
            ...(config.extraBulkActions?.(selected, (fn, message) => {
              applyToMany(ids, fn, message);
              clear();
            }) ?? []),
            {
              key: "archive",
              label: allArchived ? "Restore" : "Archive",
              icon: allArchived ? <CheckCircle2 /> : <Archive />,
              destructive: !allArchived,
              disabled: !canWrite,
              title: canWrite ? undefined : "You do not have permission to archive records",
              onSelect: () => {
                applyToMany(
                  ids,
                  (r) => config.statusField.set(r, allArchived ? "active" : "archived"),
                  `${ids.length} ${ids.length === 1 ? config.noun : plural} ${allArchived ? "restored" : "archived"}`
                );
                clear();
              },
            },
          ];
        }}
      />

      {initial && (
        <DirectoryRecordSheet<Row>
          open
          onOpenChange={(next) => {
            if (!next) closeSheet();
          }}
          mode={sheet?.kind === "create" ? "create" : "edit"}
          noun={Noun}
          title={config.nameOf(initial)}
          headerAside={sheet?.kind === "create" ? undefined : config.headerAsideOf(initial)}
          initial={initial}
          sections={config.formSections}
          readSections={
            sheet?.kind === "create" ? [] : config.readSectionsOf(initial, navigate)
          }
          onSubmit={submit}
        />
      )}
    </>
  );
}

/** A bulk verb that sets a tag on everything selected. Shared by all four. */
export function tagBulkAction<Row>(
  apply: (fn: (row: Row) => Row, message: string) => void,
  addTag: (row: Row, tag: string) => Row,
  count: number
): BulkAction {
  return {
    key: "tag",
    label: "Add “Watch List” tag",
    icon: <Tag />,
    onSelect: () =>
      apply(
        (r) => addTag(r, "Watch List"),
        `Tagged ${count} ${count === 1 ? "record" : "records"}`
      ),
  };
}

/** Deactivate / reactivate, for the two entities that have an `active` flag. */
export function activeBulkAction<Row>(
  apply: (fn: (row: Row) => Row, message: string) => void,
  isActive: (row: Row) => boolean,
  setActive: (row: Row, next: boolean) => Row,
  selected: Row[]
): BulkAction {
  const allOff = selected.every((r) => !isActive(r));
  return {
    key: "active",
    label: allOff ? "Reactivate" : "Deactivate",
    icon: allOff ? <CheckCircle2 /> : <XCircle />,
    onSelect: () =>
      apply(
        (r) => setActive(r, allOff),
        `${selected.length} ${selected.length === 1 ? "record" : "records"} ${allOff ? "reactivated" : "deactivated"}`
      ),
  };
}
