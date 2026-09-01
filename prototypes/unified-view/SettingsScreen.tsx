import { SlidersHorizontal } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/*
  Settings — the second account-menu page, alongside Profile.

  It is a real destination with no sections yet: nothing about the source app's
  Settings screen was captured, and inventing switches here would put app
  decisions on screen that nobody made. It renders on `SettingsPage` the moment
  the section list is specified — the scaffold is already built and Profile
  proves it.
*/
export function SettingsScreen() {
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SlidersHorizontal />
        </EmptyMedia>
        <EmptyTitle>Settings</EmptyTitle>
        <EmptyDescription>
          The page exists; its sections haven't been specified yet.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
