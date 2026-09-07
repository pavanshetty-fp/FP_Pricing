import { AlertTriangle } from "lucide-react";
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
import { DASH, daysFromToday, formatDate, money, oneLineAddress } from "./directoryCore";
import {
  MAINTENANCE_STATUSES,
  OWNERSHIP_TYPES,
  RENTAL_STATUSES,
  RENTAL_TYPES,
  assetDispatchWarnings,
  endingSoon,
  type RentalAsset,
} from "./directory";
import { ordersForAsset, productById } from "./directoryLinks";
import { BROKER_STATUS_TONE } from "./orders";
import { vendorById } from "./vendors";
import type { FormSectionDef } from "./DirectoryForm";

/*
  What a rental asset record shows, and why in this order.

  AN ASSET IS A THING IN A PLACE, ON A CLOCK. Three clocks, in fact — the
  rental period, the service interval and the compliance certificate — and each
  of them independently makes the asset undispatchable when it runs out. The
  summary strip carries all three because "where is it and can I move it" is
  the only question anyone opens this page with.

  CONFLICTS ARE COMPUTED WHEN ASKED, never stored. A conflict is a relationship
  between the asset, a date range and everything already booked against it, so
  a `hasConflict` flag would be stale the moment anything moved. The panel below
  runs the rules live against today.
*/

const AVAIL_TONE: Record<string, BadgeTone> = {
  "On rent": "info",
  Available: "success",
  "In maintenance": "warning",
  Retired: "neutral",
};

const MAINT_TONE: Record<string, BadgeTone> = {
  OK: "success",
  "Service due": "warning",
  Overdue: "critical",
  "Out of service": "critical",
};

const COMPLIANCE_TONE: Record<string, BadgeTone> = {
  Valid: "success",
  Expiring: "warning",
  Expired: "critical",
  "Not required": "neutral",
};

export const assetStatusTone = (a: RentalAsset): BadgeTone =>
  AVAIL_TONE[a.availabilityStatus] ?? "neutral";

export function assetBadges(a: RentalAsset) {
  const out: { label: string; tone: BadgeTone; title?: string }[] = [
    { label: a.maintenanceStatus, tone: MAINT_TONE[a.maintenanceStatus] ?? "neutral" },
    { label: a.complianceStatus, tone: COMPLIANCE_TONE[a.complianceStatus] ?? "neutral" },
  ];
  if (endingSoon(a)) {
    const left = daysFromToday(a.rentalEndDate);
    out.push({
      label: `Ends in ${left} days`,
      tone: "warning",
      title: `Rental ends ${formatDate(a.rentalEndDate)}${a.autoRenew ? " — auto-renews" : ""}`,
    });
  }
  if (a.status === "archived") out.push({ label: "Archived", tone: "neutral" });
  return out;
}

export function assetStats(a: RentalAsset): RecordSummaryStat[] {
  const serviceIn = daysFromToday(a.nextServiceDue);
  return [
    {
      label: "Availability",
      value: a.availabilityStatus,
      hint: a.customer ?? "At the yard",
      tone: a.availabilityStatus === "In maintenance" ? "warning" : undefined,
    },
    {
      label: "Capacity",
      /* A nozzle holds nothing, and "0 gal" reads as an empty tank rather
         than as a thing that has no capacity. */
      value: a.capacityGal > 0 ? `${a.capacityGal.toLocaleString()} ${a.unit}` : "N/A",
      hint: a.capacityGal > 0 ? `Fill at ${a.fillThreshold?.toLocaleString() ?? DASH}` : a.assetType,
    },
    {
      label: "Rate",
      value: money(a.rentalRate),
      hint: a.billingFrequency,
    },
    {
      label: "Rental ends",
      value: a.rentalEndDate ? formatDate(a.rentalEndDate) : a.availabilityStatus === "On rent" ? "Open ended" : "N/A",
      hint: a.autoRenew ? "Auto-renews" : a.rentalEndDate ? "Does not renew" : undefined,
      tone: endingSoon(a) ? "warning" : undefined,
    },
    {
      label: "Next service",
      value: serviceIn === null ? DASH : serviceIn < 0 ? `${Math.abs(serviceIn)} days overdue` : `${serviceIn} days`,
      hint: formatDate(a.nextServiceDue),
      tone: serviceIn === null ? undefined : serviceIn < 0 ? "critical" : serviceIn < 30 ? "warning" : "success",
    },
  ];
}

