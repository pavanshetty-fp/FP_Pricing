import * as React from "react";
import {
  Info,
  TriangleAlert,
  CircleCheck,
  CircleX,
  Loader2,
  Inbox,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Stack, SectionHeading } from "@/components/typography";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/*
  Modals — Figma "Modals: AlertDialog + Dialog Template" (27610:58823). Two
  modal archetypes plus the Dialog's lifecycle outcome states. Opened from a
  fresh demo button cluster.
*/

/* ── Reused selection patterns (from the Form Layout vocabulary) ───────────── */
function RadioCard({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border border-border bg-fp-surface-1a p-4 transition-colors has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-fp-surface-1b",
        className
      )}
    >
      <RadioGroupItem value={value} className="mt-0.5" />
      <span className="flex flex-col">
        <span className="text-sm font-medium">Radio Button Text</span>
        <span className="text-xs text-muted-foreground">
          This is a radio description.
        </span>
      </span>
    </label>
  );
}

function RadioTile({ value }: { value: string }) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-border bg-fp-surface-1a p-4 text-center transition-colors has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-fp-surface-1b">
      <RadioGroupItem value={value} className="mb-2" />
      <span className="text-sm font-medium">Title</span>
      <span className="text-xs text-muted-foreground">Subtext</span>
    </label>
  );
}

