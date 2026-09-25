import * as React from "react";
import { Image as ImageIcon, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { RecordSheet } from "../RecordSheet";
import { DATE_FMT } from "../data";
import type { OrderLine } from "./orders";

/*
  INVITING A PARTNER IS SENDING THEM AN EMAIL, so the sheet is the email.

  WHY IT IS NOT A CONFIRM DIALOG. What goes out carries the whole order — the
  site, the window, the assets and the gallons — and it is the only thing the
  partner will ever see of it. A dialog saying "Invite Redline Carriers?" asks
  somebody to vouch for a message they have not read.

  TWO COLUMNS, WHICH IS WHY IT IS `xxwide`: what you write on the left, what
  they receive on the right. The same rule the order sheet follows — editable
  left, derived right — and the preview is derived in the strictest sense,
  because every line of it comes off the order rather than out of this form.

  THE PREVIEW IS NOT A MOCK. It is built from the same draft the sheet was
  opened on, so a wrong address here is a wrong address in the inbox, and it
  can be caught before the send rather than after.
*/

export interface InviteTarget {
  id: string;
  name: string;
  /** Where the invitation goes. Seeded from the partner's dispatch address. */
  email: string;
}

export interface InviteOrderFacts {
  orderNo: string;
  customer: string;
  shipTo: string;
  address: string;
  dateKey: string;
  window: { start: string; end: string };
  lines: OrderLine[];
}

/* ---------------------------------------------------------------------------
 * Email addresses, as chips
 * ------------------------------------------------------------------------ */

/**
 * A LIST OF ADDRESSES IS NOT A LINE OF TEXT. Comma-separated in one field,
 * a single typo takes the whole send down and nothing says which address was
 * wrong. As chips each address is its own object: added on Enter or a comma,
 * removed on its own ×, and one bad one is visibly one bad one.
 */
export function EmailChips({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  id: string;
}) {
  const [text, setText] = React.useState("");

  const commit = () => {
    const parts = text
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    onChange([...new Set([...value, ...parts])]);
    setText("");
  };

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5">
      {value.map((addr) => (
        <span
          key={addr}
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-fp-surface-1b py-0.5 pr-1 pl-2 text-sm",
            /* A ROUGH SHAPE CHECK, NOT VALIDATION. It cannot know whether an
               address exists; it can say that this one has no @ in it, which
               is the typo people actually make. */
            !addr.includes("@") && "text-status-failed"
          )}
        >
          {addr}
          <button
            type="button"
            aria-label={`Remove ${addr}`}
            onClick={() => onChange(value.filter((a) => a !== addr))}
            className="flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        placeholder={value.length === 0 ? placeholder : undefined}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Backspace" && text === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        /* ON BLUR TOO. A half-typed address left in the box and a press of
           Send is the one way to lose a recipient silently. */
        onBlur={commit}
        className="min-w-[10ch] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * What is attached
 * ------------------------------------------------------------------------ */

/**
 * THE EMAIL BODY IS NOT DESIGNED HERE. (Pavan, 2026-09-22.) The order summary
 * that reaches the partner is rendered by another system and goes out as an
 * image; this sheet composes the message around it. Redrawing that layout in
 * the app would be a second copy of somebody else's design, wrong the first
 * time it changed and nobody's job to keep right.
 *
 * SO THIS PANE SHOWS THE ATTACHMENT, not a replica of it — its name, what it
 * carries, and the fact that it is generated rather than written. What the
 * broker is responsible for is on the left.
 */
function AttachedSummary({
  facts,
  partnerName,
}: {
  facts: InviteOrderFacts;
  partnerName: string;
}) {
  const when = (() => {
    const [y, m, d] = facts.dateKey.split("-").map(Number);
    if (!y) return "—";
    return `${DATE_FMT.format(new Date(y, m - 1, d))}, ${facts.window.start} – ${facts.window.end}`;
  })();
  const lines = facts.lines.filter((l) => l.asset);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3 rounded-md border border-fp-outline-1 bg-fp-card-1 p-3">
        <ImageIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            {facts.orderNo}-order-summary.png
          </span>
          <span className="text-xs text-muted-foreground">
            Generated when the invitation is sent · goes out in the message body
          </span>
        </span>
      </div>

      {/* WHAT IS IN IT, IN WORDS. Not a picture of the picture: a list of what
          the partner will be able to read, so a missing asset or a wrong
          window is catchable from here even though the layout is not ours. */}
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">It will show</span>
        <ul className="flex flex-col gap-1 text-muted-foreground">
          <li>
            Order <span className="text-foreground">{facts.orderNo}</span> for{" "}
            <span className="text-foreground">{facts.customer}</span>
          </li>
          <li>
            <span className="text-foreground">{facts.shipTo}</span> —{" "}
            {facts.address}
          </li>
          <li>
            Delivery <span className="text-foreground">{when}</span>
          </li>
          <li>
            {lines.length === 0 ? (
              <span className="text-status-failed">
                No assets on the order — {partnerName} would be asked to price
                nothing
              </span>
            ) : (
              <>
                <span className="text-foreground">
                  {lines.length} {lines.length === 1 ? "line" : "lines"}
                </span>
                {" — "}
                {lines
                  .map(
                    (l) =>
                      `${l.asset} · ${l.product} · ${
                        l.topOff ? "top off" : `${(l.gal ?? 0).toLocaleString()} gal`
                      }`
                  )
                  .join("; ")}
              </>
            )}
          </li>
          <li>A link back to submit their pricing</li>
        </ul>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * The sheet
 * ------------------------------------------------------------------------ */

export function InvitePartnerSheet({
  open,
  onOpenChange,
  targets,
  facts,
  resend = false,
  onSend,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** One partner, or everything ticked for a bulk send. */
  targets: InviteTarget[];
  facts: InviteOrderFacts;
  /** A second invitation to somebody already asked — the wording differs. */
  resend?: boolean;
  onSend: (ids: string[]) => void;
}) {
  const one = targets.length === 1 ? targets[0] : null;

  const [to, setTo] = React.useState<string[]>([]);
  const [cc, setCc] = React.useState<string[]>([]);
  const [bcc, setBcc] = React.useState<string[]>([]);
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");

  /* SEEDED ONCE PER OPEN, so a broker who edits the subject and closes by
     accident does not get their wording back — and one who opens it on a
     different partner does not get the last one's. */
  React.useEffect(() => {
    if (!open) return;
    setTo(targets.map((t) => t.email));
    setCc([]);
    setBcc([]);
    setSubject(
      `${facts.orderNo} · ${facts.shipTo} · ${facts.customer}`
    );
    setMessage(
      resend
        ? `A reminder about order ${facts.orderNo}. We have not had your pricing yet — please acknowledge and submit it when you can.`
        : `We have a delivery to cover and would like you to quote for it. Please acknowledge the order and submit your pricing.`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targets.map((t) => t.id).join(","), resend]);

  const nothingToSend = to.length === 0 || subject.trim() === "";

  return (
    <RecordSheet
      /* TWO COLUMNS — compose and preview — which is the one shape `xxwide`
         exists for. */
      size="xxwide"
      /* OVER THE ORDER SHEET — see `level` on `RecordSheet`. */
      level={2}
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      editTitle=""
      createTitle={
        one
          ? `${resend ? "Resend to" : "Invite"} ${one.name}`
          : `Invite ${targets.length} partners`
      }
      createAction={resend ? "Resend invitation" : "Send invitation"}
      showCancel={false}
      canSubmit={!nothingToSend}
      onSubmit={() => onSend(targets.map((t) => t.id))}
      footerPrimary={
        <Button
          disabled={nothingToSend}
          onClick={() => {
            onSend(targets.map((t) => t.id));
            onOpenChange(false);
          }}
        >
          <Send />
          {targets.length > 1
            ? `Send ${targets.length} invitations`
            : resend
              ? "Resend invitation"
              : "Send invitation"}
        </Button>
      }
    >
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        {/* ── left: what you write ─────────────────────────────────────── */}
        <div className="flex min-h-0 min-w-0 flex-col gap-10">
          <SheetSection title="Recipients">
            <SheetField label="To">
              <EmailChips
                id="invite-to"
                value={to}
                onChange={setTo}
                placeholder="name@partner.com"
              />
            </SheetField>
            <div className="grid grid-cols-2 gap-4">
              <SheetField label="Cc">
                <EmailChips
                  id="invite-cc"
                  value={cc}
                  onChange={setCc}
                  placeholder="Optional"
                />
              </SheetField>
              <SheetField label="Bcc">
                <EmailChips
                  id="invite-bcc"
                  value={bcc}
                  onChange={setBcc}
                  placeholder="Optional"
                />
              </SheetField>
            </div>
            {targets.length > 1 && (
              /* A BULK SEND IS N EMAILS, NOT ONE WITH N NAMES ON IT. Partners
                 bidding against each other must not see the list they are
                 bidding against. */
              <p className="text-xs text-muted-foreground">
                One message each — no partner sees the others.
              </p>
            )}
          </SheetSection>

          {/* THE MESSAGE RUNS TO THE BOTTOM. It is the only thing on this
              sheet the broker actually writes, and a seven-line box under
              two short fields made the writing feel like an afterthought to
              the addressing. Everything above it is fixed; this takes what
              is left. */}
          <SheetSection
            title="Message"
            className="flex min-h-0 flex-1 flex-col"
            bodyClassName="min-h-0 flex-1"
          >
            <SheetField label="Subject">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What the order is"
              />
            </SheetField>
            {/* THE BOX IS THE REST OF THE CARD.
                TWO THINGS HAD TO GIVE. `SheetField` wraps its control in a
                second div for the helper-text rhythm, so the growth has to be
                passed through it as well as to the field itself; and the DS
                textarea is `field-sizing-content`, which sizes to what is
                typed and would shrink a deliberately tall box back to three
                lines. Fixed sizing plus `flex-1` is what makes it fill. */}
            <SheetField
              label="Your note"
              className="min-h-0 flex-1 [&>div:last-child]:min-h-0 [&>div:last-child]:flex-1"
            >
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Anything this partner needs to know."
                className="min-h-[200px] flex-1 resize-none [field-sizing:fixed]"
              />
            </SheetField>
          </SheetSection>
        </div>

        {/* ── right: what they get ─────────────────────────────────────── */}
        {/* THE SAME HEIGHT AS WHAT IS BEING WRITTEN. The two columns are one
            thing seen twice, and a preview that stops halfway down reads as a
            fragment of the email rather than the email. It scrolls inside
            itself when the order is long, so the card's edge stays put. */}
        <div className="flex min-h-0 min-w-0 flex-col">
          <SheetSection
            title="Attached"
            flush
            className="flex min-h-0 flex-1 flex-col"
            bodyClassName="min-h-0 flex-1 overflow-y-auto"
            action={
              <span className="text-xs text-muted-foreground">
                {one ? one.name : `${targets.length} partners`}
              </span>
            }
          >
            <AttachedSummary
              facts={facts}
              partnerName={one?.name ?? "the partner"}
            />
          </SheetSection>
        </div>
      </div>
    </RecordSheet>
  );
}
