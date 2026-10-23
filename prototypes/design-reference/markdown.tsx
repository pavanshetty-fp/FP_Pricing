import * as React from "react";
import { cn } from "@/lib/utils";

/*
  A SMALL MARKDOWN RENDERER for the FPDS docs — headings, paragraphs, lists,
  tables, fenced code, quotes, rules, and inline code / bold / italic / links.
  Enough for the spec cards; nothing the cards don't use.
*/

function inline(text: string, key = 0): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${i++}`;
    if (t.startsWith("`")) out.push(<code key={k} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">{t.slice(1, -1)}</code>);
    else if (t.startsWith("**")) out.push(<strong key={k} className="font-semibold text-foreground">{inline(t.slice(2, -2), i)}</strong>);
    else if (t.startsWith("[")) {
      const mm = t.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      out.push(<a key={k} href={mm[2]} className="text-foreground underline underline-offset-4">{mm[1]}</a>);
    } else out.push(<em key={k}>{inline(t.slice(1, -1), i)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());

export function Markdown({ source, className }: { source: string; className?: string }) {
  const lines = source.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let n = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = n++;
    if (/^```/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      blocks.push(<pre key={key} className="overflow-x-auto rounded-md border border-border bg-fp-table-header p-3 text-xs leading-relaxed"><code>{body.join("\n")}</code></pre>);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      const lvl = h[1].length;
      const cls = ["text-2xl font-semibold", "mt-6 text-xl font-semibold", "mt-5 text-base font-semibold", "mt-4 text-sm font-semibold"][lvl - 1];
      const Tag = (`h${lvl + 1}` as "h2");
      blocks.push(<Tag key={key} className={cn(cls, "text-foreground")}>{inline(h[2])}</Tag>);
      i++;
      continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      blocks.push(
        <div key={key} className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-fp-table-header">
                {head.map((c, j) => (
                  <th key={j} className="border-b border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground">{inline(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-border last:border-b-0 align-top">
                  {r.map((c, j) => (
                    <td key={j} className="px-3 py-2 text-foreground">{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "");
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) item += " " + lines[i++].trim();
        items.push(item);
      }
      const L = ordered ? "ol" : "ul";
      blocks.push(
        <L key={key} className={cn("flex flex-col gap-1 pl-5 text-sm text-foreground", ordered ? "list-decimal" : "list-disc")}>
          {items.map((it, j) => (
            <li key={j}>{inline(it)}</li>
          ))}
        </L>
      );
      continue;
    }
    if (/^>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(<blockquote key={key} className="rounded-md border-l-4 border-selected-border bg-selected px-4 py-3 text-sm text-foreground">{inline(body.join(" "))}</blockquote>);
      continue;
    }
    if (/^---+\s*$/.test(line)) {
      blocks.push(<hr key={key} className="my-2 border-border" />);
      i++;
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*\||\s*([-*]|\d+\.)\s|>|---)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={key} className="text-sm leading-relaxed text-foreground">{inline(para.join(" "))}</p>);
  }
  return <div className={cn("flex flex-col gap-3", className)}>{blocks}</div>;
}
