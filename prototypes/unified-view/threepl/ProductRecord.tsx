import { CELL } from "../RecordSheet";
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
import { DASH, formatDate, money } from "./directoryCore";
import {
  BROKER_CUSTOMERS,
  PRODUCT_CATEGORIES,
  UNITS_OF_MEASURE,
  customerReach,
  type BrokerProduct,
} from "./directory";
import { ordersForProduct, vendorsForProduct } from "./directoryLinks";
import { BROKER_STATUS_TONE } from "./orders";
import type { FormSectionDef } from "./directoryFormTypes";
import { ACTIVE_KIND, kindTone } from "../statusKind";

/*
  What a product record shows in the sheet, beyond the fields it edits.

  A PRODUCT IS A SET OF RULES, not a thing. Everything here constrains an order
  line: what it can be measured in, how much may be ordered, whether "top off"
  is even offerable, who may buy it, and who can deliver it.

  TWO NUMBERS ARE COMPUTED, NEVER STORED — how many customers may buy it and
  how many vendors can fulfil it. Both answer "why is this product not on the
  picker", and a stored count would be wrong the first time a vendor was
  edited.
*/

const Muted = () => <span className="text-muted-foreground/70">{DASH}</span>;

export function productHeaderAside(p: BrokerProduct) {
  const vendors = vendorsForProduct(p).length;
  return (
    <span className="flex items-center gap-1.5">
      <StatusChip tone={kindTone(ACTIVE_KIND(p.status === "active"))} variant="soft">
        <span className="capitalize">{p.status}</span>
      </StatusChip>
      {p.topOffSupported && (
        <StatusChip tone={kindTone("info")} variant="soft">
          Top off
        </StatusChip>
      )}
      {p.taxable && !p.taxCode && (
        <StatusChip tone={kindTone("critical")} variant="soft">
          No tax code
        </StatusChip>
      )}
      {vendors === 0 && (
        <StatusChip tone={kindTone("critical")} variant="soft">
          No vendor can fulfil
        </StatusChip>
      )}
    </span>
  );
}

