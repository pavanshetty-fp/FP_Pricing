import * as React from "react";

/*
  THE SERVICE MODULE'S SWITCH POINTS.

  Eight of them, and between them they describe every customer this module has
  to fit. They are NOT preferences: each one turns a whole step of the flow on
  or off — whether a work type arrives with its parts priced, whether a manager
  signs it off, whether an invoice writes itself, what a stalled job does next.
  Two named profiles sit at the ends of the range, and everything in between is
  a real configuration somebody runs.

  THEY LIVE HERE, NOT IN THE GLOBAL SETTINGS PAGE. The app's Settings page will
  govern several modules and has been on hold pending that; these are this
  module's own, and putting them behind a rail item inside it is what lets them
  ship now without pre-empting that decision.

  A MODULE-LEVEL STORE RATHER THAN A PROVIDER. The rail's screens are siblings
  mounted one at a time by the shell, so a context would have to be threaded
  through the whole app to reach two of them. `useSyncExternalStore` gives the
  same thing — one value, every subscriber re-rendered — without the shell
  having to know this module has settings.
*/

/**
 * WHAT A PARTIAL VISIT DOES (Pavan, 2026-09-23).
 *
 * THE TRIGGER. Ten parts are needed, five are on the van. The technician fits
 * the five and marks the job partially completed. The work that happened is
 * recorded either way; what differs is where the REMAINING five live.
 *
 * `continue`  — **THE SAME ORDER, THE SAME NUMBER.** It goes back to OPEN,
 *               because a second visit needs a technician and a date and
 *               nobody has picked either yet. Its part list keeps the fitted
 *               quantities, so the order carries its own progress: five of
 *               ten, and it is not done until it is ten of ten. One fault,
 *               one number, however many visits it takes.
 * `neworder`  — **THIS ONE IS FINISHED; THE REST IS A NEW JOB.** The five
 *               fitted are complete and the order says so; the five owed
 *               become an order of their own, with its own number, linked
 *               back.
 *
 * THE DIFFERENCE IS WHETHER THE FAULT IS ONE PIECE OF WORK OR TWO — which is
 * a question about how the business invoices and talks to the customer, not
 * about the parts. That is why it is a setting and not a choice on the day.
 *
 * SUPERSEDES `suborder` (2026-09-23), which made a CHILD record `SO-1048-2`.
 * That was a third thing nobody asked for: it split one fault into two
 * records while pretending they were one, so the progress lived on neither.
 * And it supersedes `rollforward` before it, which just moved the whole order
 * to tomorrow and could not say that five of ten went on.
 */
export type ReturnMode = "continue" | "neworder";

export interface ServiceSettings {
  /**
   * ON: the invoice writes itself the moment a job is approved — parts, actual
   * labour, mileage and fees. OFF: the costs are still captured, but somebody
   * generates the invoice by hand. Either way it reaches accounting on a batch
   * schedule afterwards, not in real time.
   */
  nativeBilling: boolean;
  /** ON: what a job costs rolls into the asset's payback picture. */
  roiFeed: boolean;
  /**
   * ON: finished work waits in Needs approval for a service manager. OFF: it
   * approves itself the moment the technician submits.
   */
  managerApproval: boolean;
  /** Where the parts a visit could not fit go. See `ReturnMode`. */
  returnMode: ReturnMode;
  /** ON: a work type arrives with its usual parts and a suggested fee. */
  priceBook: boolean;
  /** ON: "Portal request" is offered as an intake source. */
  portalIntake: boolean;
  /**
   * ON: an assigned order flows to the TECHNICIAN'S OWN APP for on-site
   * completion — arrive, quote, then do it now or defer for a part. OFF: it is
   * handled by hand from the order sheet; dispatch records the completed work
   * and there is no on-site quote at all.
   *
   * RESTORED 2026-09-21, having been cut on 2026-09-18 on the grounds that the
   * field app is a separate mobile product. It is — and that is exactly why
   * the switch has to exist: whether it is in play changes what the DISPATCH
   * screens can do. With it on, the order sheet cannot complete a job, because
   * the person holding the job is standing in front of the asset.
   */
  techApp: boolean;
  /**
   * THE TRIP EVERY JOB IS ASSUMED TO TAKE, in miles, pre-filled on a new
   * order (Pavan, 2026-09-23). Most yards bill a standard call-out distance
   * and typing the same number on every job is a question the settings have
   * already answered. **It is a default, not a lock** — dispatch or sales can
   * type over it on any order.
   *
   * 0 means "no default" and the field starts empty, which is the right
   * answer for a yard whose jobs are genuinely all different distances.
   */
  defaultMileage: number;
  /**
   * ON: before work starts the technician sends the customer a quote — parts
   * plus fees — for on-site approval. OFF: work starts straight from dispatch
   * and everything settles on the invoice afterwards.
   *
   * NESTED UNDER `techApp`, and dead without it: a quote can only be sent from
   * the field, so with no field app there is no moment at which to send one.
   */
  fieldQuote: boolean;
}

/** Everything on — the unified profile. */
export const DEFAULT_SETTINGS: ServiceSettings = {
  nativeBilling: true,
  roiFeed: true,
  managerApproval: true,
  returnMode: "continue",
  priceBook: true,
  portalIntake: true,
  defaultMileage: 18,
  techApp: true,
  fieldQuote: true,
};

/**
 * THE TWO ENDS OF THE RANGE, named. A reader turning eight switches one at a
 * time has to know what they are aiming at; these are the two configurations
 * the module was shaped around, so they are offered as one click each.
 */
export const SETTINGS_PROFILES: {
  key: string;
  name: string;
  detail: string;
  settings: ServiceSettings;
}[] = [
  {
    key: "unified",
    name: "Unified",
    detail:
      "Everything in FleetPanda — price book, manager sign-off and invoicing.",
    settings: DEFAULT_SETTINGS,
  },
  {
    key: "dispatch",
    name: "Dispatch layer",
    detail:
      "FleetPanda dispatches and records; approval and billing happen elsewhere.",
    settings: {
      nativeBilling: false,
      roiFeed: false,
      managerApproval: false,
      returnMode: "neworder",
      priceBook: false,
      portalIntake: false,
      defaultMileage: 0,
      techApp: false,
      fieldQuote: false,
    },
  },
];

let current: ServiceSettings = { ...DEFAULT_SETTINGS };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setServiceSetting<K extends keyof ServiceSettings>(
  key: K,
  value: ServiceSettings[K]
) {
  current = { ...current, [key]: value };
  /* A NESTED SWITCH CANNOT OUTLIVE ITS PARENT. Field quoting means nothing
     without a field app, and leaving it ticked under a disabled parent is how
     a reader comes back later and believes a step is running that is not. */
  if (key === "techApp" && value === false) current.fieldQuote = false;
  emit();
}

export function applyServiceProfile(settings: ServiceSettings) {
  current = { ...settings };
  emit();
}

export function useServiceSettings(): ServiceSettings {
  return React.useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => current,
    () => current
  );
}

/** For the seed and for pure helpers that cannot use a hook. */
export function readServiceSettings(): ServiceSettings {
  return current;
}
