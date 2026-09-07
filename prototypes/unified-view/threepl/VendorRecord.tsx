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
import type { FormSectionDef } from "./DirectoryForm";

/*
  What a vendor record shows, and why in this order.

  ELIGIBILITY IS THE HEADLINE. Everything at the top of this page exists to
  answer one question — can I give this carrier work today — and that question
  has four independent answers: are they switched on, are they approved, is the
  paperwork current, and are they free. Four badges, because collapsing them
  into one "eligible / not eligible" chip destroys the only useful part, which
  is WHICH of the four is the problem.

  COMPLIANCE IS COUNTED IN DAYS, not shown as a date. "Expires 2026-11-30" is
  a date somebody has to subtract today from; "expires in 84 days" is the
  answer they were doing the subtraction to get.
*/

const AVAIL_TONE: Record<string, BadgeTone> = {
  Available: "success",
  Limited: "warning",
  Unavailable: "critical",
};

const COMPLIANCE_TONE: Record<string, BadgeTone> = {
  Valid: "success",
  Expiring: "warning",
  Expired: "critical",
  Missing: "critical",
};

export const vendorStatusTone = (v: Vendor): BadgeTone => (v.active ? "success" : "neutral");

export function vendorBadges(v: Vendor) {
  const days = daysFromToday(v.complianceValidTo);
  const out: { label: string; tone: BadgeTone; title?: string }[] = [
    {
      label: v.complianceStatus,
      tone: COMPLIANCE_TONE[v.complianceStatus] ?? "neutral",
      title:
        days === null
          ? undefined
          : days < 0
            ? `Lapsed ${Math.abs(days)} days ago on ${formatDate(v.complianceValidTo)}`
            : `Current for another ${days} days, until ${formatDate(v.complianceValidTo)}`,
    },
    { label: v.availabilityStatus, tone: AVAIL_TONE[v.availabilityStatus] ?? "neutral" },
  ];
  if (!v.approvedForAssignment) {
    out.push({
      label: "Not approved",
      tone: "critical",
      title: "Somebody has withheld assignment approval. This is a decision, not a document.",
    });
  }
  if (!v.emailsEnabled) {
    out.push({ label: "Emails off", tone: "warning", title: "Invitations will not be emailed to this vendor" });
  }
  return out;
}

