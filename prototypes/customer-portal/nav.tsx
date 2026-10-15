import * as React from "react";

/*
  LINKS BETWEEN RECORDS (Pavan, 2026-10-15 — PRD FR-10: no dead ends). An
  invoice opens its order and an order its invoice, from any page: the
  portal switches page and opens the record there.
*/
export interface PortalNav {
  openOrder: (requestNo: string) => void;
  openInvoice: (invoiceNo: string) => void;
}

export const PortalNavContext = React.createContext<PortalNav>({
  openOrder: () => {},
  openInvoice: () => {},
});

export const usePortalNav = () => React.useContext(PortalNavContext);

/** A record's number as a link — the dotted underline the banner's "View
    details" wears (the DS has no link colour), solid on hover. */
export function RecordLink({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className="cursor-pointer self-start rounded-sm text-left text-sm text-foreground tabular-nums underline decoration-current/50 decoration-dotted underline-offset-4 outline-none hover:decoration-solid focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {label}
    </button>
  );
}
