/* "Ship-to Details" → "Ship-to" — a property label, not a section heading.
   The board cards' sentence-case labels (Pavan, 2026-10-28). */
const SHORT_LABEL: Record<string, string> = {
  customer: "Ship-to",
  schedule: "Schedule",
  completed: "Completed",
  product: "Delivery",
  driver: "Driver",
  partner: "Vendor",
};

export const shortLabel = (u: { key: string; heading: string }) => SHORT_LABEL[u.key] ?? u.heading;
