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
import { BulkRuleSheet, StatusPill, type BulkSheetTarget } from "./BulkRuleSheet";
import {
  changesText,
  countOf,
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
  { key: "rule", label: "Rule", width: 240, sortable: true },
  { key: "change", label: "Change", width: 200, sortable: true },
  { key: "amount", label: "Value", width: 180, sortable: true },
  { key: "scope", label: "Scope", width: 220, sortable: true },
  { key: "status", label: "Status", width: 140, sortable: true },
  { key: "lastRun", label: "Last run", width: 200, sortable: true },
  { key: "updated", label: "Prices updated", width: 150, sortable: true },
  { key: "runs", label: "Runs", width: 90, sortable: true },
  { key: "actions", label: "", width: 44 },
];

export function BulkRulesScreen() {
  const bulk = useBulkRules();
  const { setOpen, sheet } = useBulkSheet();
  /* A RERUN FROM THE LIST ASKS FIRST (Yash, 2026-11-18) — it says what the
     run would change, or that nothing would, before it goes. */
  const [rerun, setRerun] = React.useState<Rule | null>(null);
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
  /* WHAT RAN WELL FIRST (Yash, 2026-11-18): running now, then done, then
     partly failed — latest run on top — then scheduled, soonest first. */
  const ordered = React.useMemo(() => {
    const rank = { Running: 0, Done: 1, "Partly failed": 2, Scheduled: 3 } as const;
    return [...bulk.rules].sort((a, b) => {
      const d = rank[ruleStatus(a)] - rank[ruleStatus(b)];
      if (d) return d;
      const ta = lastRun(a)?.at ?? 0;
      const tb = lastRun(b)?.at ?? 0;
      return ruleStatus(a) === "Scheduled" ? ta - tb : tb - ta;
    });
  }, [bulk.rules]);
  const columns = React.useMemo(() => fitColumns(RULE_COLUMNS, bulk.rules, (r, k) => [text(r, k)], ["status"]), [bulk.rules]); // eslint-disable-line react-hooks/exhaustive-deps
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
          return t === "—" ? <span className="text-muted-foreground">—</span> : t;
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
              <DropdownMenuItem
                disabled={lastRun(r)?.status === "running"}
                onSelect={() => setRerun(r)}
              >
                <RotateCw />
                {lastRun(r)?.status === "scheduled" ? "Run now" : "Run again"}
              </DropdownMenuItem>
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
        storageKey="pricing-bulk-rules"
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
              {next && next.updated.length === 0 ? "Nothing would change" : `${rerun && lastRun(rerun)?.status === "scheduled" ? "Run" : "Rerun"} ${rerun?.name ?? ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {next && next.updated.length === 0
                ? `All ${plural(next.matched, "price")} this rule reaches are already up to date.`
                : next
                  ? `${next.updated.length.toLocaleString()} of ${plural(next.matched, "price")} will change at ${plural(next.shiptos.length, "ship-to")} for ${plural(next.customers.length, "customer")}.`
                  : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!rerun) return;
                runAgain(rerun.id, bulk.rows, bulk.entityMap);
                toast.success(`${rerun.name} running`);
              }}
            >
              {next && next.updated.length === 0 ? "Run anyway" : `Run on ${plural(next?.updated.length ?? 0, "price")}`}
            </AlertDialogAction>
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
