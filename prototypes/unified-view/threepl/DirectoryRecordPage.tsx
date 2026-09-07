import * as React from "react";
import {
  Archive,
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Sheet as SheetIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { StatusChip } from "@/components/ui/status-chip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DASH, formatDate, formatStamp, type Attachment, type AuditEvent } from "./directoryCore";

/*
  The Directory's record page — one layout, four entities.

  A PAGE, NOT A SHEET, and the split is deliberate. An ORDER is opened to do
  one thing and close: price it, send it, accept a quote. A side sheet keeps
  the board behind it and is exactly right for that. A DIRECTORY RECORD is
  opened to read it — ten sections, several child lists, a history — and a
  sheet that deep turns into a scrolling column half the width of the screen
  with a board it no longer relates to sitting behind it. So orders keep the
  sheet, records take the page, and each pattern is used for the shape of work
  it fits.

  THE SUMMARY STRIP IS THE ANSWER TO "WHY DID I OPEN THIS". Four or five facts,
  chosen per entity, above the fold and above the tabs: credit exposure for an
  account, compliance for a carrier, where an asset is and what it earns. Any
  record that has to be read past the first screen to answer its own most
  common question is badly laid out, whatever is further down.

  TABS RATHER THAN ONE LONG SCROLL. Ten sections stacked is a page nobody
  reaches the bottom of, and — worse — a page where "Attachments" is a
  different distance down on every record. Tabs put every section one click
  from every other and keep the header, the status and the actions pinned.
*/

export type BadgeTone = "success" | "warning" | "critical" | "info" | "neutral";

export interface RecordSummaryStat {
  label: string;
  value: React.ReactNode;
  /** Secondary line — the unit, the comparison, the "of $250,000". */
  hint?: string;
  tone?: BadgeTone;
}

export interface RecordSection {
  key: string;
  label: string;
  /** Shown on the tab as a count chip. Omit for sections that do not count. */
  count?: number;
  render: () => React.ReactNode;
}

export interface DirectoryRecordPageProps {
  /** Breadcrumb parent — "Customers", "Vendors". */
  parentLabel: string;
  onBack: () => void;
  title: string;
  /** `ERP-4821 · Fresno, CA` — the line that disambiguates two similar names. */
  subtitle?: React.ReactNode;
  status: { label: string; tone: BadgeTone };
  /** Second and third status pills — approval, compliance, availability. */
  badges?: { label: string; tone: BadgeTone; title?: string }[];
  stats: RecordSummaryStat[];
  sections: RecordSection[];
  activeSection?: string;
  onSectionChange?: (key: string) => void;
  onEdit?: () => void;
  onArchive?: () => void;
  archiveLabel?: string;
  /** Already archived — the verb becomes Restore and the copy changes with it. */
  archived?: boolean;
  extraActions?: { label: string; onSelect: () => void; destructive?: boolean }[];
  canWrite?: boolean;
}

/*
  FIVE TONES ON THE DS'S THREE STATUS CHANNELS, plus the banner's caution hue.

  The DS ships `status-success / processing / failed` and a caution accent, and
  binds no meaning to any of them — the application declares the mapping, the
  same split `TYPE_TONE` makes for the order discs. Warning borrows the banner
  accent rather than inventing a fourth channel: a compliance certificate that
  lapses next month is the same "act soon, nothing is broken yet" the caution
  banner means, and a new colour for it would be a second vocabulary.
*/
const TONE_CLASS: Record<BadgeTone, string> = {
  success: "border-transparent bg-status-success/10 text-status-success",
  warning: "border-transparent bg-fp-banner-accent-caution/10 text-fp-banner-accent-caution",
  critical: "border-transparent bg-status-failed/10 text-status-failed",
  info: "border-transparent bg-status-processing/10 text-status-processing",
  neutral: "border-fp-outline-1 bg-fp-surface-1a text-muted-foreground",
};

export function RecordBadge({
  tone,
  children,
  title,
}: {
  tone: BadgeTone;
  children: React.ReactNode;
  title?: string;
}) {
  const chip = (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-xs font-medium",
        TONE_CLASS[tone]
      )}
    >
      {children}
    </span>
  );
  if (!title) return chip;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

