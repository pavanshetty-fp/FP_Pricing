import * as React from "react";
import {
  X,
  UserPlus,
  UserMinus,
  LockOpen,
  CircleCheck,
  CircleSlash,
  Copy,
  Trash2,
  MoreHorizontal,
  User,
  Truck,
  Tag,
  Building2,
  Calendar,
  Clock,
  Timer,
  CalendarCheck,
  Package,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface BulkActionBarProps {
  count: number;
  onClear?: () => void;
  onAssign?: () => void;
  onUnassign?: () => void;
  onUnblock?: () => void;
  onVerify?: () => void;
  onUnverify?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  /** A field was picked from the ··· More menu (deep sub-panels deferred). */
  onField?: (key: string) => void;
}

/* Grouped field-edit menu — Figma "Bulk Action FAB_More" (27722:1251). */
const FIELD_GROUPS: {
  heading: string;
  items: { key: string; label: string; icon: React.ReactNode }[];
}[] = [
  {
    heading: "Assignments",
    items: [
      { key: "driver", label: "Driver", icon: <User /> },
      { key: "truck", label: "Truck", icon: <Truck /> },
      { key: "tags", label: "Tags", icon: <Tag /> },
      { key: "carrier", label: "Carrier", icon: <Building2 /> },
    ],
  },
  {
    heading: "Scheduling",
    items: [
      { key: "planned-date", label: "Planned Date", icon: <Calendar /> },
      { key: "planned-time", label: "Planned Time", icon: <Clock /> },
      { key: "extend-planned-time", label: "Extend Planned Time", icon: <Timer /> },
      { key: "completed-at", label: "Completed At", icon: <CalendarCheck /> },
    ],
  },
  {
    heading: "Order Details",
    items: [
      { key: "product", label: "Product", icon: <Package /> },
      { key: "purchase-order", label: "Purchase Order", icon: <FileText /> },
    ],
  },
];

/** Quick-action verbs — text labels mandatory (no icon-only). */
const VERBS: {
  key: keyof Pick<
    BulkActionBarProps,
    "onAssign" | "onUnassign" | "onUnblock" | "onVerify" | "onUnverify"
  >;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "onAssign", label: "Assign", icon: <UserPlus /> },
  { key: "onUnassign", label: "Unassign", icon: <UserMinus /> },
  { key: "onUnblock", label: "Unblock", icon: <LockOpen /> },
  { key: "onVerify", label: "Verify", icon: <CircleCheck /> },
  { key: "onUnverify", label: "Unverify", icon: <CircleSlash /> },
];

/**
 * Floating bulk-action bar — Figma "FAB bulk actions" (27631:11151).
 * Renders only when rows are selected; slides up on entrance. Anatomy: a
 * primary count chip + × (left), quick-action verbs (centre), then a hairline
 * before Copy / Delete and a trailing ··· More menu (right). Delete always
 * confirms via AlertDialog; ··· More opens a grouped, searchable Command menu.
 */
export function BulkActionBar(props: BulkActionBarProps) {
  const { count, onClear, onCopy, onDelete, onField } = props;
  if (count <= 0) return null;

  return (
    // `bulk-bar-in` slides the bar up 16px over 200ms; its default (docked)
    // state has no transform, so placement is correct without any JS timing.
    /* `bg-popover` is byte-identical to `--fp-surface-1b` in BOTH themes — the
       content layer this bar floats over — so the old fill was the same
       token==surface collision one level up. Card-1 steps off it, and the
       overlay tier carries the separation the fill cannot. */
    <div className="bulk-bar-in flex items-center gap-1 rounded-lg border border-fp-outline-1 bg-fp-card-1 p-1.5 shadow-fp-overlay dark:border-fp-outline-2">
      {/* Count chip — primary filled */}
      <span className="flex items-center gap-2 rounded-md bg-primary py-1 pr-1.5 pl-2.5 text-sm font-medium text-primary-foreground">
        {count} Selected
        <button
          type="button"
          aria-label="Clear selection"
          onClick={onClear}
          className="rounded-sm text-primary-foreground/80 outline-none transition-colors hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <X className="size-3.5" />
        </button>
      </span>

      {/* Quick-action verbs */}
      {VERBS.map((v) => (
        <Button key={v.key} variant="ghost" size="sm" onClick={props[v.key]}>
          {v.icon}
          {v.label}
        </Button>
      ))}

      <div className="mx-1 h-5 w-px bg-border" aria-hidden />

      {/* Icon-only zone: Copy + Delete */}
      <Button variant="ghost" size="icon-sm" aria-label="Copy" onClick={onCopy}>
        <Copy />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} records?</AlertDialogTitle>
            <AlertDialogDescription>
              This will affect {count} {count === 1 ? "record" : "records"} and
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-1 h-5 w-px bg-border" aria-hidden />

      {/* ··· More — always last */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal />
            More
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={8}
          className="w-[420px] p-0"
        >
          <Command>
            <CommandInput placeholder="Search fields..." />
            <CommandList className="max-h-[360px]">
              <CommandEmpty>No fields found.</CommandEmpty>
              {FIELD_GROUPS.map((group, gi) => (
                <React.Fragment key={group.heading}>
                  {gi > 0 && <CommandSeparator />}
                  <CommandGroup
                    heading={group.heading}
                    className="[&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:grid-cols-2 [&_[cmdk-group-items]]:gap-1"
                  >
                    {group.items.map((item) => (
                      <CommandItem
                        key={item.key}
                        value={item.label}
                        icon={item.icon}
                        onSelect={() => onField?.(item.key)}
                      >
                        {item.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </React.Fragment>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
