import * as React from "react";
import { toast } from "sonner";
import { Archive, CheckCircle2, Download, Tag, XCircle } from "lucide-react";
import type { BulkAction } from "@/components/tables-layout";
import { DirectoryList, type DirectoryColumn, type DirectoryFacet } from "./DirectoryList";
import {
  DirectoryRecordPage,
  type BadgeTone,
  type RecordSection,
  type RecordSummaryStat,
} from "./DirectoryRecordPage";
import { DirectoryForm, type FormSectionDef } from "./DirectoryForm";
import { writeUrl } from "./directoryUrl";
import type { AuditEvent, RecordStatus } from "./directoryCore";
import type { GroupDim } from "@/components/tables-layout";

/*
  List → record → form, for one entity.

  WHY THIS IS ONE COMPONENT AND NOT FOUR. The three screens are the same three
  screens on every entity, and so is the traffic between them: a row opens a
  record, a record opens a form, a saved form returns to the record it came
  from, a cancelled create returns to the list. Written four times, the fourth
  copy would be the one where Cancel from Create lands on a record that does
  not exist yet.

  WHAT AN ENTITY STILL SUPPLIES is everything that is genuinely about ITS
  records — columns, cells, facets, the record layout, the form, and what
  "archive" means for it. The traffic rules are here.

  STATE LIVES HERE, at the top of the entity. A saved edit has to be visible on
  the list behind it and in the record on top of it, and the only way to make
  that true without a store is to own the array in one place and pass it down.
  Real screens would refetch; this prototype mutates its own copy and keeps the
  audit trail honest about it.

  BACK BEHAVES. Opening a record pushes a history entry so the browser's Back
  returns to the list — the one navigation people try without being told.
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

  /* ── the record page ── */
  subtitleOf: (row: Row) => React.ReactNode;
  statusOf: (row: Row) => { label: string; tone: BadgeTone };
  badgesOf: (row: Row) => { label: string; tone: BadgeTone; title?: string }[];
  statsOf: (row: Row) => RecordSummaryStat[];
  sectionsOf: (row: Row, go: Navigator) => RecordSection[];

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

type Mode =
  | { kind: "list" }
  | { kind: "record"; id: string }
  | { kind: "edit"; id: string }
  | { kind: "create" };

