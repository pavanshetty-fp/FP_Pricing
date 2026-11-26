/*
  PRICING SAMPLE DATA — customers, ship-tos and products (Yash, 2026-11-16).
  Ported from the Pricing prototype's Price Notices seed (12 customers,
  ~260 ship-tos, 24 products) so the change log runs at the scale a tenant has.
*/

/** The prototype's clock — 10:40 AM on Tuesday 3 November 2026. */
export const NOW_MIN = 10 * 60 + 40;
export const TODAY_DOW = 2;
export const CURRENT_USER = "Yash J";

/** Stable pseudo-random in [0, 1) from a string. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}
const pick = <T,>(xs: readonly T[], seed: string) => xs[Math.floor(hash(seed) * xs.length)];

// ------------------------------------------------------------------ catalog --

export interface Contact {
  name: string;
  email: string;
  phone: string;
}

export interface Customer {
  id: string;
  name: string;
  account: string;
  salesperson: Contact;
}

export type Tz = "CT" | "ET" | "MT";

export interface ShipTo {
  id: string;
  customerId: string;
  name: string;
  account: string;
  address: string;
  tz: Tz;
  /** Added after the rules that cover it — "All ShipTos" picked it up. */
  isNew?: boolean;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export const CATEGORIES: ProductCategory[] = [
  { id: "diesel", name: "Diesel" },
  { id: "gasoline", name: "Gasoline" },
  { id: "bio", name: "Biofuels & Renewables" },
  { id: "def", name: "DEF" },
  { id: "heating", name: "Heating Fuels" },
  { id: "aviation", name: "Aviation" },
  { id: "marine", name: "Marine" },
];

const REPS: Contact[] = [
  { name: "George Leiato", email: "george.leiato@gulfstatesfuel.com", phone: "(318) 555-0142" },
  { name: "Valarie Rogers", email: "valarie.rogers@gulfstatesfuel.com", phone: "(318) 555-0187" },
  { name: "Cody McLelland", email: "cody.mclelland@gulfstatesfuel.com", phone: "(432) 555-0119" },
  { name: "Priya Nair", email: "priya.nair@gulfstatesfuel.com", phone: "(214) 555-0133" },
];

