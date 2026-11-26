import * as React from "react";
import { toast } from "sonner";
import { Copy, LayoutTemplate, MoreHorizontal, Pencil, RotateCw, Workflow } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ListColumn } from "../ListTable";
import type { ListFacet } from "../ListFilters";
import { StandardList } from "../StandardList";
import { fmtWhen, plural } from "./changeLog";
import { fitColumns } from "./fitColumns";
import { BulkRuleSheet, LockedButton, StatusPill, type BulkSheetTarget } from "./BulkRuleSheet";
import {
  changesText,
  countOf,
  runningRule,
  defOf,
  lastRun,
  ruleStatus,
  runAgain,
  scopeText,
  setRunDoneHandler,
  useBulkRules,
  type Rule,
  type Template,
  adjustedBy,
  previewRule,
} from "./bulkRules";

/*
  PRICING CONFIGURATION › BULK RULES AND BULK TEMPLATES (Yash, 2026-11-18).
  The shared list. A rule row opens the rule — its latest run and Run again;
  a template row opens the template, whose next act makes a rule from it.
*/

/** One sheet for both lists, and the toast when a run finishes. */
function useBulkSheet() {
  const [open, setOpen] = React.useState<BulkSheetTarget | null>(null);
  /* ONE SHEET PER OPENING — Apply turns the same sheet into its rule, so the
     page stays and its status bar follows the run (Yash, 2026-11-19). */
  const [session, setSession] = React.useState(0);
  const go = (t: BulkSheetTarget | null) => {
    if (!(t && t.kind === "rule" && t.stay)) setSession((n) => n + 1);
    setOpen(t);
  };
  React.useEffect(() => {
    setRunDoneHandler((rule, run) => {
      const failed = countOf(run, "failed");
      if (failed) toast.warning(`${rule.name} finished · ${failed} failed`);
      else toast.success(`${rule.name} finished · ${plural(countOf(run, "updated"), "price")} updated`);
    });
    return () => setRunDoneHandler(null);
  }, []);
  const sheet = open && (
    <BulkRuleSheet key={session} target={open} onClose={() => go(null)} onOpen={go} />
  );
  return { setOpen: go, sheet };
}

// ------------------------------------------------------------------ rules --

type RKey = "rule" | "change" | "amount" | "scope" | "status" | "lastRun" | "updated" | "runs" | "actions";
const RULE_COLUMNS: ListColumn<RKey>[] = [
  /* RULE · CHANGE · SCOPE · LAST RUN, NARROWER (Yash, 2026-11-20) — Last
     run in sight without a sideways scroll. */
  { key: "rule", label: "Rule", width: 220, sortable: true },
  { key: "change", label: "Change", width: 170, sortable: true },
  /* NO VALUE COLUMN (Yash, 2026-11-19) — Change says what the rule does. */
  { key: "scope", label: "Scope", width: 220, sortable: true },
  { key: "lastRun", label: "Last run", width: 190, sortable: true },
  { key: "status", label: "Status", width: 130, sortable: true },
  { key: "updated", label: "Records updated", width: 140, sortable: true },
  { key: "runs", label: "Runs", width: 80, sortable: true },
  { key: "actions", label: "", width: 44 },
];

/* WIDTHS THAT FIT A 1440 SCREEN (Yash, 2026-11-20) — no sideways scroll;
   longer text cuts off with "…", whole on hover. */
const CAP: Partial<Record<RKey, number>> = { rule: 200, change: 160, scope: 200, lastRun: 205, status: 120, updated: 140, runs: 70 };

