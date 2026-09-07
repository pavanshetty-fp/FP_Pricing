import { Contact } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/ui/status-chip";
import {
  AttachmentsSection,
  AuditSection,
  DetailCard,
  DetailPanel,
  Field,
  NotesSection,
  RelatedTable,
  SectionStack,
  TagList,
  type BadgeTone,
  type RecordSection,
  type RecordSummaryStat,
} from "./DirectoryRecordPage";
import {
  DASH,
  formatDate,
  money,
  oneLineAddress,
  notApplicable,
} from "./directoryCore";
import {
  PAYMENT_TERMS,
  CREDIT_STATUSES,
  creditAvailable,
  creditBlocked,
  type BrokerCustomer,
} from "./directory";
import {
  assetsForCustomer,
  ordersForCustomer,
  shipTosForCustomer,
} from "./directoryLinks";
import { BROKER_STATUS_TONE } from "./orders";
import { vendorById, VENDORS } from "./vendors";
import type { FormSectionDef } from "./DirectoryForm";

/*
  What a customer record shows, and why in this order.

  THE SUMMARY ANSWERS "CAN THEY ORDER". Credit exposure is not one number, it
  is three that only mean anything together — the limit, what is drawn against
  it, and what is left — and the third is the one people are actually asking
  for. It is computed here rather than stored, because a stored "available"
  goes stale the moment a balance moves.

  TABS IN THE ORDER SOMEBODY WORKS. Overview to see who they are, contacts to
  ring them, ship-tos because that is where the fuel goes, financials for the
  question the summary raised, then everything the account is attached to.
*/

const RECORD_TONE: Record<string, BadgeTone> = {
  active: "success",
  inactive: "neutral",
  archived: "neutral",
};

const CREDIT_TONE: Record<string, BadgeTone> = {
  Approved: "success",
  "On hold": "warning",
  Unapproved: "critical",
};

export function customerBadges(c: BrokerCustomer) {
  const out: { label: string; tone: BadgeTone; title?: string }[] = [
    { label: c.creditStatus, tone: CREDIT_TONE[c.creditStatus] ?? "neutral" },
  ];
  /* OVER LIMIT IS ITS OWN BADGE, not a shade of the credit status. An account
     can be fully approved AND over its limit — that is exactly the pair that
     blocks an order, and one chip cannot carry both facts. */
  if (c.creditLimit !== null && c.currentBalance > c.creditLimit) {
    out.push({
      label: "Over limit",
      tone: "critical",
      title: `${money(c.currentBalance)} drawn against a ${money(c.creditLimit)} limit`,
    });
  }
  if (c.taxExempt) out.push({ label: "Tax exempt", tone: "info" });
  if (c.portalAccessEnabled) out.push({ label: "Portal access", tone: "neutral" });
  return out;
}

export function customerStats(c: BrokerCustomer): RecordSummaryStat[] {
  const available = creditAvailable(c);
  const sites = shipTosForCustomer(c.id);
  const orders = ordersForCustomer(c.name);
  return [
    {
      label: "Credit limit",
      value: c.creditLimit === null ? "No limit set" : money(c.creditLimit),
      hint: c.creditLimit === null ? "Nothing approved yet" : c.paymentTerms,
    },
    {
      label: "Current balance",
      value: money(c.currentBalance),
      hint: `${c.currency} · ${c.paymentTerms}`,
      tone: creditBlocked(c) ? "critical" : undefined,
    },
    {
      label: "Available credit",
      value: available === null ? DASH : money(available),
      hint: available === null ? "Requires a limit" : available < 0 ? "Over limit" : "Headroom",
      tone: available !== null && available < 0 ? "critical" : "success",
    },
    { label: "Ship-to locations", value: sites.length, hint: `${sites.filter((s) => s.status === "active").length} active` },
    { label: "Orders", value: orders.length, hint: "All time" },
  ];
}

