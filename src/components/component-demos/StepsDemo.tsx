import * as React from "react";
import { Stack, SectionHeading } from "@/components/typography";
import { Steps } from "@/components/ui/steps";

/**
 * Steps showcase — the DS library's "Pro Blocks / Buttons / Steps", built from
 * this repo's tokens.
 */
export function StepsDemo() {
  const [a, setA] = React.useState("pricing");
  const [b, setB] = React.useState("pick");

  return (
    <Stack space="section" className="max-w-3xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Steps</code> marks progress through
        work that has an ORDER to it. Not a tab strip: tabs are views of one
        thing and may be read in any order, a step is a stage that exists
        because the one before it produced something. The rule between two
        discs is what carries the sequence.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="Two steps" />
        <Steps
          value={a}
          onValueChange={setA}
          steps={[
            { value: "order", label: "Order" },
            { value: "pricing", label: "Quotes & pricing" },
          ]}
        />
      </Stack>

      <Stack space="title">
        <SectionHeading
          as="h3"
          title="With descriptions, and one out of reach"
        />
        <Steps
          value={b}
          onValueChange={setB}
          steps={[
            { value: "pick", label: "Choose", description: "What changes" },
            { value: "review", label: "Review", description: "What it becomes" },
            {
              value: "apply",
              label: "Apply",
              description: "Commit the change",
              // Unreachable is not the same as upcoming: upcoming is "not yet",
              // unreachable is "not possible", and the second one owes a reason.
              disabledReason: "Review the change first",
            },
          ]}
        />
      </Stack>
    </Stack>
  );
}
