import * as React from "react";
import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { SettingsPage, type SettingsSection } from "./SettingsPage";
import type { AccountUser } from "./types";

/*
  Profile — the settings-page archetype, reached from the top bar's account
  menu (Profile is deliberately not a rail destination).

  SCOPE: only the identity the app already carries is modelled here — the name,
  email and initials the top bar renders. Nothing else about the source app's
  Profile screen was captured, so no further fields are invented; the remaining
  sections land as `SettingsSection`s once they are specified.
*/

export interface ProfileScreenProps {
  user: AccountUser;
  onSave: (user: AccountUser) => void;
}

/** Initials follow the name unless they were typed over. */
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function ProfileScreen({ user, onSave }: ProfileScreenProps) {
  const [draft, setDraft] = React.useState(user);
  // A save elsewhere (or a fresh visit) re-seeds the form.
  React.useEffect(() => setDraft(user), [user]);

  const dirty =
    draft.name !== user.name ||
    draft.email !== user.email ||
    draft.fallback !== user.fallback;

  const set = <K extends keyof AccountUser>(key: K, value: AccountUser[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const sections: SettingsSection[] = [
    {
      key: "personal",
      label: "Personal info",
      icon: <UserRound />,
      description: "How you appear across the workspace.",
      content: (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {draft.avatarSrc && (
                <AvatarImage src={draft.avatarSrc} alt={draft.name} />
              )}
              <AvatarFallback className="text-lg">
                {draft.fallback}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  Upload photo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!draft.avatarSrc}
                  onClick={() => set("avatarSrc", undefined)}
                >
                  Remove
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                No photo set — the initials below stand in for one.
              </p>
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="profile-name">Full name</FieldLabel>
            <Input
              id="profile-name"
              value={draft.name}
              onChange={(e) => {
                const name = e.target.value;
                setDraft((d) => ({
                  ...d,
                  name,
                  // Initials track the name until they are typed over.
                  fallback:
                    d.fallback === initialsOf(d.name)
                      ? initialsOf(name)
                      : d.fallback,
                }));
              }}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="profile-email">Email</FieldLabel>
            <Input
              id="profile-email"
              type="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
            />
            <FieldDescription>
              Used to sign in and to address notifications.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="profile-initials">Initials</FieldLabel>
            <Input
              id="profile-initials"
              value={draft.fallback}
              maxLength={2}
              className="w-20"
              onChange={(e) =>
                set("fallback", e.target.value.toUpperCase().slice(0, 2))
              }
            />
            <FieldDescription>
              Shown in the avatar wherever no photo is set.
            </FieldDescription>
          </Field>
        </div>
      ),
    },
  ];

  return (
    <SettingsPage
      sections={sections}
      dirty={dirty}
      onSave={() => onSave(draft)}
      onDiscard={() => setDraft(user)}
    />
  );
}
