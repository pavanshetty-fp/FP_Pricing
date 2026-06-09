import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

export interface PaginationProps {
  /** verbatim range label from Figma: "Showing  20-45 of 1,000" */
  rangeLabel?: string;
  page?: number;
  pages?: number[];
  lastPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

/** Footer — Figma "Footer" (id 27618:46001): range label, pager, page-size. */
export function Pagination({
  rangeLabel = "Showing 20-45 of 1,000",
  page = 1,
  pages = [1, 2, 3, 4],
  lastPage = 50,
  pageSize = 25,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex h-[72px] items-center justify-between px-4 text-sm text-muted-foreground">
      <span>{rangeLabel}</span>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
        >
          <ChevronLeft />
        </Button>
        {pages.map((p) => (
          <PageButton
            key={p}
            page={p}
            active={p === page}
            onClick={() => onPageChange?.(p)}
          />
        ))}
        <span className="px-1 text-muted-foreground">…</span>
        <PageButton
          page={lastPage}
          active={lastPage === page}
          onClick={() => onPageChange?.(lastPage)}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next page"
          disabled={page >= lastPage}
          onClick={() => onPageChange?.(page + 1)}
        >
          <ChevronRight />
        </Button>
      </nav>

      {/* Rows-per-page select */}
      <button
        type="button"
        aria-label="Rows per page"
        className="inline-flex h-8 items-center gap-2 rounded-md border border-input px-3 text-sm text-foreground"
      >
        {pageSize}
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>
    </div>
  );
}

function PageButton({
  page,
  active,
  onClick,
}: {
  page: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Page ${page}`}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "border border-border bg-muted text-foreground"
          : "text-muted-foreground"
      )}
    >
      {page}
    </button>
  );
}
