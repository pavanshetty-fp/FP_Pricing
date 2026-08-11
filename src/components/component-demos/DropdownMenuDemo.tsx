import { User, CreditCard, LogOut, Plus } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator,
  DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

/** Dropdown menu showcase — items, checkbox items, submenu, labels. */
export function DropdownMenuDemo() {
  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">DropdownMenu</code> — trigger a set of
        actions/toggles: items, checkbox items, a submenu, labels and separators.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="Default" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline">Open menu</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuItem><User />Profile<DropdownMenuShortcut>⌘P</DropdownMenuShortcut></DropdownMenuItem>
            <DropdownMenuItem><CreditCard />Billing</DropdownMenuItem>
            <DropdownMenuCheckboxItem checked>Notifications</DropdownMenuCheckboxItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><Plus />Invite</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Email</DropdownMenuItem>
                <DropdownMenuItem>Message</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive"><LogOut />Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Stack>
    </Stack>
  );
}
