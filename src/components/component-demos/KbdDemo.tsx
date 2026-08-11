import { Stack, SectionHeading } from "@/components/typography";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

/** Kbd showcase — keyboard keys and shortcut combinations. */
export function KbdDemo() {
  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Kbd</code> — keyboard keys;{" "}
        <code className="text-foreground">KbdGroup</code> for combinations.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="Single keys" />
        <div className="flex flex-wrap gap-2">
          <Kbd>⌘</Kbd><Kbd>⇧</Kbd><Kbd>⌥</Kbd><Kbd>⌃</Kbd><Kbd>Esc</Kbd><Kbd>Enter</Kbd><Kbd>Tab</Kbd>
        </div>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="Combinations" />
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">Command palette <KbdGroup><Kbd>⌘</Kbd><Kbd>K</Kbd></KbdGroup></span>
          <span className="flex items-center gap-2">Save <KbdGroup><Kbd>⌘</Kbd><Kbd>S</Kbd></KbdGroup></span>
        </div>
      </Stack>
    </Stack>
  );
}
