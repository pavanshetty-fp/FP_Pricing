import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { paginationRange } from "./data";

/**
 * Jump-to-page — Figma 27728:13260. The `…` ellipsis is a popover trigger;
 * the user types a page number and presses Enter to jump. Progressive
 * disclosure: no separate go-to field on the bar.
 */
function JumpToPage({
  totalPages,
  onJump,
}: {
  totalPages: number;
  onJump: (page: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  const submit = () => {
    const n = Number.parseInt(value, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= totalPages) {
      onJump(n);
      setOpen(false);
      setValue("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Jump to page"
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="flex w-auto flex-col gap-1 rounded-lg bg-fp-surface-1b p-1"
      >
        <span className="px-1 text-xs font-medium text-primary">Jump to page</span>
        <Input
          autoFocus
          value={value}
          inputMode="numeric"
          placeholder="Page #"
          aria-label="Page number"
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className="h-8 w-20 rounded-md border-fp-outline-2 bg-fp-surface-1a"
        />
      </PopoverContent>
    </Popover>
  );
}

export interface TablePaginationProps {
  /** 1-based current page. */
  page: number;
  /** Rows per page. */
  pageSize: number;
  /** Total row count across all pages. */
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /**
   * Override the footer band. The default is `h-9` — exactly the 36px controls,
   * so the PAGE owns the rhythm: the gap above the footer and the gap below it
   * are set by the page's own padding, not baked into the band.
   *
   * Pass `h-[72px]` for the original Figma band, which centres the controls with
   * 18px of its own air each side. Nothing in the DS wants that any more — see
   * the note on the root element.
   */
  className?: string;
}

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

/**
 * Footer — Figma "FP Pagination" (27631:11152). Three zones: range info (left),
 * windowed page controls (center, per `paginationRange`), rows-per-page Select
 * (right). Active page uses the FP/Outline-2 outline treatment.
 */
export function TablePagination({
  page,
  pageSize,
  total,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const items = paginationRange(page, totalPages);

  const go = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (p >= 1 && p <= totalPages && p !== page) onPageChange(p);
  };

  /*
    `h-9`, not the Figma frame's `h-[72px]`.

    The controls inside are 36px, so a 72px band adds 18px of its own air above
    and below them. On a screen whose vertical rhythm is set by the page, that
    fights the page: measured, the footer sat 34px off the panel bottom (18 from
    the band + 16 from the content layer's padding) while pressed FLUSH against
    the table — a 0px gap above and a doubled one below.

    The band is now exactly its content and the page does the spacing: callers
    wrap it in `mt-4`, and the content layer's own padding gives the 16px below.
    Measured across the DS screens and the four prototype list screens, before ->
    after: band 72 -> 36, table 589 -> 609, table->footer 0 -> 16, footer->panel
    16 -> 16.

    The 72px frame almost certainly had the page padding baked into it, which is
    why the default was backwards. `className="h-[72px]"` restores it if a screen
    genuinely wants the band to own the rhythm.
  */
  return (
    <div
      className={cn(
        "flex h-9 items-center justify-between text-sm text-muted-foreground",
        className
      )}
    >
      {/* `whitespace-nowrap`: one short phrase that must never break mid-sentence.
          The old 72px band hid this — at a narrow viewport the label wrapped to
          three lines (60px) and simply had room. In a band that is exactly its
          content it overflowed by 24px instead. `shrink-0` keeps flex from
          squeezing it into a wrap in the first place. */}
      <span className="shrink-0 whitespace-nowrap">
        Showing {from.toLocaleString()}-{to.toLocaleString()} of{" "}
        {total.toLocaleString()}
      </span>

      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
              onClick={go(page - 1)}
            />
          </PaginationItem>

          {items.map((item, i) =>
            item === "ellipsis" ? (
              <PaginationItem key={`e${i}`}>
                <JumpToPage totalPages={totalPages} onJump={onPageChange} />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  href="#"
                  isActive={item === page}
                  onClick={go(item)}
                  className={
                    /* THE TABLE HEADER'S COLOUR (Pavan, 2026-10-14) — the
                       selected page wears the same quiet fill as the header. */
                    item === page
                      ? "border-fp-outline-2 bg-fp-table-header"
                      : undefined
                  }
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={page >= totalPages}
              className={
                page >= totalPages ? "pointer-events-none opacity-50" : undefined
              }
              onClick={go(page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* Rows-per-page */}
      <Select
        value={String(pageSize)}
        onValueChange={(v) => onPageSizeChange(Number(v))}
      >
        <SelectTrigger
          size="sm"
          aria-label="Rows per page"
          /* A QUIET ROWS-PER-PAGE (Pavan, 2026-10-14 — tried on the portal's
             Orders, then everywhere): white, 12px type, 58px wide, 28px tall,
             6px corners. */
          className="h-7 w-[58px] gap-1 rounded-sm border-fp-outline-2 bg-fp-surface-1b px-2 text-xs data-[size=sm]:h-7 [&_svg]:size-3.5"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[58px]">
          {pageSizeOptions.map((opt) => (
            <SelectItem key={opt} value={String(opt)} className="text-xs">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
