import * as React from "react";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";

/**
 * Fields showcase — Figma "Field" (18684:15220) + siblings. Demonstrates the
 * form-composition layer: orientation (vertical / horizontal / responsive),
 * the Data Invalid state, description placement, sets/legends, separators and
 * the button-row pattern.
 */
export function FieldsDemo() {
  // Invalid-state example — flips to Data Invalid=True on blur when empty.
  const [email, setEmail] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const emailError =
    touched && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
      ? "Enter a valid email address."
      : undefined;

  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        The <code className="text-foreground">Field</code> family scaffolds every
        form control with a consistent label, description and error, plus
        orientation handling and accessible wiring.
      </p>

      {/* Orientation */}
      <Stack space="title">
        <SectionHeading as="h3" title="Orientation" />
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="f-vertical">Vertical (default)</FieldLabel>
            <Input id="f-vertical" placeholder="Placeholder" />
            <FieldDescription>Label and control stack.</FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="f-horizontal">Horizontal</FieldLabel>
              <FieldDescription>
                Label sits beside its control — good for switches.
              </FieldDescription>
            </FieldContent>
            <Switch id="f-horizontal" defaultChecked />
          </Field>

          <Field orientation="responsive">
            <FieldContent>
              <FieldLabel htmlFor="f-responsive">Responsive</FieldLabel>
              <FieldDescription>
                Stacks on narrow, goes inline at the @md container width.
              </FieldDescription>
            </FieldContent>
            <Input id="f-responsive" placeholder="Placeholder" />
          </Field>
        </FieldGroup>
      </Stack>

      {/* Data Invalid */}
      <Stack space="title">
        <SectionHeading as="h3" title="Validation (Data Invalid)" />
        <Field data-invalid={emailError ? true : undefined}>
          <FieldLabel htmlFor="f-email">Email</FieldLabel>
          <Input
            id="f-email"
            type="email"
            placeholder="you@fleetpanda.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={!!emailError}
          />
          {emailError ? (
            <FieldError>{emailError}</FieldError>
          ) : (
            <FieldDescription>
              Blur the field while empty to see the error state.
            </FieldDescription>
          )}
        </Field>
      </Stack>

      {/* Description placement */}
      <Stack space="title">
        <SectionHeading as="h3" title="Description placement" />
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="f-under-input">Under input</FieldLabel>
            <Input id="f-under-input" placeholder="Placeholder" />
            <FieldDescription>Description follows the control.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="f-under-label">Under label</FieldLabel>
            <FieldDescription>Description precedes the control.</FieldDescription>
            <Input id="f-under-label" placeholder="Placeholder" />
          </Field>
        </FieldGroup>
      </Stack>

      {/* Field set + legend, with a checkbox group */}
      <Stack space="title">
        <SectionHeading as="h3" title="Field set + legend" />
        <FieldSet>
          <FieldLegend>Notifications</FieldLegend>
          <FieldDescription>
            Choose how you'd like to be notified.
          </FieldDescription>
          <FieldGroup data-slot="checkbox-group">
            {["Email", "SMS", "Push"].map((opt, i) => (
              <Field key={opt} orientation="horizontal">
                <Checkbox id={`f-notify-${i}`} defaultChecked={i === 0} />
                <FieldLabel htmlFor={`f-notify-${i}`} className="font-normal">
                  {opt}
                </FieldLabel>
              </Field>
            ))}
          </FieldGroup>
        </FieldSet>
      </Stack>

      {/* Separator + button row (Field / Buttons) */}
      <Stack space="title">
        <SectionHeading as="h3" title="Separator + actions" />
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="f-sep">Workspace name</FieldLabel>
            <Input id="f-sep" placeholder="Acme Logistics" />
          </Field>
          <FieldSeparator>Or</FieldSeparator>
          <Field>
            <FieldTitle>Continue with a template</FieldTitle>
            <FieldDescription>
              Start from a prebuilt workspace instead.
            </FieldDescription>
          </Field>
          {/* Horizontal button row */}
          <Field orientation="horizontal" className="justify-end">
            <Button variant="ghost">Cancel</Button>
            <Button>Create</Button>
          </Field>
          {/* Vertical button stack with a trailing link */}
          <Field>
            <Button className="w-full">Submit</Button>
            <Button variant="outline" className="w-full">
              Save draft
            </Button>
            <FieldDescription className="text-center">
              Already have an account? <a href="#">Sign in</a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </Stack>
    </Stack>
  );
}
