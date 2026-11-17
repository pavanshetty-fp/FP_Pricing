import * as React from "react";
import type { PricingTarget } from "./pricingConfig";

/**
 * VIEW ALL GOES TO THE ACTIVITY FEED (Yash, 2026-11-17) — from a customer's or
 * ship-to's pricing, the feed opens filtered to that record, and the header
 * shows the path back: Customer › Acme Fuels › Activity feed. A crumb press
 * goes back to the list, or to the list with the record's sheet open again.
 */
export type ConfigPage = "pricing-config-customer" | "pricing-config-shipto";

export interface FeedTrail {
  /** The list it came from, and its name in the path. */
  from: ConfigPage;
  fromLabel: string;
  /** The record it came from. */
  record: PricingTarget;
  recordLabel: string;
  /** The feed filter it opens with: "customer:Acme Fuels". */
  facet: string;
}

type State = {
  trail: FeedTrail | null;
  /** A page to go to, with a nonce so the same press twice still lands. */
  go: { key: string; n: number } | null;
  /** A record sheet to open again on arrival. */
  reopen: PricingTarget | null;
};

let state: State = { trail: null, go: null, reopen: null };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const usePricingNav = () => React.useSyncExternalStore(subscribe, () => state);

/** Open the feed, filtered to this record, with the path back. */
export function openFeedFor(trail: FeedTrail) {
  set({ trail, go: { key: "pricing-log-activity", n: Date.now() } });
}

/** A crumb: back to the list, with or without its record's sheet open. */
export function backTo(page: ConfigPage, record: PricingTarget | null) {
  set({ trail: null, reopen: record, go: { key: page, n: Date.now() } });
}

export const clearTrail = () => state.trail && set({ trail: null });
export const takeReopen = () => {
  const r = state.reopen;
  if (r) state = { ...state, reopen: null };
  return r;
};
/** The feed reads the trail's filter once, when it opens. */
export const peekTrail = () => state.trail;

/** On the feed, switch the path to another customer — its Activity, pressed
 *  from a change's other customers (Yash, 2026-11-18). */
export function retargetCustomer(customerId: string, name: string) {
  if (!state.trail) return;
  set({
    trail: {
      from: "pricing-config-customer",
      fromLabel: "Customer",
      record: { kind: "customer", customerId },
      recordLabel: name,
      facet: `customer:${name}`,
    },
  });
}
