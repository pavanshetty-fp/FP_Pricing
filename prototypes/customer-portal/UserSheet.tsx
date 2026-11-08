import * as React from "react";
import { DetailViewMenuItem } from "../unified-view/RecordSheet";
import { toast } from "sonner";
import { Ban, MoreHorizontal, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { StatusChip } from "@/components/ui/status-chip";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DATE_FMT } from "../unified-view/data";
import { kindTone } from "../unified-view/statusKind";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "../unified-view/RecordSheet";
import { type PendingItem } from "../unified-view/PendingStrip";
import {
  ME,
  PORTAL_ROLES,
  blankUser,
  fullName,
  inviteUser,
  isEmail,
  resendInvite,
  setDeactivated,
  updateUser,
  type PortalRole,
  type PortalUser,
  type UserDraft,
} from "./users";

/*
  THE USER SHEET (Pavan, 2026-10-14) — invite a user (create, the act is
  "Send invite"), or open one: their details autosave; their state is shown
  as facts (invitation, last login, deactivated); the ⋯ menu resends a
  pending invite and deactivates / reactivates. You cannot deactivate
  yourself.
*/

const WHEN = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export const userStateKind = (u: PortalUser) =>
  u.deactivatedAt ? ("neutral" as const) : u.invitationStatus === "Pending" ? ("caution" as const) : ("success" as const);

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <SheetField label={label}>
      <div className="flex min-h-9 flex-col justify-center text-sm text-foreground">{children}</div>
    </SheetField>
  );
}

const draftOf = (u: PortalUser): UserDraft => ({
  firstName: u.firstName,
  lastName: u.lastName,
  jobTitle: u.jobTitle,
  email: u.email,
  phone: u.phone,
  role: u.role,
});

export function UserSheet({
  user,
  open,
  creating,
  onOpenChange,
}: {
  user: PortalUser | null;
  open: boolean;
  creating: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = React.useState<UserDraft | null>(null);
  const lastSaved = React.useRef<string | null>(null);
  const key = creating ? "new" : (user?.id ?? null);
  React.useEffect(() => {
    if (!open) {
      setDraft(null);
      return;
    }
    const d = creating ? blankUser() : user ? draftOf(user) : null;
    lastSaved.current = JSON.stringify(d);
    setDraft(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  /* AUTOSAVE — an existing user only. */
  React.useEffect(() => {
    if (creating || !user || !draft) return;
    const shape = JSON.stringify(draft);
    if (shape === lastSaved.current) return;
    const t = window.setTimeout(() => {
      lastSaved.current = shape;
      updateUser(user.id, draft);
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, user, creating]);
  const saveState = useDraftSaveState(draft, open && !creating);

  if (!draft) return null;
  const set = <K extends keyof UserDraft>(k: K, v: UserDraft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const pending: PendingItem[] = [
    !draft.firstName.trim() && { key: "first", label: "Enter the first name", target: "user-details" },
    !draft.lastName.trim() && { key: "last", label: "Enter the last name", target: "user-details" },
    !isEmail(draft.email) && { key: "email", label: "Enter a valid email", target: "user-details" },
  ].filter(Boolean) as PendingItem[];

  const deactivated = Boolean(user?.deactivatedAt);
  const self = user?.id === ME;
  const stateLabel = user ? (deactivated ? "Deactivated" : user.invitationStatus) : "";

  return (
    <RecordSheet
      size="form"
      open={open}
      onOpenChange={onOpenChange}
      mode={creating ? "create" : "edit"}
      editTitle={user ? fullName(user) : "User"}
      createTitle="Invite user"
      createAction="Send invite"
      showCancel={false}
      pending={creating ? pending : undefined}
      footerPrimary={creating ? undefined : null}
      headerAside={
        <span className="flex items-center gap-2">
          {user && (
            <StatusChip tone={kindTone(userStateKind(user))} variant="text">
              {stateLabel}
            </StatusChip>
          )}
          {saveState !== "idle" && <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} />}
        </span>
      }
      headerMenu={
        creating || !user ? undefined : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More user actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DetailViewMenuItem />
              {user.invitationStatus === "Pending" && !deactivated && (
                <DropdownMenuItem
                  onSelect={() => {
                    resendInvite(user.id);
                    toast.success(`Invite sent again to ${user.email}`);
                  }}
                >
                  <Send />
                  Resend invite
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                disabled={self}
                onSelect={() => {
                  setDeactivated(user.id, !deactivated);
                  toast.success(`${fullName(user)} ${deactivated ? "reactivated" : "deactivated"}`);
                }}
              >
                {deactivated ? <RotateCcw /> : <Ban />}
                {deactivated ? "Reactivate user" : "Deactivate user"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
      onSubmit={() => {
        const u = inviteUser(draft);
        toast.success(`Invite sent to ${u.email}`);
      }}
    >
      <div className="flex min-w-0 flex-col gap-10">
        <SheetSection id="user-details" title="Details">
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="First name" required>
              <Input value={draft.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </SheetField>
            <SheetField label="Last name" required>
              <Input value={draft.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </SheetField>
            <SheetField label="Email" required>
              <Input
                type="email"
                value={draft.email}
                placeholder="name@company.com"
                disabled={!creating}
                onChange={(e) => set("email", e.target.value)}
              />
            </SheetField>
            <SheetField label="Phone">
              <Input type="tel" value={draft.phone} placeholder="(713) 555-0100" onChange={(e) => set("phone", e.target.value)} />
            </SheetField>
            <SheetField label="Job title">
              <Input value={draft.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
            </SheetField>
            <SheetField label="Role" required>
              <Combobox
                className="w-full"
                value={draft.role}
                onValueChange={(v) => v && set("role", v as PortalRole)}
                options={[...PORTAL_ROLES]}
                searchThreshold={99}
              />
            </SheetField>
          </div>
        </SheetSection>

        {user && (
          <SheetSection title="Access">
            <div className="grid grid-cols-3 gap-4">
              <Fact label="Invitation">
                <span>{user.invitationStatus}</span>
                <span className="text-xs text-muted-foreground">Sent {DATE_FMT.format(new Date(user.invitedAt))}</span>
              </Fact>
              <Fact label="Last login">
                {user.lastLoginAt ? WHEN.format(new Date(user.lastLoginAt)) : <span className="text-muted-foreground">Never</span>}
              </Fact>
              <Fact label="Deactivated">
                {user.deactivatedAt ? DATE_FMT.format(new Date(user.deactivatedAt)) : <span className="text-muted-foreground">—</span>}
              </Fact>
            </div>
          </SheetSection>
        )}
      </div>
    </RecordSheet>
  );
}
