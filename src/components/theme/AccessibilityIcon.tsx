import { cn } from "@/lib/utils";

/*
  THE ACCESSIBILITY ICON (Pavan, 2026-10-22, from his reference): a dot with
  five rays fanning out to the right, each widening as it goes. Filled, in
  the text colour, on lucide's 24px grid so it sits with the other nav icons.
*/
const RAYS = [
  "8.51,9.06 13.50,2.01 10.90,0.51 7.29,8.36",
  "9.64,10.71 17.49,7.10 15.99,4.50 8.94,9.49",
  "9.80,12.70 18.40,13.50 18.40,10.50 9.80,11.30",
  "8.94,14.51 15.99,19.50 17.49,16.90 9.64,13.29",
  "7.29,15.64 10.90,23.49 13.50,21.99 8.51,14.94",
];

export function AccessibilityIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn("size-4 shrink-0", className)}>
      <g transform="translate(0.8 0)">
        <circle cx="6" cy="12" r="2.1" />
        {RAYS.map((p) => (
          <polygon key={p} points={p} />
        ))}
      </g>
    </svg>
  );
}
