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
import { DASH, money } from "./directoryCore";
import { formatDate } from "./directoryCore";
import {
  BROKER_CUSTOMERS,
  PRODUCT_CATEGORIES,
  UNITS_OF_MEASURE,
  customerReach,
  type BrokerProduct,
} from "./directory";
import { ordersForProduct, vendorsForProduct } from "./directoryLinks";
import { BROKER_STATUS_TONE } from "./orders";
import type { FormSectionDef } from "./DirectoryForm";

/*
  What a product record shows, and why in this order.

  A PRODUCT IS A SET OF RULES, not a thing. Everything on this page constrains
  an order line: what it can be measured in, how much of it may be ordered,
  whether "top off" is even offerable, who may buy it, and who can deliver it.
  So the sections follow the order those rules bite in during order entry.

  TWO NUMBERS ARE COMPUTED, NEVER STORED — how many customers may buy it and
  how many vendors can fulfil it. Both are the answer to "why is this product
  not on the picker", and a stored count would be wrong the first time anyone
  edited a vendor.
*/

const STATUS_TONE: Record<string, BadgeTone> = {
  active: "success",
  inactive: "neutral",
  archived: "neutral",
};

export const productStatusTone = (p: BrokerProduct): BadgeTone =>
  STATUS_TONE[p.status] ?? "neutral";

export function productBadges(p: BrokerProduct) {
  const out: { label: string; tone: BadgeTone; title?: string }[] = [];
  if (p.topOffSupported) {
    out.push({
      label: "Top-off",
      tone: "info",
      title: "Order lines may be entered as a top-off instead of a fixed quantity",
    });
  }
  if (p.hazmat) out.push({ label: p.hazmat, tone: "warning" });
  if (!p.taxCode) {
    out.push({ label: "No tax code", tone: "critical", title: "Invoices for this product cannot be taxed correctly" });
  }
  if (!p.revenueAccount || !p.cogsAccount) {
    out.push({ label: "Unmapped", tone: "warning", title: "Missing an accounting mapping — it will not sync cleanly" });
  }
  return out;
}

export function productStats(p: BrokerProduct): RecordSummaryStat[] {
  const vendors = vendorsForProduct(p);
  const orders = ordersForProduct(p.name);
  return [
    { label: "Base price", value: money(p.basePrice, true), hint: `per ${p.unit}` },
    { label: "Unit of measure", value: p.unit, hint: `${p.quantityPrecision} decimal places` },
    {
      label: "Customers",
      value: customerReach(p),
      hint: p.availableToAllCustomers ? "Available to all" : "Restricted list",
    },
    {
      label: "Vendors",
      value: vendors.length,
      hint: vendors.length === 0 ? "Nobody can fulfil this" : "Can fulfil",
      tone: vendors.length === 0 ? "critical" : undefined,
    },
    { label: "Used on", value: orders.length, hint: "Orders, all time" },
  ];
}

