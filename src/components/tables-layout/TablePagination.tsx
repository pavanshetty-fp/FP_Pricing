import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
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
import { paginationRange } from "./data";

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
    <div className="flex h-[72px] items-center justify-between text-sm text-muted-foreground">
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
                <PaginationEllipsis />
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
