import * as React from "react";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  ReceiptText,
  Store,
  UsersRound,
  Repeat,
} from "lucide-react";
import { RecurringScreen } from "./RecurringScreen";
import { useEventToasts } from "./notifications";
import { AppShell } from "@/components/app-shell";
import type { NavGroup, NavItem } from "@/components/navigation-drawer";
import { TopBar } from "@/components/top-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ModuleSidebar } from "../unified-view/ModuleSidebar";
import { OrdersScreen } from "./OrdersScreen";
import { SitesScreen } from "./SitesScreen";
import { DashboardScreen, DeliveryPerformanceReport } from "./DashboardScreen";
import { InvoicesScreen } from "./InvoicesScreen";
import { PortalNavContext } from "./nav";
import { useHeadCollapsed } from "../unified-view/pageHead";
import { TeamScreen } from "./TeamScreen";

/*
  CUSTOMER PORTAL (Pavan, 2026-10-13) — the CUSTOMER's side of the portal:
  the tenant's customers raise fuel requests for their ship-tos and the tanks
  and assets on them, and follow them through to invoice. The tenant's side
  is a separate unit, built later.

  A SEPARATE MODULE, NOT PART OF THE UNIFIED VIEW. It wears the same shell —
  top bar, one-panel sidebar, page frame — by consuming the same parts, and
  ships as its own HTML (`npm run build:portal`).

  No account switcher (Pavan, 2026-10-13): sales reps order on a customer's
  behalf from their own apps. Notifications are the top bar's bell, not a page.

  PAGES ARE EMPTY ON PURPOSE — built page by page. Built: Dashboard, Orders, Invoices, Sites & Assets, Team & Access.
*/

const MODULE = { key: "portal", name: "Customer Portal", icon: <Store /> };

const NAV: NavItem[] = [
  /* The landing page (PRD FR-30). */
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
  /* Order requests and the orders the tenant makes from them, with their
     statuses; new and recurring orders are created here. */
  { key: "orders", label: "Orders", icon: <ClipboardList /> },
  /* Also reachable from each order request. */
  { key: "invoices", label: "Invoices", icon: <ReceiptText /> },
  { key: "sites-assets", label: "Sites & Assets", icon: <MapPin /> },
  { key: "reports", label: "Reports", icon: <BarChart3 /> },
  { key: "team-access", label: "Team & Access", icon: <UsersRound /> },
];

/* ORDERS HOLDS TWO PAGES (Pavan, 2026-10-15) — the requests, and the
   standing orders one row per series (3PL's Recurring Orders) — as 3PL's
   Orders holds Delivery and Recurring Orders. */
const SUB_NAV: Record<string, NavGroup[]> = {
  orders: [
    {
      items: [
        /* ORDERS AND ORDER REQUESTS, ONE PAGE (Pavan, 2026-10-19) — a
           segment above the list switches between them. */
        { key: "orders", label: "Orders", icon: <ClipboardList /> },
        { key: "recurring", label: "Recurring Orders", icon: <Repeat /> },
      ],
    },
  ],
};
const SUB_PAGES = SUB_NAV.orders[0].items;
const areaOf = (page: string) => (SUB_PAGES.some((i) => i.key === page) ? "orders" : page);

const PAGE_KEY = "fp-portal-page";

function readStoredPage(): string {
  try {
    const saved = localStorage.getItem(PAGE_KEY);
    return saved && (NAV.some((i) => i.key === saved) || SUB_PAGES.some((i) => i.key === saved)) ? saved : NAV[0].key;
  } catch {
    return NAV[0].key;
  }
}

export function CustomerPortal() {
  const [page, setPage] = React.useState(readStoredPage);
  const [prefill, setPrefill] = React.useState<{ shipTo: string; assetIds: string[]; n: number } | null>(null);
  /* A RECORD TO OPEN ON ARRIVAL — set by a link on another page. */
  const [focusOrder, setFocusOrder] = React.useState<{ requestNo: string; n: number } | null>(null);
  const [focusInvoice, setFocusInvoice] = React.useState<{ invoiceNo: string; n: number } | null>(null);
  const go = (key: string) => {
    setPage(key);
    try {
      localStorage.setItem(PAGE_KEY, key);
    } catch {
      // Storage blocked — the page still changes for this visit.
    }
  };
  const active = SUB_PAGES.find((i) => i.key === page) ?? NAV.find((i) => i.key === page) ?? NAV[0];
  /* A NUMBER OPENS WHERE IT LIVES — ORD-… on the Orders segment, REQ-… on
     Order Requests (the page picks the segment). */
  const openOrder = (requestNo: string) => {
    setFocusOrder({ requestNo, n: Date.now() });
    go("orders");
  };
  const openInvoice = (invoiceNo: string) => {
    setFocusInvoice({ invoiceNo, n: Date.now() });
    go("invoices");
  };
  useEventToasts(openOrder, openInvoice);
  /* The Orders list folds the page title with its views row (as every list). */
  const headCollapsed = useHeadCollapsed();

  return (
    <PortalNavContext.Provider value={{ openOrder, openInvoice }}>
    <TooltipProvider>
      <AppShell
        /* No line under the top bar, panels right under it (2026-10-27). */
        flushTop
        headerCollapsed={headCollapsed}
        title={
          <h1 className="truncate text-xl font-semibold leading-none text-foreground">
            {active.label}
          </h1>
        }
        headerDivider={false}
        className="bg-fp-shell-ground"
        topBar={
          <TopBar
            divider={false}
            user={{
              name: "Pavan Shetty",
              email: "pavanshetty@fleetpanda.com",
              fallback: "PS",
            }}
            searchPlaceholder="Search everything"
          />
        }
        rail={
          <ModuleSidebar
            flushTop
            modules={[MODULE]}
            moduleNav={{ [MODULE.key]: NAV }}
            subNav={SUB_NAV}
            nested={["orders"]}
            activeModule={MODULE.key}
            activeArea={areaOf(page)}
            activeSub={areaOf(page) === "orders" ? page : null}
            onModuleChange={() => {}}
            onNavigate={(area, sub) => go(sub ?? (area === "orders" ? "orders" : area))}
          />
        }
      >
        {/* A page is empty until it is designed. */}
        {page === "dashboard" ? (
          <DashboardScreen />
        ) : page === "team-access" ? (
          <TeamScreen />
        ) : page === "invoices" ? (
          <InvoicesScreen focus={focusInvoice} />
        ) : page === "orders" ? (
          <OrdersScreen prefill={prefill} focus={focusOrder} />
        ) : page === "recurring" ? (
          <RecurringScreen />
        ) : page === "sites-assets" ? (
          <SitesScreen
            onCreateOrder={(shipTo, assetIds) => {
              /* CREATE ORDER FROM A SITE OR TANK — the Orders page opens on
                 a new draft for it. */
              setPrefill({ shipTo, assetIds, n: Date.now() });
              go("orders");
            }}
          />
        ) : page === "reports" ? (
          /* REPORTS — canned reports; Delivery performance moved here from
             the dashboard (Anirudh review, 2026-10-17). */
          <DeliveryPerformanceReport />
        ) : (
          <div className="flex-1" />
        )}
      </AppShell>
    </TooltipProvider>
    </PortalNavContext.Provider>
  );
}