export function assetSections(
  a: RentalAsset,
  go: { openCustomer: (id: string) => void; openVendor: (id: string) => void }
): RecordSection[] {
  const orders = ordersForAsset(a.name);
  const recurring = orders.filter((o) => o.kind === "Recurring");
  const product = productById(a.associatedProductId);
  const vendor = vendorById(a.assignedVendorId);

  /* WHAT IS WRONG WITH IT AS IT STANDS, not whether it could be booked. The
     booking rules compare an asset against a REQUESTED range; run against the
     account this asset is already out to, every rental clashes with itself.
     This page has no requested range, so it asks the other question. */
  const conflicts = assetDispatchWarnings(a);

  return [
    {
      key: "overview",
      label: "Overview",
      render: () => (
        <SectionStack>
          {conflicts.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-md border border-fp-banner-accent-caution/40 bg-fp-banner-accent-caution/5 px-4 py-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-fp-banner-accent-caution" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {conflicts.length === 1 ? "One issue" : `${conflicts.length} issues`} with this asset
                </p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {conflicts.map((c) => (
                    <li key={c} className="text-sm text-muted-foreground">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <DetailCard title="Identity">
            <Field label="Asset name" value={a.name} />
            <Field label="Asset type" value={a.assetType} />
            <Field label="Serial number" value={a.serialNumber} />
            <Field label="QR code" value={a.qrCode} />
            <Field label="External asset ID" value={a.externalAssetId} />
            <Field label="Ownership" value={<span className="capitalize">{a.ownershipType.replace(/_/g, " ")}</span>} />
            <Field label="Record status" value={<span className="capitalize">{a.status}</span>} />
            <Field label="Tags" value={<TagList tags={a.tags} />} wide />
          </DetailCard>
          <DetailCard title="What it holds">
            <Field
              label="Capacity"
              value={a.capacityGal > 0 ? `${a.capacityGal.toLocaleString()} ${a.unit}` : "N/A"}
            />
            <Field label="Linked product" value={product?.name} />
            <Field label="Fill threshold" value={a.fillThreshold === null ? null : `${a.fillThreshold.toLocaleString()} ${a.unit}`} />
            <Field label="Reorder point" value={a.reorderPoint === null ? null : `${a.reorderPoint.toLocaleString()} ${a.unit}`} />
            <Field label="Top-off relevant" value={a.topOffRelevant ? "Yes" : "No"} />
          </DetailCard>
        </SectionStack>
      ),
    },
    {
      key: "placement",
      label: "Customer / Location",
      render: () => (
        <SectionStack>
          <DetailCard title="Where it is">
            <Field
              label="Customer"
              value={
                a.customerId && a.customer ? (
                  <button
                    type="button"
                    className="text-left underline-offset-2 hover:underline"
                    onClick={() => go.openCustomer(a.customerId!)}
                  >
                    {a.customer}
                  </button>
                ) : (
                  "At the yard"
                )
              }
            />
            <Field label="Ship-to" value={a.shipTo} />
            <Field label="Installed" value={formatDate(a.installedDate)} />
            <Field label="Removed" value={formatDate(a.removalDate)} />
            <Field label="Address" value={oneLineAddress(a)} wide />
            <Field
              label="Coordinates"
              value={
                a.latitude !== null && a.longitude !== null
                  ? `${a.latitude}, ${a.longitude}`
                  : null
              }
            />
            <Field label="Country" value={a.country} />
          </DetailCard>
        </SectionStack>
      ),
    },
    {
      key: "rental",
      label: "Rental Terms",
      render: () => (
        <SectionStack>
          <DetailCard title="The contract">
            <Field label="Contract ID" value={a.contractId} />
            <Field label="Rental start" value={formatDate(a.rentalStartDate)} />
            <Field label="Rental end" value={a.rentalEndDate ? formatDate(a.rentalEndDate) : a.availabilityStatus === "On rent" ? "Open ended" : null} />
            <Field label="Billing frequency" value={a.billingFrequency} />
            <Field label="Rate" value={money(a.rentalRate)} />
            <Field label="Deposit" value={money(a.depositAmount)} />
            <Field label="Auto renew" value={a.autoRenew ? "Yes" : "No"} />
          </DetailCard>
        </SectionStack>
      ),
    },
    {
      key: "service",
      label: "Service & Maintenance",
      count: a.inspectionFiles.length,
      render: () => (
        <SectionStack>
          <DetailCard title="Standing">
            <Field label="Maintenance status" value={a.maintenanceStatus} />
            <Field label="Compliance status" value={a.complianceStatus} />
            <Field label="Last service" value={formatDate(a.lastServiceDate)} />
            <Field label="Next service due" value={formatDate(a.nextServiceDue)} />
            <Field
              label="Service vendor"
              value={
                vendor ? (
                  <button
                    type="button"
                    className="text-left underline-offset-2 hover:underline"
                    onClick={() => go.openVendor(vendor.id)}
                  >
                    {vendor.name}
                  </button>
                ) : null
              }
            />
          </DetailCard>
          <AttachmentsSection
            groups={[
              { title: "Inspection files", files: a.inspectionFiles },
              { title: "Installation records", files: a.installationRecords },
            ]}
          />
        </SectionStack>
      ),
    },
    {
      key: "orders",
      label: "Linked Orders",
      count: orders.length,
      render: () => (
        <SectionStack>
          <DetailPanel title="Orders naming this asset">
            <RelatedTable
              rows={orders.slice(0, 60)}
              rowKey={(o) => o.id}
              emptyTitle="No linked orders"
              emptyBody="Nothing has been delivered to or moved with this asset."
              columns={[
                { key: "no", label: "Order", render: (o) => o.orderNo },
                { key: "cust", label: "Customer", render: (o) => o.customer.title },
                { key: "type", label: "Type", render: (o) => o.orderType },
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
      label: "Recurring Schedules",
      count: recurring.length,
      render: () => (
        <SectionStack>
          <DetailPanel title="Schedules this asset is on">
            <RelatedTable
              rows={recurring}
              rowKey={(o) => o.id}
              emptyTitle="Not on a schedule"
              emptyBody="Moving this asset will not disturb a recurring order."
              columns={[
                { key: "no", label: "Order", render: (o) => o.orderNo },
                { key: "cust", label: "Customer", render: (o) => o.customer.title },
                { key: "freq", label: "Frequency", render: (o) => o.recurrence?.frequency ?? DASH },
              ]}
            />
          </DetailPanel>
        </SectionStack>
      ),
    },
    {
      key: "billing",
      label: "Billing History",
      render: () => {
        /* Derived from the rental period rather than stored: one row per
           billing period since the rental began, which is exactly what a
           monthly rental at a flat rate produces. */
        const rows: { id: string; period: string; amount: number }[] = [];
        if (a.rentalStartDate) {
          const start = new Date(`${a.rentalStartDate}T00:00:00Z`);
          const end = a.rentalEndDate ? new Date(`${a.rentalEndDate}T00:00:00Z`) : new Date();
          const step = a.billingFrequency === "Annual" ? 12 : a.billingFrequency === "Quarterly" ? 3 : 1;
          const cursor = new Date(start);
          let i = 0;
          while (cursor <= end && i < 36) {
            rows.push({
              id: `${a.id}-bill-${i}`,
              period: cursor.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
              amount: a.rentalRate * step,
            });
            cursor.setUTCMonth(cursor.getUTCMonth() + step);
            i += 1;
          }
        }
        return (
          <SectionStack>
            <DetailPanel title={`Billed periods (${rows.length})`}>
              <RelatedTable
                rows={rows.reverse().slice(0, 36)}
                rowKey={(r) => r.id}
                emptyTitle="Never billed"
                emptyBody="This asset has not been on rent, so nothing has been charged for it."
                columns={[
                  { key: "period", label: "Period", render: (r) => r.period },
                  { key: "freq", label: "Frequency", render: () => a.billingFrequency },
                  { key: "amt", label: "Amount", align: "right", render: (r) => money(r.amount) },
                ]}
              />
            </DetailPanel>
          </SectionStack>
        );
      },
    },
    {
      key: "attachments",
      label: "Attachments",
      count: a.documents.length,
      render: () => <AttachmentsSection groups={[{ title: "Documents", files: a.documents }]} />,
    },
    {
      key: "notes",
      label: "Notes",
      render: () => (
        <NotesSection blocks={[{ title: "Asset notes", body: a.notes, hint: "No notes recorded." }]} />
      ),
    },
    {
      key: "audit",
      label: "Audit History",
      count: a.audit.length,
      render: () => <AuditSection events={a.audit} />,
    },
  ];
}

/* ─────────────────────────────────────────────────────────────── the form ── */

export function assetFormSections(): FormSectionDef<RentalAsset>[] {
  return [
    {
      key: "identity",
      title: "Identity",
      fields: [
        { key: "name", label: "Asset name", kind: "text", required: true, get: (d) => d.name, set: (d, v) => ({ ...d, name: String(v ?? "") }) },
        { key: "assetType", label: "Asset type", kind: "select", required: true, options: RENTAL_TYPES, get: (d) => d.assetType, set: (d, v) => ({ ...d, assetType: v as RentalAsset["assetType"] }) },
        { key: "serialNumber", label: "Serial number", kind: "text", get: (d) => d.serialNumber, set: (d, v) => ({ ...d, serialNumber: (v as string) || null }) },
        { key: "qrCode", label: "QR code", kind: "text", get: (d) => d.qrCode, set: (d, v) => ({ ...d, qrCode: (v as string) || null }) },
        { key: "externalAssetId", label: "External asset ID", kind: "text", get: (d) => d.externalAssetId, set: (d, v) => ({ ...d, externalAssetId: (v as string) || null }) },
        { key: "ownershipType", label: "Ownership", kind: "select", required: true, options: OWNERSHIP_TYPES, get: (d) => d.ownershipType, set: (d, v) => ({ ...d, ownershipType: v as RentalAsset["ownershipType"] }) },
        { key: "status", label: "Record status", kind: "select", required: true, options: ["active", "inactive", "archived"], get: (d) => d.status, set: (d, v) => ({ ...d, status: v as RentalAsset["status"] }) },
      ],
    },
    {
      key: "capacity",
      title: "Capacity and product",
      fields: [
        {
          key: "capacityGal",
          label: "Capacity",
          kind: "number",
          description: "Zero for a nozzle or a cart — it prints as N/A, not as an empty tank.",
          get: (d) => d.capacityGal,
          set: (d, v) => ({ ...d, capacityGal: Number(v ?? 0) }),
        },
        { key: "unit", label: "Unit", kind: "text", get: (d) => d.unit, set: (d, v) => ({ ...d, unit: String(v ?? "gal") }) },
        {
          key: "fillThreshold",
          label: "Fill threshold",
          kind: "number",
          visible: (d) => d.capacityGal > 0,
          get: (d) => d.fillThreshold,
          set: (d, v) => ({ ...d, fillThreshold: v === null ? null : Number(v) }),
          validate: (d) =>
            d.fillThreshold !== null && d.fillThreshold > d.capacityGal
              ? "A fill threshold above the tank's capacity can never be reached"
              : null,
        },
        {
          key: "reorderPoint",
          label: "Reorder point",
          kind: "number",
          visible: (d) => d.capacityGal > 0,
          get: (d) => d.reorderPoint,
          set: (d, v) => ({ ...d, reorderPoint: v === null ? null : Number(v) }),
        },
        {
          key: "topOffRelevant",
          label: "Top-off relevant",
          kind: "switch",
          visible: (d) => d.capacityGal > 0,
          get: (d) => d.topOffRelevant,
          set: (d, v) => ({ ...d, topOffRelevant: Boolean(v) }),
        },
      ],
    },
    {
      key: "placement",
      title: "Placement",
      description: "Where the asset physically is. Leave blank for anything back at the yard.",
      fields: [
        { key: "customer", label: "Customer", kind: "text", get: (d) => d.customer, set: (d, v) => ({ ...d, customer: (v as string) || null }) },
        { key: "shipTo", label: "Ship-to", kind: "text", get: (d) => d.shipTo, set: (d, v) => ({ ...d, shipTo: (v as string) || null }) },
        { key: "addressLine1", label: "Address line 1", kind: "text", get: (d) => d.addressLine1, set: (d, v) => ({ ...d, addressLine1: (v as string) || null }) },
        { key: "addressLine2", label: "Address line 2", kind: "text", get: (d) => d.addressLine2, set: (d, v) => ({ ...d, addressLine2: (v as string) || null }) },
        { key: "city", label: "City", kind: "text", get: (d) => d.city, set: (d, v) => ({ ...d, city: (v as string) || null }) },
        { key: "state", label: "State", kind: "text", get: (d) => d.state, set: (d, v) => ({ ...d, state: (v as string) || null }) },
        { key: "zip", label: "Zip", kind: "text", get: (d) => d.zip, set: (d, v) => ({ ...d, zip: (v as string) || null }) },
        { key: "installedDate", label: "Installed", kind: "date", get: (d) => d.installedDate, set: (d, v) => ({ ...d, installedDate: (v as string) || null }) },
      ],
    },
    {
      key: "rental",
      title: "Rental terms",
      fields: [
        {
          key: "availabilityStatus",
          label: "Availability",
          kind: "select",
          required: true,
          options: RENTAL_STATUSES,
          get: (d) => d.availabilityStatus,
          set: (d, v) => ({ ...d, availabilityStatus: v as RentalAsset["availabilityStatus"] }),
          /* THE ONE INVARIANT THIS FORM ENFORCES. An asset cannot be on rent
             to nobody — that state is how a tank goes missing. */
          validate: (d) =>
            d.availabilityStatus === "On rent" && !d.customer
              ? "An asset on rent needs a customer — otherwise nobody is being billed"
              : null,
        },
        { key: "contractId", label: "Contract ID", kind: "text", get: (d) => d.contractId, set: (d, v) => ({ ...d, contractId: (v as string) || null }) },
        { key: "rentalStartDate", label: "Rental start", kind: "date", get: (d) => d.rentalStartDate, set: (d, v) => ({ ...d, rentalStartDate: (v as string) || null }) },
        {
          key: "rentalEndDate",
          label: "Rental end",
          kind: "date",
          description: "Blank means open ended.",
          get: (d) => d.rentalEndDate,
          set: (d, v) => ({ ...d, rentalEndDate: (v as string) || null }),
          validate: (d) =>
            d.rentalEndDate && d.rentalStartDate && d.rentalEndDate < d.rentalStartDate
              ? "The rental cannot end before it starts"
              : null,
        },
        { key: "billingFrequency", label: "Billing frequency", kind: "select", required: true, options: ["Monthly", "Quarterly", "Annual"], get: (d) => d.billingFrequency, set: (d, v) => ({ ...d, billingFrequency: String(v) }) },
        { key: "rentalRate", label: "Rate", kind: "money", required: true, get: (d) => d.rentalRate, set: (d, v) => ({ ...d, rentalRate: Number(v ?? 0) }) },
        { key: "depositAmount", label: "Deposit", kind: "money", get: (d) => d.depositAmount, set: (d, v) => ({ ...d, depositAmount: v === null ? null : Number(v) }) },
        { key: "autoRenew", label: "Auto renew", kind: "switch", get: (d) => d.autoRenew, set: (d, v) => ({ ...d, autoRenew: Boolean(v) }) },
      ],
    },
    {
      key: "service",
      title: "Service and compliance",
      fields: [
        { key: "maintenanceStatus", label: "Maintenance status", kind: "select", required: true, options: MAINTENANCE_STATUSES, get: (d) => d.maintenanceStatus, set: (d, v) => ({ ...d, maintenanceStatus: v as RentalAsset["maintenanceStatus"] }) },
        { key: "complianceStatus", label: "Compliance status", kind: "select", required: true, options: ["Valid", "Expiring", "Expired", "Not required"], get: (d) => d.complianceStatus, set: (d, v) => ({ ...d, complianceStatus: v as RentalAsset["complianceStatus"] }) },
        { key: "lastServiceDate", label: "Last service", kind: "date", get: (d) => d.lastServiceDate, set: (d, v) => ({ ...d, lastServiceDate: (v as string) || null }) },
        { key: "nextServiceDue", label: "Next service due", kind: "date", get: (d) => d.nextServiceDue, set: (d, v) => ({ ...d, nextServiceDue: (v as string) || null }) },
        { key: "notes", label: "Asset notes", kind: "textarea", wide: true, get: (d) => d.notes, set: (d, v) => ({ ...d, notes: (v as string) || null }) },
      ],
    },
  ];
}