export function vendorStats(v: Vendor): RecordSummaryStat[] {
  const days = daysFromToday(v.complianceValidTo);
  const base = v.rateCard.find((l) => l.minGallons === null);
  return [
    {
      label: "Safety score",
      value: v.safetyScore,
      hint: v.safetyScore >= 90 ? "Top band" : v.safetyScore >= 80 ? "Acceptable" : "Below target",
      tone: v.safetyScore >= 90 ? "success" : v.safetyScore >= 70 ? undefined : "critical",
    },
    {
      label: "Compliance",
      value: days === null ? DASH : days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`,
      hint: formatDate(v.complianceValidTo),
      tone: days === null ? undefined : days < 0 ? "critical" : days < 60 ? "warning" : "success",
    },
    { label: "Live orders", value: assignedOrderCount(v.id), hint: "Assigned, accepted or in flight" },
    {
      label: "Base rate",
      value: base ? `${money(base.rate, true)} ${base.unit}` : DASH,
      hint: base?.fuelSurcharge ? `+ ${money(base.fuelSurcharge, true)} surcharge` : "No surcharge",
    },
    { label: "Coverage", value: `${v.serviceStates.length} states`, hint: v.serviceStates.join(", ") || DASH },
  ];
}

export function vendorSections(v: Vendor): RecordSection[] {
  const orders = ordersForVendor(v.id);
  const live = orders.filter((o) => !["Completed", "Accounting Synced", "Cancelled"].includes(o.status));
  const history = orders.filter((o) => ["Completed", "Accounting Synced", "Cancelled"].includes(o.status));
  const products = BROKER_PRODUCTS.filter((p) => v.supportedProductIds.includes(p.id));

  return [
    {
      key: "overview",
      label: "Overview",
      render: () => (
        <SectionStack>
          <DetailCard title="Identity">
            <Field label="Vendor name" value={v.name} />
            <Field label="Legal business name" value={v.legalBusinessName} />
            <Field label="DBA" value={v.dbaName} />
            <Field label="Vendor ID" value={v.erpVendorId} />
            <Field label="Vendor type" value={v.vendorType} />
            <Field label="Tax ID" value={v.taxId} />
            <Field label="Record status" value={<span className="capitalize">{v.status}</span>} />
            <Field label="Created" value={formatDate(v.createdAt.slice(0, 10))} />
            <Field label="Last updated" value={formatDate(v.updatedAt.slice(0, 10))} />
          </DetailCard>

          <DetailCard title="Address">
            <Field label="Address line 1" value={v.addressLine1} />
            <Field label="Address line 2" value={v.addressLine2} />
            <Field label="City" value={v.city} />
            <Field label="State" value={v.state} />
            <Field label="Zip" value={v.zip} />
            <Field label="Country" value={v.country} />
          </DetailCard>

          <DetailCard title="Assignment">
            <Field
              label="Approved for assignment"
              value={v.approvedForAssignment ? "Yes" : "No — withheld"}
            />
            <Field label="Assignment priority" value={`${v.assignmentPriority} of 5`} />
            <Field label="Availability" value={v.availabilityStatus} />
            <Field label="Vendor app account" value={v.hasAccount ? "Has account" : "Email link only"} />
            <Field label="Email invitations" value={v.emailsEnabled ? "Enabled" : "Disabled"} />
            <Field label="Tags" value={<TagList tags={v.tags} />} wide />
          </DetailCard>
        </SectionStack>
      ),
    },
    {
      key: "contacts",
      label: "Dispatch Contacts",
      count: v.contacts.length,
      render: () => (
        <SectionStack>
          <DetailCard title="Named contacts">
            <Field label="Main contact" value={v.mainContactName} />
            <Field label="Dispatch contact" value={v.dispatchContactName} />
            <Field label="Accounting contact" value={v.accountingContactName} />
            <Field label="Escalation contact" value={v.escalationContactName} />
            <Field label="Main phone" value={v.phone} />
            <Field label="Dispatch phone" value={v.dispatchPhone} />
            <Field label="General email" value={v.email} />
            <Field label="Dispatch email" value={v.dispatchEmail} />
            <Field label="Accounting email" value={v.accountingEmail} />
          </DetailCard>
          <DetailPanel title="Contact list">
            <RelatedTable
              rows={v.contacts}
              rowKey={(p) => p.id}
              emptyTitle="No contacts"
              emptyBody="Nobody is recorded here. Dispatch has no one to call."
              columns={[
                {
                  key: "name",
                  label: "Name",
                  render: (p) => (
                    <span className="flex items-center gap-2">
                      {p.name}
                      {p.isPrimary && <Badge variant="secondary" className="font-normal">Primary</Badge>}
                    </span>
                  ),
                },
                { key: "role", label: "Role", render: (p) => p.role },
                { key: "phone", label: "Phone", render: (p) => p.phone ?? <Muted /> },
                { key: "email", label: "Email", render: (p) => p.email ?? <Muted /> },
              ]}
            />
          </DetailPanel>
        </SectionStack>
      ),
    },
    {
      key: "coverage",
      label: "Service Coverage",
      render: () => (
        <SectionStack>
          <DetailCard title="Where they run">
            <Field label="Service area type" value={<span className="capitalize">{v.serviceAreaType}</span>} />
            <Field label="Max radius" value={v.maxRadiusMiles ? `${v.maxRadiusMiles} mi` : null} />
            <Field label="Distance from yard" value={`${v.distanceMi} mi`} />
            <Field
              label="States covered"
              value={v.serviceStates.length > 0 ? <TagList tags={v.serviceStates} /> : null}
              wide
            />
            <Field
              label="Cities covered"
              value={v.coveredCities.length > 0 ? <TagList tags={v.coveredCities} /> : null}
              wide
            />
            <Field
              label="ZIPs covered"
              value={v.coveredZips.length > 0 ? <TagList tags={v.coveredZips} /> : null}
              wide
            />
          </DetailCard>
          <DetailCard title="Availability">
            <Field label="Status" value={v.availabilityStatus} />
            <Field
              label="Blackout dates"
              value={
                v.blackoutDates.length > 0 ? (
                  <TagList tags={v.blackoutDates.map((d) => formatDate(d))} />
                ) : (
                  "None"
                )
              }
              wide
            />
          </DetailCard>
        </SectionStack>
      ),
    },
    {
      key: "capabilities",
      label: "Product Capabilities",
      count: products.length,
      render: () => (
        <SectionStack>
          <DetailCard title="What they can carry">
            <Field label="Business lines" value={<TagList tags={v.businessLines} />} wide />
            <Field label="Order types" value={<TagList tags={v.supportedOrderTypes} />} wide />
            <Field label="Top-off capable" value={v.topOffCapable ? "Yes" : "No"} />
            <Field label="Asset handling" value={v.assetHandlingCapable ? "Yes" : "No"} />
            <Field label="After hours" value={v.afterHoursCapable ? "Yes" : "No"} />
          </DetailCard>
          <DetailPanel title={`Supported products (${products.length})`}>
            <RelatedTable
              rows={products}
              rowKey={(p) => p.id}
              emptyTitle="No products"
              emptyBody="This vendor's business lines do not cover anything in the catalogue."
              columns={[
                { key: "name", label: "Product", render: (p) => p.name },
                { key: "code", label: "Code", render: (p) => p.productCode },
                { key: "cat", label: "Category", render: (p) => p.category },
                { key: "unit", label: "UOM", render: (p) => p.unit },
              ]}
            />
          </DetailPanel>
        </SectionStack>
      ),
    },
    {
      key: "rates",
      label: "Rate Card",
      count: v.rateCard.length,
      render: () => (
        <SectionStack>
          <DetailPanel title="Contracted rates">
            <RelatedTable
              rows={v.rateCard}
              rowKey={(l) => l.id}
              emptyTitle="No rate card"
              emptyBody="Quotes from this vendor cannot be checked against anything."
              columns={[
                {
                  key: "label",
                  label: "Tier",
                  render: (l) => (
                    <span className="flex items-center gap-2">
                      {l.label}
                      {l.id === v.defaultRateCardId && (
                        <Badge variant="secondary" className="font-normal">Default</Badge>
                      )}
                    </span>
                  ),
                },
                { key: "min", label: "From", align: "right", render: (l) => (l.minGallons ? `${l.minGallons.toLocaleString()} gal` : <Muted />) },
                { key: "rate", label: "Rate", align: "right", render: (l) => `${money(l.rate, true)} ${l.unit}` },
                { key: "fsc", label: "Fuel surcharge", align: "right", render: (l) => (l.fuelSurcharge === null ? <Muted /> : money(l.fuelSurcharge, true)) },
              ]}
            />
          </DetailPanel>
          <DetailCard title="Terms">
            <Field label="Minimum charge" value={money(v.minimumCharge)} />
            <Field label="Payment terms" value={v.paymentTerms} />
            <Field label="Accounting vendor ID" value={v.accountingVendorId} />
          </DetailCard>
        </SectionStack>
      ),
    },
    {
      key: "compliance",
      label: "Compliance",
      count: v.documents.length,
      render: () => (
        <SectionStack>
          <DetailCard title="Standing">
            <Field label="Compliance status" value={v.complianceStatus} />
            <Field label="Valid until" value={formatDate(v.complianceValidTo)} />
            <Field label="Insurance expiry" value={formatDate(v.insuranceExpiry)} />
            <Field label="Licences" value={<TagList tags={v.licenseNumbers} />} wide />
          </DetailCard>
          <AttachmentsSection groups={[{ title: "Compliance documents", files: v.documents }]} />
        </SectionStack>
      ),
    },
    {
      key: "active",
      label: "Active Assignments",
      count: live.length,
      render: () => (
        <SectionStack>
          <DetailPanel title="Orders in flight">
            <RelatedTable
              rows={live.slice(0, 60)}
              rowKey={(o) => o.id}
              emptyTitle="No live assignments"
              emptyBody="This vendor is not carrying anything right now."
              columns={[
                { key: "no", label: "Order", render: (o) => o.orderNo },
                { key: "cust", label: "Customer", render: (o) => o.customer.title },
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
      key: "history",
      label: "Historical Orders",
      count: history.length,
      render: () => (
        <SectionStack>
          <DetailPanel title="Completed and closed">
            <RelatedTable
              rows={history.slice(0, 60)}
              rowKey={(o) => o.id}
              emptyTitle="No history"
              emptyBody="Nothing has been completed with this vendor yet."
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
          </DetailPanel>
        </SectionStack>
      ),
    },
    {
      key: "attachments",
      label: "Attachments",
      count: v.attachments.length,
      render: () => <AttachmentsSection groups={[{ title: "Files", files: v.attachments }]} />,
    },
    {
      key: "notes",
      label: "Notes",
      render: () => (
        <NotesSection
          blocks={[
            {
              title: "Vendor instruction",
              body: v.vendorInstruction,
              hint: "Shown to dispatch when this vendor is picked. Nothing recorded.",
            },
            { title: "Internal notes", body: v.notes, hint: "No internal notes." },
          ]}
        />
      ),
    },
    {
      key: "audit",
      label: "Audit History",
      count: v.audit.length,
      render: () => <AuditSection events={v.audit} />,
    },
  ];
}

const Muted = () => <span className="text-muted-foreground/70">{DASH}</span>;

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
        { key: "vendorType", label: "Vendor type", kind: "select", required: true, options: VENDOR_TYPES, get: (d) => d.vendorType, set: (d, v) => ({ ...d, vendorType: String(v) }) },
        { key: "taxId", label: "Tax ID", kind: "text", get: (d) => d.taxId, set: (d, v) => ({ ...d, taxId: (v as string) || null }) },
        { key: "active", label: "Active", kind: "switch", description: "Deactivated vendors keep their history and take no new work.", get: (d) => d.active, set: (d, v) => ({ ...d, active: Boolean(v), status: v ? "active" : "inactive" }) },
      ],
    },
    {
      key: "dispatch",
      title: "Dispatch contacts",
      description: "Who gets the invitation, and who gets called when it is urgent.",
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
      description: "A vendor is only offered for an order inside the area they cover.",
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
      description: "Paperwork and permission are separate — both must hold before a vendor is offered.",
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
          label: "Licence numbers",
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
