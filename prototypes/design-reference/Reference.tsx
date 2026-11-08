import * as React from "react";
import { Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme";
import { Markdown } from "./markdown";
import { liveFor } from "./samples";
import register from "../../docs/fpds/register.json";

/*
  THE FPDS DESIGN REFERENCE — the design system as one page: every layer, every
  spec card, the rules, the checks, and the real code running where there is a
  live example. Built from the same files the tools install (docs/fpds), so the
  page and the docs can never say different things.
*/

const DOCS = import.meta.glob("../../docs/fpds/**/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
/* THE ARCHIVE (Pavan, 2026-11-03 — "whatever was archived … I hope all of
   that is in the design reference"): every retired design's write-up, a page
   each, under Archive. */
const ARCHIVE = import.meta.glob(["../../docs/archive/*.md", "../../docs/ds/ui/archive/*.md"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const archiveTitle = (src: string, path: string) => {
  const t = src.match(/^#\s+(.+)$/m)?.[1].replace(/^Archived — /, "") ?? path.split("/").pop()!.replace(/\.md$/, "");
  return t[0].toUpperCase() + t.slice(1);
};
const doc = (path: string) => DOCS[`../../${path}`] ?? "";
/* THE VERSION IS THE CHANGELOG'S NEWEST HEADING (2026-11-08) — one place to
   bump, and the badge can never disagree with the history under it. */
const VERSION = doc("docs/fpds/CHANGELOG.md").match(/^##\s+(v[\d.]+)/m)?.[1];

type Entry = (typeof register.entries)[number];

/** A card's own text: from its heading to the next heading at its level. */
function cardText(e: Entry) {
  const [file, at] = e.doc.split(":");
  const lines = doc(file).split("\n");
  let start = Number(at) - 1;
  while (start > 0 && !/^#{1,3}\s/.test(lines[start])) start--;
  const level = lines[start].match(/^(#+)/)?.[1].length ?? 1;
  let end = start + 1;
  while (end < lines.length && !new RegExp(`^#{1,${level}}\\s`).test(lines[end])) end++;
  /* Re-level so every card renders with the same heading sizes. */
  return lines
    .slice(start, end)
    .map((l) => l.replace(/^(#+)/, (h) => "#".repeat(Math.max(1, h.length - level + 1))))
    .join("\n");
}

type Page = { key: string; label: string; group: string; body: () => React.ReactNode };

/* [group, label, file, link token] — the token is the page's #anchor. */
const DOC_PAGES: [string, string, string, string][] = [
  ["Start", "Overview", "docs/fpds/README.md", "overview"],
  ["Start", "How to build (protocol)", "docs/fpds/00-protocol.md", "protocol"],
  ["Start", "Checks", "docs/fpds/evals/README.md", "checks"],
  ["Start", "Changelog", "docs/fpds/CHANGELOG.md", "changelog"],
  ["Start", "Not designed yet", "docs/fpds/09-later.md", "not-designed-yet"],
  ["Foundations", "Foundations", "docs/fpds/01-foundations.md", "foundations"],
  ["Rules", "UX rules", "docs/fpds/07-ux-rules.md", "ux-rules"],
  ["Rules", "Interaction rules", "docs/fpds/08-interaction-rules.md", "interaction-rules"],
  ["Reference pages", "Reference pages", "docs/fpds/06-pages.md", "reference-pages"],
  ["Archive", "Archive — index", "docs/fpds/10-archive.md", "archive"],
];

const LAYER_GROUP: Record<string, string> = { atom: "Atoms", molecule: "Molecules", unit: "Units", template: "Templates" };

function Live({ id }: { id: string }) {
  const Comp = liveFor(id);
  if (!Comp) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Live — the real FPDS code</h3>
      <div className="rounded-lg border border-border bg-fp-surface-1b p-4">
        <Boundary>
          <Comp />
        </Boundary>
      </div>
    </section>
  );
}

class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p className="text-sm text-muted-foreground">This example needs its screen's data — see Reference.</p> : this.props.children;
  }
}

function CardPage({ e }: { e: Entry }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-chip px-2 py-0.5 font-medium text-foreground">{e.layer}</span>
        <code>{e.id}</code>
        <span>·</span>
        <span>{e.doc}</span>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-fp-table-header px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-xs text-foreground">{e.install}</code>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Copy install command"
          onClick={() => {
            void navigator.clipboard?.writeText(e.install);
            toast.success("Install command copied");
          }}
        >
          <Copy />
        </Button>
      </div>
      <Live id={e.id} />
      <Markdown source={cardText(e)} />
    </div>
  );
}

function RegisterPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold text-foreground">Register</h2>
      <p className="text-sm text-muted-foreground">
        Every atom, molecule, unit and template — generated from the cards ({register.generated}). Gap message:{" "}
        <em>{register.gapMessage}</em>
      </p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-fp-table-header">
              {["Name", "Layer", "id", "Use when", "Code"].map((h) => (
                <th key={h} className="border-b border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {register.entries.map((e) => (
              <tr key={e.id} className="border-b border-border align-top last:border-b-0">
                <td className="px-3 py-2 font-medium text-foreground">{e.title}</td>
                <td className="px-3 py-2">{e.layer}</td>
                <td className="px-3 py-2 text-xs">{e.id}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.useWhen.slice(0, 2).join(" ")}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{e.code.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PAGES: Page[] = [
  ...DOC_PAGES.map(([group, label, path, token]) => ({ key: token, label, group, body: () => <Markdown source={doc(path)} /> })),
  ...(["atom", "molecule", "unit", "template"] as const).flatMap((layer) =>
    register.entries
      .filter((e) => e.layer === layer)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((e) => ({ key: e.id, label: e.title, group: LAYER_GROUP[layer], body: () => <CardPage e={e} /> }))
  ),
  { key: "fpds-register", label: "Register", group: "Start", body: () => <RegisterPage /> },
  ...Object.entries(ARCHIVE)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, src]) => ({
      key: `archive-${path.split("/").pop()!.replace(/\.md$/, "")}`,
      label: archiveTitle(src, path),
      group: "Archive",
      body: () => <Markdown source={src} />,
    })),
];
const GROUPS = ["Start", "Foundations", "Atoms", "Molecules", "Units", "Templates", "Reference pages", "Rules", "Archive"];

export function Reference() {
  const [current, setCurrent] = React.useState(() => {
    const h = decodeURIComponent(location.hash.slice(1));
    return PAGES.some((p) => p.key === h) ? h : PAGES[0].key;
  });
  const [q, setQ] = React.useState("");
  React.useEffect(() => {
    history.replaceState(null, "", `#${current}`);
    document.querySelector("main")?.scrollTo(0, 0);
  }, [current]);
  const page = PAGES.find((p) => p.key === current)!;
  const shown = PAGES.filter((p) => !q || `${p.label} ${p.key}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex h-screen flex-col bg-fp-surface-1b text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <span className="text-base font-semibold">FPDS</span>
        {VERSION && (
          <button
            type="button"
            onClick={() => setCurrent("changelog")}
            className="rounded-full bg-fp-surface-1a px-2 py-0.5 text-xs text-muted-foreground tabular-nums outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {VERSION}
          </button>
        )}
        <span className="hidden truncate text-sm text-muted-foreground sm:inline">FleetPanda Design System — design reference</span>
        <span className="ml-auto hidden text-xs text-muted-foreground md:inline">Owner: {register.owner}</span>
        <ThemeToggle />
      </header>
      {/* PHONE WIDTH: the menu stacks above the page, a third of the height. */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav className="flex max-h-[35vh] w-full shrink-0 flex-col gap-4 overflow-y-auto border-b border-border p-3 md:max-h-none md:w-72 md:border-r md:border-b-0">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the design system…" className="h-8 pl-8" />
          </div>
          {GROUPS.map((g) => {
            const items = shown.filter((p) => p.group === g);
            if (items.length === 0) return null;
            return (
              <div key={g} className="flex flex-col gap-0.5">
                <p className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {g} <span className="tabular-nums">· {items.length}</span>
                </p>
                {items.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setCurrent(p.key)}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-fp-row-hover focus-visible:ring-2 focus-visible:ring-ring/50",
                      current === p.key ? "bg-selected font-medium text-selected-foreground" : "text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">{page.body()}</div>
        </main>
      </div>
    </div>
  );
}
