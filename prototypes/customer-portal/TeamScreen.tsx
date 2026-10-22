import * as React from "react";
import { UsersRound } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { Pill } from "@/components/ui/pill";
import { DATE_FMT } from "../unified-view/data";
import { kindTone } from "../unified-view/statusKind";
import { TwoLineCell, type ListColumn } from "../unified-view/ListTable";
import { PortalList } from "./PortalList";
import { UserSheet, userStateKind } from "./UserSheet";
import { PORTAL_ROLES, fullName, useUsers, type PortalUser } from "./users";

/*
  TEAM & ACCESS (Pavan, 2026-10-14) — the customer's portal users: name,
  role, invitation status, last login, deactivated. Invite user is the
  create; a row opens the user. The portal list, as everywhere.
*/

const LAST = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const ago = (iso: string) => {
  const h = (Date.now() - Date.parse(iso)) / 3_600_000;
  if (h < 1) return "Just now";
  if (h < 24) return `${Math.floor(h)} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
};

type UK = "name" | "role" | "phone" | "invite" | "lastLogin" | "deactivated" | "actions";
const COLUMNS: ListColumn<UK>[] = [
  { key: "name", label: "Name", width: 220, sortable: true },
  { key: "role", label: "Role", width: 100, sortable: true },
  { key: "phone", label: "Phone", width: 130, sortable: true },
  { key: "invite", label: "Invite Status", width: 120, sortable: true },
  { key: "lastLogin", label: "Last Login", width: 120, sortable: true },
  { key: "deactivated", label: "Deactivated", width: 120, sortable: true },
  { key: "actions", label: "", width: 44 },
];

const text = (u: PortalUser, k: UK): string => {
  switch (k) {
    case "name":
      return `${fullName(u)} ${u.email} ${u.jobTitle}`;
    case "role":
      return u.role;
    case "phone":
      return u.phone;
    case "invite":
      return u.invitationStatus;
    case "lastLogin":
      return u.lastLoginAt ? LAST.format(new Date(u.lastLoginAt)) : "Never";
    case "deactivated":
      return u.deactivatedAt ? DATE_FMT.format(new Date(u.deactivatedAt)) : "";
    default:
      return "";
  }
};

export function TeamScreen() {
  const users = useUsers();
  const [open, setOpen] = React.useState<{ id: string | null } | null>(null);
  const muted = <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PortalList<PortalUser, UK>
        rows={users}
        columns={COLUMNS}
        rowId={(u) => u.id}
        text={text}
        sortValue={(u, k) =>
          k === "lastLogin" ? (u.lastLoginAt ?? "") : k === "deactivated" ? (u.deactivatedAt ?? "") : undefined
        }
        renderCell={(u, k) => {
          switch (k) {
            case "name":
              return <TwoLineCell title={fullName(u)} description={u.email} />;
            case "role":
              return <Pill>{u.role}</Pill>;
            case "phone":
              return u.phone ? <span className="text-sm tabular-nums">{u.phone}</span> : muted;
            case "invite":
              return (
                <StatusChip tone={kindTone(u.invitationStatus === "Pending" ? "caution" : "success")} variant="text">
                  {u.invitationStatus}
                </StatusChip>
              );
            case "lastLogin":
              return u.lastLoginAt ? (
                <TwoLineCell title={ago(u.lastLoginAt)} description={LAST.format(new Date(u.lastLoginAt))} />
              ) : (
                <span className="text-sm text-muted-foreground">Never</span>
              );
            case "deactivated":
              return u.deactivatedAt ? (
                <StatusChip tone={kindTone(userStateKind(u))} variant="text">
                  {DATE_FMT.format(new Date(u.deactivatedAt))}
                </StatusChip>
              ) : (
                muted
              );
            default:
              return null;
          }
        }}
        facets={[
          { key: "role", label: "Role", options: [...PORTAL_ROLES] },
          { key: "invite", label: "Invite status", options: ["Active", "Pending"] },
          { key: "state", label: "Account", options: ["Active", "Deactivated"] },
        ]}
        facetValues={(u, f) =>
          f === "role" ? [u.role] : f === "invite" ? [u.invitationStatus] : f === "state" ? [u.deactivatedAt ? "Deactivated" : "Active"] : []
        }
        storageKey="portal-team"
        noun="users"
        nounOne="user"
        searchPlaceholder="Search names, emails, job titles…"
        ctaLabel="Invite user"
        onCreate={() => setOpen({ id: null })}
        onOpen={(u) => setOpen({ id: u.id })}
        openLabel={(u) => `Open user ${fullName(u)}`}
        emptyIcon={<UsersRound />}
      />
      <UserSheet
        user={open?.id ? (users.find((u) => u.id === open.id) ?? null) : null}
        open={open !== null}
        creating={open !== null && open.id === null}
        onOpenChange={(o) => !o && setOpen(null)}
      />
    </div>
  );
}
