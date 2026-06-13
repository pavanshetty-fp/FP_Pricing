import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

/** A labelled example row. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** Six contiguous slots — the "Digits Only" layout. */
function DigitsOnly({ invalid }: { invalid?: boolean }) {
  return (
    <InputOTP maxLength={6} aria-invalid={invalid}>
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot key={i} index={i} aria-invalid={invalid} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

/** 3 — 3 joined by a separator. */
function WithSeparator({ invalid }: { invalid?: boolean }) {
  return (
    <InputOTP maxLength={6} aria-invalid={invalid}>
      <InputOTPGroup>
        {[0, 1, 2].map((i) => (
          <InputOTPSlot key={i} index={i} aria-invalid={invalid} />
        ))}
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        {[3, 4, 5].map((i) => (
          <InputOTPSlot key={i} index={i} aria-invalid={invalid} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

/** 2 — 2 — 2 joined by separators. */
function WithSpacing({ invalid }: { invalid?: boolean }) {
  return (
    <InputOTP maxLength={6} aria-invalid={invalid}>
      <InputOTPGroup>
        {[0, 1].map((i) => (
          <InputOTPSlot key={i} index={i} aria-invalid={invalid} />
        ))}
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        {[2, 3].map((i) => (
          <InputOTPSlot key={i} index={i} aria-invalid={invalid} />
        ))}
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        {[4, 5].map((i) => (
          <InputOTPSlot key={i} index={i} aria-invalid={invalid} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

/** Six individually-spaced rounded slots — the "Simple" layout. */
function Simple({ invalid }: { invalid?: boolean }) {
  return (
    <InputOTP maxLength={6} aria-invalid={invalid}>
      <InputOTPGroup className="gap-2 [&>[data-slot=input-otp-slot]]:rounded-md [&>[data-slot=input-otp-slot]]:border-l">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot key={i} index={i} aria-invalid={invalid} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

/**
 * Input OTP showcase — Figma "InputOTP" (81:141). The four layout variants,
 * the invalid state, and a live 6-digit input that validates against a code.
 */
export function InputOTPDemo() {
  const [value, setValue] = React.useState("");
  const CODE = "123456";
  const complete = value.length === 6;
  const valid = value === CODE;

  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">InputOTP</code> is a segmented
        passcode field — one slot per digit with a moving caret, paste support
        and per-slot focus / filled / invalid state.
      </p>

      {/* Live interactive */}
      <Stack space="title">
        <SectionHeading as="h3" title="Live — enter the code" />
        <p className="text-sm text-muted-foreground">
          Type any 6 digits. The demo code is{" "}
          <code className="text-foreground">123456</code>.
        </p>
        <InputOTP
          maxLength={6}
          value={value}
          onChange={setValue}
          aria-invalid={complete && !valid}
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot key={i} index={i} aria-invalid={complete && !valid} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <div className="h-5 text-sm">
          {complete && valid && (
            <span className="flex items-center gap-1.5 text-status-success">
              <CheckCircle2 className="size-4" />
              Code verified
            </span>
          )}
          {complete && !valid && (
            <span className="text-destructive">
              That code isn't right — try 123456.
            </span>
          )}
        </div>
      </Stack>

      {/* Layout variants */}
      <Stack space="title">
        <SectionHeading as="h3" title="Layout variants" />
        <div className="grid grid-cols-1 gap-5">
          <Row label="Digits Only">
            <DigitsOnly />
          </Row>
          <Row label="With Separator">
            <WithSeparator />
          </Row>
          <Row label="With Spacing">
            <WithSpacing />
          </Row>
          <Row label="Simple">
            <Simple />
          </Row>
        </div>
      </Stack>

      {/* Invalid state */}
      <Stack space="title">
        <SectionHeading as="h3" title="Invalid state" />
        <div className="grid grid-cols-1 gap-5">
          <Row label="Digits Only — invalid">
            <DigitsOnly invalid />
          </Row>
          <Row label="With Separator — invalid">
            <WithSeparator invalid />
          </Row>
        </div>
      </Stack>
    </Stack>
  );
}
