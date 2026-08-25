import * as React from "react";

import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelectList } from "@/components/ui/multi-select-list";
import {
  BulkEditDialog,
  BeforeAfterTable,
  StandingItems,
  type RecordRef,
} from "@/components/bulk-edit";

const HEADERS = ["Record No", "Type", "Location"];

const SELECTED: RecordRef[] = [
  { id: "2026894", cells: ["Type A", "Location 1"] },
  { id: "2026888", cells: ["Type B", "Location 2"] },
  { id: "2026852", cells: ["Type A", "Location 2"] },
];

const STANDING: RecordRef[] = [
  { id: "2026101", cells: ["Type A", "Location 3"] },
  { id: "2026102", cells: ["Type C", "Location 1"] },
];

const OPTIONS = ["Value A", "Value B", "Value C", "Value D"];

/** Bulk edit — the two-step dialog, one tier per example. */
export function BulkEditDemo() {
  const [tier1, setTier1] = React.useState(false);
  const [tier2, setTier2] = React.useState(false);
  const [scalar, setScalar] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);

  return (
    <Stack space="section" className="overflow-auto pb-10">
      <p className="max-w-prose text-sm text-muted-foreground">
        Bulk-attribute edits are a two-step dialog, never a popover that commits
        on click. Step 1 leads with <strong>scope + count</strong> and surfaces
        the state that <em>already exists</em> on the target; step 2 shows the
        per-row <strong>before/after</strong> delta with{" "}
        <code className="text-xs">Go back</code> /{" "}
        <code className="text-xs">Confirm</code>. Both steps earn their keep —
        collapsing to one removes the only chance to notice you are about to
        replace something.
      </p>

      <Stack space="title">
        <SectionHeading
          as="h3"
          title="Tier 1 — scalar"
          description="One value for every row. A single input is the whole picker; the shell is unchanged."
        />
        <div>
          <Button size="sm" onClick={() => setTier1(true)}>
            Set reference
          </Button>
        </div>
        <BulkEditDialog
          open={tier1}
          onOpenChange={setTier1}
          title="Set reference"
          scopeVerb="Set reference on"
          count={SELECTED.length}
          itemNoun="record"
          canProceed={scalar.trim().length > 0}
          summaryDescription="This reference replaces any value already on these records."
          onConfirm={() => setScalar("")}
          summary={
            <BeforeAfterTable
              idHeader="Record No"
              valueHeader="Reference"
              rows={SELECTED.map((r, i) => ({
                id: r.id,
                before: i === 0 ? "REF-001" : "",
                after: scalar,
              }))}
            />
          }
        >
          <div className="flex flex-col gap-3">
            <StandingItems
              label="Target"
              records={STANDING}
              headers={HEADERS}
              itemNoun="record"
            />
            <Input
              value={scalar}
              onChange={(e) => setScalar(e.target.value)}
              placeholder="Reference…"
              aria-label="Reference"
            />
          </div>
        </BulkEditDialog>
      </Stack>

      <Stack space="title">
        <SectionHeading
          as="h3"
          title="Tier 3 — a collection per row, destructive replace"
          description="A multi-select picker, and a replace that discards standing values — so Confirm arms rather than commits on the first press."
        />
        <div>
          <Button size="sm" variant="outline" onClick={() => setTier2(true)}>
            Replace values
          </Button>
        </div>
        <BulkEditDialog
          open={tier2}
          onOpenChange={setTier2}
          title="Replace values"
          scopeVerb="Replace values on"
          count={SELECTED.length}
          itemNoun="record"
          destructive
          canProceed={picked.length > 0}
          summaryDescription="These values replace everything currently on the selected records."
          toastMessage={`Replaced values on ${SELECTED.length} records`}
          onConfirm={() => setPicked([])}
          summary={
            <BeforeAfterTable
              idHeader="Record No"
              valueHeader="Values"
              rows={SELECTED.map((r, i) => ({
                id: r.id,
                before: i === 2 ? "" : "Value A, Value B",
                after: picked.join(", "),
              }))}
            />
          }
        >
          <div className="flex flex-col gap-3">
            <StandingItems
              label="Target"
              records={STANDING}
              headers={HEADERS}
              itemNoun="record"
            />
            <MultiSelectList
              options={OPTIONS}
              value={picked}
              onChange={setPicked}
              placeholder="Search values…"
            />
          </div>
        </BulkEditDialog>
      </Stack>
    </Stack>
  );
}
