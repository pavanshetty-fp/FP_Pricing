import {
  PanelRight,
  SquareStack,
  Bell,
  Megaphone,
  Info,
  CreditCard,
  Layers,
  ChevronsUpDown,
  ListFilter,
  LayoutTemplate,
  PanelTop,
  SlidersHorizontal,
  Rows3,
  LayoutList,
  AppWindow,
  PanelLeft,
} from "lucide-react";
import { Stack, SectionHeading, Eyebrow } from "@/components/typography";

/*
  Visual Reference — Decision Rules (the "Do's"). Two groups: the structural
  LAWS every screen follows (page layout + molecule hierarchy — the rules that
  keep prompt-built screens composed the same way), then the "when to use X vs
  Y" component CHOICES that otherwise diverge between prompters.
*/

/* ---- Structural laws (prescriptive) ---- */

interface Law {
  id: string;
  icon: React.ReactNode;
  name: string;
  rule: string;
}

function LawCard({ law }: { law: Law }) {
  return (
    <div className="flex gap-3 rounded-lg border border-fp-outline-1 bg-card p-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-fp-card-1 text-muted-foreground [&_svg]:size-4">
        {law.icon}
      </span>
      <div className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {law.name}
          <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {law.id}
          </span>
        </span>
        <p className="mt-1 text-xs text-muted-foreground">{law.rule}</p>
      </div>
    </div>
  );
}

const LAWS: Law[] = [
  {
    id: "L1",
    icon: <LayoutTemplate />,
    name: "Everything lives in the AppShell",
    rule: "Every screen is the icon rail + contextual drawer + one rounded content layer. No full-bleed pages and no page-owned top chrome — the shell is the frame, always.",
  },
  {
    id: "L2",
    icon: <PanelTop />,
    name: "One header stack, fixed order",
    rule: "The 48px header carries title → breadcrumb; a tab row and the search / filter / action toolbar sit directly beneath. Collapse multiple source top-bars into this single stack.",
  },
  {
    id: "L3",
    icon: <SlidersHorizontal />,
    name: "Toolbar: filters left, actions right",
    rule: "Filters are a left-aligned group of identically-styled controls; view switches and the one primary action are right-aligned. A toolbar carries a single primary action.",
  },
  {
    id: "L4",
    icon: <Rows3 />,
    name: "Content zones stack in order",
    rule: "Inside the content layer: header → toolbar → summary / insight band → data region. Always that order, with a consistent gap between zones and a tighter inset within each.",
  },
  {
    id: "L5",
    icon: <LayoutList />,
    name: "Header units: include by relevance",
    rule: "The header stack has three optional units, each answering a distinct question. Include one only when that question is real: breadcrumb (where am I?) when nested ≥2 levels · tabs (which slice?) when ≥2 real facets exist · toolbar (act on this?) when the dataset needs search / filter / action. The title is always present; dropped units keep the fixed order. Never ship a placeholder unit — a one-level breadcrumb, a lone tab, a dead-control toolbar.",
  },
  {
    id: "H1",
    icon: <Layers />,
    name: "Five hierarchy levels, one job each",
    rule: "Page · Region · Group · Compound-row · Atom. A component declares its level, and that fixes its surface token, radius, and padding. Nothing floats between levels.",
  },
];

/* ---- Component choices (X vs Y) ---- */

interface Choice {
  icon: React.ReactNode;
  name: string;
  when: string;
}

function Rule({ a, b }: { a: Choice; b: Choice }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[a, b].map((c) => (
        <div key={c.name} className="rounded-lg border border-fp-outline-1 bg-card p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground">
            {c.icon}
            {c.name}
          </span>
          <p className="mt-2 text-xs text-muted-foreground">{c.when}</p>
        </div>
      ))}
    </div>
  );
}

const RULES: { title: string; a: Choice; b: Choice }[] = [
  {
    title: "Sheet vs Dialog",
    a: { icon: <PanelRight />, name: "Sheet", when: "Edge-anchored panel for a focused sub-task or record detail that keeps page context — forms, detail views, asset pickers. Can be wide." },
    b: { icon: <SquareStack />, name: "Dialog", when: "Centered modal for a short, self-contained decision or message — confirm, quick create, alert. Blocks until resolved." },
  },
  {
    title: "Toast (Sonner) vs Banner",
    a: { icon: <Bell />, name: "Toast", when: "Transient, dismissible feedback about an action just taken (saved, deleted, error). Auto-dismisses; not tied to a region." },
    b: { icon: <Megaphone />, name: "Banner", when: "Persistent, section-level message about state (a filter is active, a warning applies to this table). Stays until resolved/dismissed." },
  },
  {
    title: "Banner: Callout vs Inline alert",
    a: { icon: <Megaphone />, name: "Callout (Type 1)", when: "Prominent full-width solid-fill bar with an optional CTA or dismiss. For attention-grabbing, actionable messages." },
    b: { icon: <Info />, name: "Inline alert (Type 2)", when: "Compact 32px bar on the card surface; status shown by icon+text color. For quieter, informational notes." },
  },
  {
    title: "Card vs inner card",
    a: { icon: <CreditCard />, name: "Card (bg-card)", when: "A panel sitting directly on the content layer. Separates via a border-fp-outline-1 hairline." },
    b: { icon: <Layers />, name: "Inner card (bg-fp-card-1)", when: "A card nested inside another card/lane — steps up one elevation (e.g. a Kanban lane, a card footer chip)." },
  },
  {
    title: "Select vs Dropdown menu",
    a: { icon: <ChevronsUpDown />, name: "Select", when: "Pick one value from a list to set a field. Returns a value; used in forms." },
    b: { icon: <ListFilter />, name: "Dropdown menu", when: "Trigger a set of actions or toggles (row actions, column filters). Items do things; not a form value." },
  },
  {
    title: "Tabs vs Navigation",
    a: { icon: <AppWindow />, name: "Tabs", when: "Mutually-exclusive facets of the SAME dataset (status, type, period). Switching filters the view, not the destination — the table below stays the same object. One facet → drop the tab row." },
    b: { icon: <PanelLeft />, name: "Navigation", when: "Moving to a DIFFERENT page/object. That's the rail/drawer's job — never tabs. If each 'tab' loads an unrelated screen, it belongs in nav." },
  },
];

export function DecisionRulesReference() {
  return (
    <Stack space="section" className="max-w-3xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        The calls that otherwise drift between prompts. First the structural laws
        every screen follows — how a page is laid out and how molecules nest —
        then the "when two components could both work" choices.
      </p>

      {/* Structural laws */}
      <Stack space="body">
        <Eyebrow>Layout &amp; hierarchy laws</Eyebrow>
        <Stack space="body">
          {LAWS.map((l) => (
            <LawCard key={l.id} law={l} />
          ))}
        </Stack>
      </Stack>

      {/* Component choices */}
      <Stack space="body">
        <Eyebrow>Component choices</Eyebrow>
        <Stack space="body">
          {RULES.map((r) => (
            <Stack key={r.title} space="body">
              <SectionHeading as="h3" title={r.title} />
              <Rule a={r.a} b={r.b} />
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
