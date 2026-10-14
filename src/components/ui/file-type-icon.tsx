import { cn } from "@/lib/utils";

/*
  FILE TYPE ICON (Pavan, 2026-10-14) — a document outline with its format on
  a tag, beside every uploaded file's name: PDF, PNG, SVG, JPG, DOC, XLS, CSV…
  After his reference (a file with a "PDF" tag on its left edge).

  THE TAG'S COLOUR SAYS THE FAMILY, so a list can be scanned by kind: PDF red
  · images violet · documents blue · spreadsheets green · archives orange ·
  anything else ink. The text on the tag carries the format, so colour is
  never the only cue. Lane tokens — the same in both themes.
*/

const FAMILY: Record<string, string> = {
  pdf: "bg-fp-lane-red",
  png: "bg-fp-lane-violet",
  jpg: "bg-fp-lane-violet",
  jpeg: "bg-fp-lane-violet",
  gif: "bg-fp-lane-violet",
  svg: "bg-fp-lane-violet",
  webp: "bg-fp-lane-violet",
  heic: "bg-fp-lane-violet",
  doc: "bg-fp-lane-blue",
  docx: "bg-fp-lane-blue",
  txt: "bg-fp-lane-blue",
  rtf: "bg-fp-lane-blue",
  xls: "bg-fp-lane-green",
  xlsx: "bg-fp-lane-green",
  csv: "bg-fp-lane-green",
  zip: "bg-fp-lane-orange",
};

/** The file's extension, from its name — "" when it has none. */
export const extensionOf = (name: string) => {
  const m = /\.([a-z0-9]{1,5})$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
};

export function FileTypeIcon({ name, className }: { name: string; className?: string }) {
  const ext = extensionOf(name);
  const label = (ext === "jpeg" ? "jpg" : ext || "file").slice(0, 4).toUpperCase();
  return (
    <span aria-hidden data-slot="file-type-icon" className={cn("relative inline-flex h-7 w-6 shrink-0", className)}>
      {/* THE SHEET — an outline with a folded corner. */}
      <svg viewBox="0 0 24 28" className="size-full text-foreground/70" fill="none">
        <path
          d="M5 1.5h9.5L21.5 8.5V24.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-21a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M14.5 1.5v5a2 2 0 0 0 2 2h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 19.5h9M8 22.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {/* THE FORMAT — on a tag over the sheet's left edge. */}
      <span
        className={cn(
          "absolute top-[9px] -left-1 rounded-[3px] px-[3px] py-px text-[7px] leading-none font-bold tracking-wide",
          FAMILY[ext] ? `${FAMILY[ext]} text-white` : "bg-foreground text-background"
        )}
      >
        {label}
      </span>
    </span>
  );
}
