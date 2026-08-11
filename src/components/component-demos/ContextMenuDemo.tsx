import { Stack, SectionHeading } from "@/components/typography";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
  ContextMenuCheckboxItem, ContextMenuSeparator, ContextMenuLabel,
  ContextMenuShortcut, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent,
} from "@/components/ui/context-menu";

/** ContextMenu showcase — right-click (or long-press) a target for a menu. */
export function ContextMenuDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground"><code className="text-foreground">ContextMenu</code> — right-click / long-press a target to open a menu.</p>
      <Stack space="title">
        <SectionHeading as="h3" title="Default" />
        <ContextMenu>
          <ContextMenuTrigger className="flex h-36 w-full max-w-md items-center justify-center rounded-md border border-dashed border-fp-outline-2 text-sm text-muted-foreground">
            Right-click here
          </ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            <ContextMenuLabel>Actions</ContextMenuLabel>
            <ContextMenuItem>Back<ContextMenuShortcut>⌘[</ContextMenuShortcut></ContextMenuItem>
            <ContextMenuItem>Reload<ContextMenuShortcut>⌘R</ContextMenuShortcut></ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Save page</ContextMenuItem>
                <ContextMenuItem>Print</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuCheckboxItem checked>Show bookmarks</ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenu>
      </Stack>
    </Stack>
  );
}
