/*
  Groupable dimensions for the Vendors list.

  NO MEASURE. Safety score and distance are properties of one vendor, not
  quantities that add up: a summed distance is meaningless and an averaged
  safety score would be a different statistic sitting where a total goes. The
  screen passes no `measureOf`, so every group header carries its count alone —
  which the DS now supports rather than printing a "0" that reads as "none".
*/
import type { GroupDim } from "@/components/tables-layout";
import {
  BUSINESS_LINES,
  distanceBand,
  DISTANCE_BANDS,
  safetyBand,
  SAFETY_BANDS,
  type Vendor,
} from "./vendors";

export const VENDOR_GROUP_DIMS: GroupDim<Vendor>[] = [
  {
    key: "lines",
    label: "Business lines",
    /* A carrier that runs three lines belongs to three groups — the counts add
       up past the list total, and the footer says so. */
    multi: true,
    order: [...BUSINESS_LINES],
    valuesOf: (v) => v.businessLines,
  },
  {
    key: "safety",
    label: "Safety score",
    hides: "safety",
    /* Bands, not the raw number: grouping by a 0–100 score makes one group per
       vendor. The bands are the question anyone actually asks. */
    order: [...SAFETY_BANDS],
    valuesOf: (v) => [safetyBand(v.safetyScore)],
  },
  {
    key: "distance",
    label: "Distance",
    hides: "distance",
    order: [...DISTANCE_BANDS],
    valuesOf: (v) => [distanceBand(v.distanceMi)],
  },
  {
    key: "emails",
    label: "Emails",
    hides: "emails",
    // "Off" first: the group worth finding is the one that will never be told.
    order: ["Off", "On"],
    valuesOf: (v) => [v.emailsEnabled ? "On" : "Off"],
  },
  {
    key: "account",
    label: "Vendor app",
    hides: "account",
    order: ["Link only", "Has account"],
    valuesOf: (v) => [v.hasAccount ? "Has account" : "Link only"],
  },
  {
    key: "base",
    label: "Base",
    valuesOf: (v) => [v.base],
  },
];