export function BulkRulesScreen() {
  const bulk = useBulkRules();
  const { setOpen, sheet } = useBulkSheet();
  /* A RERUN FROM THE LIST ASKS FIRST (Yash, 2026-11-18) — it says what the
     run would change, or that nothing would, before it goes. */
  const [rerun, setRerun] = React.useState<Rule | null>(null);
  const lock = runningRule(bulk.rules);
  const next = React.useMemo(
    () => (rerun ? previewRule(rerun, bulk.rows, bulk.entityMap, adjustedBy(rerun)) : null),
    [rerun, bulk.rows, bulk.entityMap]
  );
  const text = (r: Rule, key: RKey): string => {
    const run = lastRun(r);
    switch (key) {
      case "rule":
        return r.name;
      case "change":
        return changesText(r, bulk.entityMap).settings;
      case "amount":
        return changesText(r, bulk.entityMap).values;
      case "scope":
        return scopeText(r);
      case "status":
        return ruleStatus(r);
      case "lastRun":
        return !run ? "—" : run.status === "scheduled" ? `Runs ${fmtWhen(run.at)}` : fmtWhen(run.at);
      case "updated":
        return !run || run.status === "scheduled" ? "—" : run.status === "running" ? `${run.progress} of ${run.total}` : countOf(run, "updated").toLocaleString();
      case "runs":
        return String(r.runs.filter((x) => x.status !== "scheduled").length);
      default:
        return "";
    }
  };
  /* BY THE CLOCK (Yash, 2026-11-20) — the Last run column, latest first;
     a scheduled run, still to come, sits above the ones that ran. */
  /* A DRAFT, NEVER RUN, SITS BY WHEN IT WAS SAVED (Yash, 2026-11-26). */
  const ordered = React.useMemo(() => [...bulk.rules].sort((a, b) => (lastRun(b)?.at ?? b.createdAt) - (lastRun(a)?.at ?? a.createdAt)), [bulk.rules]);
  /* THE SCOPE IN FULL, UP TO 360 — longer cuts off with "…", whole on hover (Yash, 2026-11-19). */
  const columns = React.useMemo(
    () => fitColumns(RULE_COLUMNS, bulk.rules, (r, k) => [text(r, k)], ["status"]).map((c) => (CAP[c.key] ? { ...c, width: Math.min(c.width ?? CAP[c.key]!, CAP[c.key]!) } : c)),
    [bulk.rules] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const facets: ListFacet[] = (["status", "change"] as const).map((key) => ({
    key,
    label: RULE_COLUMNS.find((c) => c.key === key)!.label,
    options: [...new Set(bulk.rules.map((r) => text(r, key)))].sort(),
  }));

  return (
    <>
      <StandardList<Rule, RKey>
        rows={ordered}
        columns={columns}
        rowId={(r) => r.id}
        text={text}
        sortValue={(r, key) => (key === "lastRun" ? lastRun(r)?.at : key === "updated" || key === "runs" ? Number(text(r, key)) || 0 : undefined)}
        renderCell={(r, key) => {
          if (key === "status") return <StatusPill rule={r} />;
          const t = text(r, key);
          if (t === "—") return <span className="text-muted-foreground">—</span>;
          /* EVERY CELL CUTS TO ITS COLUMN, whole on hover — the narrower widths. */
          return (
            <span className="block min-w-0 truncate" title={t}>
              {t}
            </span>
          );
        }}
        rowMenu={(r) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${r.name}`} onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setOpen({ kind: "rule", id: r.id })}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              {lastRun(r) && (
              <DropdownMenuItem
                disabled={lastRun(r)?.status === "running"}
                onSelect={() => (lastRun(r)?.status === "scheduled" ? setRerun(r) : setOpen({ kind: "rule", id: r.id, review: true }))}
              >
                <RotateCw />
                {/* PREVIEW AND RERUN (Yash, 2026-11-26) — opens only the review, over
                    this list, when records failed or need a rerun; else asks "No
                    records need rerunning". A scheduled rule keeps Run now; a
                    draft has neither. */}
                {lastRun(r)?.status === "scheduled" ? "Run now" : "Preview and rerun"}
              </DropdownMenuItem>
              )}
              {/* NO SAVE AS TEMPLATE (Yash, 2026-11-19) — templates are hidden; Duplicate reuses a rule. */}
              <DropdownMenuItem onSelect={() => setOpen({ kind: "rule", id: null, from: { ...defOf(r), name: `${r.name} (copy)` } })}>
                <Copy />
                Duplicate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        facets={facets}
        facetValues={(r, f) => [text(r, f as RKey)]}
        storageKey="pricing-bulk-rules-v2"
        noun="bulk rules"
        nounOne="bulk rule"
        searchPlaceholder="Search bulk rules…"
        ctaLabel="Create bulk rule"
        onCreate={() => setOpen({ kind: "rule", id: null })}
        onOpen={(r) => setOpen({ kind: "rule", id: r.id })}
        openLabel={(r) => `Open ${r.name}`}
        emptyIcon={<Workflow />}
      />
      {sheet}
      <AlertDialog open={!!rerun} onOpenChange={(o) => !o && setRerun(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {/* SAME WORDS AS THE SHEET FOOTER (Yash, 2026-11-20): Run again when nothing needs it, Rerun X records when some do. */}
              {next && next.updated.length === 0 ? "No records need rerunning" : `${rerun && lastRun(rerun)?.status === "scheduled" ? "Run" : "Rerun"} ${rerun?.name ?? ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {next && next.updated.length === 0
                ? "All records are up to date. You can still run this rule again if needed."
                : next
                  ? `${next.updated.length.toLocaleString()} of ${plural(next.matched, "record")} ${next.updated.length === 1 ? "needs" : "need"} attention.`
                  : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* ONE RUN AT A TIME (Yash, 2026-11-26). */}
            {lock && lock.id !== rerun?.id ? (
              <LockedButton label={next && next.updated.length === 0 ? "Run again" : `Rerun ${plural(next?.updated.length ?? 0, "record")}`} name={lock.name} />
            ) : (
            <AlertDialogAction
              onClick={() => {
                if (!rerun) return;
                runAgain(rerun.id, bulk.rows, bulk.entityMap);
                toast.success(`${rerun.name} running`);
              }}
            >
              {next && next.updated.length === 0 ? "Run again" : `Rerun ${plural(next?.updated.length ?? 0, "record")}`}
            </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// -------------------------------------------------------------- templates --

type TKey = "template" | "change" | "amount" | "scope" | "edited" | "actions";
const TEMPLATE_COLUMNS: ListColumn<TKey>[] = [
  { key: "template", label: "Template", width: 240, sortable: true },
  { key: "change", label: "Change", width: 200, sortable: true },
  { key: "amount", label: "Value", width: 180, sortable: true },
  { key: "scope", label: "Scope", width: 220, sortable: true },
  { key: "edited", label: "Last edited", width: 220, sortable: true },
  { key: "actions", label: "", width: 44 },
];

export function BulkTemplatesScreen() {
  const bulk = useBulkRules();
  const { setOpen, sheet } = useBulkSheet();
  const text = (t: Template, key: TKey): string => {
    switch (key) {
      case "template":
        return t.name;
      case "change":
        return changesText(t, bulk.entityMap).settings;
      case "amount":
        return changesText(t, bulk.entityMap).values;
      case "scope":
        return scopeText(t);
      case "edited":
        return `${fmtWhen(t.editedAt)} · ${t.editedBy}`;
      default:
        return "";
    }
  };
  const columns = React.useMemo(() => fitColumns(TEMPLATE_COLUMNS, bulk.templates, (t, k) => [text(t, k)], []), [bulk.templates]); // eslint-disable-line react-hooks/exhaustive-deps
  const facets: ListFacet[] = [{ key: "change", label: "Change", options: [...new Set(bulk.templates.map((t) => text(t, "change")))].sort() }];

  return (
    <>
      <StandardList<Template, TKey>
        rows={bulk.templates}
        columns={columns}
        rowId={(t) => t.id}
        text={text}
        sortValue={(t, key) => (key === "edited" ? t.editedAt : undefined)}
        renderCell={(t, key) => {
          const v = text(t, key);
          return v === "—" ? <span className="text-muted-foreground">—</span> : v;
        }}
        rowMenu={(t) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${t.name}`} onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => setOpen({ kind: "template", id: t.id })}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setOpen({ kind: "rule", id: null, from: { ...defOf(t), name: "" } })}>
                <Workflow />
                Create rule from template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        facets={facets}
        facetValues={(t, f) => [text(t, f as TKey)]}
        storageKey="pricing-bulk-templates"
        noun="bulk templates"
        nounOne="bulk template"
        searchPlaceholder="Search bulk templates…"
        ctaLabel="Create template"
        onCreate={() => setOpen({ kind: "template", id: null })}
        onOpen={(t) => setOpen({ kind: "template", id: t.id })}
        openLabel={(t) => `Open ${t.name}`}
        emptyIcon={<LayoutTemplate />}
      />
      {sheet}
    </>
  );
}
