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
   * Override the footer band. The default `h-[72px]` is the Figma spec, which
   * centres the 36px controls with 18px of air each side. Screens that own their
   * own vertical rhythm — where the gap above the footer and the gap below it are
   * set by the page, not by the band — pass `h-9` so the band is exactly its
   * content and the page's own padding does the spacing.
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

  return (
    <div
      className={cn(
        "flex h-[72px] items-center justify-between text-sm text-muted-foreground",
        className
      )}
    >
      <span>
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
                    item === page
                      ? "border-fp-outline-2 bg-fp-surface-1a"
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
          className="w-[72px] rounded-lg border-fp-outline-2 bg-fp-surface-1a"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizeOptions.map((opt) => (
            <SelectItem key={opt} value={String(opt)}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
