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

/* OPEN FEE, IN A NEW TAB (Yash, 2026-11-24) — a fee's application sheet opens
   the fee's own page in a new tab: `?fee=<id>` lands on Pricing setup › Fee
   with the fee open. Read once, before the app clears the address. */
const HANDOFF = "fp-pricing-edit-fee";
/** The fee the new tab was opened for — from the address (?fee=),
 *  or the hand-off the opening tab left, whichever arrives. */
function readBootFee(): string | null {
  if (typeof window === "undefined") return null;
  const fromUrl = new URLSearchParams(window.location.search).get("fee");
  let fromStore: string | null = null;
  try {
    const raw = window.localStorage.getItem(HANDOFF);
    window.localStorage.removeItem(HANDOFF);
    const v = raw ? (JSON.parse(raw) as { id: string; at: number }) : null;
    if (v && Date.now() - v.at < 15_000) fromStore = v.id;
  } catch {
    /* storage blocked — the address still carries it */
  }
  return fromUrl ?? fromStore;
}
let bootFee: string | null = readBootFee();

let state: State = { trail: null, go: bootFee ? { key: "pricing-setup-fee", n: 1 } : null, reopen: null };

/** The fee the page was opened on — read as often as the screen mounts
 *  (dev mounts twice), dropped once its sheet closes. */
export const takeFeeToOpen = () => bootFee;
export const doneWithFeeToOpen = () => {
  bootFee = null;
};
/** EDIT FEE — the fee's page in a new tab (Yash, 2026-11-24). */
export function openFeeInNewTab(id: string) {
  try {
    window.localStorage.setItem(HANDOFF, JSON.stringify({ id, at: Date.now() }));
  } catch {
    /* storage blocked — the address carries it */
  }
  const url = new URL(window.location.href);
  url.search = `?fee=${encodeURIComponent(id)}`;
  url.hash = "";
  window.open(url.toString(), "_blank");
}
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