export function DirectoryRecordPage({
  parentLabel,
  onBack,
  title,
  subtitle,
  status,
  badges = [],
  stats,
  sections,
  activeSection,
  onSectionChange,
  onEdit,
  onArchive,
  archiveLabel,
  archived = false,
  extraActions = [],
  canWrite = true,
}: DirectoryRecordPageProps) {
  const [internal, setInternal] = React.useState(sections[0]?.key ?? "");
  const active = activeSection ?? internal;
  const setActive = onSectionChange ?? setInternal;
  const [confirmArchive, setConfirmArchive] = React.useState(false);

  const section = sections.find((s) => s.key === active) ?? sections[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── header ─────────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <Button variant="ghost" size="xs" className="-ml-2 mb-2 text-muted-foreground" onClick={onBack}>
          <ArrowLeft />
          {parentLabel}
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-foreground">{title}</h1>
              <RecordBadge tone={status.tone}>{status.label}</RecordBadge>
              {badges.map((b) => (
                <RecordBadge key={b.label} tone={b.tone} title={b.title}>
                  {b.label}
                </RecordBadge>
              ))}
            </div>
            {subtitle && (
              <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                disabled={!canWrite}
                title={canWrite ? undefined : "You do not have permission to edit this record"}
                onClick={onEdit}
              >
                <Pencil />
                Edit
              </Button>
            )}
            {(onArchive || extraActions.length > 0) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-sm" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {extraActions.map((a) => (
                    <DropdownMenuItem
                      key={a.label}
                      variant={a.destructive ? "destructive" : undefined}
                      onSelect={a.onSelect}
                    >
                      {a.label}
                    </DropdownMenuItem>
                  ))}
                  {onArchive && extraActions.length > 0 && <DropdownMenuSeparator />}
                  {onArchive && (
                    <DropdownMenuItem
                      variant={archived ? undefined : "destructive"}
                      disabled={!canWrite}
                      onSelect={() => setConfirmArchive(true)}
                    >
                      <Archive />
                      {archived ? "Restore record" : (archiveLabel ?? "Archive record")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* ── summary strip ──────────────────────────────────────────────── */}
      {stats.length > 0 && (
        <div className="mt-4 grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3.5 py-3"
            >
              <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
              <div
                className={cn(
                  "mt-1 truncate text-base font-semibold tabular-nums text-foreground",
                  s.tone === "critical" && "text-status-failed",
                  s.tone === "warning" && "text-fp-banner-accent-caution",
                  s.tone === "success" && "text-status-success"
                )}
                title={typeof s.value === "string" ? s.value : undefined}
              >
                {s.value}
              </div>
              {s.hint && (
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{s.hint}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── sections ───────────────────────────────────────────────────── */}
      <div className="mt-5 shrink-0 border-b border-border">
        <Tabs value={active} onValueChange={setActive}>
          <TabsList variant="line" className="overflow-x-auto">
            {sections.map((s) => (
              <TabsTrigger key={s.key} value={s.key}>
                {s.label}
                {s.count !== undefined && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-4 min-w-4 justify-center px-1 text-[10px] font-medium tabular-nums"
                  >
                    {s.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1 overflow-auto pt-5">{section?.render()}</div>

      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archived ? `Restore ${title}?` : `Archive ${title}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archived
                ? "It becomes selectable again on new orders. Nothing about its history changes."
                : "It stops being selectable on new orders. Existing orders keep it, and the record stays readable — archiving is not deleting."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onArchive?.();
                setConfirmArchive(false);
              }}
            >
              {archived ? "Restore" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════ section building blocks ═ */

/**
 * A labelled fact.
 *
 * `-` and `N/A` are both real values here, printed muted, never suppressed. A
 * field that vanishes when it is empty makes an incomplete record look
 * complete, and the whole reason to open a record is to find out what is
 * missing from it.
 */
export function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  const empty =
    value === null ||
    value === undefined ||
    value === "" ||
    value === DASH ||
    value === "N/A";
  return (
    <div className={cn(wide && "sm:col-span-2 lg:col-span-3")}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-sm break-words",
          empty ? "text-muted-foreground/70" : "text-foreground"
        )}
      >
        {empty ? DASH : value}
      </dd>
    </div>
  );
}

/** A titled block of fields. The detail page's only structural unit. */
export function DetailCard({
  title,
  action,
  children,
  columns = 3,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <section className="rounded-md border border-fp-outline-1 bg-fp-surface-1a">
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-fp-outline-1 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </header>
      <dl
        className={cn(
          "grid gap-x-6 gap-y-4 p-4",
          columns === 1 && "grid-cols-1",
          columns === 2 && "sm:grid-cols-2",
          columns === 3 && "sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {children}
      </dl>
    </section>
  );
}

/** The same block, without the definition-list grid — for tables inside. */
export function DetailPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-fp-outline-1 bg-fp-surface-1a">
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-fp-outline-1 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Vertical rhythm between blocks in one section. 16px, per the DS. */
export function SectionStack({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 pb-6">{children}</div>;
}

/** A related-records table that says something useful when it is empty. */
export function RelatedTable<T>({
  rows,
  columns,
  emptyTitle,
  emptyBody,
  onOpenRow,
  rowKey,
}: {
  rows: T[];
  columns: { key: string; label: string; align?: "right"; render: (row: T) => React.ReactNode }[];
  emptyTitle: string;
  emptyBody: string;
  onOpenRow?: (row: T) => void;
  rowKey: (row: T) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-10">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyBody}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-fp-outline-1 bg-fp-table-header">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "h-9 whitespace-nowrap px-4 text-left text-xs font-medium text-muted-foreground",
                  c.align === "right" && "text-right"
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "border-b border-fp-outline-1 last:border-0",
                onOpenRow && "cursor-pointer hover:bg-fp-row-hover"
              )}
              onClick={onOpenRow ? () => onOpenRow(row) : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "h-11 px-4 align-middle text-foreground",
                    c.align === "right" && "text-right tabular-nums"
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═════════════════════════════════════════════════════ shared sections ═══ */

const FILE_ICON: Record<string, React.ReactNode> = {
  pdf: <FileText className="size-4" />,
  png: <ImageIcon className="size-4" />,
  xlsx: <SheetIcon className="size-4" />,
  csv: <SheetIcon className="size-4" />,
};

/**
 * Files on a record.
 *
 * EXPIRY IS THE POINT for half of these. A certificate of insurance that
 * lapsed in June is the single most consequential fact a vendor record holds,
 * so it is stated on the row and coloured, not left for someone to work out
 * from a date.
 */
export function AttachmentsSection({
  groups,
  canWrite = true,
  onUpload,
}: {
  groups: { title: string; files: Attachment[] }[];
  canWrite?: boolean;
  onUpload?: () => void;
}) {
  const today = new Date();
  return (
    <SectionStack>
      {groups.map((g) => (
        <DetailPanel
          key={g.title}
          title={`${g.title} (${g.files.length})`}
          action={
            onUpload && (
              <Button variant="outline" size="xs" disabled={!canWrite} onClick={onUpload}>
                Upload
              </Button>
            )
          }
        >
          <RelatedTable
            rows={g.files}
            rowKey={(f) => f.id}
            emptyTitle="No files"
            emptyBody={`Nothing has been attached under ${g.title.toLowerCase()} yet.`}
            columns={[
              {
                key: "name",
                label: "File",
                render: (f) => (
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">{FILE_ICON[f.kind] ?? <FileText className="size-4" />}</span>
                    <span className="truncate">{f.name}</span>
                  </span>
                ),
              },
              {
                key: "expires",
                label: "Expires",
                render: (f) => {
                  if (!f.expiresOn) return <span className="text-muted-foreground/70">{DASH}</span>;
                  const gone = new Date(`${f.expiresOn}T00:00:00Z`) < today;
                  return (
                    <StatusChip tone={gone ? "failed" : "success"} variant="text">
                      {gone ? `Expired ${formatDate(f.expiresOn)}` : formatDate(f.expiresOn)}
                    </StatusChip>
                  );
                },
              },
              { key: "size", label: "Size", align: "right", render: (f) => `${f.sizeKb.toLocaleString()} KB` },
              { key: "by", label: "Uploaded by", render: (f) => f.uploadedBy },
              { key: "at", label: "Uploaded", render: (f) => formatDate(f.uploadedAt) },
              {
                key: "dl",
                label: "",
                align: "right",
                render: () => (
                  <Button variant="ghost" size="icon-sm" aria-label="Download file">
                    <Download />
                  </Button>
                ),
              },
            ]}
          />
        </DetailPanel>
      ))}
    </SectionStack>
  );
}

/**
 * The record's history.
 *
 * NEWEST FIRST, and every entry names its fields. "Updated" tells you somebody
 * was here; "Credit limit changed" tells you what to look at. The rail down
 * the left is one element rather than a border per row, so entries of
 * different heights still read as one thread.
 */
export function AuditSection({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="py-10">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No history yet</EmptyTitle>
            <EmptyDescription>
              Edits to this record will be listed here with who made them and when.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="relative pb-6 pl-5">
      <div aria-hidden className="absolute left-[5px] top-2 bottom-6 w-px bg-fp-outline-1" />
      <ol className="flex flex-col gap-5">
        {sorted.map((e) => (
          <li key={e.id} className="relative">
            <span
              aria-hidden
              className="absolute -left-5 top-1.5 size-[11px] rounded-full border-2 border-fp-surface-1b bg-fp-outline-2"
            />
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-foreground">{e.action}</span>
              <span className="text-sm text-muted-foreground">by {e.by}</span>
              <span className="text-xs tabular-nums text-muted-foreground/80">
                {formatStamp(e.at)}
              </span>
            </div>
            {e.changes.length > 0 && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {e.changes.map((c, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Free text a record carries — instructions the driver sees, internal notes. */
export function NotesSection({
  blocks,
}: {
  blocks: { title: string; body: string | null; hint?: string }[];
}) {
  return (
    <SectionStack>
      {blocks.map((b) => (
        <DetailPanel key={b.title} title={b.title}>
          <div className="px-4 py-3.5">
            {b.body ? (
              <p className="text-sm whitespace-pre-wrap text-foreground">{b.body}</p>
            ) : (
              <p className="text-sm text-muted-foreground/70">
                {b.hint ?? "Nothing recorded."}
              </p>
            )}
          </div>
        </DetailPanel>
      ))}
    </SectionStack>
  );
}

/** Tag pills, or an honest blank. */
export function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-muted-foreground/70">{DASH}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <Badge key={t} variant="secondary" className="font-normal">
          {t}
        </Badge>
      ))}
    </span>
  );
}
