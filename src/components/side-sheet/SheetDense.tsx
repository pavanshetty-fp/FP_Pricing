import * as React from "react";
import { Search, X, TriangleAlert, QrCode, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SheetClose, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { paginationRange } from "@/components/tables-layout/data";

interface Asset {
  id: string;
  name: string;
  type: string;
  category: string;
  size: string;
  compartments: number;
  hasQr: boolean;
}

const ASSETS: Asset[] = [
  { id: "123456", name: "3L-1000", type: "Double Wall", category: "Diesel, Gas", size: "2,000", compartments: 2, hasQr: true },
  { id: "123457", name: "10-Diesel", type: "Double Wall", category: "Diesel, Aviation…", size: "5,000", compartments: 1, hasQr: true },
  { id: "123458", name: "Tank Wagon", type: "Double Wall", category: "Gas", size: "2,500", compartments: 1, hasQr: false },
  { id: "342432", name: "Field Tank", type: "Double Wall", category: "Gasoline, Diese…", size: "2,700", compartments: 2, hasQr: true },
  { id: "342343", name: "3L-1002", type: "Double Wall", category: "Heating Oil", size: "3,000", compartments: 1, hasQr: true },
  { id: "442313", name: "FP-Tank", type: "Double Wall", category: "Diesel", size: "3,500", compartments: 3, hasQr: false },
  { id: "901234", name: "John Tank", type: "Double Wall", category: "Petrol", size: "4,000", compartments: 2, hasQr: true },
  { id: "883242", name: "Len-Gen", type: "Double Wall", category: "Heating Oil, Die…", size: "4,200", compartments: 1, hasQr: false },
  { id: "567890", name: "Panda Tank", type: "Double Wall", category: "Gasoline, Aviati…", size: "4,500", compartments: 3, hasQr: true },
  { id: "354231", name: "Sabina Tank", type: "Double Wall", category: "Aviation Fuel", size: "5,000", compartments: 2, hasQr: false },
  { id: "234567", name: "Rabin's Tank", type: "Double Wall", category: "Diesel", size: "7,750", compartments: 1, hasQr: false },
];

const COLUMNS = [
  "QR",
  "Asset ID",
  "Asset Name",
  "Type",
  "Product Category",
  "Size (Gallons)",
  "Compartments",
  "Action",
];

/** Side sheet wide_Dense (1000, over scrim) — Figma 27610:71256. Asset picker. */
export function SheetDense({
  title = "FleetPanda HQ - Tank List (103)",
}: {
  title?: string;
}) {
  const [page, setPage] = React.useState(2);
  const totalPages = 10;

  return (
    <>
      {/* Header with search */}
      <div className="flex items-center justify-between gap-4 border-b border-border p-4">
        <SheetTitle className="text-base">{title}</SheetTitle>
        <SheetDescription className="sr-only">
          Choose an available asset to assign.
        </SheetDescription>
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search orders" className="h-9 pl-8" />
          </div>
          <SheetClose className="rounded-sm p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50">
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>
            <p>
              The requested{" "}
              <span className="font-semibold">“Single Wall Tank”</span> is currently
              unavailable. You can either choose an alternative asset from available
              types or wait for the requested asset to become available.
            </p>
          </AlertDescription>
        </Alert>

        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-fp-surface-1a hover:bg-fp-surface-1a">
                {COLUMNS.map((c, i) => (
                  <TableHead
                    key={c}
                    className={cn(
                      "h-10 px-4 text-xs font-medium text-muted-foreground",
                      i === COLUMNS.length - 1 && "text-right"
                    )}
                  >
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ASSETS.map((a) => (
                <TableRow key={a.id} className="h-13">
                  <TableCell className="px-4">
                    {a.hasQr ? (
                      <QrCode className="size-6 text-foreground" />
                    ) : (
                      <span className="text-sm text-muted-foreground">NA</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 text-sm tabular-nums">{a.id}</TableCell>
                  <TableCell className="px-4 text-sm">{a.name}</TableCell>
                  <TableCell className="px-4 text-sm">{a.type}</TableCell>
                  <TableCell className="px-4 text-sm">{a.category}</TableCell>
                  <TableCell className="px-4 text-sm tabular-nums">{a.size}</TableCell>
                  <TableCell className="px-4 text-sm tabular-nums">
                    {a.compartments}
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <Button variant="outline" size="xs">
                      Assign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer pager */}
      <div className="flex items-center justify-center gap-1 border-t border-border p-3">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
          Previous
        </button>
        {paginationRange(page, totalPages).map((item, i) =>
          item === "ellipsis" ? (
            <span key={`e${i}`} className="px-2 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => setPage(item)}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                item === page
                  ? "border border-fp-outline-2 bg-fp-surface-1a text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
        >
          Next
          <ChevronRight className="size-4" />
        </button>
      </div>
    </>
  );
}
