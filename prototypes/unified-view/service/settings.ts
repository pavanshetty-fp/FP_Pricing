import * as React from "react";

/*
  THE SERVICE MODULE'S SWITCH POINTS.

  Eight of them, and between them they describe every customer this module has
  to fit. They are NOT preferences: each one turns a whole step of the flow on
  or off — whether there is a field app at all, whether a job is quoted before
  it is done, whether a manager signs it off, whether an invoice writes itself.
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

export type ReturnMode = "spawn" | "rollforward";

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
  /**
   * What happens when a job stalls for a part. `spawn` creates a linked
   * return-visit order and leaves this one Parts-pending; `rollforward` keeps
   * this order and moves it to the next day.
   */
  returnMode: ReturnMode;
  /** ON: a work type arrives with its usual parts and a suggested fee. */
  priceBook: boolean;
  /**
   * ON: assigned work goes to the technician's own app — arrive, quote, record.
   * OFF: there is no field app, and dispatch records the finished work itself.
   */
  serviceTechApp: boolean;
  /**
   * ON: before starting, the technician sends the customer a quote — parts and
   * the predefined fee — for approval on site. Only meaningful with the
   * technician app on.
   */
  fieldQuote: boolean;
  /** ON: "Portal request" is offered as an intake source. */
  portalIntake: boolean;
}

/** Everything on — the unified profile. */
export const DEFAULT_SETTINGS: ServiceSettings = {
  nativeBilling: true,
  roiFeed: true,
  managerApproval: true,
  returnMode: "spawn",
  priceBook: true,
  serviceTechApp: true,
  fieldQuote: true,
  portalIntake: true,
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
      "Everything in FleetPanda — field app, on-site quoting, manager sign-off and invoicing.",
    settings: DEFAULT_SETTINGS,
  },
  {
    key: "dispatch",
    name: "Dispatch layer",
    detail:
      "FleetPanda dispatches and records; quoting, approval and billing happen elsewhere.",
    settings: {
      nativeBilling: false,
      roiFeed: false,
      managerApproval: false,
      returnMode: "rollforward",
      priceBook: false,
      serviceTechApp: false,
      fieldQuote: false,
      portalIntake: false,
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
  /* FIELD QUOTING CANNOT OUTLIVE THE APP IT LIVES IN. Turning the technician
     app off leaves the nested switch describing a step that no longer exists,
     so it goes off with it — and the screen shows it disabled rather than
     silently lying. */
  if (key === "serviceTechApp" && value === false) {
    current = { ...current, fieldQuote: false };
  }
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
