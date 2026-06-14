import { Globe } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** A labelled example. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

const FRUITS = ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"];

/**
 * Select showcase — Figma "Select" (345:11530). Covers the Size (default / sm)
 * and State (Default / Filled / Disabled / Invalid) variants, the Show Icon
 * trigger, and a grouped menu with labels + separators.
 */
export function SelectDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Select</code> presents a list of
        options in a dropdown. The trigger carries the size and state; the
        content holds grouped, labelled items.
      </p>

      {/* Sizes */}
      <Stack space="title">
        <SectionHeading as="h3" title="Sizes" />
        <div className="flex flex-wrap items-end gap-4">
          <Row label="default">
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a fruit" />
              </SelectTrigger>
              <SelectContent>
                {FRUITS.map((f) => (
                  <SelectItem key={f} value={f.toLowerCase()}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="sm">
            <Select>
              <SelectTrigger size="sm" className="w-[180px]">
                <SelectValue placeholder="Select a fruit" />
              </SelectTrigger>
              <SelectContent>
                {FRUITS.map((f) => (
                  <SelectItem key={f} value={f.toLowerCase()}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        </div>
      </Stack>

      {/* States */}
      <Stack space="title">
        <SectionHeading as="h3" title="States" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Row label="Default">
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Placeholder" />
              </SelectTrigger>
              <SelectContent>
                {FRUITS.map((f) => (
                  <SelectItem key={f} value={f.toLowerCase()}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Filled">
            <Select defaultValue="banana">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FRUITS.map((f) => (
                  <SelectItem key={f} value={f.toLowerCase()}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Disabled">
            <Select disabled>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Placeholder" />
              </SelectTrigger>
            </Select>
          </Row>
          <Row label="Invalid">
            <Select>
              <SelectTrigger aria-invalid className="w-full">
                <SelectValue placeholder="Placeholder" />
              </SelectTrigger>
              <SelectContent>
                {FRUITS.map((f) => (
                  <SelectItem key={f} value={f.toLowerCase()}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        </div>
      </Stack>

      {/* With icon */}
      <Stack space="title">
        <SectionHeading as="h3" title="With leading icon" />
        <Select defaultValue="utc">
          <SelectTrigger className="w-[220px]">
            <Globe />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="utc">UTC</SelectItem>
            <SelectItem value="ist">India (IST)</SelectItem>
            <SelectItem value="cst">Central (CST)</SelectItem>
            <SelectItem value="pst">Pacific (PST)</SelectItem>
          </SelectContent>
        </Select>
      </Stack>

      {/* Grouped */}
      <Stack space="title">
        <SectionHeading as="h3" title="Grouped — labels + separator" />
        <Select>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>North America</SelectLabel>
              <SelectItem value="est">Eastern (EST)</SelectItem>
              <SelectItem value="cst2">Central (CST)</SelectItem>
              <SelectItem value="pst2">Pacific (PST)</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Asia</SelectLabel>
              <SelectItem value="ist2">India (IST)</SelectItem>
              <SelectItem value="jst">Japan (JST)</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Stack>
    </Stack>
  );
}
