import { Settings2 } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

const DIMENSIONS = [
  { id: "width", label: "Width", value: "100%" },
  { id: "maxWidth", label: "Max. width", value: "300px" },
  { id: "height", label: "Height", value: "25px" },
  { id: "maxHeight", label: "Max. height", value: "none" },
];

/**
 * Popover showcase — Figma "Popover" (195:1621). A floating card with an
 * optional header (title + description) over a content slot. The primitive is
 * also used across the app (multi-select, bulk-action menu, filters).
 */
export function PopoverDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Popover</code> shows rich floating
        content anchored to a trigger — with an optional header (title +
        description) over the body.
      </p>

      {/* With header — the canonical "Dimensions" form */}
      <Stack space="title">
        <SectionHeading as="h3" title="With header" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Settings2 />
              Dimensions
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <div className="grid gap-4">
              <PopoverHeader>
                <PopoverTitle>Dimensions</PopoverTitle>
                <PopoverDescription>
                  Set the dimensions for the layer.
                </PopoverDescription>
              </PopoverHeader>
              <div className="grid gap-2">
                {DIMENSIONS.map((d) => (
                  <div
                    key={d.id}
                    className="grid grid-cols-3 items-center gap-4"
                  >
                    <Label htmlFor={d.id}>{d.label}</Label>
                    <Input
                      id={d.id}
                      defaultValue={d.value}
                      className="col-span-2 h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </Stack>

      {/* Without header — body only */}
      <Stack space="title">
        <SectionHeading as="h3" title="Without header" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open popover</Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
            <p className="text-sm text-muted-foreground">
              A bare popover with no header — drop any content into the body.
            </p>
          </PopoverContent>
        </Popover>
      </Stack>
    </Stack>
  );
}