export interface DirectoryEntityScreenProps<Row, K extends string> {
  config: EntityConfig<Row, K>;
  rows: Row[];
  onRowsChange: (next: Row[]) => void;
  navigate: Navigator;
  /** Open this record on mount — a jump from another entity, or a deep link. */
  focusId?: string | null;
  onFocusHandled?: () => void;
  canWrite?: boolean;
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
}: DirectoryEntityScreenProps<Row, K>) {
  const [mode, setMode] = React.useState<Mode>({ kind: "list" });
  const [section, setSection] = React.useState<string | undefined>(undefined);
  const seq = React.useRef(0);

  /* A jump from another entity's record page lands on the record, not the list. */
  React.useEffect(() => {
    if (!focusId) return;
    setMode({ kind: "record", id: focusId });
    setSection(undefined);
    onFocusHandled?.();
  }, [focusId, onFocusHandled]);

  const record = mode.kind === "record" || mode.kind === "edit"
    ? rows.find((r) => config.rowId(r) === mode.id) ?? null
    : null;

  const openRecord = (row: Row) => {
    const id = config.rowId(row);
    setMode({ kind: "record", id });
    setSection(undefined);
    /* PUSH, not replace: Back from a record should return to the list, and
       that is the one navigation nobody has to be told about. */
    writeUrl({ entity: config.urlKey, record: id }, { push: true });
  };

  const backToList = () => {
    setMode({ kind: "list" });
    writeUrl({ record: null });
  };

  const replaceRow = (id: string, fn: (row: Row) => Row) => {
    onRowsChange(rows.map((r) => (config.rowId(r) === id ? fn(r) : r)));
  };

  const applyToMany = (ids: string[], fn: (row: Row) => Row, message: string) => {
    const set = new Set(ids);
    onRowsChange(rows.map((r) => (set.has(config.rowId(r)) ? fn(r) : r)));
    toast.success(message);
  };

  /* ── the list ─────────────────────────────────────────────────────────── */
  if (mode.kind === "list") {
    return (
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
        exportRow={config.exportRow}
        onCreate={() => setMode({ kind: "create" })}
        bulkActions={(selected, clear) => {
          const ids = selected.map(config.rowId);
          const allArchived = selected.every((r) => config.statusField.get(r) === "archived");
          const base: BulkAction[] = [
            {
              key: "export",
              label: "Export selection",
              icon: <Download />,
              onSelect: () => {
                toast.success(`${selected.length} ${selected.length === 1 ? config.noun : config.nounPlural ?? `${config.noun}s`} exported`);
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
                  `${ids.length} ${ids.length === 1 ? config.noun : config.nounPlural ?? `${config.noun}s`} ${allArchived ? "restored" : "archived"}`
                );
                clear();
              },
            },
          ];
          return base;
        }}
      />
    );
  }

  /* ── create / edit ────────────────────────────────────────────────────── */
  if (mode.kind === "create" || (mode.kind === "edit" && record)) {
    const creating = mode.kind === "create";
    const initial = creating
      ? config.blank(`${config.urlKey.slice(0, 2)}-new-${(seq.current += 1)}`)
      : (record as Row);

    const finish = (draft: Row, close: boolean) => {
      if (creating) {
        onRowsChange([draft, ...rows]);
        toast.success(`${config.noun[0].toUpperCase()}${config.noun.slice(1)} created`, {
          description: config.nameOf(draft),
        });
        if (close) backToList();
        else {
          setMode({ kind: "record", id: config.rowId(draft) });
          writeUrl({ entity: config.urlKey, record: config.rowId(draft) }, { push: true });
        }
        return;
      }

      const entry = auditFor(initial, draft, config.formSections, "Dana Whitfield");
      const next = entry ? config.withAudit(draft, entry) : draft;
      replaceRow(config.rowId(next), () => next);
      /* A save that changed nothing says so, rather than claiming a save. The
         audit trail stays clean and nobody goes looking for the diff. */
      if (entry) {
        toast.success("Changes saved", {
          description:
            entry.changes.length === 1
              ? entry.changes[0]
              : `${entry.changes.length} fields updated`,
        });
      } else {
        toast.info("Nothing to save", { description: "No fields were changed." });
      }
      if (close) setMode({ kind: "record", id: config.rowId(next) });
    };

    return (
      <DirectoryForm<Row>
        mode={creating ? "create" : "edit"}
        noun={config.noun[0].toUpperCase() + config.noun.slice(1)}
        title={creating ? undefined : config.nameOf(initial)}
        parentLabel={creating ? config.parentLabel : `Back to ${config.nameOf(initial)}`}
        initial={initial}
        sections={config.formSections}
        onCancel={() =>
          creating ? backToList() : setMode({ kind: "record", id: config.rowId(initial) })
        }
        onSave={(d) => finish(d, false)}
        onSaveAndClose={(d) => finish(d, true)}
        archived={!creating && config.statusField.get(initial) === "archived"}
        onArchive={
          creating
            ? undefined
            : () => {
                const wasArchived = config.statusField.get(initial) === "archived";
                replaceRow(config.rowId(initial), (r) =>
                  config.statusField.set(r, wasArchived ? "active" : "archived")
                );
                toast.success(
                  `${config.nameOf(initial)} ${wasArchived ? "restored" : "archived"}`
                );
                setMode({ kind: "record", id: config.rowId(initial) });
              }
        }
      />
    );
  }

  /* ── the record ───────────────────────────────────────────────────────── */
  if (record) {
    const archived = config.statusField.get(record) === "archived";
    return (
      <DirectoryRecordPage
        parentLabel={config.parentLabel}
        onBack={backToList}
        title={config.nameOf(record)}
        subtitle={config.subtitleOf(record)}
        status={config.statusOf(record)}
        badges={config.badgesOf(record)}
        stats={config.statsOf(record)}
        sections={config.sectionsOf(record, navigate)}
        activeSection={section}
        onSectionChange={setSection}
        canWrite={canWrite}
        archived={archived}
        onEdit={() => setMode({ kind: "edit", id: config.rowId(record) })}
        onArchive={() => {
          replaceRow(config.rowId(record), (r) =>
            config.statusField.set(r, archived ? "active" : "archived")
          );
          toast.success(`${config.nameOf(record)} ${archived ? "restored" : "archived"}`, {
            description: archived
              ? "It is selectable on new orders again."
              : "Existing orders keep it. It is no longer offered on new ones.",
          });
        }}
        extraActions={[
          {
            label: "Copy record link",
            onSelect: () => {
              const url = `${window.location.origin}${window.location.pathname}?entity=${config.urlKey}&record=${config.rowId(record)}`;
              void navigator.clipboard?.writeText(url);
              toast.success("Link copied");
            },
          },
        ]}
      />
    );
  }

  /* The record was archived away, or the id in the URL is stale. */
  return (
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
      emptyIcon={config.emptyIcon}
      onOpenRow={openRecord}
      openLabel={(r) => `Open ${config.noun} ${config.nameOf(r)}`}
      urlKey={config.urlKey}
    />
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
