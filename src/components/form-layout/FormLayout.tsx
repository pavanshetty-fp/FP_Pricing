import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditableTable } from "./EditableTable";
import { FileUpload } from "./FileUpload";
import { SignaturePad } from "./SignaturePad";
import { MultiSelect } from "./MultiSelect";
import { ChoicePills } from "./ChoicePills";

/*
  Form Layout — Figma "Form Layout" (27593:15012). A kitchen-sink form page that
  exercises every form input type in the DS. Opened from the action bar's
  "Create Form" CTA; Cancel/✕ returns to the table. Each control is a DS
  component whose variant/state follows the data (layout-template composition).
*/

/** Section = muted group heading + its fields. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** Field = label (+ optional required marker) + control + helper text. */
function Field({
  label,
  required,
  description,
  children,
  className,
}: {
  label?: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
      )}
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/** Radio rendered as a selectable description card (Radio Buttons – 1). */
function RadioCard({
  value,
  title,
  description,
}: {
  value: string;
  title: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border border-border bg-fp-surface-1a p-4 transition-colors",
        "has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-fp-surface-1b"
      )}
    >
      <RadioGroupItem value={value} className="mt-0.5" />
      <span className="flex flex-col">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

/** Radio rendered as a centered tile with a top control (Radio Buttons – 2). */
function RadioTile({ value }: { value: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1 rounded-md border border-border bg-fp-surface-1a p-4 text-center transition-colors",
        "has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-fp-surface-1b"
      )}
    >
      <RadioGroupItem value={value} className="mb-2" />
      <span className="text-sm font-medium">Title</span>
      <span className="text-xs text-muted-foreground">Subtext</span>
    </label>
  );
}

export interface FormLayoutProps {
  onClose?: () => void;
}

export function FormLayout({ onClose }: FormLayoutProps) {
  const [range1, setRange1] = React.useState<number[]>([15, 80]);
  const [range2, setRange2] = React.useState<number[]>([60]);
  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header band */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border">
        <div className="flex flex-col">
          <h2 className="text-base font-semibold">Create Form</h2>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close form"
            onClick={onClose}
          >
            <X />
          </Button>
        )}
      </div>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-auto py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
          <Section title="Input Fields">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              <Field label="Default" description="This is an input description.">
                <Input placeholder="Placeholder" />
              </Field>
              <Field
                label="Phone Number"
                description="Enter your 10-digit card number"
              >
                <div className="flex">
                  <Select defaultValue="+1">
                    <SelectTrigger className="w-[72px] rounded-r-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+1">+1</SelectItem>
                      <SelectItem value="+44">+44</SelectItem>
                      <SelectItem value="+91">+91</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    placeholder="Enter Phone Number"
                    className="-ml-px rounded-l-none"
                  />
                </div>
              </Field>
            </div>
          </Section>

          <Section title="Text Area">
            <Field label="Default" description="This is a textarea description.">
              <Textarea placeholder="Placeholder" className="min-h-28" />
            </Field>
          </Section>

          <Section title="Dropdown">
            <Field
              label="Department"
              description="Select your department or area of work."
            >
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ops">Operations</SelectItem>
                  <SelectItem value="fin">Finance</SelectItem>
                  <SelectItem value="eng">Engineering</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Section title="Input, Dropdown Tables Layout">
            <p className="-mt-2 text-sm text-muted-foreground">
              Fully editable cells, static information/data cells. Add more rows
              and columns.
            </p>
            <EditableTable />
          </Section>

          <Section title="Toggles/Switch">
            <div className="flex items-start justify-between gap-4">
              <Field
                label="Switch Text"
                description="This is a switch description."
                className="flex-1"
              >
                <span className="sr-only" />
              </Field>
              <Switch defaultChecked aria-label="Switch Text" className="mt-0.5" />
            </div>
          </Section>

          <Section title="Radio Buttons - 1">
            <RadioGroup
              defaultValue="rc-2"
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <RadioCard
                value="rc-1"
                title="Radio Button Text"
                description="This is a radio description."
              />
              <RadioCard
                value="rc-2"
                title="Radio Button Text"
                description="This is a radio description."
              />
            </RadioGroup>
          </Section>

          <Section title="Radio Buttons - 2">
            <RadioGroup
              defaultValue="rt-2"
              className="grid grid-cols-2 gap-4 md:grid-cols-4"
            >
              <RadioTile value="rt-1" />
              <RadioTile value="rt-2" />
              <RadioTile value="rt-3" />
              <RadioTile value="rt-4" />
            </RadioGroup>
          </Section>

          <Section title="Checkboxes">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {["Option 1", "Option 2", "Option 3", "Option 4"].map((opt, i) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <Checkbox defaultChecked={i < 3} />
                  {opt}
                </label>
              ))}
            </div>
          </Section>

          <Section title="Upload documents">
            <FileUpload />
          </Section>

          <Section title="Signature">
            <SignaturePad />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked />I agree to the terms and conditions
            </label>
          </Section>

          <Section title="Dropdown">
            <Field>
              <MultiSelect />
            </Field>
            <Field>
              <MultiSelect defaultSelected={["Text 1", "Text 2"]} />
            </Field>
          </Section>

          <Section title="Options">
            <ChoicePills defaultValue="Low" />
          </Section>

          <Section title="Sliders">
            <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
              <Field label="Range - 1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Range</span>
                  <span className="tabular-nums">
                    {fmt(range1[0])}, {fmt(range1[1])}
                  </span>
                </div>
                <Slider
                  value={range1}
                  onValueChange={setRange1}
                  min={0}
                  max={100}
                  className="my-2"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>100.00</span>
                </div>
              </Field>
              <Field label="Range - 2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Range</span>
                  <span className="tabular-nums">{fmt(range2[0])}</span>
                </div>
                <Slider
                  value={range2}
                  onValueChange={setRange2}
                  min={0}
                  max={100}
                  className="my-2"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>100.00</span>
                </div>
              </Field>
            </div>
          </Section>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex h-16 shrink-0 items-center justify-end gap-3 border-t border-border">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose}>Submit</Button>
      </div>
    </div>
  );
}
