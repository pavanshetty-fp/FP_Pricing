import type * as React from "react";
import {
  LayoutDashboard,
  Table2,
  FileText,
  Fuel,
  SlidersHorizontal,
  Handshake,
  Truck,
  FileSignature,
  DollarSign,
} from "lucide-react";
import type { NavGroup } from "./types";

/** Sample config mirroring the "Navigation Drawer Expanded" artboard (FleetPanda). */
export const PRIMARY_NAV: NavGroup = {
  items: [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { key: "tables", label: "Tables", icon: <Table2 /> },
    { key: "form", label: "Form", icon: <FileText /> },
    { key: "dashboard-2", label: "Dashboard", icon: <LayoutDashboard /> },
  ],
};

/** Sample config mirroring the contextual "Customer Pricing" drawer (Sidebar 07.). */
export const PRICING_NAV: NavGroup = {
  label: "Platform",
  items: [
    { key: "todays-pricing", label: "Today’s Pricing", icon: <Fuel /> },
    {
      key: "configuration",
      label: "Configuration",
      icon: <SlidersHorizontal />,
      children: [
        { key: "freight", label: "Freight" },
        { key: "simulator", label: "Simulator" },
        { key: "customer-pricing", label: "Customer Pricing" },
        { key: "pricing-setup", label: "Pricing Setup" },
      ],
    },
  ],
};

/* ── Modules ─────────────────────────────────────────────────────────────────
   The four FleetPanda workspaces the rail's module switcher offers.

   These live HERE rather than in `ModuleSwitcher.tsx` because a consumer that
   routes on the active module has to name the keys it routes on, and exporting a
   constant alongside a component breaks Fast Refresh for that whole file (the
   `react-refresh/only-export-components` rule). Icons come from Lucide per the
   locked icon rule.
   ────────────────────────────────────────────────────────────────────────── */

export interface Module {
  key: string;
  name: string;
  icon: React.ReactNode;
}

export const MODULES: Module[] = [
  { key: "sales", name: "Sales", icon: <Handshake /> },
  { key: "3pl", name: "3PL", icon: <Truck /> },
  { key: "lease", name: "Lease", icon: <FileSignature /> },
  { key: "pricing", name: "Pricing", icon: <DollarSign /> },
];
