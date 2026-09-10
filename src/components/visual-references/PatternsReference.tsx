import { ArrowRight } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { useAppNav } from "./app-nav";

/*
  Visual Reference — Patterns. The DS's signature interaction patterns, each
  documented as a spec (sizes + class strings + measurements) with a link to the
  live demo where it already runs. It does NOT re-implement them — the working
  versions live on Board / Tables / Form Layout, so there's one source of truth.
*/

function Spec({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function OpenLink({ label, main, sub }: { label: string; main: string; sub?: string }) {
  const goTo = useAppNav();
  return (
    <Button variant="outline" size="sm" className="self-start" onClick={() => goTo(main, sub)}>
      {label}
      <ArrowRight />
    </Button>
  );
}

function Pattern({
  title,
  spec,
  link,
  children,
}: {
  title: string;
  spec: React.ReactNode[];
  link?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-fp-outline-1 bg-card p-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="mt-3 flex flex-col gap-3">
        {children}
        <Spec items={spec} />
        {link}
      </div>
    </div>
  );
}

/** Small annotated mock of the app shell with the measurements called out. */
function ShellDiagram() {
  return (
    <div className="rounded-md bg-background p-2">
      <div className="mb-1 text-[11px] text-muted-foreground">
        <code>p-2</code> = 8px outer margin · <code>gap-2</code> = 8px between panels
      </div>
      <div className="flex gap-2">
        <div className="flex w-13 shrink-0 flex-col items-center justify-center rounded-md bg-rail py-4 text-center text-[10px] text-muted-foreground">
          rail<br />52px
        </div>
        <div className="flex w-40 shrink-0 flex-col justify-center rounded-lg bg-sidebar p-3 text-[10px] text-muted-foreground">
          drawer · 256px
          <br />+ shadow
        </div>
        <div className="flex min-w-0 flex-1 flex-col rounded-md bg-fp-surface-1b p-4">
          <span className="text-[11px] text-muted-foreground">content layer · 16px inset (p-4) · no border</span>
          <div className="mt-2 h-10 rounded-md border border-fp-outline-1 bg-card" />
        </div>
      </div>
    </div>
  );
}

export function PatternsReference() {
  return (
    <Stack space="section" className="max-w-3xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        The DS's signature interaction patterns — each with its spec and a link
        to the <strong>live demo</strong> where it runs. Reuse these; don't
        rebuild them.
      </p>

      {/* Layout Shell */}
      <Stack space="title">
        <SectionHeading as="h3" title="Layout shell" />
        <Pattern
          title="Rail → drawer → content"
          spec={[
            <>Tier-1 <strong>rail</strong>: 52px icon strip (<code>bg-rail</code>), hover-expands to a 256px overlay (<code>bg-sidebar</code>). Flush with the background, no shadow.</>,
            <>Tier-2 <strong>drawer</strong>: 256px contextual sub-nav (<code>rounded-lg bg-sidebar</code>). No shadow — it separates from the ground by value.</>,
            <><strong>Content layer</strong>: fills the rest — <code>rounded-md bg-fp-surface-1b</code>, <strong>no outer border and no shadow</strong>.</>,
            <>Spacing laws: <code>8px</code> gaps + <code>8px</code> outer margin (<code>p-2 gap-2</code>); <code>16px</code> inset in the content body.</>,
            <>Body stacking order: action bar → tabs → accordions → content.</>,
          ]}
        >
          <ShellDiagram />
        </Pattern>
      </Stack>

      {/* Kanban */}
      <Stack space="title">
        <SectionHeading as="h3" title="Kanban board" />
        <Pattern
          title="Lanes + cards"
          spec={[
            <><strong>Lane</strong>: <code>w-[340px] bg-fp-card-1 rounded-md</code>, with a 4px colored top strip (<code>bg-fp-lane-*</code>).</>,
            <><strong>Header</strong>: title + a count pill (lane-colored) + a <code>ArrowDownUp</code> sort button.</>,
            <><strong>Card</strong>: <code>rounded-md border border-fp-outline-1 bg-fp-surface-1a</code>; title + key/value rows; optional alert footer (with/without a Button).</>,
            <>Board scrolls horizontally when lanes overflow. Static template (no drag-and-drop).</>,
          ]}
          link={<OpenLink label="Open Board" main="board" />}
        />
      </Stack>

      {/* Bulk action bar */}
      <Stack space="title">
        <SectionHeading as="h3" title="Bulk action bar" />
        <Pattern
          title="Selection → docked action bar"
          spec={[
            <>Appears when table rows are selected; docks centered ~20px above the pagination.</>,
            <>Entrance: the <code>bulk-bar-in</code> animation — <code>translateY(1rem)</code> → 0 + opacity, 200ms (defined in <code>index.css</code>).</>,
            <>Holds the selection count + bulk actions + a More menu with a delete confirm.</>,
          ]}
          link={<OpenLink label="Open Tables — select rows" main="tables" />}
        />
      </Stack>

      {/* Editable table cell */}
      <Stack space="title">
        <SectionHeading as="h3" title="Editable table cell" />
        <Pattern
          title="Full-cell dropdown / input + delete confirm"
          spec={[
            <>The trigger <strong>fills the whole cell</strong>: the <code>td</code> gets <code>p-0</code>, the control <code>h-full w-full</code>.</>,
            <>Hover / open paint <code>bg-accent</code> across the <strong>entire cell</strong> — no inset outline. Two-line cell = title (<code>text-foreground</code>) over description (<code>text-muted-foreground</code>).</>,
            <>Delete confirm: a stacked <strong>52×52</strong> control — ✕ cancel (<code>bg-fp-card-1</code>) over ✓ confirm (<code>bg-destructive</code>), clipped <code>rounded-md</code>.</>,
          ]}
          link={<OpenLink label="Open Form Layout" main="form-layout" />}
        />
      </Stack>
    </Stack>
  );
}
