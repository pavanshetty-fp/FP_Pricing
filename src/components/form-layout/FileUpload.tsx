import * as React from "react";
import { FileText, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  "Upload documents" (Figma 27593:15012). Three states from the design: an empty
  dropzone, an in-progress upload (circular progress + "Uploading N of M"), and
  uploaded file chips (type icon + name + size + preview/delete). Seeded to match
  the frame; the dropzone accepts new files and removal is live.
*/

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  kind: "PDF" | "DOC" | "PNG";
}

/* File-kind chips are categorical, not semantic — the hues come from the DS
   status/verified tokens so both themes track the token layer (never Tailwind's
   stock palette, whose -400 steps are tuned for dark grounds only). */
const KIND_STYLE: Record<UploadedFile["kind"], string> = {
  PDF: "bg-status-failed/15 text-status-failed",
  DOC: "bg-verified/15 text-verified",
  PNG: "bg-status-processing/15 text-status-processing",
};

const INITIAL_FILES: UploadedFile[] = [
  { id: "f1", name: "Signature format.pdf", size: "2.4mb", kind: "PDF" },
  { id: "f2", name: "Fees.doc", size: "2.4mb", kind: "DOC" },
  { id: "f3", name: "Conditions.png", size: "2.4mb", kind: "PNG" },
];

const NOTE =
  "Note: Upload files in .JPG, .PNG, .PDF, or .DOC format. Files must be under 5 MB in total.";

/** Determinate circular progress ring. */
function CircularProgress({ value }: { value: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex size-11 items-center justify-center">
      <svg className="size-11 -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="3"
          className="stroke-muted"
        />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <span className="absolute text-[11px] font-medium tabular-nums">
        {value}%
      </span>
    </span>
  );
}

export interface FileUploadProps {
  /**
   * `showcase` renders all three states at once — empty dropzone, an
   * in-progress example, and seeded chips — which is what the gallery needs and
   * what every existing caller gets by default.
   *
   * `field` renders the control a real form needs: dropzone, note, and only the
   * files actually added. No seeded files, no fake progress.
   */
  variant?: "showcase" | "field";
  /** Dropzone label. */
  label?: string;
  /** The format/size note under the dropzone. */
  note?: string;
}

export function FileUpload({
  variant = "showcase",
  label = "Upload Documents",
  note = NOTE,
}: FileUploadProps = {}) {
  const showcase = variant === "showcase";
  const [files, setFiles] = React.useState<UploadedFile[]>(
    showcase ? INITIAL_FILES : [],
  );
  const idRef = React.useRef(INITIAL_FILES.length);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const inferKind = (name: string): UploadedFile["kind"] => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "doc" || ext === "docx") return "DOC";
    if (ext === "png" || ext === "jpg" || ext === "jpeg") return "PNG";
    return "PDF";
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).map((f) => ({
      id: `f${++idRef.current}`,
      name: f.name,
      size: `${(f.size / 1_000_000).toFixed(1)}mb`,
      kind: inferKind(f.name),
    }));
    setFiles((prev) => [...prev, ...next]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Dropzone + its note are ONE unit, 4px apart — the note describes the
          control above it, not the list below. */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            /* TRANSPARENT AT REST — an empty dropzone is a 96px hole in the
               form, and a filled one made it the largest painted shape on the
               page for the field least often used. The dashed rim is the whole
               affordance; the fill was only saying "something goes here" a
               second time, louder. Transparent also means the zone inherits
               whatever it is dropped into — the white content layer, a card, a
               tinted panel — instead of pinning one surface value that is
               right in exactly one of those places.

               A FILL ON DRAG, though: while a file is over it the zone has to
               say it will catch it, and that is the one moment the extra
               weight is information rather than decoration. */
            "flex h-24 w-full items-center justify-center gap-2 rounded-md border bg-transparent text-sm outline-none transition-colors",
            dragOver
              ? "border-ring bg-accent"
              : "border-border hover:border-fp-outline-2",
            "focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <UploadCloud className="size-5 text-muted-foreground" />
          <span className="font-medium">{label}</span>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </button>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>

      {/* The in-progress state is a STATE, not a permanent block — it belongs in
          the showcase, never on a form where nothing is uploading. */}
      {showcase && (
        <div className="flex flex-col gap-1">
          <div className="flex h-24 w-full items-center justify-center gap-3 rounded-md border border-border bg-fp-surface-1a">
            <CircularProgress value={75} />
            <span className="text-sm">Uploading 2 of 3</span>
          </div>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
      )}

      {/* Uploaded chips. A CHIP IS SIZED BY ITS CONTENT, not by the container:
          a filename and a file size need about 240px, and a three-column grid
          across a wide sheet stretched each one to twice that for no reader's
          benefit. They wrap, so more files fill the row rather than the row
          growing to fit. */}
      <div className="flex flex-wrap gap-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex w-60 items-center gap-3 rounded-md border border-border bg-fp-surface-1a px-3 py-2.5"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold",
                KIND_STYLE[file.kind],
              )}
            >
              <FileText className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">{file.size}</span>
            </span>
            <button
              type="button"
              aria-label={`Delete ${file.name}`}
              onClick={() =>
                setFiles((prev) => prev.filter((f) => f.id !== file.id))
              }
              className="flex size-7 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
