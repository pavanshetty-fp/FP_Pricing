import * as React from "react";
import { Stack, SectionHeading } from "@/components/typography";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

/**
 * Menubar showcase — Figma "Menubar" (210:2486). A desktop app-style bar with
 * standard items + shortcuts, checkbox and radio items, a submenu, separators
 * and a destructive item.
 */
export function MenubarDemo() {
  const [showStatusBar, setShowStatusBar] = React.useState(true);
  const [showActivityBar, setShowActivityBar] = React.useState(false);
  const [profile, setProfile] = React.useState("pavan");

  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Menubar</code> is a desktop
        application menu bar — a row of menus with items, shortcuts, checkbox /
        radio items, submenus and separators.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="Application menu" />
        <Menubar>
          {/* File */}
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                New Tab <MenubarShortcut>⌘T</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                New Window <MenubarShortcut>⌘N</MenubarShortcut>
              </MenubarItem>
              <MenubarItem disabled>New Incognito Window</MenubarItem>
              <MenubarSeparator />
              <MenubarSub>
                <MenubarSubTrigger>Share</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Email link</MenubarItem>
                  <MenubarItem>Messages</MenubarItem>
                  <MenubarItem>Notes</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarSeparator />
              <MenubarItem>
                Print… <MenubarShortcut>⌘P</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem variant="destructive">
                Delete file <MenubarShortcut>⌫</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* Edit */}
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                Undo <MenubarShortcut>⌘Z</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Cut</MenubarItem>
              <MenubarItem>Copy</MenubarItem>
              <MenubarItem>Paste</MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* View — checkbox items */}
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem
                checked={showStatusBar}
                onCheckedChange={setShowStatusBar}
              >
                Status Bar
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                checked={showActivityBar}
                onCheckedChange={setShowActivityBar}
              >
                Activity Bar
              </MenubarCheckboxItem>
              <MenubarSeparator />
              <MenubarItem inset>
                Reload <MenubarShortcut>⌘R</MenubarShortcut>
              </MenubarItem>
              <MenubarItem inset>Toggle Fullscreen</MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* Profiles — radio group */}
          <MenubarMenu>
            <MenubarTrigger>Profiles</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup value={profile} onValueChange={setProfile}>
                <MenubarRadioItem value="pavan">Pavan S</MenubarRadioItem>
                <MenubarRadioItem value="shadcn">shadcn</MenubarRadioItem>
                <MenubarRadioItem value="guest">Guest</MenubarRadioItem>
              </MenubarRadioGroup>
              <MenubarSeparator />
              <MenubarItem inset>Edit…</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        <p className="text-xs text-muted-foreground">
          Status Bar: {showStatusBar ? "on" : "off"} · Activity Bar:{" "}
          {showActivityBar ? "on" : "off"} · Profile: {profile}
        </p>
      </Stack>
    </Stack>
  );
}