const CUSTOMER_SEED: { id: string; name: string; account: string; sites: number; region: string[] }[] = [
  { id: "onsite", name: "OnSite Concrete Solutions", account: "9873078", sites: 24, region: ["Creole, LA", "Lake Charles, LA", "Sulphur, LA", "Westlake, LA", "Jennings, LA"] },
  { id: "adamas", name: "Adamas Energy", account: "9873486", sites: 38, region: ["Lufkin, TX", "Nacogdoches, TX", "Diboll, TX", "Center, TX"] },
  { id: "mustang", name: "Mustang Well Service", account: "9870287", sites: 31, region: ["Andrews, TX", "Hobbs, NM", "Odessa, TX", "Midland, TX", "Seminole, TX"] },
  { id: "gulf", name: "Gulf Coast Fleet", account: "9871150", sites: 42, region: ["Galveston, TX", "Texas City, TX", "League City, TX", "Pasadena, TX", "Baytown, TX", "Mobile, AL"] },
  { id: "bayou", name: "Bayou Construction", account: "9874402", sites: 18, region: ["Baton Rouge, LA", "Gonzales, LA", "Denham Springs, LA", "Prairieville, LA"] },
  { id: "lonestar", name: "Lone Star Logistics", account: "9875011", sites: 27, region: ["Austin, TX", "Round Rock, TX", "San Marcos, TX", "Georgetown, TX"] },
  { id: "pelican", name: "Pelican Marine Services", account: "9875530", sites: 12, region: ["Port Fourchon, LA", "Houma, LA", "Morgan City, LA"] },
  { id: "redriver", name: "Red River Aggregates", account: "9876204", sites: 16, region: ["Shreveport, LA", "Bossier City, LA", "Minden, LA"] },
  { id: "delta-ag", name: "Delta Ag Cooperative", account: "9876719", sites: 22, region: ["Greenville, MS", "Cleveland, MS", "Indianola, MS"] },
  { id: "permian", name: "Permian Frac Partners", account: "9877350", sites: 14, region: ["Pecos, TX", "Monahans, TX", "Kermit, TX"] },
  { id: "coastal", name: "Coastal Waste Haulers", account: "9877902", sites: 9, region: ["Beaumont, TX", "Port Arthur, TX"] },
  { id: "natchez", name: "Natchez Timber Co.", account: "9878114", sites: 6, region: ["Natchez, MS", "Vidalia, LA"] },
  /* 28 MORE CUSTOMERS (Yash, 2026-11-26) — the demo at a tenant's scale:
     about 4,300 more ship-tos and 13,000 more prices, so a rule over ten
     customers reaches thousands and a run takes long enough to see. */
  { id: "acadiana", name: "Acadiana Ready Mix", account: "9879000", sites: 110, region: ["Lafayette, LA", "New Iberia, LA", "Opelousas, LA", "Crowley, LA"] },
  { id: "brazos", name: "Brazos Valley Hauling", account: "9879013", sites: 147, region: ["Bryan, TX", "College Station, TX", "Navasota, TX", "Hearne, TX"] },
  { id: "caddo", name: "Caddo Lake Farms", account: "9879026", sites: 184, region: ["Shreveport, LA", "Mooringsport, LA", "Vivian, LA"] },
  { id: "calcasieu", name: "Calcasieu Marine Fuel", account: "9879039", sites: 131, region: ["Lake Charles, LA", "Cameron, LA", "Sulphur, LA"] },
  { id: "coastal-bend", name: "Coastal Bend Logistics", account: "9879052", sites: 168, region: ["Corpus Christi, TX", "Portland, TX", "Robstown, TX", "Kingsville, TX"] },
  { id: "crescent", name: "Crescent City Paving", account: "9879065", sites: 115, region: ["New Orleans, LA", "Metairie, LA", "Kenner, LA", "Chalmette, LA"] },
  { id: "deep-south", name: "Deep South Rentals", account: "9879078", sites: 152, region: ["Mobile, AL", "Daphne, AL", "Foley, AL", "Theodore, AL"] },
  { id: "east-tx", name: "East Texas Timber", account: "9879091", sites: 189, region: ["Lufkin, TX", "Jasper, TX", "Woodville, TX"] },
  { id: "gulf-south", name: "Gulf South Utilities", account: "9879104", sites: 136, region: ["Gulfport, MS", "Biloxi, MS", "Pascagoula, MS"] },
  { id: "hill-country", name: "Hill Country Builders", account: "9879117", sites: 173, region: ["Austin, TX", "Kerrville, TX", "Fredericksburg, TX", "Boerne, TX"] },
  { id: "houma", name: "Houma Offshore Supply", account: "9879130", sites: 120, region: ["Houma, LA", "Thibodaux, LA", "Port Fourchon, LA"] },
  { id: "magnolia", name: "Magnolia Ag Partners", account: "9879143", sites: 157, region: ["Greenville, MS", "Greenwood, MS", "Clarksdale, MS"] },
  { id: "midland-basin", name: "Midland Basin Water", account: "9879156", sites: 194, region: ["Midland, TX", "Stanton, TX", "Big Spring, TX"] },
  { id: "mississippi-river", name: "Mississippi River Towing", account: "9879169", sites: 141, region: ["Baton Rouge, LA", "Vicksburg, MS", "Natchez, MS"] },
  { id: "panhandle", name: "Panhandle Cattle Co.", account: "9879182", sites: 178, region: ["Amarillo, TX", "Hereford, TX", "Dumas, TX"] },
  { id: "pecos-valley", name: "Pecos Valley Sand", account: "9879195", sites: 125, region: ["Pecos, TX", "Kermit, TX", "Monahans, TX"] },
  { id: "permian-haul", name: "Permian Crude Haulers", account: "9879208", sites: 162, region: ["Odessa, TX", "Andrews, TX", "Hobbs, NM"] },
  { id: "piney-woods", name: "Piney Woods Aggregates", account: "9879221", sites: 199, region: ["Tyler, TX", "Longview, TX", "Marshall, TX"] },
  { id: "port-arthur", name: "Port Arthur Terminals", account: "9879234", sites: 146, region: ["Port Arthur, TX", "Nederland, TX", "Groves, TX"] },
  { id: "red-stick", name: "Red Stick Construction", account: "9879247", sites: 183, region: ["Baton Rouge, LA", "Zachary, LA", "Denham Springs, LA"] },
  { id: "sabine", name: "Sabine River Energy", account: "9879260", sites: 130, region: ["Orange, TX", "Vinton, LA", "Vidor, TX"] },
  { id: "san-jacinto", name: "San Jacinto Fleet", account: "9879273", sites: 167, region: ["Houston, TX", "Baytown, TX", "Pasadena, TX", "Humble, TX"] },
  { id: "south-plains", name: "South Plains Cotton", account: "9879286", sites: 114, region: ["Lubbock, TX", "Levelland, TX", "Brownfield, TX"] },
  { id: "tejas", name: "Tejas Waste Services", account: "9879299", sites: 151, region: ["San Antonio, TX", "New Braunfels, TX", "Seguin, TX"] },
  { id: "tombigbee", name: "Tombigbee Paper", account: "9879312", sites: 188, region: ["Mobile, AL", "Jackson, AL", "Monroeville, AL"] },
  { id: "trinity", name: "Trinity Rail Services", account: "9879325", sites: 135, region: ["Dallas, TX", "Fort Worth, TX", "Ennis, TX"] },
  { id: "vermilion", name: "Vermilion Rice Growers", account: "9879338", sites: 172, region: ["Abbeville, LA", "Kaplan, LA", "Gueydan, LA"] },
  { id: "west-texas-rig", name: "West Texas Rig Services", account: "9879351", sites: 119, region: ["Midland, TX", "Odessa, TX", "Seminole, TX"] },
];

