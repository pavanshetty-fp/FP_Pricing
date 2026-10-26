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
import { DASH, daysFromToday, formatDate, money } from "./directoryCore";
import { BROKER_PRODUCTS } from "./directory";
import { ordersForVendor } from "./directoryLinks";
import { BROKER_STATUS_TONE } from "./orders";
import {
  AVAILABILITY_STATUSES,
  BUSINESS_LINES,
  SERVICE_AREA_TYPES,
  VENDOR_TYPES,
  assignedOrderCount,
  type Vendor,
} from "./vendors";
import type { FormSectionDef } from "./directoryFormTypes";
import { ACTIVE_KIND, kindTone } from "../statusKind";

/*
  What a vendor record shows in the sheet, beyond the fields it edits.

  ELIGIBILITY IS THE HEADLINE, and it is four independent answers: are they
  switched on, are they approved, is the paperwork current, and are they free.
  Four chips, because collapsing them into one "eligible / not eligible"
  destroys the only useful part — WHICH of the four is the problem.

  COMPLIANCE IS COUNTED IN DAYS, not shown as a date. "Expires 2026-11-30" is a
  date somebody has to subtract today from; "84 days left" is the answer they
  were doing the subtraction to get.
*/

const Muted = () => <span className="text-muted-foreground/70">{DASH}</span>;

export function vendorHeaderAside(v: Vendor) {
  const days = daysFromToday(v.complianceValidTo);
  return (
    <span className="flex items-center gap-1.5">
      <StatusChip tone={kindTone(ACTIVE_KIND(v.active))} variant="soft">
        {v.active ? "Active" : "Inactive"}
      </StatusChip>
      <StatusChip
        tone={
          kindTone(
            v.complianceStatus === "Valid"
              ? "success"
              : v.complianceStatus === "Expiring"
                ? "caution"
                : "critical",
          )
        }
        variant="soft"
      >
        {days !== null && days < 0
          ? `Compliance expired`
          : days !== null && days < 60
            ? `Compliance ${days}d`
            : "Compliance valid"}
      </StatusChip>
      {!v.approvedForAssignment && (
        <StatusChip tone={kindTone("critical")} variant="soft">
          Not approved
        </StatusChip>
      )}
      {v.availabilityStatus !== "Available" && (
        <StatusChip tone={kindTone("caution")} variant="soft">
          {v.availabilityStatus}
        </StatusChip>
      )}
    </span>
  );
}

