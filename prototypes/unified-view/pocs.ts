/**
 * THE PEOPLE TO CALL AT A SHIP-TO — every module's POC card reads this
 * (Pavan, 2026-10-29). INVENTED.
 */

/**
 * POC directory. The sheet picks a NAME and shows that person's phone and email
 * beside it — they are attributes of the person, never typed per order, so they
 * render read-only rather than as a second and third input to keep in sync.
 */
export const POC_DIRECTORY: Record<string, { phone: string; email: string }> = {
  "Marisol Vega": { phone: "+1-415-555-0142", email: "marisol.vega@example.com" },
  "Dwight Feeney": { phone: "+1-661-555-0188", email: "dwight.feeney@example.com" },
  "Anita Kaur": { phone: "+1-916-555-0119", email: "anita.kaur@example.com" },
  "Ray Obuya": { phone: "+1-713-555-0164", email: "ray.obuya@example.com" },
  "Colleen Marsh": { phone: "+1-918-555-0173", email: "colleen.marsh@example.com" },
  "Hector Salas": { phone: "+1-559-555-0121", email: "hector.salas@example.com" },
  "Bree Lindqvist": { phone: "+1-661-555-0135", email: "bree.lindqvist@example.com" },
  "Owen Pratt": { phone: "+1-209-555-0150", email: "owen.pratt@example.com" },
  "Tasha Greene": { phone: "+1-713-555-0186", email: "tasha.greene@example.com" },
  "Luis Ferreira": { phone: "+1-918-555-0109", email: "luis.ferreira@example.com" },
  "Mei Tanaka": { phone: "+1-916-555-0193", email: "mei.tanaka@example.com" },
  "Grant Ochoa": { phone: "+1-602-555-0127", email: "grant.ochoa@example.com" },
};

/* THE PEOPLE AT EACH SHIP-TO (Pavan, 2026-10-29) — the POC card lists the
   picked ship-to's contacts; "Add POC" puts a new one here. Three or four a
   site. INVENTED. Mutable on purpose: an added POC stays with the site. */
export const SHIP_TO_POCS: Record<string, string[]> = {
  "Bray North Yard": ["Marisol Vega", "Hector Salas", "Owen Pratt"],
  "Bray Depot 2": ["Dwight Feeney", "Bree Lindqvist", "Hector Salas"],
  "Morris Yard 4": ["Anita Kaur", "Mei Tanaka", "Owen Pratt", "Grant Ochoa"],
  "GPM Southside": ["Ray Obuya", "Tasha Greene", "Luis Ferreira"],
  "Halvorsen Main": ["Colleen Marsh", "Luis Ferreira", "Grant Ochoa"],
  "Cardinal Hub A": ["Marisol Vega", "Mei Tanaka", "Tasha Greene"],
  "Westbrook Farm 1": ["Bree Lindqvist", "Ray Obuya", "Anita Kaur"],
  "Ironline Depot": ["Dwight Feeney", "Colleen Marsh", "Grant Ochoa", "Owen Pratt"],
};

/* A SHIP-TO THE MAP DOESN'T NAME STILL HAS PEOPLE — three from the directory,
   picked by its name so it is the same three every time (no picker is ever
   empty; see the no-empty-options guard). */
const POOL = Object.keys(POC_DIRECTORY);
const hash = (str: string) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const pocsAt = (shipTo: string): string[] => {
  if (!shipTo) return [];
  if (!SHIP_TO_POCS[shipTo]) {
    const h = hash(shipTo);
    SHIP_TO_POCS[shipTo] = [0, 1, 2].map((k) => POOL[(h + k * 5) % POOL.length]);
  }
  return SHIP_TO_POCS[shipTo];
};

/** Put a new person on a ship-to and in the directory. */
export const addPoc = (shipTo: string, name: string, phone: string, email: string) => {
  POC_DIRECTORY[name] = { phone, email };
  SHIP_TO_POCS[shipTo] = [...pocsAt(shipTo).filter((n) => n !== name), name];
};