import { CELL } from "../RecordSheet";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import {
  AttachmentTable,
  NoteBlock,
  ReadField,
  ReadGrid,
  SheetTable,
  TagRow,
  type RecordReadSection,
} from "./DirectoryRecordSheet";
import { CONTACT_ROLES, DASH, formatDate, money, oneLineAddress } from "./directoryCore";
import {
  PAYMENT_TERMS,
  CREDIT_STATUSES,
  creditAvailable,
  creditBlocked,
  type BrokerCustomer,
} from "./directory";
import { assetsForCustomer, ordersForCustomer, shipTosForCustomer } from "./directoryLinks";
import { BROKER_STATUS_TONE } from "./orders";
import { vendorById, VENDORS } from "./vendors";
import type { FormSectionDef } from "./directoryFormTypes";
import { ACTIVE_KIND, kindTone } from "../statusKind";

/*
  What a customer record shows in the sheet, beyond the fields it edits.

  THE FORM COVERS THE RECORD'S OWN FIELDS. What is left is everything the
  account is ATTACHED to — its people, its sites, what it has ordered, what of
  ours is sitting on its land — and none of that is edited here, so it reads as
  tables under the form rather than as more inputs.

  CREDIT IS THE HEADLINE, and it is three numbers that only mean anything
  together: the limit, what is drawn against it, and what is left. The third is
  the one people are actually asking for, and it is computed — a stored
  "available" goes stale the moment a balance moves.
*/

const Muted = () => <span className="text-muted-foreground/70">{DASH}</span>;

/** The chip beside the sheet's title — status first, exposure second. */
export function customerHeaderAside(c: BrokerCustomer) {
  const over = c.creditLimit !== null && c.currentBalance > c.creditLimit;
  return (
    <span className="flex items-center gap-1.5">
      <StatusChip tone={kindTone(ACTIVE_KIND(c.status === "active"))} variant="soft">
        <span className="capitalize">{c.status}</span>
      </StatusChip>
      <StatusChip
        tone={
          kindTone(c.creditStatus === "Approved" ? "success" : c.creditStatus === "On hold" ? "caution" : "critical")
        }
        variant="soft"
      >
        {c.creditStatus}
      </StatusChip>
      {/* OVER LIMIT IS ITS OWN CHIP, not a shade of the credit status. An
          account can be fully approved AND over its limit — that is exactly
          the pair that blocks an order, and one chip cannot carry both. */}
      {over && (
        <StatusChip tone={kindTone("critical")} variant="soft">
          Over limit
        </StatusChip>
      )}
    </span>
  );
}