/* SITES NAMED THE WAY THE CUSTOMER WOULD (Yash, 2026-11-17: "use some
   sensible names") — the town, then the kind of site that business runs:
   "Lake Charles Batch Plant", "Houma Fuel Dock". */
const SITE_TYPES: Record<string, string[]> = {
  onsite: ["Batch Plant", "Ready-Mix Yard", "Equipment Yard", "Job Site", "Aggregate Yard"],
  mustang: ["Field Office", "Rig Yard", "Pipe Yard", "Truck Shop", "Water Station", "Supply Yard", "Field Camp"],
  gulf: ["Fleet Yard", "Truck Terminal", "Maintenance Shop", "Distribution Center", "Cross-Dock", "Trailer Yard", "Fuel Island", "Service Center"],
  bayou: ["Equipment Yard", "Job Site", "Shop", "Laydown Yard", "Material Yard"],
  lonestar: ["Distribution Center", "Truck Terminal", "Cross-Dock", "Fleet Yard", "Service Center", "Trailer Yard", "Warehouse"],
  pelican: ["Fuel Dock", "Supply Base", "Boat Yard", "Marine Terminal"],
  redriver: ["Quarry", "Sand Pit", "Crushing Plant", "Gravel Pit", "Stockpile Yard", "Asphalt Plant"],
  "delta-ag": ["Grain Elevator", "Farm Shop", "Seed Warehouse", "Gin", "Fertilizer Plant", "Equipment Shed", "Dryer Site", "Co-op Store"],
  coastal: ["Transfer Station", "Landfill", "Recycling Center", "Truck Yard", "Hauling Depot"],
  natchez: ["Sawmill", "Log Yard", "Logging Camp"],
  "acadiana": ["Batch Plant", "Ready-Mix Yard", "Truck Shop"],
  "brazos": ["Truck Yard", "Hauling Depot", "Shop"],
  "caddo": ["Farm Shop", "Grain Bin", "Equipment Shed"],
  "calcasieu": ["Fuel Dock", "Marine Terminal", "Supply Base"],
  "coastal-bend": ["Distribution Center", "Cross-Dock", "Fleet Yard"],
  "crescent": ["Asphalt Plant", "Equipment Yard", "Job Site"],
  "deep-south": ["Rental Yard", "Service Center", "Equipment Yard"],
  "east-tx": ["Sawmill", "Log Yard", "Logging Camp"],
  "gulf-south": ["Service Center", "Substation Yard", "Line Yard"],
  "hill-country": ["Job Site", "Equipment Yard", "Shop"],
  "houma": ["Supply Base", "Fuel Dock", "Boat Yard"],
  "magnolia": ["Grain Elevator", "Farm Shop", "Co-op Store"],
  "midland-basin": ["Water Station", "Disposal Well", "Pump Yard"],
  "mississippi-river": ["Fleeting Area", "Fuel Dock", "Marine Terminal"],
  "panhandle": ["Feed Yard", "Ranch Shop", "Feed Mill"],
  "pecos-valley": ["Sand Mine", "Transload Yard", "Shop"],
  "permian-haul": ["Truck Yard", "Field Office", "Crude Station"],
  "piney-woods": ["Quarry", "Gravel Pit", "Crushing Plant"],
  "port-arthur": ["Terminal", "Tank Farm", "Truck Rack"],
  "red-stick": ["Job Site", "Laydown Yard", "Equipment Yard"],
  "sabine": ["Plant", "Field Office", "Pipe Yard"],
  "san-jacinto": ["Fleet Yard", "Truck Terminal", "Maintenance Shop"],
  "south-plains": ["Gin", "Farm Shop", "Warehouse"],
  "tejas": ["Transfer Station", "Landfill", "Truck Yard"],
  "tombigbee": ["Mill", "Chip Yard", "Log Yard"],
  "trinity": ["Rail Yard", "Repair Shop", "Transload Yard"],
  "vermilion": ["Rice Dryer", "Farm Shop", "Pump Station"],
  "west-texas-rig": ["Rig Yard", "Field Office", "Supply Yard"],
};
const STREETS = ["Highway 90", "Broad St", "Industrial Pkwy", "Airline Hwy", "Main St", "County Rd 12", "Harborside Dr", "Loop 250", "FM 1960", "Timberland Dr"];
/* FRAC PADS BY LEASE (Yash, 2026-11-16: "keep realistic data") — the way
   operators name well pads: lease or unit, then the well, e.g. "Hayes Unit 2H". */
