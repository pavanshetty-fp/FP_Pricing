import * as React from "react";
import { FileText, Eye, Trash2, UploadCloud } from "lucide-react";
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
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3" className="stroke-muted" />
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
      <span className="absolute text-[11px] font-medium tabular-nums">{value}%</span>
    </span>
  );
}

export function FileUpload() {
  const [files, setFiles] = React.useState<UploadedFile[]>(INITIAL_FILES);
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
      {/* Dropzone */}
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
          "flex h-24 w-full items-center justify-center gap-2 rounded-md border bg-fp-surface-1a text-sm outline-none transition-colors",
          dragOver
            ? "border-ring bg-fp-surface-1b"
            : "border-border hover:border-fp-outline-2",
          "focus-visible:ring-2 focus-visible:ring-ring/50"
        )}
      >
        <UploadCloud className="size-5 text-muted-foreground" />
        <span className="font-medium">Upload Documents</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </button>
      <p className="text-xs text-muted-foreground">{NOTE}</p>

      {/* In-progress upload */}
      <div className="flex h-24 w-full items-center justify-center gap-3 rounded-md border border-border bg-fp-surface-1a">
        <CircularProgress value={75} />
        <span className="text-sm">Uploading 2 of 3</span>
      </div>
      <p className="text-xs text-muted-foreground">{NOTE}</p>

      {/* Uploaded chips */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3 rounded-md border border-border bg-fp-surface-1a px-3 py-2.5"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold",
                KIND_STYLE[file.kind]
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
              aria-label={`Preview ${file.name}`}
              className="flex size-7 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Eye className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${file.name}`}
              onClick={() => setFiles((prev) => prev.filter((f) => f.id !== file.id))}
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
