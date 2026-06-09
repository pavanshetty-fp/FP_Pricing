import {
  X,
  UserPlus,
  UserMinus,
  ShieldOff,
  Check,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui";

export interface BulkActionBarProps {
  count: number;
  onClear?: () => void;
  onAssign?: () => void;
  onUnassign?: () => void;
  onUnblock?: () => void;
  onVerify?: () => void;
  onDelete?: () => void;
  onMore?: () => void;
}

/**
 * Floating bulk-action bar — Figma "Frame 2147227100" (id 27720:59696).
 * Renders only when rows are selected.
 */
export function BulkActionBar({
  count,
  onClear,
  onAssign,
  onUnassign,
  onUnblock,
  onVerify,
  onDelete,
  onMore,
}: BulkActionBarProps) {
  if (count <= 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-md">
        {/* Selected count chip */}
        <span className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-sm font-medium">
          {count} Selected
          <button
            type="button"
            aria-label="Clear selection"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </span>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

        {/* Verb actions */}
        <Button variant="ghost" size="sm" onClick={onAssign}>
          <UserPlus />
          Assign
        </Button>
        <Button variant="ghost" size="sm" onClick={onUnassign}>
          <UserMinus />
          Unassign
        </Button>
        <Button variant="ghost" size="sm" onClick={onUnblock}>
          <ShieldOff />
          Unblock
        </Button>
        <Button variant="ghost" size="sm" onClick={onVerify}>
          <Check />
          Verify
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete"
          onClick={onDelete}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 />
        </Button>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Button variant="ghost" size="sm" onClick={onMore}>
          <MoreHorizontal />
          More
        </Button>
      </div>
    </div>
  );
}
