import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SheetNarrow } from "./SheetNarrow";
import { SheetWide } from "./SheetWide";
import { SheetDense } from "./SheetDense";

export type SideSheetVariant = "narrow" | "wide" | "dense";

/*
  Side Sheet — Figma "Side Sheet" (27610:58293). One right-anchored sheet shell
  with three width/content variants: narrow (form), wide (embedded table), dense
  (asset picker). Slides in over a scrim; content scrolls between a fixed header
  and footer.
*/
const WIDTH: Record<SideSheetVariant, string> = {
  narrow: "w-[560px] sm:max-w-[560px]",
  wide: "w-[1200px] max-w-[96vw] sm:max-w-[1200px]",
  dense: "w-[1000px] max-w-[96vw] sm:max-w-[1000px]",
};

export interface SideSheetProps {
  variant: SideSheetVariant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export function SideSheet({ variant, open, onOpenChange, title }: SideSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn("gap-0 p-0", WIDTH[variant])}
      >
        {variant === "narrow" && <SheetNarrow title={title} />}
        {variant === "wide" && <SheetWide title={title} />}
        {variant === "dense" && <SheetDense title={title} />}
      </SheetContent>
    </Sheet>
  );
}
