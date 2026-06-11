import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Invoice information card — Figma "Invoice" (27599:62303). An "Effective Price
  per gallon" breakdown: grouped line items (muted detail rows with an ⓘ marker,
  each followed by a bold subtotal) bracketed by dashed rules, ending in a bold
  Grand Total. Used as the amount-column HoverCard and in the Info Cards tab.
*/

interface DetailRow {
  label: string;
  amount: string;
}
interface Group {
  details: DetailRow[];
  total: DetailRow;
}

const GROUPS: Group[] = [
  {
    details: [{ label: "OPIS High-Dallas", amount: "$0.10" }],
    total: { label: "Base Price Index", amount: "$0.10" },
  },
  {
    details: [
      { label: "Margin A", amount: "+ $0.55" },
      { label: "Margin B", amount: "+ $0.50" },
    ],
    total: { label: "Margin", amount: "+ $1.05" },
  },
  {
    details: [
      { label: "Regional Tax", amount: "+ $0.55" },
      { label: "National Tax", amount: "+ $0.50" },
    ],
    total: { label: "Tax", amount: "+ $1.05" },
  },
  {
    details: [
      { label: "Processing Fees", amount: "+ $0.55" },
      { label: "Travel Fees", amount: "+ $0.50" },
    ],
    total: { label: "Fee", amount: "+ $1.05" },
  },
  {
    details: [{ label: "Black Friday", amount: "- $0.35" }],
    total: { label: "Discount", amount: "- $0.35" },
  },
];

const GRAND_TOTAL = "$2.90";

export function InvoiceCard({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <h4 className="text-base font-semibold">Effective Price per gallon</h4>
      <div className="border-t border-dashed border-border" />

      <div className="flex flex-col gap-5">
        {GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {group.details.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between text-sm text-muted-foreground"
              >
                <span className="inline-flex items-center gap-1.5">
                  {d.label}
                  <Info className="size-3.5 opacity-70" />
                </span>
                <span className="tabular-nums">{d.amount}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm font-semibold text-foreground">
              <span>{group.total.label}</span>
              <span className="tabular-nums">{group.total.amount}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-border" />
      <div className="flex items-center justify-between text-base font-semibold">
        <span>Grand Total</span>
        <span className="tabular-nums">{GRAND_TOTAL}</span>
      </div>
    </div>
  );
}