export function customerSections(
  c: BrokerCustomer,
  go: { openAsset: (id: string) => void; openVendor: (id: string) => void }
): RecordSection[] {
  const sites = shipTosForCustomer(c.id);
  const orders = ordersForCustomer(c.name);
  const assets = assetsForCustomer(c.id);
  const recurring = orders.filter((o) => o.kind === "Recurring");
  const preferred = vendorById(c.preferredVendorId);

  return [
    {
      key: "overview",
      label: "Overview",
      render: () => (
        <SectionStack>
          <DetailCard title="Identity">
            <Field label="Customer name" value={c.name} />
            <Field label="ERP ID" value={c.erpId} />
            <Field label="Accounting ID" value={c.accountingCustomerId} />
            <Field label="Record status" value={<span className="capitalize">{c.status}</span>} />
            <Field label="Created" value={formatDate(c.createdAt.slice(0, 10))} />
            <Field label="Last updated" value={formatDate(c.updatedAt.slice(0, 10))} />
          </DetailCard>

          <DetailCard title="Primary contact">
            <Field label="Name" value={c.mainContactName} />
            <Field label="Role" value={c.mainContactRole} />
            <Field label="Phone" value={c.phone} />
            <Field label="Secondary phone" value={c.secondaryPhone} />
            <Field label="Email" value={c.email} />
            <Field label="Billing email" value={c.billingEmail} />
            <Field label="Dispatch email" value={c.dispatchEmail} />
          </DetailCard>

          <DetailCard title="Billing address">
            <Field label="Address line 1" value={c.addressLine1} />
            <Field label="Address line 2" value={c.addressLine2} />
            <Field label="City" value={c.city} />
            <Field label="State" value={c.state} />
            <Field label="Zip" value={c.zip} />
            <Field label="Country" value={c.country} />
          </DetailCard>

          <DetailCard title="Operations">
            <Field
              label="Preferred vendor"
              value={
                preferred ? (
                  <button
                    type="button"
                    className="text-left underline-offset-2 hover:underline"
                    onClick={() => go.openVendor(preferred.id)}
                  >
                    {preferred.name}
                  </button>
                ) : null
              }
            />
            <Field label="Portal access" value={c.portalAccessEnabled ? "Enabled" : "Disabled"} />
            <Field label="Tags" value={<TagList tags={c.tags} />} wide />
          </DetailCard>
        </SectionStack>
      ),
    },
    {
      key: "contacts",
      label: "Contacts",
      count: c.contacts.length,
      render: () => (
        <SectionStack>
          <DetailPanel title="People at this account">
            <RelatedTable
              rows={c.contacts}
              rowKey={(p) => p.id}
              emptyTitle="No contacts"
              emptyBody="Nobody has been recorded for this account. Add one so dispatch has somebody to call."
              columns={[
                {
                  key: "name",
                  label: "Name",
                  render: (p) => (
                    <span className="flex items-center gap-2">
                      {p.name}
                      {p.isPrimary && (
                        <Badge variant="secondary" className="font-normal">
                          Primary
                        </Badge>
                      )}
                    </span>
                  ),
                },
                { key: "role", label: "Role", render: (p) => p.role },
                { key: "phone", label: "Phone", render: (p) => p.phone ?? <Muted /> },
                { key: "email", label: "Email", render: (p) => p.email ?? <Muted /> },
                { key: "notes", label: "Notes", render: (p) => p.notes ?? <Muted /> },
              ]}
            />
          </DetailPanel>
        </SectionStack>
      ),
    },
    {
      key: "shiptos",
      label: "Ship-to Locations",
      count: sites.length,
      render: () => (
        <SectionStack>
          <DetailPanel title="Where this account receives">
            <RelatedTable
              rows={sites}
              rowKey={(s) => s.id}
              emptyTitle="No ship-to locations"
              emptyBody="An order cannot be created without one. Add the first delivery site."
              columns={[
                {
                  key: "name",
                  label: "Location",
                  render: (s) => (
                    <span className="flex items-center gap-2">
                      {s.locationName}
                      {s.isDefault && (
                        <Badge variant="secondary" className="font-normal">
                          Default
                        </Badge>
                      )}
                    </span>
                  ),
                },
                { key: "addr", label: "Address", render: (s) => oneLineAddress(s) },
                {
                  key: "geo",
                  label: "Coordinates",
                  /* A site with no geocode cannot be routed, which is the only
                     reason this column is on screen rather than in the drawer. */
                  render: (s) =>
                    s.latitude !== null && s.longitude !== null ? (
                      <span className="tabular-nums">{s.latitude}, {s.longitude}</span>
                    ) : (
                      <span className="text-muted-foreground/70">Not geocoded</span>
                    ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (s) => (
                    <StatusChip tone={s.status === "active" ? "success" : "neutral"} variant="text">
                      <span className="capitalize">{s.status}</span>
                    </StatusChip>
                  ),
                },
                { key: "notes", label: "Notes", render: (s) => s.notes ?? <Muted /> },
              ]}
            />
          </DetailPanel>
        </SectionStack>
      ),
    },
    {
      key: "financials",
      label: "Financials",
      render: () => (
        <SectionStack>
          <DetailCard title="Credit">
            <Field label="Credit status" value={c.creditStatus} />
            <Field label="Credit limit" value={c.creditLimit === null ? "No limit set" : money(c.creditLimit)} />
            <Field label="Current balance" value={money(c.currentBalance)} />
            <Field
              label="Available credit"
              value={creditAvailable(c) === null ? notApplicable(null) : money(creditAvailable(c))}
            />
            <Field label="Payment terms" value={c.paymentTerms} />
            <Field label="Currency" value={c.currency} />
          </DetailCard>
          <DetailCard title="Tax and accounting">
            <Field label="Tax ID" value={c.taxId} />
            <Field label="Tax exempt" value={c.taxExempt ? "Yes" : "No"} />
            <Field label="Accounting customer ID" value={c.accountingCustomerId} />
          </DetailCard>
        </SectionStack>
      ),
    },
    {
      key: "orders",
      label: "Orders",
      count: orders.length,
      render: () => (
        <SectionStack>
          <DetailPanel title="Orders placed by this account">
            <RelatedTable
              rows={orders.slice(0, 60)}
              rowKey={(o) => o.id}
              emptyTitle="No orders yet"
              emptyBody="Nothing has been ordered against this account."
              columns={[
                { key: "no", label: "Order", render: (o) => o.orderNo },
                { key: "type", label: "Type", render: (o) => o.orderType },
                { key: "shipTo", label: "Ship-to", render: (o) => o.shipTo },
                { key: "date", label: "Date", render: (o) => o.date.title },
                {
                  key: "status",
                  label: "Status",
                  render: (o) => (
                    <StatusChip tone={BROKER_STATUS_TONE[o.status]} variant="text">
                      {o.status}
                    </StatusChip>
                  ),
                },
              ]}
            />
          </DetailPanel>
        </SectionStack>
      ),
    },
    {
      key: "recurring",
      label: "Recurring Orders",
      count: recurring.length,
      render: () => (
        <SectionStack>
          <DetailPanel title="Recurring schedules">
            <RelatedTable
              rows={recurring}
              rowKey={(o) => o.id}
              emptyTitle="No recurring schedules"
              emptyBody="This account orders one delivery at a time."
              columns={[
                { key: "no", label: "Order", render: (o) => o.orderNo },
                { key: "freq", label: "Frequency", render: (o) => o.recurrence?.frequency ?? DASH },
                { key: "shipTo", label: "Ship-to", render: (o) => o.shipTo },
                { key: "next", label: "Next", render: (o) => o.date.title },
              ]}
            />
          </DetailPanel>
        </SectionStack>
      ),
    },
    {
      key: "assets",
      label: "Rental Assets",
      count: assets.length,
      render: () => (
        <SectionStack>
          <DetailPanel title="On rent to this account">
            <RelatedTable
              rows={assets}
              rowKey={(a) => a.id}
              onOpenRow={(a) => go.openAsset(a.id)}
              emptyTitle="No assets on rent"
              emptyBody="Nothing of ours is currently sitting at this account's sites."
              columns={[
                { key: "name", label: "Asset", render: (a) => a.name },
                { key: "serial", label: "Serial", render: (a) => a.serialNumber ?? <Muted /> },
                { key: "type", label: "Type", render: (a) => a.assetType },
                { key: "site", label: "Ship-to", render: (a) => a.shipTo ?? <Muted /> },
                { key: "start", label: "Since", render: (a) => formatDate(a.rentalStartDate) },
                { key: "rate", label: "Rate", align: "right", render: (a) => money(a.rentalRate) },
              ]}
            />
          </DetailPanel>
        </SectionStack>
      ),
    },
    {
      key: "attachments",
      label: "Attachments",
      count: c.attachments.length,
      render: () => <AttachmentsSection groups={[{ title: "Documents", files: c.attachments }]} />,
    },
    {
      key: "notes",
      label: "Notes",
      render: () => (
        <NotesSection
          blocks={[
            {
              title: "Customer instruction",
              body: c.customerInstruction,
              hint: "Printed on the dispatch sheet. Nothing recorded.",
            },
            { title: "Delivery notes", body: c.deliveryNotes, hint: "No site notes recorded." },
            { title: "Internal notes", body: c.notes, hint: "No internal notes." },
          ]}
        />
      ),
    },
    {
      key: "audit",
      label: "Audit History",
      count: c.audit.length,
      render: () => <AuditSection events={c.audit} />,
    },
  ];
}

const Muted = () => <span className="text-muted-foreground/70">{DASH}</span>;

export const CUSTOMER_EMPTY_ICON = <Contact />;

export const customerStatusTone = (c: BrokerCustomer): BadgeTone =>
  RECORD_TONE[c.status] ?? "neutral";

/* ─────────────────────────────────────────────────────────────── the form ── */

export function customerFormSections(): FormSectionDef<BrokerCustomer>[] {
  return [
    {
      key: "identity",
      title: "Identity",
      description: "How this account is named here and in accounting.",
      fields: [
        {
          key: "name",
          label: "Customer name",
          kind: "text",
          required: true,
          get: (d) => d.name,
          set: (d, v) => ({ ...d, name: String(v ?? "") }),
        },
        {
          key: "erpId",
          label: "ERP ID",
          kind: "text",
          required: true,
          description: "Must match the accounting system exactly.",
          get: (d) => d.erpId,
          set: (d, v) => ({ ...d, erpId: String(v ?? "") }),
        },
        {
          key: "status",
          label: "Record status",
          kind: "select",
          required: true,
          options: ["active", "inactive", "archived"],
          get: (d) => d.status,
          set: (d, v) => ({ ...d, status: v as BrokerCustomer["status"] }),
        },
        {
          key: "accountingCustomerId",
          label: "Accounting customer ID",
          kind: "text",
          get: (d) => d.accountingCustomerId,
          set: (d, v) => ({ ...d, accountingCustomerId: (v as string) || null }),
        },
      ],
    },
    {
      key: "contact",
      title: "Contact",
      fields: [
        { key: "mainContactName", label: "Main contact", kind: "text", get: (d) => d.mainContactName, set: (d, v) => ({ ...d, mainContactName: (v as string) || null }) },
        { key: "mainContactRole", label: "Role", kind: "text", get: (d) => d.mainContactRole, set: (d, v) => ({ ...d, mainContactRole: (v as string) || null }) },
        {
          key: "phone",
          label: "Phone",
          kind: "tel",
          required: true,
          get: (d) => d.phone,
          set: (d, v) => ({ ...d, phone: (v as string) || null }),
        },
        { key: "secondaryPhone", label: "Secondary phone", kind: "tel", get: (d) => d.secondaryPhone, set: (d, v) => ({ ...d, secondaryPhone: (v as string) || null }) },
        {
          key: "email",
          label: "Email",
          kind: "email",
          get: (d) => d.email,
          set: (d, v) => ({ ...d, email: (v as string) || null }),
          validate: (d) => (d.email && !d.email.includes("@") ? "Enter a valid email address" : null),
        },
        {
          key: "billingEmail",
          label: "Billing email",
          kind: "email",
          description: "Where invoices go. Falls back to the main email.",
          get: (d) => d.billingEmail,
          set: (d, v) => ({ ...d, billingEmail: (v as string) || null }),
          validate: (d) => (d.billingEmail && !d.billingEmail.includes("@") ? "Enter a valid email address" : null),
        },
        { key: "dispatchEmail", label: "Dispatch email", kind: "email", get: (d) => d.dispatchEmail, set: (d, v) => ({ ...d, dispatchEmail: (v as string) || null }) },
      ],
    },
    {
      key: "address",
      title: "Billing address",
      fields: [
        { key: "addressLine1", label: "Address line 1", kind: "text", get: (d) => d.addressLine1, set: (d, v) => ({ ...d, addressLine1: (v as string) || null }) },
        { key: "addressLine2", label: "Address line 2", kind: "text", get: (d) => d.addressLine2, set: (d, v) => ({ ...d, addressLine2: (v as string) || null }) },
        { key: "city", label: "City", kind: "text", get: (d) => d.city, set: (d, v) => ({ ...d, city: (v as string) || null }) },
        { key: "state", label: "State", kind: "text", get: (d) => d.state, set: (d, v) => ({ ...d, state: (v as string) || null }) },
        {
          key: "zip",
          label: "Zip",
          kind: "text",
          get: (d) => d.zip,
          set: (d, v) => ({ ...d, zip: (v as string) || null }),
          validate: (d) => (d.zip && !/^\d{5}(-\d{4})?$/.test(d.zip) ? "Use a 5-digit ZIP, or ZIP+4" : null),
        },
        { key: "country", label: "Country", kind: "text", get: (d) => d.country, set: (d, v) => ({ ...d, country: String(v ?? "USA") }) },
      ],
    },
    {
      key: "financial",
      title: "Financial",
      description: "What finance will let through, and on what terms.",
      fields: [
        {
          key: "creditStatus",
          label: "Credit status",
          kind: "select",
          required: true,
          options: CREDIT_STATUSES,
          get: (d) => d.creditStatus,
          set: (d, v) => ({ ...d, creditStatus: v as BrokerCustomer["creditStatus"] }),
        },
        {
          key: "creditLimit",
          label: "Credit limit",
          kind: "money",
          description: "Leave blank for no limit — that is not the same as zero.",
          /* ONLY WHERE IT COULD BE HONOURED. An unapproved account has no
             limit to speak of, and a box for one invites somebody to set it
             and assume it means something. */
          visible: (d) => d.creditStatus !== "Unapproved",
          get: (d) => d.creditLimit,
          set: (d, v) => ({ ...d, creditLimit: v === null ? null : Number(v) }),
          validate: (d) =>
            d.creditLimit !== null && d.creditLimit < 0 ? "A credit limit cannot be negative" : null,
        },
        {
          key: "currentBalance",
          label: "Current balance",
          kind: "money",
          required: true,
          get: (d) => d.currentBalance,
          set: (d, v) => ({ ...d, currentBalance: Number(v ?? 0) }),
        },
        {
          key: "paymentTerms",
          label: "Payment terms",
          kind: "select",
          required: true,
          options: PAYMENT_TERMS,
          get: (d) => d.paymentTerms,
          set: (d, v) => ({ ...d, paymentTerms: String(v) }),
        },
        { key: "taxId", label: "Tax ID", kind: "text", get: (d) => d.taxId, set: (d, v) => ({ ...d, taxId: (v as string) || null }) },
        { key: "taxExempt", label: "Tax exempt", kind: "switch", get: (d) => d.taxExempt, set: (d, v) => ({ ...d, taxExempt: Boolean(v) }) },
      ],
    },
    {
      key: "operations",
      title: "Operations",
      fields: [
        {
          key: "preferredVendorId",
          label: "Preferred vendor",
          kind: "select",
          options: VENDORS.filter((v) => v.active).map((v) => v.name),
          get: (d) => vendorById(d.preferredVendorId)?.name ?? "",
          set: (d, v) => ({
            ...d,
            preferredVendorId: VENDORS.find((x) => x.name === v)?.id ?? null,
          }),
        },
        { key: "portalAccessEnabled", label: "Portal access", kind: "switch", description: "Lets this account see its own orders.", get: (d) => d.portalAccessEnabled, set: (d, v) => ({ ...d, portalAccessEnabled: Boolean(v) }) },
        {
          key: "customerInstruction",
          label: "Customer instruction",
          kind: "textarea",
          wide: true,
          description: "Printed on the dispatch sheet — the driver reads this.",
          get: (d) => d.customerInstruction,
          set: (d, v) => ({ ...d, customerInstruction: (v as string) || null }),
        },
        {
          key: "deliveryNotes",
          label: "Delivery notes",
          kind: "textarea",
          wide: true,
          get: (d) => d.deliveryNotes,
          set: (d, v) => ({ ...d, deliveryNotes: (v as string) || null }),
        },
        {
          key: "notes",
          label: "Internal notes",
          kind: "textarea",
          wide: true,
          description: "Not shown to the customer or the vendor.",
          get: (d) => d.notes,
          set: (d, v) => ({ ...d, notes: (v as string) || null }),
        },
      ],
    },
  ];
}