const LEASES = ["Hayes Unit", "Pecos Ranch", "Red Bluff", "Cotton Draw", "Big Spring", "Sand Dune", "Mesa Verde", "Wolfbone", "Toyah Lake", "Salt Flat"];

export const CUSTOMERS: Customer[] = CUSTOMER_SEED.map((c, i) => ({
  id: c.id,
  name: c.name,
  account: c.account,
  salesperson: REPS[i % REPS.length],
}));

const SHIPTOS_RAW: ShipTo[] = CUSTOMER_SEED.flatMap((c) =>
  Array.from({ length: c.sites }, (_, i): ShipTo => {
    const city = c.region[i % c.region.length];
    const frac = c.id === "adamas" || c.id === "permian";
    const name = frac
      ? `${LEASES[i % LEASES.length]} ${1 + Math.floor(i / LEASES.length)}H`
      : `${city.split(",")[0]} ${SITE_TYPES[c.id][Math.floor(i / c.region.length) % SITE_TYPES[c.id].length]}`;
    return {
      id: `${c.id}-${i + 1}`,
      customerId: c.id,
      name,
      account: `${c.account}/${String(i + 1).padStart(3, "0")}`,
      address: `${100 + Math.floor(hash(c.id + i + "a") * 9800)} ${pick(STREETS, c.id + i + "s")}, ${city}`,
      tz: city.endsWith("NM") ? "MT" : "CT",
      isNew: i === c.sites - 1 && hash(c.id + "new") > 0.45,
    };
  }),
);

/* ONE NAME, ONE SHIP-TO — a picker and a filter chip go by the name, so a
   repeat gets a number ("Lufkin North Yard 2"). */
const seenNames = new Map<string, number>();
export const SHIPTOS: ShipTo[] = SHIPTOS_RAW.map((st) => {
  const n = (seenNames.get(st.name) ?? 0) + 1;
  seenNames.set(st.name, n);
  return n === 1 ? st : { ...st, name: `${st.name} ${n}` };
});

export const PRODUCTS: Product[] = [
  { id: "dct", code: "DCT", name: "Diesel Clear Transport", categoryId: "diesel" },
  { id: "ddt", code: "DDT", name: "Diesel Dyed Transport", categoryId: "diesel" },
  { id: "dcb", code: "DCB", name: "Diesel Clear Short Truck", categoryId: "diesel" },
  { id: "ddb", code: "DDB", name: "Diesel Dyed Short Truck", categoryId: "diesel" },
  { id: "dob", code: "DOB", name: "Ultra Low Sulfur #2 Fuel Oil Dyed", categoryId: "diesel" },
  { id: "ulsd", code: "ULC", name: "ULSD #2 Clear", categoryId: "diesel" },
  { id: "ulsdw", code: "ULW", name: "ULSD #2 Winter Blend", categoryId: "diesel" },
  { id: "b5", code: "B05", name: "Biodiesel B5", categoryId: "bio" },
  { id: "b20", code: "B20", name: "Biodiesel B20", categoryId: "bio" },
  { id: "rd", code: "RD9", name: "Renewable Diesel R99", categoryId: "bio" },
  { id: "u87", code: "U87", name: "Unleaded 87", categoryId: "gasoline" },
  { id: "u87e", code: "E10", name: "Unleaded 87 E10", categoryId: "gasoline" },
  { id: "m89", code: "M89", name: "Midgrade 89", categoryId: "gasoline" },
  { id: "p91", code: "P91", name: "Premium 91", categoryId: "gasoline" },
  { id: "p93", code: "P93", name: "Premium 93", categoryId: "gasoline" },
  { id: "e85", code: "E85", name: "Ethanol Flex E85", categoryId: "bio" },
  { id: "def", code: "DEF", name: "Diesel Exhaust Fluid", categoryId: "def" },
  { id: "kero", code: "K1K", name: "Kerosene 1-K", categoryId: "heating" },
  { id: "avg", code: "AVG", name: "Avgas 100LL", categoryId: "aviation" },
  { id: "jeta", code: "JTA", name: "Jet A", categoryId: "aviation" },
  { id: "mgo", code: "MGO", name: "Marine Gas Oil", categoryId: "marine" },
  { id: "hfo", code: "HFO", name: "Heating Oil #2", categoryId: "heating" },
  { id: "lpg", code: "LPG", name: "Propane HD-5", categoryId: "heating" },
  { id: "r110", code: "R110", name: "Racing Fuel 110", categoryId: "gasoline" },
];

