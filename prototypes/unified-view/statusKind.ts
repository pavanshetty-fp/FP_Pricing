import type { StatusTone } from "@/components/ui/status-chip";

/**
 * WHAT KIND OF STATE A STATUS IS — the one colour rule for every status badge in
 * Unified View, in every module: sales, 3PL, service, and whatever comes next
 * (Pavan, 2026-09-23). The rule is `docs/ds/ui/2-rules.md` §10b; the binding of
 * each module's statuses is `docs/unified-view/1-components.md` §Status kinds.
 *
 * FIVE KINDS, AND THEY ARE ABOUT WHAT THE READER SHOULD DO, not about where the
 * status sits in its lifecycle:
 *
 *   caution   WAITING ON SOMEBODY — pending, awaiting, not yet looked at
 *   info      SIMPLY TRUE — somebody is on it, it is under way. Asks nothing
 *   success   DONE — the thing it was for has happened
 *   critical  A WARNING, or a state important enough to change a plan
 *   neutral   NEITHER — a record that exists and is not yet a state; an end
 *             that is not an outcome (Cancelled, Ended)
 *
 * A MODULE DECLARES KINDS, NEVER TONES. `StatusChip`'s tones are the DS's
 * channels and their names are hues-in-disguise (`processing` is amber); a map
 * written in them is a map written in colours, which is how "Assigned" came to
 * be green in sales and amber in 3PL. `npm run eval` fails a status map or a
 * chip that names a tone directly.
 */
export type StatusKind = "caution" | "info" | "success" | "critical" | "neutral";

/** Kind → the DS channel that draws it. The only place the two meet. */
export const KIND_TONE: Record<StatusKind, StatusTone> = {
  caution: "processing",
  info: "info",
  success: "success",
  critical: "failed",
  neutral: "neutral",
};

export function kindTone(kind: StatusKind): StatusTone {
  return KIND_TONE[kind];
}

/**
 * A module's status → kind map, handed back as tones so call sites keep
 * passing `tone={X_TONE[status]}`. The declaration is in kinds; the type
 * checker holds every status to one of the five.
 */
export function statusTones<S extends string>(
  kinds: Record<S, StatusKind>,
): Record<S, StatusTone> {
  const out = {} as Record<S, StatusTone>;
  for (const k in kinds) out[k] = KIND_TONE[kinds[k]];
  return out;
}

/** Active / inactive, for any record that is simply on or off — a customer, a
 *  vendor, a technician, a directory row. Being active asks nothing, so it is
 *  `info`, not `success`: nothing has been achieved by a customer existing. */
export const ACTIVE_KIND = (active: boolean): StatusKind =>
  active ? "info" : "neutral";
