import * as React from "react";
import { PORTAL_ACTOR } from "./orders";

/*
  TEAM & ACCESS (Pavan, 2026-10-14) — the customer's own portal users, after
  the FleetPanda portal's user record (demo account, structure only):
  first/last name, job title, email, phone, role, invitation status, last
  login, deactivated. No account switcher yet, so a user here belongs to
  this one account.

  INVITATION STATUS is the real product's: Active (signed in at least once)
  or Pending (invited, not yet signed in). DEACTIVATED is a date, separate
  from it — a deactivated user keeps their history.

  ROLES: the real data only shows "manager"; Buyer and Viewer are INVENTED
  until the real list is known. INVENTED people throughout, except the
  prototype's own signed-in user.
*/

export const PORTAL_ROLES = ["Manager", "Buyer", "Viewer"] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];
export type InvitationStatus = "Active" | "Pending";

export interface PortalUser {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  role: PortalRole;
  invitationStatus: InvitationStatus;
  /** ISO, or null — never signed in. */
  lastLoginAt: string | null;
  /** ISO, or null — active. */
  deactivatedAt: string | null;
  /** ISO — when the invitation was sent. */
  invitedAt: string;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const USERS: PortalUser[] = [
  { id: "u-1", firstName: "Pavan", lastName: "Shetty", jobTitle: "Fleet manager", email: "pavan@cardinal-logistics.example", phone: "(713) 555-0101", role: "Manager", invitationStatus: "Active", lastLoginAt: hoursAgo(0.2), deactivatedAt: null, invitedAt: hoursAgo(24 * 120) },
  { id: "u-2", firstName: "Rosa", lastName: "Delgado", jobTitle: "Site lead, Hub A", email: "rosa@cardinal-logistics.example", phone: "(713) 555-0142", role: "Buyer", invitationStatus: "Active", lastLoginAt: hoursAgo(5), deactivatedAt: null, invitedAt: hoursAgo(24 * 90) },
  { id: "u-3", firstName: "Mike", lastName: "Turner", jobTitle: "Site lead, Hub B", email: "mike@cardinal-logistics.example", phone: "(281) 555-0187", role: "Buyer", invitationStatus: "Active", lastLoginAt: hoursAgo(30), deactivatedAt: null, invitedAt: hoursAgo(24 * 88) },
  { id: "u-4", firstName: "Dee", lastName: "Park", jobTitle: "Operations", email: "dee@cardinal-logistics.example", phone: "(713) 555-0119", role: "Manager", invitationStatus: "Active", lastLoginAt: hoursAgo(24 * 6), deactivatedAt: null, invitedAt: hoursAgo(24 * 80) },
  { id: "u-5", firstName: "Grace", lastName: "Liu", jobTitle: "Accounts payable", email: "grace@cardinal-logistics.example", phone: "(713) 555-0166", role: "Viewer", invitationStatus: "Active", lastLoginAt: hoursAgo(24 * 2), deactivatedAt: null, invitedAt: hoursAgo(24 * 60) },
  { id: "u-6", firstName: "Omar", lastName: "Haddad", jobTitle: "Night supervisor", email: "omar@cardinal-logistics.example", phone: "(832) 555-0174", role: "Buyer", invitationStatus: "Pending", lastLoginAt: null, deactivatedAt: null, invitedAt: hoursAgo(26) },
  { id: "u-7", firstName: "Tom", lastName: "Becker", jobTitle: "Former site lead", email: "tom@cardinal-logistics.example", phone: "(281) 555-0133", role: "Buyer", invitationStatus: "Active", lastLoginAt: hoursAgo(24 * 41), deactivatedAt: hoursAgo(24 * 35), invitedAt: hoursAgo(24 * 200) },
];

/** The signed-in user — the prototype's actor. */
export const ME = USERS.find((u) => `${u.firstName} ${u.lastName}` === PORTAL_ACTOR)?.id ?? "u-1";

export const fullName = (u: Pick<PortalUser, "firstName" | "lastName">) => `${u.firstName} ${u.lastName}`.trim();

/* ------------------------------------------------------------- store --- */

let snapshot: PortalUser[] = [...USERS];
const listeners = new Set<() => void>();
const emit = () => {
  snapshot = [...USERS];
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useUsers(): PortalUser[] {
  return React.useSyncExternalStore(subscribe, () => snapshot);
}

export type UserDraft = Pick<PortalUser, "firstName" | "lastName" | "jobTitle" | "email" | "phone" | "role">;
export const blankUser = (): UserDraft => ({ firstName: "", lastName: "", jobTitle: "", email: "", phone: "", role: "Buyer" });

/** Invite — the user exists at once, Pending until they sign in. */
export function inviteUser(d: UserDraft): PortalUser {
  const u: PortalUser = {
    ...d,
    id: `u-${Date.now().toString(36)}`,
    invitationStatus: "Pending",
    lastLoginAt: null,
    deactivatedAt: null,
    invitedAt: new Date().toISOString(),
  };
  USERS.unshift(u);
  emit();
  return u;
}

export function updateUser(id: string, d: Partial<PortalUser>) {
  const i = USERS.findIndex((u) => u.id === id);
  if (i < 0) return;
  USERS[i] = { ...USERS[i], ...d };
  emit();
}

export const setDeactivated = (id: string, on: boolean) =>
  updateUser(id, { deactivatedAt: on ? new Date().toISOString() : null });

export const resendInvite = (id: string) => updateUser(id, { invitedAt: new Date().toISOString() });

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