export function customerReadSections(
  c: BrokerCustomer,
  go: { openAsset: (id: string) => void; openVendor: (id: string) => void }
): RecordReadSection[] {
  const sites = shipTosForCustomer(c.id);
  const orders = ordersForCustomer(c.name);
  const assets = assetsForCustomer(c.id);
  const recurring = orders.filter((o) => o.kind === "Recurring");
  const available = creditAvailable(c);
  const preferred = vendorById(c.preferredVendorId);

  return [
    {
      key: "credit",
      title: "Credit position",
      note: creditBlocked(c) ? "This account cannot place new orders" : "Clear to order",
      render: () => (
        <ReadGrid>
          <ReadField
            label="Credit limit"
            value={c.creditLimit === null ? "No limit set" : money(c.creditLimit)}
          />
          <ReadField label="Current balance" value={money(c.currentBalance)} />
          <ReadField
            label="Available credit"
            value={
              available === null ? (
                "N/A"
              ) : (
                <span className={available < 0 ? "font-medium text-status-failed" : undefined}>
                  {money(available)}
                </span>
              )
            }
          />
          <ReadField label="Payment terms" value={c.paymentTerms} />
          <ReadField label="Tax exempt" value={c.taxExempt ? "Yes" : "No"} />
          <ReadField label="Accounting ID" value={c.accountingCustomerId} />
          <ReadField
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
          <ReadField label="Tags" value={<TagRow tags={c.tags} />} />
        </ReadGrid>
      ),
    },
    {
      key: "contacts",
      /* ITS TABLE'S COLUMNS — the sheet's width (DS ui/7-variants §1). */
      columns: [CELL.name, CELL.pick, CELL.pick, CELL.text],
      title: "Contacts",
      count: c.contacts.length,
      render: () => (
        <SheetTable
          rows={c.contacts}
          rowKey={(p) => p.id}
          emptyBody="Nobody is recorded for this account. Dispatch has no one to call."
          columns={[
            {
              key: "name",
              label: "Name",
              render: (p) => (
                <span className="flex items-center gap-2">
                  {p.name}
                  {p.isPrimary && (
                    <Pill>
                      Primary
                    </Pill>
                  )}
                </span>
              ),
            },
            { key: "role", label: "Role", render: (p) => p.role },
            { key: "phone", label: "Phone", render: (p) => p.phone ?? <Muted /> },
            { key: "email", label: "Email", render: (p) => p.email ?? <Muted /> },
          ]}
        />
      ),
    },
    {
      key: "shiptos",
      /* ITS TABLE'S COLUMNS — the sheet's width (DS ui/7-variants §1). */
      columns: [CELL.name, CELL.text, CELL.flag, CELL.status],
      title: "Ship-to Locations",
      count: sites.length,
      render: () => (
        <SheetTable
          rows={sites}
          rowKey={(s) => s.id}
          emptyBody="No delivery sites. An order cannot be created without one."
          columns={[
            {
              key: "name",
              label: "Location",
              render: (s) => (
                <span className="flex items-center gap-2">
                  {s.locationName}
                  {s.isDefault && (
                    <Pill>
                      Default
                    </Pill>
                  )}
                </span>
              ),
            },
            { key: "addr", label: "Address", render: (s) => oneLineAddress(s) },
            {
              key: "geo",
              label: "Geocoded",
              /* A site with no coordinates cannot be routed, which is the only
                 reason this column is on screen rather than buried. */
              render: (s) =>
                s.latitude !== null && s.longitude !== null ? (
                  "Yes"
                ) : (
                  <span className="text-muted-foreground/70">Not geocoded</span>
                ),
            },
            {
              key: "status",
              label: "Status",
              render: (s) => (
                <StatusChip tone={kindTone(ACTIVE_KIND(s.status === "active"))} variant="text">
                  <span className="capitalize">{s.status}</span>
                </StatusChip>
              ),
            },
          ]}
        />
      ),
    },
    {
      key: "orders",
      /* ITS TABLE'S COLUMNS — the sheet's width (DS ui/7-variants §1). */
      columns: [CELL.pick, CELL.pick, CELL.name, CELL.date, CELL.status],
      title: "Orders",
      note: `${orders.length} all time · ${recurring.length} recurring`,
      render: () => (
        <SheetTable
          rows={orders}
          rowKey={(o) => o.id}
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
      ),
    },
    {
      key: "assets",
      /* ITS TABLE'S COLUMNS — the sheet's width (DS ui/7-variants §1). */
      columns: [CELL.name, CELL.pick, CELL.pick, CELL.name, CELL.date, CELL.number],
      title: "Rental Assets",
      count: assets.length,
      render: () => (
        <SheetTable
          rows={assets}
          rowKey={(a) => a.id}
          onOpenRow={(a) => go.openAsset(a.id)}
          emptyBody="Nothing of ours is sitting at this account's sites."
          columns={[
            { key: "name", label: "Asset", render: (a) => a.name },
            { key: "serial", label: "Serial", render: (a) => a.serialNumber ?? <Muted /> },
            { key: "type", label: "Type", render: (a) => a.assetType },
            { key: "site", label: "Ship-to", render: (a) => a.shipTo ?? <Muted /> },
            { key: "start", label: "Since", render: (a) => formatDate(a.rentalStartDate) },
            { key: "rate", label: "Rate", align: "right", render: (a) => money(a.rentalRate) },
          ]}
        />
      ),
    },
    {
      key: "attachments",
      title: "Attachments",
      count: c.attachments.length,
      render: () => <AttachmentTable files={c.attachments} />,
    },
    {
      key: "notes",
      title: "Internal notes",
      render: () => <NoteBlock body={c.notes} hint="No internal notes." />,
    },
  ];
}

/* ─────────────────────────────────────────────────────────────── the form ── */

export function customerFormSections(): FormSectionDef<BrokerCustomer>[] {
  return [
    {
      key: "identity",
      title: "Identity",
      note: "How this account is named here and in accounting.",
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
        {
          key: "mainContactRole",
          label: "Role",
          /* THE COMMON ROLES, AND ANYTHING ELSE. A closed list here would send
             "Night Yard Lead" into a notes field, where nothing can filter by
             it; a bare text box would give ten spellings of "Foreman". */
          kind: "combobox",
          options: CONTACT_ROLES,
          allowCreate: true,
          placeholder: "Select or type a role",
          get: (d) => d.mainContactRole,
          set: (d, v) => ({ ...d, mainContactRole: (v as string) || null }),
        },
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
      note: "What finance will let through, and on what terms.",
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
