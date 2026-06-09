import {
  LayoutDashboard,
  Table2,
  FileText,
  Fuel,
  SlidersHorizontal,
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