/** Each customer buys from a family of products; each ShipTo prices some of it. */
export const FAMILY: Record<string, string[]> = {
  onsite: ["dct", "ddt", "dcb", "ddb", "def", "b5", "ulsd"],
  adamas: ["dcb", "ddt", "dob", "ddb", "def", "ulsdw", "rd"],
  mustang: ["dct", "ddt", "dcb", "def", "ulsd", "b20"],
  gulf: ["dct", "ddt", "u87", "u87e", "m89", "p91", "def", "b5", "rd"],
  bayou: ["ddt", "dob", "dcb", "def", "ulsd"],
  lonestar: ["u87", "u87e", "m89", "p91", "p93", "dct", "def", "e85"],
  pelican: ["mgo", "dct", "ddt", "def", "kero"],
  redriver: ["ddt", "dcb", "ddb", "def", "ulsdw"],
  "delta-ag": ["ddt", "dob", "u87", "lpg", "hfo", "def"],
  permian: ["dcb", "ddt", "ddb", "def", "rd", "ulsdw"],
  coastal: ["dct", "b20", "def", "u87"],
  natchez: ["ddt", "dob", "kero", "lpg"],
};

/* BULK-RULE VOLUME (Yash, 2026-11-26) — the extra customers and ship-tos the
   bulk rule engine generates so "All customers · All ship-tos" passes 50K
   records. Registered here so their names read; no other screen lists them. */
const VOLUME_CUSTOMERS = new Map<string, Customer>();
const VOLUME_SHIPTOS = new Map<string, ShipTo>();
export function registerVolume(customers: Customer[], shiptos: ShipTo[]) {
  customers.forEach((c) => VOLUME_CUSTOMERS.set(c.id, c));
  shiptos.forEach((s) => VOLUME_SHIPTOS.set(s.id, s));
}
export const customerOf = (id: string) => VOLUME_CUSTOMERS.get(id) ?? CUSTOMERS.find((c) => c.id === id)!;
export const shiptoOf = (id: string) => VOLUME_SHIPTOS.get(id) ?? SHIPTOS.find((s) => s.id === id)!;
export const productOf = (id: string) => PRODUCTS.find((p) => p.id === id)!;
export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id)!;
export const shiptosOfCustomer = (customerId: string) => SHIPTOS.filter((s) => s.customerId === customerId);
/** ShipTo names repeat inside a customer, so a picker's option key carries the
 *  address; the list shows the name with the address on a line under it. */
export const shiptoKey = (s: ShipTo) => `${s.name} — ${s.address}`;
export function shiptoChoices(list: ShipTo[]) {
  return {
    options: list.map(shiptoKey),
    labels: Object.fromEntries(list.map((s) => [shiptoKey(s), s.name])),
    notes: Object.fromEntries(list.map((s) => [shiptoKey(s), s.address])),
  };
}
/** "City" and "ST" out of a "123 Street, City, ST" address — for location filters. */
export const cityOf = (s: ShipTo) => s.address.split(", ").slice(-2, -1)[0] ?? "";
export const stateOf = (s: ShipTo) => s.address.split(", ").slice(-1)[0] ?? "";
export const STATES = [...new Set(SHIPTOS.map(stateOf))].sort();
export const CITIES = [...new Set(SHIPTOS.map(cityOf))].sort();
