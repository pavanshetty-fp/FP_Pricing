import type { FuelOrder } from "./types";
import type { AssetOrder } from "./assetOrders";
import { stageLabel } from "./salesSettings";

/*
  WHAT SALES WRITES DOWN (the list Pavan approved, 2026-09-23). An event, not
  an edit: who is driving it, when it is planned, what is on it, what stage it
  is at. Tags, notes, PO numbers and contacts are edits and are not logged.
  "Order created" is written by `useLoggedRows` itself.
*/

const say = (out: string[], label: string, from: unknown, to: unknown) => {
  if (String(from ?? "") === String(to ?? "")) return;
  out.push(`${label}: ${from || "—"} → ${to || "—"}`);
};

export function diffFuelOrder(a: FuelOrder, b: FuelOrder): string[] {
  const out: string[] = [];
  /* A DRIVER PICK CAN MOVE THE STAGE (Requested ↔ Scheduled), so one line
     carries both. */
  if ((a.driver?.name ?? "") !== (b.driver?.name ?? ""))
    out.push(
      `Driver: ${a.driver?.name || "—"} → ${b.driver?.name || "—"}${
        a.status !== b.status ? ` (${stageLabel(b.status)})` : ""
      }`
    );
  else
    /* THE SHEET'S "MOVE TO …" (2026-10-07) changes the stage on its own —
       written under the stage's name as Sales Settings call it. */
    say(out, "Status", stageLabel(a.status), stageLabel(b.status));
  say(
    out,
    "Planned",
    a.planned ? `${a.planned.date} ${a.planned.time}` : "",
    b.planned ? `${b.planned.date} ${b.planned.time}` : ""
  );
  const products = (r: FuelOrder) => r.products.map((p) => `${p.name} ${p.gal} gal`).join(" · ");
  say(out, "Products", products(a), products(b));
  return out;
}

export function diffAssetOrder(a: AssetOrder, b: AssetOrder): string[] {
  const out: string[] = [];
  /* THE STAGE, set by hand — one of the five Sales stages (2026-10-07). */
  say(out, "Status", stageLabel(a.status), stageLabel(b.status));
  say(out, "Delivery date", a.date.title, b.date.title);
  return out;
}
