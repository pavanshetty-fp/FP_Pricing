import { PanelRight, SquareStack, Bell, Megaphone, Info, CreditCard, Layers, ChevronsUpDown, ListFilter } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";

/*
  Visual Reference — Decision Rules. "When to use X vs Y" for the choices that
  otherwise diverge between prompters: Sheet vs Dialog, Toast vs Banner, Callout
  vs Inline alert, Card vs inner card, Select vs Dropdown menu.
*/

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
];

export function DecisionRulesReference() {
  return (
    <Stack space="section" className="max-w-3xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        When two components could both work, use this. One line each — enough to
        keep prompt-built screens consistent about which pattern to reach for.
      </p>
      <Stack space="body">
        {RULES.map((r) => (
          <Stack key={r.title} space="body">
            <SectionHeading as="h3" title={r.title} />
            <Rule a={r.a} b={r.b} />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
