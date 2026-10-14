import * as React from "react";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  ReceiptText,
  Store,
  UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/navigation-drawer";
import { TopBar } from "@/components/top-bar";
import { ThemeToggle } from "@/components/theme";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ModuleSidebar } from "../unified-view/ModuleSidebar";
import { OrdersScreen } from "./OrdersScreen";
import { SitesScreen } from "./SitesScreen";
import { DashboardScreen } from "./DashboardScreen";
import { InvoicesScreen } from "./InvoicesScreen";

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

  PAGES ARE EMPTY ON PURPOSE — built page by page. Built: Dashboard, Orders, Invoices, Sites & Assets.
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

const PAGE_KEY = "fp-portal-page";

function readStoredPage(): string {
  try {
    const saved = localStorage.getItem(PAGE_KEY);
    return saved && NAV.some((i) => i.key === saved) ? saved : NAV[0].key;
  } catch {
    return NAV[0].key;
  }
}

export function CustomerPortal() {
  const [page, setPage] = React.useState(readStoredPage);
  const [prefill, setPrefill] = React.useState<{ shipTo: string; assetIds: string[]; n: number } | null>(null);
  const go = (key: string) => {
    setPage(key);
    try {
      localStorage.setItem(PAGE_KEY, key);
    } catch {
      // Storage blocked — the page still changes for this visit.
    }
  };
  const active = NAV.find((i) => i.key === page) ?? NAV[0];

  return (
    <TooltipProvider>
      <AppShell
        title={
          <h1 className="truncate text-xl font-semibold leading-none text-foreground">
            {active.label}
          </h1>
        }
        headerDivider={false}
        className="bg-fp-shell-ground"
        topBar={
          <TopBar
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
            modules={[MODULE]}
            moduleNav={{ [MODULE.key]: NAV }}
            subNav={{}}
            activeModule={MODULE.key}
            activeArea={page}
            activeSub={null}
            onModuleChange={() => {}}
            onNavigate={(area) => go(area)}
          />
        }
        headerAction={<ThemeToggle />}
      >
        {/* A page is empty until it is designed. */}
        {page === "dashboard" ? (
          <DashboardScreen />
        ) : page === "invoices" ? (
          <InvoicesScreen />
        ) : page === "orders" ? (
          <OrdersScreen prefill={prefill} />
        ) : page === "sites-assets" ? (
          <SitesScreen
            onCreateOrder={(shipTo, assetIds) => {
              /* CREATE ORDER FROM A SITE OR TANK — the Orders page opens on
                 a new draft for it. */
              setPrefill({ shipTo, assetIds, n: Date.now() });
              go("orders");
            }}
          />
        ) : (
          <div className="flex-1" />
        )}
      </AppShell>
    </TooltipProvider>
  );
}
