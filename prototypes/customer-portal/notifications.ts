import * as React from "react";
import { toast } from "sonner";
import { allRequests, TENANT } from "./orders";
import { INVOICES } from "./invoices";

/*
  NOTIFICATIONS AS TOASTS (Pavan, 2026-10-15 — PRD FR-29): what happens to
  the customer's orders while they are in the portal, said as it happens —
  one line, with View opening the record. SIMULATED: the first shortly
  after arrival, then one a minute, each once, drawn from the data.
*/

const FIRST_AFTER = 8_000;
const EVERY = 60_000;

interface Event {
  text: string;
  open: { order?: string; invoice?: string };
}

function events(): Event[] {
  const rs = allRequests();
  const out: Event[] = [];
  const onWay = rs.find((r) => r.status === "Out for delivery" && r.trip);
  if (onWay) out.push({ text: `${onWay.requestNo} arriving in 30 minutes`, open: { order: onWay.requestNo } });
  /* A DRIVER IS ON IT (Pavan, 2026-10-21) — the one thing the customer
     hears about an order before its delivery. */
  const assigned = rs.find((r) => r.status === "Scheduled");
  if (assigned) out.push({ text: `${assigned.requestNo} scheduled · driver assigned`, open: { order: assigned.requestNo } });
  const inv = [...INVOICES].sort((a, b) => b.issued.localeCompare(a.issued))[0];
  if (inv) out.push({ text: `Invoice ${inv.invoiceNo} ready`, open: { invoice: inv.invoiceNo } });
  const done = rs.find((r) => r.status === "Delivered");
  if (done) out.push({ text: `${done.requestNo} delivered · ticket ready`, open: { order: done.requestNo } });
  /* THE TENANT ANSWERED A DISPUTE (Pavan, 2026-10-15). */
  const answered = INVOICES.find((i) => i.dispute?.outcome && !i.dispute.closedAt);
  if (answered) out.push({ text: `${TENANT} answered the dispute on ${answered.invoiceNo}`, open: { invoice: answered.invoiceNo } });
  return out;
}

export function useEventToasts(openOrder: (no: string) => void, openInvoice: (no: string) => void) {
  const open = React.useRef({ openOrder, openInvoice });
  open.current = { openOrder, openInvoice };
  React.useEffect(() => {
    const list = events();
    let i = 0;
    const fire = () => {
      const e = list[i++];
      if (!e) return;
      toast(e.text, {
        action: {
          label: "View",
          onClick: () =>
            e.open.invoice ? open.current.openInvoice(e.open.invoice) : open.current.openOrder(e.open.order!),
        },
      });
    };
    const first = window.setTimeout(fire, FIRST_AFTER);
    const rest = window.setInterval(fire, EVERY);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(rest);
    };
  }, []);
}
