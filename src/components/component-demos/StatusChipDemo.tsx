import { Stack, SectionHeading } from "@/components/typography";
import { StatusChip, type StatusTone } from "@/components/ui";

const TONES: StatusTone[] = ["success", "processing", "failed", "neutral"];

/** Sample application-side mapping — the DS ships no status→tone binding. */
const SAMPLE_MAPPING: { status: string; tone: StatusTone }[] = [
  { status: "Success", tone: "success" },
  { status: "Processing", tone: "processing" },
  { status: "Failed", tone: "failed" },
];

/**
 * Status chip — the three status treatments in one component. Kept in the
 * gallery so the choice between them is a visual comparison, not a guess.
 */
export function StatusChipDemo() {
  return (
    <Stack space="section" className="overflow-auto pb-10">
      <p className="max-w-prose text-sm text-muted-foreground">
        One vocabulary for the three status treatments the system uses. Colour is
        never the only carrier of meaning — the label always spells the status
        out, and the dot is <code className="text-xs">aria-hidden</code> because
        it only repeats it.
      </p>

      <div className="max-w-prose rounded-lg border border-fp-outline-1 bg-card p-4 text-sm">
        <p className="font-medium text-foreground">Contrast caveat</p>
        <p className="mt-1 text-muted-foreground">
          <span className="font-medium text-foreground">dot</span> is safe on any
          surface. <span className="font-medium text-foreground">text</span> and{" "}
          <span className="font-medium text-foreground">soft</span> fall below
          WCAG AA on light surfaces for the success and processing tones — the
          light <code className="text-xs">--status-*</code> values are too light
          to carry text on white. Prefer <span className="font-medium">dot</span>{" "}
          in Light until darker values land. See the note in{" "}
          <code className="text-xs">ui/status-chip.tsx</code>.
        </p>
      </div>

      <Stack space="title">
        <SectionHeading
          as="h3"
          title="dot — coloured dot, neutral label"
          description="The quietest treatment. Use in dense grids where every row shows a status and colouring all the text would shout."
        />
        <div className="flex flex-wrap items-center gap-6">
          {TONES.map((tone) => (
            <StatusChip key={tone} tone={tone}>
              {tone}
            </StatusChip>
          ))}
        </div>
      </Stack>

      <Stack space="title">
        <SectionHeading
          as="h3"
          title="text — coloured dot and label, no fill"
          description="Dot and label share one color via bg-current. Use where the status is the point of the row rather than one column among many."
        />
        <div className="flex flex-wrap items-center gap-6">
          {TONES.map((tone) => (
            <StatusChip key={tone} tone={tone} variant="text">
              {tone}
            </StatusChip>
          ))}
        </div>
      </Stack>

      <Stack space="title">
        <SectionHeading
          as="h3"
          title="soft — tinted pill"
          description="A /10 tint behind tone-coloured text — the DS's canonical treatment for a state that must be noticed, and the same recipe the destructive Badge variant uses."
        />
        <div className="flex flex-wrap items-center gap-6">
          {TONES.map((tone) => (
            <StatusChip key={tone} tone={tone} variant="soft">
              {tone}
            </StatusChip>
          ))}
        </div>
      </Stack>

      <Stack space="title">
        <SectionHeading
          as="h3"
          title="Binding meaning"
          description="Tones are visual channels, not statuses. The DS deliberately ships no status→tone map: a status carries no color until a usage rule binds it, so each application declares its own. This table's binding lives in statusTone() in tables-layout/data.ts."
        />
        <div className="flex flex-wrap items-center gap-6">
          {SAMPLE_MAPPING.map(({ status, tone }) => (
            <StatusChip key={status} tone={tone} variant="text">
              {status}
            </StatusChip>
          ))}
        </div>
      </Stack>
    </Stack>
  );
}
