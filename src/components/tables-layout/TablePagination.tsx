import { ChevronDown } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export interface TablePaginationProps {
  /** verbatim range label from Figma: "Showing  20-45 of 1,000" */
  rangeLabel?: string;
  page?: number;
  pages?: number[];
  lastPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

/**
 * Footer — Figma "Footer" (id 27618:46001): range label, pager, page-size.
 * Built on the shadcn Pagination primitives.
 */
export function TablePagination({
  rangeLabel = "Showing 20-45 of 1,000",
  page = 1,
  pages = [1, 2, 3, 4],
  lastPage = 50,
  pageSize = 25,
  onPageChange,
}: TablePaginationProps) {
  const go = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (p >= 1 && p <= lastPage) onPageChange?.(p);
  };

  return (
    <div className="flex h-[72px] items-center justify-between text-sm text-muted-foreground">
      <span>{rangeLabel}</span>

      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={go(page - 1)} />
          </PaginationItem>
          {pages.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink href="#" isActive={p === page} onClick={go(p)}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              href="#"
              isActive={lastPage === page}
              onClick={go(lastPage)}
            >
              {lastPage}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" onClick={go(page + 1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

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