function MiniTable() {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-fp-surface-1a">
            {["Header", "Header", "Header", "Header"].map((h, i) => (
              <TableHead key={i} className="h-9 px-3 text-xs">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[0, 1].map((r) => (
            <TableRow key={r}>
              {[0, 1, 2, 3].map((c) => (
                <TableCell key={c} className="px-3 py-2">
                  <span className="flex flex-col">
                    <span className="truncate text-sm">Table Cell Text</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Description Text
                    </span>
                  </span>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ── Dialog lifecycle outcome states ───────────────────────────────────────── */
type DialogState = "default" | "loading" | "success" | "error" | "empty";

/** Centered status body shared by loading / success / error / empty. */
function StatusBody({
  icon,
  iconClass,
  title,
  message,
  spin,
}: {
  icon: React.ReactNode;
  iconClass?: string;
  title: string;
  message: string;
  spin?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full",
          iconClass
        )}
      >
        <span className={cn("[&_svg]:size-6", spin && "animate-spin")}>
          {icon}
        </span>
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold">{title}</p>
        <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function DialogBody({ state }: { state: DialogState }) {
  if (state === "loading")
    return (
      <StatusBody
        icon={<Loader2 />}
        iconClass="bg-muted text-foreground"
        title="Working on it…"
        message="Applying your changes. This will only take a moment."
        spin
      />
    );
  if (state === "success")
    return (
      <StatusBody
        icon={<CircleCheck />}
        iconClass="bg-status-success/15 text-status-success"
        title="All done"
        message="Your changes have been saved successfully."
      />
    );
  if (state === "error")
    return (
      <StatusBody
        icon={<CircleX />}
        iconClass="bg-destructive/15 text-destructive"
        title="Something went wrong"
        message="We couldn't save your changes. Please try again."
      />
    );
  if (state === "empty")
    return (
      <StatusBody
        icon={<Inbox />}
        iconClass="bg-muted text-muted-foreground"
        title="Nothing here yet"
        message="There's no data to show. Create your first item to get started."
      />
    );

  // default — the content from the Figma Dialog frame
  return (
    <div className="-mr-2 flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-2">
      <RadioGroup defaultValue="a-0" className="gap-3">
        <RadioCard value="a-0" />
        <RadioCard value="a-1" />
      </RadioGroup>

      <RadioGroup defaultValue="b-0" className="grid grid-cols-2 gap-3">
        <RadioCard value="b-0" />
        <RadioCard value="b-1" />
      </RadioGroup>

      <RadioGroup defaultValue="c-1" className="grid grid-cols-3 gap-3">
        {["c-0", "c-1", "c-2", "c-3", "c-4"].map((v) => (
          <RadioTile key={v} value={v} />
        ))}
      </RadioGroup>

      <MiniTable />
    </div>
  );
}

/** Footer varies by outcome state. */
function DialogFooterFor({
  state,
  onPrimary,
  onRetry,
}: {
  state: DialogState;
  onPrimary: () => void;
  onRetry: () => void;
}) {
  if (state === "loading")
    return (
      <DialogFooter>
        <Button variant="outline" disabled>
          Cancel
        </Button>
        <Button disabled>
          <Loader2 className="animate-spin" />
          Working…
        </Button>
      </DialogFooter>
    );
  if (state === "success")
    return (
      <DialogFooter>
        <DialogClose asChild>
          <Button>Done</Button>
        </DialogClose>
      </DialogFooter>
    );
  if (state === "error")
    return (
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button onClick={onRetry}>Retry</Button>
      </DialogFooter>
    );
  if (state === "empty")
    return (
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button>
          <Plus />
          Create item
        </Button>
      </DialogFooter>
    );
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button onClick={onPrimary}>Primary action</Button>
    </DialogFooter>
  );
}

const STATE_TITLES: Record<DialogState, { title: string; desc: string }> = {
  default: { title: "Dialog title", desc: "This is a dialog description." },
  loading: { title: "Saving changes", desc: "Please wait." },
  success: { title: "Success", desc: "Your action completed." },
  error: { title: "Action failed", desc: "An error occurred." },
  empty: { title: "No results", desc: "Nothing to display." },
};

function LifecycleDialog({
  open,
  initialState,
  onOpenChange,
}: {
  open: boolean;
  initialState: DialogState;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = React.useState<DialogState>(initialState);
  // Re-sync to the requested state whenever the dialog is (re)opened.
  React.useEffect(() => {
    if (open) setState(initialState);
  }, [open, initialState]);

  // Primary on the default content runs the lifecycle: loading → success.
  const runPrimary = () => {
    setState("loading");
    setTimeout(() => setState("success"), 1200);
  };
  const retry = () => {
    setState("loading");
    setTimeout(() => setState("success"), 1200);
  };

  const { title, desc } = STATE_TITLES[state];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={state !== "loading"}
        className="sm:max-w-[480px]"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <DialogBody state={state} />
        <DialogFooterFor state={state} onPrimary={runPrimary} onRetry={retry} />
      </DialogContent>
    </Dialog>
  );
}

/* ── Demo screen ───────────────────────────────────────────────────────────── */
const STATES: DialogState[] = ["default", "loading", "success", "error", "empty"];

export function ModalsDemo() {
  const [dialog, setDialog] = React.useState<DialogState | null>(null);

  return (
    <Stack space="section" className="overflow-auto">
      <p className="max-w-prose text-sm text-muted-foreground">
        Two modal archetypes — a compact AlertDialog for decisions, and a Dialog
        for richer content — plus the Dialog's lifecycle outcome states.
      </p>

      {/* AlertDialog */}
      <Stack space="title">
        <SectionHeading as="h3" title="AlertDialog" />
        <div className="flex flex-wrap gap-3">
          {/* Default / informational */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Open alert</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted text-foreground [&_svg]:size-5">
                  <Info />
                </span>
                <AlertDialogTitle>AlertDialog title</AlertDialogTitle>
                <AlertDialogDescription>
                  This is a alert dialog description.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Primary action</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Destructive */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive">
                Delete (destructive)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/15 text-destructive [&_svg]:size-5">
                  <TriangleAlert />
                </span>
                <AlertDialogTitle>Delete item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the item and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Stack>

      {/* Dialog */}
      <Stack space="title">
        <SectionHeading as="h3" title="Dialog" />
        <Button variant="outline" onClick={() => setDialog("default")}>
          Open dialog
        </Button>
      </Stack>

      {/* Lifecycle outcome states */}
      <Stack space="title">
        <SectionHeading as="h3" title="Outcome states" />
        <div className="flex flex-wrap gap-3">
          {STATES.map((s) => (
            <Button key={s} variant="outline" onClick={() => setDialog(s)}>
              <span className="capitalize">{s}</span>
            </Button>
          ))}
        </div>
      </Stack>

      <LifecycleDialog
        open={dialog !== null}
        initialState={dialog ?? "default"}
        onOpenChange={(o) => !o && setDialog(null)}
      />
    </Stack>
  );
}