export function productReadSections(
  p: BrokerProduct,
  go: { openVendor: (id: string) => void; openCustomer: (id: string) => void }
): RecordReadSection[] {
  const vendors = vendorsForProduct(p);
  const orders = ordersForProduct(p.name);
  const recurring = orders.filter((o) => o.kind === "Recurring");
  const allowed = p.availableToAllCustomers
    ? BROKER_CUSTOMERS.filter((c) => !p.blockedCustomerIds.includes(c.id))
    : BROKER_CUSTOMERS.filter((c) => p.allowedCustomerIds.includes(c.id));

  return [
    {
      key: "reach",
      title: "Reach",
      note: `${customerReach(p)} customers · ${vendors.length} vendors`,
      render: () => (
        <ReadGrid>
          <ReadField label="Base price" value={`${money(p.basePrice)} per ${p.unit}`} />
          <ReadField
            label="Top off"
            value={p.topOffSupported ? "A line may be a top-off" : "Every line needs a quantity"}
          />
          <ReadField
            label="Quantity"
            value={
              p.minimumQuantity === null && p.maximumQuantity === null
                ? null
                : `${p.minimumQuantity?.toLocaleString() ?? "—"} – ${p.maximumQuantity?.toLocaleString() ?? "no max"} ${p.unit}`
            }
          />
          <ReadField label="Default quantity" value={p.defaultQuantity === null ? null : `${p.defaultQuantity.toLocaleString()} ${p.unit}`} />
          <ReadField label="Hazard flags" value={p.hazardFlags.length > 0 ? <TagRow tags={p.hazardFlags} /> : null} />
          <ReadField label="Tags" value={<TagRow tags={p.tags} />} />
          <ReadField
            label="Geography restrictions"
            value={p.geographyRestrictions.length > 0 ? <TagRow tags={p.geographyRestrictions} /> : "None"}
            wide
          />
          <ReadField label="Last updated" value={formatDate(p.updatedAt.slice(0, 10))} />
          <ReadField label="Created" value={formatDate(p.createdAt.slice(0, 10))} />
        </ReadGrid>
      ),
    },
    {
      key: "vendors",
      /* ITS TABLE'S COLUMNS — the sheet's width (DS ui/7-variants §1). */
      columns: [CELL.name, CELL.pick, CELL.text, CELL.flag, CELL.status],
      title: "Vendors who can fulfill this",
      count: vendors.length,
      render: () => (
        <SheetTable
          rows={vendors}
          rowKey={(v) => v.id}
          onOpenRow={(v) => go.openVendor(v.id)}
          emptyBody="No carrier's business lines cover this product, so an order naming it cannot be assigned."
          columns={[
            { key: "name", label: "Vendor", render: (v) => v.name },
            { key: "base", label: "Base", render: (v) => v.base },
            { key: "lines", label: "Business lines", render: (v) => v.businessLines.join(", ") },
            {
              key: "default",
              label: "Default",
              render: (v) => (p.defaultVendorIds.includes(v.id) ? "Yes" : <Muted />),
            },
            {
              key: "status",
              label: "Status",
              render: (v) => (
                <StatusChip tone={kindTone(ACTIVE_KIND(v.active))} variant="text">
                  {v.active ? "Active" : "Inactive"}
                </StatusChip>
              ),
            },
          ]}
        />
      ),
    },
    {
      key: "customers",
      /* ITS TABLE'S COLUMNS — the sheet's width (DS ui/7-variants §1). */
      columns: [CELL.name, CELL.pick, CELL.pick, CELL.pick],
      title: "Eligible accounts",
      count: allowed.length,
      note: p.availableToAllCustomers ? "Available to all customers" : "Restricted list",
      render: () => (
        <SheetTable
          rows={allowed}
          rowKey={(c) => c.id}
          onOpenRow={(c) => go.openCustomer(c.id)}
          emptyBody="Nobody can order this product. Check the availability rules above."
          columns={[
            { key: "name", label: "Customer", render: (c) => c.name },
            { key: "erp", label: "ERP ID", render: (c) => c.erpId },
            { key: "credit", label: "Credit", render: (c) => c.creditStatus },
            { key: "state", label: "State", render: (c) => c.state ?? <Muted /> },
          ]}
        />
      ),
    },
    {
      key: "usage",
      /* ITS TABLE'S COLUMNS — the sheet's width (DS ui/7-variants §1). */
      columns: [CELL.pick, CELL.name, CELL.date, CELL.number, CELL.status],
      title: "Order usage",
      note: `${orders.length} orders · ${recurring.length} recurring`,
      render: () => (
        <SheetTable
          rows={orders}
          rowKey={(o) => o.id}
          emptyBody="No order line has named this product."
          columns={[
            { key: "no", label: "Order", render: (o) => o.orderNo },
            { key: "cust", label: "Customer", render: (o) => o.customer.title },
            { key: "date", label: "Date", render: (o) => o.date.title },
            {
              key: "qty",
              label: "Quantity",
              render: (o) => {
                const line = o.lines.find((l) => l.product === p.name);
                if (!line) return <Muted />;
                return line.topOff ? "Top off" : `${(line.gal ?? 0).toLocaleString()} ${p.unit}`;
              },
            },
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
      key: "sds",
      title: "Safety data sheets",
      count: p.sdsAttachments.length,
      render: () => <AttachmentTable files={p.sdsAttachments} />,
    },
    {
      key: "attachments",
      title: "Attachments",
      count: p.attachments.length,
      render: () => <AttachmentTable files={p.attachments} />,
    },
    {
      key: "notes",
      title: "Product notes",
      render: () => <NoteBlock body={p.notes} hint="No notes yet." />,
    },
  ];
}

export const productSubtitle = (p: BrokerProduct) =>
  `${p.productCode} · ${p.category} · updated ${formatDate(p.updatedAt.slice(0, 10))}`;

/* ─────────────────────────────────────────────────────────────── the form ── */

export function productFormSections(): FormSectionDef<BrokerProduct>[] {
  return [
    {
      key: "identity",
      title: "Identity",
      fields: [
        { key: "name", label: "Product name", kind: "text", required: true, get: (d) => d.name, set: (d, v) => ({ ...d, name: String(v ?? "") }) },
        { key: "productCode", label: "Product code", kind: "text", required: true, get: (d) => d.productCode, set: (d, v) => ({ ...d, productCode: String(v ?? "") }) },
        { key: "erpItemId", label: "ERP item ID", kind: "text", get: (d) => d.erpItemId, set: (d, v) => ({ ...d, erpItemId: (v as string) || null }) },
        { key: "category", label: "Category", kind: "select", required: true, options: PRODUCT_CATEGORIES, get: (d) => d.category, set: (d, v) => ({ ...d, category: v as BrokerProduct["category"] }) },
        { key: "status", label: "Status", kind: "select", required: true, options: ["active", "inactive", "archived"], get: (d) => d.status, set: (d, v) => ({ ...d, status: v as BrokerProduct["status"] }) },
        { key: "description", label: "Description", kind: "textarea", wide: true, get: (d) => d.description, set: (d, v) => ({ ...d, description: (v as string) || null }) },
      ],
    },
    {
      key: "quantity",
      title: "Unit and quantity rules",
      note: "These constrain every order line that names this product.",
      fields: [
        {
          key: "unit",
          label: "Unit of measure",
          kind: "select",
          required: true,
          options: UNITS_OF_MEASURE,
          description: "Changing this affects new orders only — history keeps its original unit.",
          get: (d) => d.unit,
          set: (d, v) => ({ ...d, unit: String(v) }),
        },
        { key: "quantityPrecision", label: "Decimal places", kind: "number", get: (d) => d.quantityPrecision, set: (d, v) => ({ ...d, quantityPrecision: Number(v ?? 0) }) },
        { key: "minimumQuantity", label: "Minimum quantity", kind: "number", get: (d) => d.minimumQuantity, set: (d, v) => ({ ...d, minimumQuantity: v === null ? null : Number(v) }) },
        {
          key: "maximumQuantity",
          label: "Maximum quantity",
          kind: "number",
          get: (d) => d.maximumQuantity,
          set: (d, v) => ({ ...d, maximumQuantity: v === null ? null : Number(v) }),
          validate: (d) =>
            d.maximumQuantity !== null &&
            d.minimumQuantity !== null &&
            d.maximumQuantity < d.minimumQuantity
              ? "Maximum cannot be below the minimum"
              : null,
        },
        { key: "defaultQuantity", label: "Default quantity", kind: "number", get: (d) => d.defaultQuantity, set: (d, v) => ({ ...d, defaultQuantity: v === null ? null : Number(v) }) },
        {
          key: "topOffSupported",
          label: "Top off supported",
          kind: "switch",
          description: "Off, an order line for this product always needs a number.",
          get: (d) => d.topOffSupported,
          set: (d, v) => ({ ...d, topOffSupported: Boolean(v) }),
        },
        { key: "quantityOverrideAllowed", label: "Quantity override allowed", kind: "switch", get: (d) => d.quantityOverrideAllowed, set: (d, v) => ({ ...d, quantityOverrideAllowed: Boolean(v) }) },
      ],
    },
    {
      key: "pricing",
      title: "Pricing, tax and accounting",
      fields: [
        {
          key: "basePrice",
          label: "Base price",
          kind: "money",
          required: true,
          get: (d) => d.basePrice,
          set: (d, v) => ({ ...d, basePrice: v === null ? null : Number(v) }),
          validate: (d) => (d.basePrice !== null && d.basePrice < 0 ? "A price cannot be negative" : null),
        },
        { key: "currency", label: "Currency", kind: "text", get: (d) => d.currency, set: (d, v) => ({ ...d, currency: String(v ?? "USD") }) },
        { key: "taxable", label: "Taxable", kind: "switch", get: (d) => d.taxable, set: (d, v) => ({ ...d, taxable: Boolean(v) }) },
        {
          key: "taxCode",
          label: "Tax code",
          kind: "text",
          get: (d) => d.taxCode,
          set: (d, v) => ({ ...d, taxCode: (v as string) || null }),
          /* A taxable product with no code is the one combination that
             produces a wrong invoice rather than an incomplete record. */
          validate: (d) => (d.taxable && !d.taxCode ? "A taxable product needs a tax code" : null),
        },
        { key: "revenueAccount", label: "Revenue account", kind: "text", get: (d) => d.revenueAccount, set: (d, v) => ({ ...d, revenueAccount: (v as string) || null }) },
        { key: "cogsAccount", label: "COGS account", kind: "text", get: (d) => d.cogsAccount, set: (d, v) => ({ ...d, cogsAccount: (v as string) || null }) },
        { key: "inventoryClassification", label: "Inventory classification", kind: "text", get: (d) => d.inventoryClassification, set: (d, v) => ({ ...d, inventoryClassification: (v as string) || null }) },
      ],
    },
    {
      key: "availability",
      title: "Availability",
      fields: [
        { key: "availableToAllCustomers", label: "Available to all customers", kind: "switch", get: (d) => d.availableToAllCustomers, set: (d, v) => ({ ...d, availableToAllCustomers: Boolean(v) }) },
        {
          key: "geographyRestrictions",
          label: "Geography restrictions",
          kind: "text",
          wide: true,
          description: "Comma separated state codes. Blank means no restriction.",
          get: (d) => d.geographyRestrictions.join(", "),
          set: (d, v) => ({ ...d, geographyRestrictions: String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean) }),
        },
      ],
    },
    {
      key: "safety",
      title: "Safety and notes",
      fields: [
        { key: "hazmat", label: "Hazmat class", kind: "text", placeholder: "Class 3 · UN1202", get: (d) => d.hazmat, set: (d, v) => ({ ...d, hazmat: (v as string) || null }) },
        {
          key: "hazardFlags",
          label: "Hazard flags",
          kind: "text",
          wide: true,
          get: (d) => d.hazardFlags.join(", "),
          set: (d, v) => ({ ...d, hazardFlags: String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean) }),
        },
        { key: "notes", label: "Product notes", kind: "textarea", wide: true, get: (d) => d.notes, set: (d, v) => ({ ...d, notes: (v as string) || null }) },
      ],
    },
  ];
}
