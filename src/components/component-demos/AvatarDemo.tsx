import { Stack, SectionHeading } from "@/components/typography";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

/** Avatar showcase — image + fallback, sizes, and a stacked group. */
export function AvatarDemo() {
  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Avatar</code> — user image with
        fallback initials; sizes and a stacked group.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="Image + fallback" />
        <div className="flex items-center gap-4">
          <Avatar><AvatarImage src="https://github.com/shadcn.png" alt="" /><AvatarFallback>CN</AvatarFallback></Avatar>
          <Avatar><AvatarFallback>PS</AvatarFallback></Avatar>
        </div>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="Sizes" />
        <div className="flex items-center gap-4">
          <Avatar className="size-6"><AvatarFallback className="text-[10px]">S</AvatarFallback></Avatar>
          <Avatar className="size-8"><AvatarFallback className="text-xs">M</AvatarFallback></Avatar>
          <Avatar className="size-10"><AvatarFallback>L</AvatarFallback></Avatar>
          <Avatar className="size-14"><AvatarFallback className="text-lg">XL</AvatarFallback></Avatar>
        </div>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="Group" />
        <div className="flex -space-x-2">
          {["A", "B", "C"].map((x) => (
            <Avatar key={x} className="ring-2 ring-fp-surface-1b"><AvatarFallback>{x}</AvatarFallback></Avatar>
          ))}
          <Avatar className="ring-2 ring-fp-surface-1b"><AvatarFallback className="bg-fp-card-1 text-xs">+5</AvatarFallback></Avatar>
        </div>
      </Stack>
    </Stack>
  );
}
