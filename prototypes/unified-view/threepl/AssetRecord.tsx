import { AlertTriangle } from "lucide-react";
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
import { MONTH_FMT } from "../data";
import { daysFromToday, formatDate, money, oneLineAddress } from "./directoryCore";
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
import type { FormSectionDef } from "./directoryFormTypes";
import { kindTone } from "../statusKind";

/*
  What a rental asset record shows in the sheet, beyond the fields it edits.

  AN ASSET IS A THING IN A PLACE, ON A CLOCK. Three clocks — the rental period,
  the service interval, the compliance certificate — and each independently
  makes the asset undispatchable when it runs out.

  THE WARNINGS PANEL ASKS "WHAT IS WRONG WITH IT", not "may I book it". The
  booking rules compare an asset against a REQUESTED range; run against the
  account it is already out to, every rental clashes with itself. This sheet
  has no requested range, so it asks the other question.
*/

export function assetHeaderAside(a: RentalAsset) {
  return (
    <span className="flex items-center gap-1.5">
      <StatusChip
        tone={kindTone(
          /* Available and On rent are both simply true; maintenance is
             waiting on the workshop. None of them is a fault. */
          a.availabilityStatus === "Available" || a.availabilityStatus === "On rent"
            ? "info"
            : a.availabilityStatus === "In maintenance"
              ? "caution"
              : "neutral",
        )}
        variant="soft"
      >
        {a.availabilityStatus}
      </StatusChip>
      {a.maintenanceStatus !== "OK" && (
        <StatusChip
          tone={kindTone(a.maintenanceStatus === "Service due" ? "caution" : "critical")}
          variant="soft"
        >
          {a.maintenanceStatus}
        </StatusChip>
      )}
      {(a.complianceStatus === "Expired" || a.complianceStatus === "Expiring") && (
        <StatusChip tone={kindTone(a.complianceStatus === "Expired" ? "critical" : "caution")} variant="soft">
          Compliance {a.complianceStatus.toLowerCase()}
        </StatusChip>
      )}
      {endingSoon(a) && (
        <StatusChip tone={kindTone("caution")} variant="soft">
          Ends in {daysFromToday(a.rentalEndDate)}d
        </StatusChip>
      )}
    </span>
  );
}

export function assetReadSections(
  a: RentalAsset,
  go: { openCustomer: (id: string) => void; openVendor: (id: string) => void }
): RecordReadSection[] {
  const orders = ordersForAsset(a.name);
  const recurring = orders.filter((o) => o.kind === "Recurring");
  const product = productById(a.associatedProductId);
  const vendor = vendorById(a.assignedVendorId);
  const warnings = assetDispatchWarnings(a);
  const serviceIn = daysFromToday(a.nextServiceDue);

  const sections: RecordReadSection[] = [];

  if (warnings.length > 0) {
    sections.push({
      key: "warnings",
      title: warnings.length === 1 ? "One issue with this asset" : `${warnings.length} issues with this asset`,
      render: () => (
        <div className="flex items-start gap-2.5 rounded-md border border-fp-banner-accent-caution/40 bg-fp-banner-accent-caution/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-fp-banner-accent-caution" />
          <ul className="flex flex-col gap-0.5">
            {warnings.map((w) => (
              <li key={w} className="text-sm text-foreground">
                {w}
              </li>
            ))}
          </ul>
        </div>
      ),
    });
  }

  sections.push(
    {
      key: "placement",
      title: "Placement and clocks",
      note: a.customer ? `${a.customer} — ${a.shipTo ?? "site not set"}` : "At the yard",
      render: () => (
        <ReadGrid>
          <ReadField
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
          <ReadField label="Ship-to" value={a.shipTo} />
          <ReadField label="Address" value={a.addressLine1 ? oneLineAddress(a) : null} wide />
          <ReadField
            label="Capacity"
            /* A nozzle holds nothing, and "0 gal" reads as an empty tank
               rather than as a thing that has no capacity. */
            value={a.capacityGal > 0 ? `${a.capacityGal.toLocaleString()} ${a.unit}` : "N/A"}
          />
          <ReadField label="Linked product" value={product?.name} />
          <ReadField
            label="Rental ends"
            value={
              a.rentalEndDate
                ? formatDate(a.rentalEndDate)
                : a.availabilityStatus === "On rent"
                  ? "Open ended"
                  : "N/A"
            }
          />
          <ReadField label="Auto renew" value={a.autoRenew ? "Yes" : "No"} />
          <ReadField
            label="Next service"
            value={
              serviceIn === null
                ? null
                : serviceIn < 0
                  ? `${Math.abs(serviceIn)} days overdue`
                  : `${serviceIn} days (${formatDate(a.nextServiceDue)})`
            }
          />
          <ReadField label="Last service" value={formatDate(a.lastServiceDate)} />
          <ReadField
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
          <ReadField label="Contract ID" value={a.contractId} />
          <ReadField label="QR code" value={a.qrCode} />
          <ReadField label="External asset ID" value={a.externalAssetId} />
          <ReadField label="Tags" value={<TagRow tags={a.tags} />} wide />
        </ReadGrid>
      ),
    },
    {
      key: "orders",
      title: "Linked orders",
      note: `${orders.length} orders · ${recurring.length} recurring`,
      render: () => (
        <SheetTable
          rows={orders}
          rowKey={(o) => o.id}
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
      ),
    },
    {
      key: "billing",
      title: "Billing history",
      render: () => {
        /* Derived from the rental period rather than stored: one row per
           billing period since the rental began, which is exactly what a
           flat-rate rental produces. */
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
              period: MONTH_FMT.format(cursor),
              amount: a.rentalRate * step,
            });
            cursor.setUTCMonth(cursor.getUTCMonth() + step);
            i += 1;
          }
        }
        return (
          <SheetTable
            rows={rows.reverse()}
            rowKey={(r) => r.id}
            emptyBody="This asset has not been on rent, so nothing has been charged for it."
            columns={[
              { key: "period", label: "Period", render: (r) => r.period },
              { key: "freq", label: "Frequency", render: () => a.billingFrequency },
              { key: "amt", label: "Amount", align: "right", render: (r) => money(r.amount) },
            ]}
          />
        );
      },
    },
    {
      key: "inspections",
      title: "Inspection and installation records",
      count: a.inspectionFiles.length + a.installationRecords.length,
      render: () => <AttachmentTable files={[...a.inspectionFiles, ...a.installationRecords]} />,
    },
    {
      key: "documents",
      title: "Documents",
      count: a.documents.length,
      render: () => <AttachmentTable files={a.documents} />,
    },
    {
      key: "notes",
      title: "Asset notes",
      render: () => <NoteBlock body={a.notes} hint="No notes recorded." />,
    },
  );

  return sections;
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
