import * as React from "react";
import { Upload, Download, FileUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { exportRowsToCsv } from "./helpers";
import type { ColumnKey, TableRow } from "@/components/tables-layout/types";

export interface ImportExportProps {
  /** The current filtered + sorted rows (what Export writes). */
  rows: TableRow[];
  /** Hidden columns — export writes only the visible ones. */
  hidden: Set<ColumnKey>;
  /** Icon-only trigger with a tooltip (compact toolbars). */
  compact?: boolean;
}

/**
 * Import / Export (Unit 2). Export downloads a CSV of the current filtered rows
 * over the visible columns (so "what you see is what you get"). Import opens a
 * file picker — a template stub here; wire real parsing per prototype.
 */
export function ImportExport({ rows, hidden, compact = false }: ImportExportProps) {
  const [importOpen, setImportOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const doExport = () => {
    const n = exportRowsToCsv(rows, hidden);
    toast.success(`Exported ${n.toLocaleString()} rows to CSV`);
  };

  const doImport = () => {
    toast.success(file ? `Imported “${file.name}” (template stub)` : "Import (template stub)");
    setImportOpen(false);
    setFile(null);
  };

  return (
    <>
      <DropdownMenu>
        {compact ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Import / Export">
                  <Upload className="size-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Import / Export</TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="size-4" />
              Import / Export
              <ChevronDown className="opacity-70" />
            </Button>
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={doExport}>
            <Download /> Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setImportOpen(true)}>
            <FileUp /> Import CSV…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) setFile(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV to add records. Parsing is stubbed in this template —
              wire it to your data source per prototype.
            </DialogDescription>
          </DialogHeader>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-fp-outline-2 bg-fp-card-1/40 px-4 py-8 text-center outline-none transition-colors hover:bg-fp-card-1 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <FileUp className="size-6 text-muted-foreground" />
            {file ? (
              <span className="text-sm text-foreground">{file.name}</span>
            ) : (
              <>
                <span className="text-sm text-foreground">Click to choose a file</span>
                <span className="text-xs text-muted-foreground">or drag and drop · .csv</span>
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={doImport} disabled={!file}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
