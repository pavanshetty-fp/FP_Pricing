import * as React from "react";
import { Bookmark, Check, Pencil, Trash2, Plus, RotateCcw, ChevronDown, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import type { PresetView } from "./helpers";

export interface PresetViewsProps {
  presets: PresetView[];
  activeId: string | null;
  /** Current state differs from the active preset (or from default). */
  dirty: boolean;
  onApply: (id: string) => void;
  onSaveNew: (name: string) => void;
  onUpdate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onResetToDefault: () => void;
}

/**
 * Preset Views (Unit 2) — save the current filter/sort/columns/view state as a
 * named view, apply it later in one click, rename or delete it. Unlimited views,
 * each named. A dot on the trigger flags unsaved changes vs the active preset.
 */
export function PresetViews({
  presets,
  activeId,
  dirty,
  onApply,
  onSaveNew,
  onUpdate,
  onRename,
  onDelete,
  onResetToDefault,
}: PresetViewsProps) {
  const [open, setOpen] = React.useState(false);
  const [dialog, setDialog] = React.useState<{ mode: "new" | "rename"; id?: string; name: string } | null>(null);

  const active = presets.find((p) => p.id === activeId);
  const triggerLabel = active ? active.name : "Default view";

  const submit = () => {
    if (!dialog) return;
    const name = dialog.name.trim();
    if (!name) return;
    if (dialog.mode === "new") onSaveNew(name);
    else if (dialog.id) onRename(dialog.id, name);
    setDialog(null);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 font-normal">
            <Bookmark className="size-4" />
            <span className="text-muted-foreground">Views:</span>
            <span className="max-w-[120px] truncate font-medium text-foreground">{triggerLabel}</span>
            {dirty && <Circle className="size-1.5 fill-brand text-brand" aria-label="unsaved changes" />}
            <ChevronDown className="opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-0">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Preset views</div>
          <Separator />
          <div className="max-h-64 overflow-y-auto p-1">
            {presets.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No saved views yet. Filter the data, then save this view.
              </p>
            ) : (
              presets.map((p) => (
                <div
                  key={p.id}
                  className="group flex items-center gap-1 rounded-sm pr-1 hover:bg-accent"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onApply(p.id);
                      setOpen(false);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm outline-none"
                  >
                    <Check className={p.id === activeId ? "size-3.5 text-foreground" : "size-3.5 text-transparent"} />
                    <span className="truncate">{p.name}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Rename ${p.name}`}
                    onClick={() => setDialog({ mode: "rename", id: p.id, name: p.name })}
                    className="rounded-sm p-1 text-muted-foreground opacity-0 outline-none transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => onDelete(p.id)}
                    className="rounded-sm p-1 text-muted-foreground opacity-0 outline-none transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
          <Separator />
          <div className="flex flex-col p-1">
            {active && dirty && (
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => {
                  onUpdate(active.id);
                  setOpen(false);
                }}
              >
                <Check /> Update “{active.name}”
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => setDialog({ mode: "new", name: "" })}
            >
              <Plus /> Save current view…
            </Button>
            {(active || dirty) && (
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-muted-foreground"
                onClick={() => {
                  onResetToDefault();
                  setOpen(false);
                }}
              >
                <RotateCcw /> Reset to default
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "rename" ? "Rename view" : "Save current view"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="preset-name">View name</Label>
            <Input
              id="preset-name"
              autoFocus
              value={dialog?.name ?? ""}
              onChange={(e) => setDialog((d) => (d ? { ...d, name: e.target.value } : d))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. Failed this week"
            />
            {dialog?.mode === "new" && (
              <p className="text-xs text-muted-foreground">
                Captures the current search, filters, sort, visible columns, and view.
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={submit} disabled={!dialog?.name.trim()}>
              {dialog?.mode === "rename" ? "Rename" : "Save view"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
