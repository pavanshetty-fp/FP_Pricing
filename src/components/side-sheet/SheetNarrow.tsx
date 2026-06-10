import * as React from "react";
import { Search, SlidersHorizontal, ListFilter, ArrowUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SheetClose,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SheetField, SheetSection, InfoAlert } from "./parts";

const TABS = ["Tab 1", "Tab 2", "Tab 3", "Tab 4", "Tab 5", "Tab 6", "Tab 7"];

/** Side sheet narrow (560) — Figma 27610:58486. Form-focused content. */
export function SheetNarrow({ title = "Sheet Header" }: { title?: string }) {
  const [tab, setTab] = React.useState(TABS[0]);

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border p-4">
        <div className="flex flex-col gap-0.5">
          <SheetTitle className="text-base">{title}</SheetTitle>
          <SheetDescription>This is a sheet description.</SheetDescription>
        </div>
        <SheetClose className="rounded-sm p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetClose>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-auto p-4">
        <InfoAlert />

        {/* Tabs + dual search/filter row */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 border-b border-border">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "-mb-px border-b-2 pb-2 text-sm whitespace-nowrap outline-none transition-colors",
                  tab === t
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search..." className="h-8 rounded-r-none pl-8" />
              </div>
              <Button variant="outline" size="icon-sm" aria-label="Settings" className="-ml-px rounded-l-none">
                <SlidersHorizontal />
              </Button>
            </div>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search..." className="h-8 pl-8" />
            </div>
            <Button variant="outline" size="icon-sm" aria-label="Filter">
              <ListFilter />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Sort">
              <ArrowUpDown />
            </Button>
          </div>
        </div>

        <SheetSection title="Input: Text Field">
          <div className="grid grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <SheetField key={i} label="Default" description="This is an input description.">
                <Input placeholder="Placeholder" />
              </SheetField>
            ))}
          </div>
        </SheetSection>

        <SheetSection title="Input: Text Area">
          <div className="grid grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <SheetField key={i} label="Default" description="This is a textarea description.">
                <Textarea placeholder="Placeholder" className="min-h-20" />
              </SheetField>
            ))}
          </div>
        </SheetSection>

        <SheetSection title="Input: Select">
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Default" description="This is an input description.">
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ops">Operations</SelectItem>
                  <SelectItem value="fin">Finance</SelectItem>
                  <SelectItem value="eng">Engineering</SelectItem>
                </SelectContent>
              </Select>
            </SheetField>
            <SheetField label="Filled" description="This is an input description.">
              <Select defaultValue="placeholder">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder">Placeholder</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </SheetField>
          </div>
        </SheetSection>

        <SheetSection title="Toggles/Switch">
          <div className="flex flex-col gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-start justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Switch Text</span>
                  <span className="text-xs text-muted-foreground">
                    This is a switch description.
                  </span>
                </div>
                <Switch aria-label="Switch Text" className="mt-0.5" />
              </div>
            ))}
          </div>
        </SheetSection>

        <SheetSection title="Checkbox Section">
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <label key={i} className="flex items-start gap-2">
                <Checkbox className="mt-0.5" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">Checkbox Text</span>
                  <span className="text-xs text-muted-foreground">
                    This is a checkbox description.
                  </span>
                </span>
              </label>
            ))}
          </div>
        </SheetSection>

        <SheetSection title="Radio Section">
          <RadioGroup defaultValue="r-0" className="gap-3">
            {[0, 1].map((i) => (
              <label key={i} className="flex items-start gap-2">
                <RadioGroupItem value={`r-${i}`} className="mt-0.5" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">Radio Button Text</span>
                  <span className="text-xs text-muted-foreground">
                    This is a radio description.
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </SheetSection>

        <SheetSection title="Accordion">
          <Accordion type="single" collapsible className="w-full">
            {[0, 1].map((i) => (
              <AccordionItem key={i} value={`a-${i}`}>
                <AccordionTrigger>Trigger Text</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  This is the accordion panel content.
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </SheetSection>

        <SheetSection title="Table">
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-fp-surface-1a">
                  {["Header", "Header", "Header", "Header"].map((h, i) => (
                    <TableHead key={i} className="h-9 px-3 text-xs">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[0, 1].map((r) => (
                  <TableRow key={r}>
                    {[0, 1, 2, 3].map((c) => (
                      <TableCell key={c} className="px-3 py-2">
                        <span className="flex flex-col">
                          <span className="text-sm">Table Cell Text</span>
                          <span className="text-xs text-muted-foreground">
                            Description Text
                          </span>
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SheetSection>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-border p-4">
        <SheetClose asChild>
          <Button variant="outline" size="sm">
            Cancel
            <KbdGroup>
              <Kbd>Esc</Kbd>
            </KbdGroup>
          </Button>
        </SheetClose>
        <Button size="sm">
          Primary
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>⏎</Kbd>
          </KbdGroup>
        </Button>
      </div>
    </>
  );
}
