import { ClipboardList, Wrench } from "lucide-react";
import { RecordSheet } from "../unified-view/RecordSheet";
import type { LogEntry } from "./activityLog";

/*
  THE ACTIVITY LOG SHEET (Pavan, 2026-10-13) — a record's whole history on a
  sheet over the one it belongs to (level 2): a ship-to's, from the activity
  icon in its header; an asset's, from the "Activity log" column of the
  ship-to's assets table. The shared activity card's timeline, every entry
  rather than the latest six.
*/

const FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function ActivityLogSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  entries,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  entries: LogEntry[];
}) {
  return (
    <RecordSheet
      level={2}
      size="form"
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      editTitle={`${title} · Activity log`}
      createTitle=""
      createAction=""
      headerSubtitle={subtitle}
      showCancel={false}
      onSubmit={() => {}}
      footerPrimary={null}
    >
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing has happened here yet.</p>
      ) : (
        <ol className="flex flex-col">
          {entries.map((e, i) => (
            <li key={`${e.at}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
              {i < entries.length - 1 && (
                <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-px bg-border" />
              )}
              <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-fp-surface-1b text-muted-foreground [&_svg]:size-3.5">
                {e.kind === "order" ? <ClipboardList /> : <Wrench />}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                <span className="text-sm text-foreground">{e.text}</span>
                <span className="text-xs text-muted-foreground">
                  {FMT.format(new Date(e.at))} · {e.by}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </RecordSheet>
  );
}