export function vendorReadSections(v: Vendor): RecordReadSection[] {
  const orders = ordersForVendor(v.id);
  const live = orders.filter(
    (o) => !["Completed", "Synced", "Canceled"].includes(o.status)
  );
  const history = orders.filter((o) =>
    ["Completed", "Synced", "Canceled"].includes(o.status)
  );
  const products = BROKER_PRODUCTS.filter((p) => v.supportedProductIds.includes(p.id));
  const days = daysFromToday(v.complianceValidTo);

  return [
    {
      key: "standing",
      title: "Standing",
      note:
        days === null
          ? undefined
          : days < 0
            ? `Lapsed ${Math.abs(days)} days ago`
            : `${days} days of cover left`,
      render: () => (
        <ReadGrid>
          <ReadField label="Compliance status" value={v.complianceStatus} />
          <ReadField label="Valid until" value={formatDate(v.complianceValidTo)} />
          <ReadField label="Insurance expiry" value={formatDate(v.insuranceExpiry)} />
          <ReadField label="Licenses" value={<TagRow tags={v.licenseNumbers} />} />
          <ReadField label="Live orders" value={assignedOrderCount(v.id)} />
          <ReadField label="Safety score" value={`${v.safetyScore} / 100`} />
          <ReadField label="Distance from yard" value={`${v.distanceMi} mi`} />
          <ReadField label="Legal business name" value={v.legalBusinessName} />
          <ReadField label="Vendor type" value={v.vendorType} />
          {/* THE COMMS SETTINGS LIVE HERE NOW. Both left the table — real,
              rarely looked at, never the reason somebody opens the list — so
              the record is where they have to be readable. */}
          <ReadField
            label="Email invitations"
            value={v.emailsEnabled ? "Enabled" : "Disabled — this vendor is not emailed"}
          />
          <ReadField
            label="Vendor app"
            value={v.hasAccount ? "Has an account" : "Email link only"}
          />
          <ReadField
            label="Approved for assignment"
            value={v.approvedForAssignment ? "Yes" : "No — withheld"}
          />
          <ReadField
            label="Blackout dates"
            value={
              v.blackoutDates.length > 0 ? (
                <TagRow tags={v.blackoutDates.map((d) => formatDate(d))} />
              ) : (
                "None"
              )
            }
            wide
          />
          <ReadField label="Tags" value={<TagRow tags={v.tags} />} wide />
        </ReadGrid>
      ),
    },
    {
      /* NOT "Service coverage" — that heading is already the editable section
         above, and two blocks with one name is how somebody edits the wrong
         one. This is the part of coverage the form does not ask for. */
      key: "coverage-detail",
      title: "Coverage detail",
      note: "Derived from the service area above",
      render: () => (
        <ReadGrid>
          <ReadField
            label="Cities covered"
            value={v.coveredCities.length > 0 ? <TagRow tags={v.coveredCities} /> : null}
            wide
          />
          <ReadField
            label="ZIPs covered"
            value={v.coveredZips.length > 0 ? <TagRow tags={v.coveredZips} /> : null}
            wide
          />
          <ReadField label="Order types" value={<TagRow tags={v.supportedOrderTypes} />} wide />
        </ReadGrid>
      ),
    },
    {
      key: "contacts",
      /* ITS TABLE'S COLUMNS — the sheet's width (DS ui/7-variants §1). */
      columns: [CELL.name, CELL.pick, CELL.pick, CELL.text],
      title: "Contacts",
      count: v.contacts.length,
      render: () => (
        <SheetTable
          rows={v.contacts}
          rowKey={(p) => p.id}
          emptyBody="Nobody is recorded here. Dispatch has no one to call."
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
      key: "rates",
      /* ITS TABLE'S COLUMNS — the sheet's width (DS ui/7-variants §1). */
      columns: [CELL.name, CELL.number, CELL.number, CELL.number],
      title: "Rate card",
      count: v.rateCard.length,
      render: () => (
        <SheetTable
          rows={v.rateCard}
          rowKey={(l) => l.id}
          emptyBody="No rate card. Quotes from this vendor cannot be checked against anything."
          columns={[
            {
              key: "label",
              label: "Tier",
              render: (l) => (
                <span className="flex items-center gap-2">
                  {l.label}
                  {l.id === v.defaultRateCardId && (
                    <Pill>
                      Default
                    </Pill>
                  )}
                </span>
              ),
            },
            {
              key: "min",
              label: "From",
              render: (l) => (l.minGallons ? `${l.minGallons.toLocaleString()} gal` : <Muted />),
            },
            {
              key: "rate",
              label: "Rate",
              render: (l) => `${money(l.rate)} ${l.unit}`,
            },
            {
              key: "fsc",
              label: "Surcharge",
              render: (l) => (l.fuelSurcharge === null ? <Muted /> : money(l.fuelSurcharge)),
            },
          ]}
        />
      ),
    },
    {
      key: "products",
      /* ITS TABLE'S COLUMNS — the sheet's width (DS ui/7-variants §1). */
      columns: [CELL.name, CELL.pick, CELL.pick, CELL.pick],
      title: "Supported products",
      count: products.length,
      render: () => (
        <SheetTable
          rows={products}
          rowKey={(p) => p.id}
          emptyBody="This vendor's business lines cover nothing in the catalog."
          columns={[
            { key: "name", label: "Product", render: (p) => p.name },
            { key: "code", label: "Code", render: (p) => p.productCode },
            { key: "cat", label: "Category", render: (p) => p.category },
            { key: "unit", label: "UOM", render: (p) => p.unit },
          ]}
        />
      ),
    },
    {
      key: "assignments",
      /* ITS TABLE'S COLUMNS — the sheet's width (DS ui/7-variants §1). */
      columns: [CELL.pick, CELL.name, CELL.date, CELL.status],
      title: "Assignments",
      note: `${live.length} live · ${history.length} closed`,
      render: () => (
        <SheetTable
          rows={[...live, ...history]}
          rowKey={(o) => o.id}
          emptyBody="This vendor has never been given work."
          columns={[
            { key: "no", label: "Order", render: (o) => o.orderNo },
            { key: "cust", label: "Customer", render: (o) => o.customer.title },
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
      key: "documents",
      title: "Compliance documents",
      count: v.documents.length,
      render: () => <AttachmentTable files={v.documents} />,
    },
    {
      key: "attachments",
      title: "Attachments",
      count: v.attachments.length,
      render: () => <AttachmentTable files={v.attachments} />,
    },
    {
      key: "notes",
      title: "Internal notes",
      render: () => <NoteBlock body={v.notes} hint="No internal notes." />,
    },
  ];
}

/* ─────────────────────────────────────────────────────────────── the form ── */

export function vendorFormSections(): FormSectionDef<Vendor>[] {
  return [
    {
      key: "identity",
      title: "Identity",
      fields: [
        { key: "name", label: "Vendor name", kind: "text", required: true, get: (d) => d.name, set: (d, v) => ({ ...d, name: String(v ?? "") }) },
        { key: "legalBusinessName", label: "Legal business name", kind: "text", get: (d) => d.legalBusinessName, set: (d, v) => ({ ...d, legalBusinessName: (v as string) || null }) },
        { key: "dbaName", label: "DBA", kind: "text", get: (d) => d.dbaName, set: (d, v) => ({ ...d, dbaName: (v as string) || null }) },
        { key: "erpVendorId", label: "Vendor ID", kind: "text", get: (d) => d.erpVendorId, set: (d, v) => ({ ...d, erpVendorId: (v as string) || null }) },
        {
          key: "vendorType",
          label: "Vendor type",
          /* Creatable for the same reason a role is: the six types cover most
             carriers and not all of them. */
          kind: "combobox",
          options: VENDOR_TYPES,
          allowCreate: true,
          required: true,
          get: (d) => d.vendorType,
          set: (d, v) => ({ ...d, vendorType: String(v) }),
        },
        { key: "taxId", label: "Tax ID", kind: "text", get: (d) => d.taxId, set: (d, v) => ({ ...d, taxId: (v as string) || null }) },
        { key: "active", label: "Active", kind: "switch", description: "Deactivated vendors keep their history and take no new work.", get: (d) => d.active, set: (d, v) => ({ ...d, active: Boolean(v), status: v ? "active" : "inactive" }) },
      ],
    },
    {
      key: "dispatch",
      title: "Dispatch contacts",
      note: "Who gets the invitation, and who gets called when it is urgent.",
      fields: [
        { key: "dispatchContactName", label: "Dispatch contact", kind: "text", required: true, get: (d) => d.dispatchContactName, set: (d, v) => ({ ...d, dispatchContactName: (v as string) || null }) },
        {
          key: "dispatchPhone",
          label: "Dispatch phone",
          kind: "tel",
          required: true,
          get: (d) => d.dispatchPhone,
          set: (d, v) => ({ ...d, dispatchPhone: (v as string) || null }),
        },
        {
          key: "dispatchEmail",
          label: "Dispatch email",
          kind: "email",
          required: true,
          description: "Order invitations are sent here.",
          get: (d) => d.dispatchEmail,
          set: (d, v) => ({ ...d, dispatchEmail: (v as string) || null }),
          validate: (d) => (d.dispatchEmail && !d.dispatchEmail.includes("@") ? "Enter a valid email address" : null),
        },
        { key: "mainContactName", label: "Main contact", kind: "text", get: (d) => d.mainContactName, set: (d, v) => ({ ...d, mainContactName: (v as string) || null }) },
        { key: "accountingContactName", label: "Accounting contact", kind: "text", get: (d) => d.accountingContactName, set: (d, v) => ({ ...d, accountingContactName: (v as string) || null }) },
        { key: "accountingEmail", label: "Accounting email", kind: "email", get: (d) => d.accountingEmail, set: (d, v) => ({ ...d, accountingEmail: (v as string) || null }) },
        { key: "escalationContactName", label: "Escalation contact", kind: "text", get: (d) => d.escalationContactName, set: (d, v) => ({ ...d, escalationContactName: (v as string) || null }) },
        { key: "phone", label: "Main phone", kind: "tel", get: (d) => d.phone, set: (d, v) => ({ ...d, phone: (v as string) || null }) },
        { key: "emailsEnabled", label: "Email invitations", kind: "switch", get: (d) => d.emailsEnabled, set: (d, v) => ({ ...d, emailsEnabled: Boolean(v) }) },
      ],
    },
    {
      key: "address",
      title: "Address",
      fields: [
        { key: "addressLine1", label: "Address line 1", kind: "text", get: (d) => d.addressLine1, set: (d, v) => ({ ...d, addressLine1: (v as string) || null }) },
        { key: "addressLine2", label: "Address line 2", kind: "text", get: (d) => d.addressLine2, set: (d, v) => ({ ...d, addressLine2: (v as string) || null }) },
        { key: "city", label: "City", kind: "text", required: true, get: (d) => d.city, set: (d, v) => ({ ...d, city: (v as string) || null, base: `${v ?? ""}, ${d.state ?? ""}` }) },
        { key: "state", label: "State", kind: "text", required: true, get: (d) => d.state, set: (d, v) => ({ ...d, state: (v as string) || null, base: `${d.city ?? ""}, ${v ?? ""}` }) },
        { key: "zip", label: "Zip", kind: "text", get: (d) => d.zip, set: (d, v) => ({ ...d, zip: (v as string) || null }) },
        { key: "country", label: "Country", kind: "text", get: (d) => d.country, set: (d, v) => ({ ...d, country: String(v ?? "USA") }) },
      ],
    },
    {
      key: "coverage",
      title: "Service coverage",
      note: "A vendor is only offered for an order inside the area they cover.",
      fields: [
        { key: "serviceAreaType", label: "Service area type", kind: "select", required: true, options: SERVICE_AREA_TYPES, get: (d) => d.serviceAreaType, set: (d, v) => ({ ...d, serviceAreaType: v as Vendor["serviceAreaType"] }) },
        {
          key: "serviceStates",
          label: "States covered",
          kind: "text",
          required: true,
          wide: true,
          description: "Comma separated, spelled out — California, Arizona.",
          get: (d) => d.serviceStates.join(", "),
          set: (d, v) => ({ ...d, serviceStates: String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean) }),
          validate: (d) => (d.serviceStates.length === 0 ? "A vendor with no coverage can never be assigned" : null),
        },
        {
          key: "maxRadiusMiles",
          label: "Max radius (mi)",
          kind: "number",
          visible: (d) => d.serviceAreaType === "radius",
          get: (d) => d.maxRadiusMiles,
          set: (d, v) => ({ ...d, maxRadiusMiles: v === null ? null : Number(v) }),
        },
        {
          key: "coveredZips",
          label: "ZIPs covered",
          kind: "text",
          wide: true,
          visible: (d) => d.serviceAreaType === "zip",
          get: (d) => d.coveredZips.join(", "),
          set: (d, v) => ({ ...d, coveredZips: String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean) }),
        },
      ],
    },
    {
      key: "capability",
      title: "Capabilities",
      fields: [
        {
          key: "businessLines",
          label: "Business lines",
          kind: "text",
          required: true,
          wide: true,
          description: `Comma separated. One of: ${BUSINESS_LINES.join(", ")}.`,
          get: (d) => d.businessLines.join(", "),
          set: (d, v) => ({
            ...d,
            businessLines: String(v ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter((s): s is Vendor["businessLines"][number] =>
                (BUSINESS_LINES as readonly string[]).includes(s)
              ),
          }),
          validate: (d) =>
            d.businessLines.length === 0 ? "Pick at least one line this vendor runs" : null,
        },
        { key: "topOffCapable", label: "Top-off capable", kind: "switch", get: (d) => d.topOffCapable, set: (d, v) => ({ ...d, topOffCapable: Boolean(v) }) },
        { key: "assetHandlingCapable", label: "Asset handling", kind: "switch", get: (d) => d.assetHandlingCapable, set: (d, v) => ({ ...d, assetHandlingCapable: Boolean(v) }) },
        { key: "afterHoursCapable", label: "After hours", kind: "switch", get: (d) => d.afterHoursCapable, set: (d, v) => ({ ...d, afterHoursCapable: Boolean(v) }) },
      ],
    },
    {
      key: "compliance",
      title: "Compliance and approval",
      note: "Paperwork and permission are separate — both must hold before a vendor is offered.",
      fields: [
        {
          key: "complianceValidTo",
          label: "Compliance valid to",
          kind: "date",
          required: true,
          description: "Past this date the vendor is offered on no new order.",
          get: (d) => d.complianceValidTo,
          set: (d, v) => ({ ...d, complianceValidTo: String(v ?? "") }),
        },
        { key: "insuranceExpiry", label: "Insurance expiry", kind: "date", get: (d) => d.insuranceExpiry, set: (d, v) => ({ ...d, insuranceExpiry: (v as string) || null }) },
        {
          key: "licenseNumbers",
          label: "License numbers",
          kind: "text",
          wide: true,
          get: (d) => d.licenseNumbers.join(", "),
          set: (d, v) => ({ ...d, licenseNumbers: String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean) }),
        },
        {
          key: "approvedForAssignment",
          label: "Approved for assignment",
          kind: "switch",
          description: "A human decision, separate from whether the documents are current.",
          get: (d) => d.approvedForAssignment,
          set: (d, v) => ({ ...d, approvedForAssignment: Boolean(v) }),
        },
        { key: "availabilityStatus", label: "Availability", kind: "select", required: true, options: AVAILABILITY_STATUSES, get: (d) => d.availabilityStatus, set: (d, v) => ({ ...d, availabilityStatus: v as Vendor["availabilityStatus"] }) },
        { key: "assignmentPriority", label: "Assignment priority", kind: "number", description: "1 is offered first.", get: (d) => d.assignmentPriority, set: (d, v) => ({ ...d, assignmentPriority: Number(v ?? 3) }) },
      ],
    },
    {
      key: "money",
      title: "Rates and terms",
      fields: [
        { key: "minimumCharge", label: "Minimum charge", kind: "money", get: (d) => d.minimumCharge, set: (d, v) => ({ ...d, minimumCharge: v === null ? null : Number(v) }) },
        { key: "paymentTerms", label: "Payment terms", kind: "select", required: true, options: ["Net 15", "Net 30", "Net 45", "Quick pay 2/10"], get: (d) => d.paymentTerms, set: (d, v) => ({ ...d, paymentTerms: String(v) }) },
        { key: "accountingVendorId", label: "Accounting vendor ID", kind: "text", get: (d) => d.accountingVendorId, set: (d, v) => ({ ...d, accountingVendorId: (v as string) || null }) },
        { key: "safetyScore", label: "Safety score", kind: "number", description: "0–100.", get: (d) => d.safetyScore, set: (d, v) => ({ ...d, safetyScore: Number(v ?? 0) }), validate: (d) => (d.safetyScore < 0 || d.safetyScore > 100 ? "Score runs 0 to 100" : null) },
        {
          key: "vendorInstruction",
          label: "Vendor instruction",
          kind: "textarea",
          wide: true,
          get: (d) => d.vendorInstruction,
          set: (d, v) => ({ ...d, vendorInstruction: (v as string) || null }),
        },
        { key: "notes", label: "Internal notes", kind: "textarea", wide: true, get: (d) => d.notes, set: (d, v) => ({ ...d, notes: (v as string) || null }) },
      ],
    },
  ];
}
