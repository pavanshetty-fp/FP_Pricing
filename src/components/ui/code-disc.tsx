import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Pastel hues a code disc can take. The DS ships hues; callers bind meaning. */
export type CodeDiscTone = "pastel-blue" | "pastel-amber";

export interface CodeDiscProps {
  /** One or two characters shown in the disc, e.g. "D". */
  code: string;
  /**
   * What the code means, e.g. "Delivery". Required, and used twice: as the
   * tooltip and as the `aria-label`. The letter alone must never be the only
   * carrier of meaning — sighted users get the tooltip, screen readers get the
   * label, and neither has to decode the initial.
   */
  label: string;
  tone?: CodeDiscTone;
  className?: string;
}

/**
 * Code disc — a 16px pastel circle carrying an initial, with the full word on
 * hover/focus. Use where a repeated category has to sit inside a dense row and
 * a full pill would not fit (table cells, list rows).
 *
 * The geometry is `Badge shape="disc"`; this wrapper exists to make the
 * accessible label non-optional, which a bare Badge cannot enforce.
 *
 * ```tsx
 * <CodeDisc code="D" label="Delivery" tone="pastel-blue" />
 * <CodeDisc code="E" label="Extraction" tone="pastel-amber" />
 * ```
 */
export function CodeDisc({
  code,
  label,
  tone = "pastel-blue",
  className,
}: CodeDiscProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Badge renders a span, so tabIndex makes the tooltip reachable by
              keyboard as well as by pointer. */}
          <Badge
            variant={tone}
            shape="disc"
            aria-label={label}
            tabIndex={0}
            className={className}
          >
            {code}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