export function productSections(
  p: BrokerProduct,
  go: { openVendor: (id: string) => void; openCustomer: (id: string) => void }
): RecordSection[] {
  const vendors = vendorsForProduct(p);
  const orders = ordersForProduct(p.name);
  const recurring = orders.filter((o) => o.kind === "Recurring");
  const allowed = p.availableToAllCustomers
    ? BROKER_CUSTOMERS.filter((c) => !p.blockedCustomerIds.includes(c.id))
    : BROKER_CUSTOMERS.filter((c) => p.allowedCustomerIds.includes(c.id));

  return [
    {
      key: "overview",
      label: "Overview",
      render: () => (
        <SectionStack>
          <DetailCard title="Identity">
            <Field label="Product name" value={p.name} />
            <Field label="Product code" value={p.productCode} />
            <Field label="ERP item ID" value={p.erpItemId} />
            <Field label="Category" value={p.category} />
            <Field label="Status" value={<span className="capitalize">{p.status}</span>} />
            <Field label="Display order" value={p.displayOrder} />
            <Field label="Description" value={p.description} wide />
            <Field label="Tags" value={<TagList tags={p.tags} />} wide />
          </DetailCard>
          <DetailCard title="Safety">
            <Field label="Hazmat class" value={p.hazmat} />
            <Field label="Hazard flags" value={p.hazardFlags.length > 0 ? <TagList tags={p.hazardFlags} /> : null} wide />
            <Field label="Inventory classification" value={p.inventoryClassification} />
          </DetailCard>
        </SectionStack>
      ),
    },
    {
      key: "pricing",
      label: "Pricing",
      render: () => (
        <SectionStack>
          <DetailCard title="Price">
            <Field label="Base price" value={money(p.basePrice, true)} />
            <Field label="Currency" value={p.currency} />
            <Field label="Per" value={p.unit} />
            <Field label="Taxable" value={p.taxable ? "Yes" : "No"} />
          </DetailCard>
        </SectionStack>
      ),
    },
    {
      key: "quantity",
      label: "Quantity Rules",
      render: () => (
        <SectionStack>
          <DetailCard title="How much may be ordered">
            <Field label="Unit of measure" value={p.unit} />
            <Field label="Precision" value={`${p.quantityPrecision} decimal places`} />
            <Field label="Minimum" value={p.minimumQuantity === null ? null : `${p.minimumQuantity.toLocaleString()} ${p.unit}`} />
            <Field label="Maximum" value={p.maximumQuantity === null ? null : `${p.maximumQuantity.toLocaleString()} ${p.unit}`} />
            <Field label="Default" value={p.defaultQuantity === null ? null : `${p.defaultQuantity.toLocaleString()} ${p.unit}`} />
            <Field label="Override allowed" value={p.quantityOverrideAllowed ? "Yes" : "No"} />
            <Field
              label="Top-off supported"
              value={
                p.topOffSupported
                  ? "Yes — a line may be entered as a top-off"
                  : "No — every line needs a quantity"
              }
              wide
            />
          </DetailCard>
        </SectionStack>
      ),
    },
    {
      key: "customers",
      label: "Customer Availability",
      count: allowed.length,
      render: () => (
        <SectionStack>
          <DetailCard title="Who may buy it">
            <Field label="Available to all customers" value={p.availableToAllCustomers ? "Yes" : "No — restricted list"} />
            <Field label="Explicitly blocked" value={p.blockedCustomerIds.length} />
            <Field
              label="Geography restrictions"
              value={p.geographyRestrictions.length > 0 ? <TagList tags={p.geographyRestrictions} /> : "None"}
              wide
            />
          </DetailCard>
          <DetailPanel title={`Eligible accounts (${allowed.length})`}>
            <RelatedTable
              rows={allowed.slice(0, 60)}
              rowKey={(c) => c.id}
              onOpenRow={(c) => go.openCustomer(c.id)}
              emptyTitle="No eligible accounts"
              emptyBody="Nobody can order this product. Check the availability rules above."
              columns={[
                { key: "name", label: "Customer", render: (c) => c.name },
                { key: "erp", label: "ERP ID", render: (c) => c.erpId },
                { key: "credit", label: "Credit", render: (c) => c.creditStatus },
                { key: "state", label: "State", render: (c) => c.state ?? <Muted /> },
              ]}
            />
          </DetailPanel>
        </SectionStack>
      ),
    },
    {
      key: "vendors",
      label: "Vendor Capability",
      count: vendors.length,
      render: () => (
        <SectionStack>
          <DetailPanel title={`Vendors who can fulfil this (${vendors.length})`}>
            <RelatedTable
              rows={vendors}
              rowKey={(v) => v.id}
              onOpenRow={(v) => go.openVendor(v.id)}
              emptyTitle="No vendor can fulfil this"
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
                    <StatusChip tone={v.active ? "success" : "neutral"} variant="text">
                      {v.active ? "Active" : "Inactive"}
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
      key: "accounting",
      label: "Tax & Accounting",
      render: () => (
        <SectionStack>
          <DetailCard title="Mapping">
            <Field label="Tax code" value={p.taxCode} />
            <Field label="Taxable" value={p.taxable ? "Yes" : "No"} />
            <Field label="Revenue account" value={p.revenueAccount} />
            <Field label="COGS account" value={p.cogsAccount} />
            <Field label="ERP item ID" value={p.erpItemId} />
            <Field label="Inventory classification" value={p.inventoryClassification} />
          </DetailCard>
        </SectionStack>
      ),
    },
    {
      key: "usage",
      label: "Order Usage",
      count: orders.length,
      render: () => (
        <SectionStack>
          <DetailPanel title="Orders naming this product">
            <RelatedTable
              rows={orders.slice(0, 60)}
              rowKey={(o) => o.id}
              emptyTitle="Never ordered"
              emptyBody="No order line has named this product."
              columns={[
                { key: "no", label: "Order", render: (o) => o.orderNo },
                { key: "cust", label: "Customer", render: (o) => o.customer.title },
                { key: "date", label: "Date", render: (o) => o.date.title },
                {
                  key: "qty",
                  label: "Quantity",
                  align: "right",
                  render: (o) => {
                    const line = o.lines.find((l) => l.product === p.name);
                    if (!line) return <Muted />;
                    return line.topOff ? "Top-off" : `${(line.gal ?? 0).toLocaleString()} ${p.unit}`;
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
          </DetailPanel>
        </SectionStack>
      ),
    },
    {
      key: "recurring",
      label: "Recurring Usage",
      count: recurring.length,
      render: () => (
        <SectionStack>
          <DetailPanel title="Recurring templates using this product">
            <RelatedTable
              rows={recurring}
              rowKey={(o) => o.id}
              emptyTitle="Not on any schedule"
              emptyBody="Changing this product will not disturb a recurring template."
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
      key: "attachments",
      label: "Attachments",
      count: p.attachments.length + p.sdsAttachments.length,
      render: () => (
        <AttachmentsSection
          groups={[
            { title: "Safety data sheets", files: p.sdsAttachments },
            { title: "Files", files: p.attachments },
          ]}
        />
      ),
    },
    {
      key: "notes",
      label: "Notes",
      render: () => (
        <NotesSection
          blocks={[{ title: "Product notes", body: p.notes, hint: "No notes recorded." }]}
        />
      ),
    },
    {
      key: "audit",
      label: "Audit History",
      count: p.audit.length,
      render: () => <AuditSection events={p.audit} />,
    },
  ];
}

const Muted = () => <span className="text-muted-foreground/70">{DASH}</span>;

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
      description: "These constrain every order line that names this product.",
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
          label: "Top-off supported",
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
