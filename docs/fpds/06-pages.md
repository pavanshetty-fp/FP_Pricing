# FPDS — Reference pages

The real screens. When a template or unit card leaves a question open, copy the
reference page. Open them in `FP-DS-2026-unified-view.html` and
`FP-DS-2026-customer-portal.html` (built from this repo), or run `npm run dev:unified`
/ `npm run dev:portal`.

| Module | Page | Template | Units on it | Code |
|---|---|---|---|---|
| 3PL | Dashboard | template.dashboard | dashboard, alert-banner, date-picker | `prototypes/unified-view/threepl/ThreePLDashboard.tsx` |
| 3PL | Delivery Orders | template.list-page | view-row, toolbar, filter-panel, chip-shelf, alert-banner, view-bar, data-table, board, map, pagination, bulk-bar, export-sheet, date-picker | `prototypes/unified-view/threepl/BrokerOrdersScreen.tsx` |
| 3PL | Create / edit Delivery Order | template.record-sheet | record-sheet, summary-rail, lines-table, documents-table, delivery-timeline, recurring-section | `prototypes/unified-view/threepl/BrokerOrderSheet.tsx` |
| 3PL | Recurring Orders (programs) | template.list-page | view-row, toolbar, filter-panel, chip-shelf, view-bar, data-table, pagination | `prototypes/unified-view/threepl/RecurringProgramsScreen.tsx` |
| 3PL | Directory › Customers, Vendors, Products, Rental Assets | template.list-page + template.directory-record | standard list units, record-sheet | `prototypes/unified-view/threepl/DirectoryList.tsx`, `DirectoryRecordSheet.tsx` |
| Master Data | Assets (Directory › Assets; every Directory page built — Documents › All documents not built) | template.list-page + template.directory-record | standard list units, record-sheet | `prototypes/unified-view/masterdata/AssetsScreen.tsx` |
| Master Data | Asset 360 (full sheet: figures strip; tabs — movement orders (table · board), journey (lifeline + milestone timeline), activity log (type tiles over the table) — under one search + Filters; rail of Placement · Contract · Tank and monitor cards; Create order → movement / service order sheets at level 2, window on the shared timeline) | template.record-sheet | record-sheet (`size="full"`, `noFooter`), toolbar, filter-panel, chip-shelf, data-table, board, pagination | `prototypes/unified-view/masterdata/AssetSheet.tsx`, `AssetViews.tsx`, `AssetJourney.tsx`, `AssetActivity.tsx`, `AssetDetails.tsx`, `AssetOrderForms.tsx` |
| Master Data | Customers list + Customer 360 (full sheet: figures, volume and margin trends; tabs — orders across modules (table · board), products delivered, ship-to sites, assets on site, recurring schedules, leases and contracts; rail of Credit and payment · Contact · Account · Instructions; Edit → the 3PL customer form at level 2) | template.list-page + template.record-sheet | record-sheet (`size="full"`, `noFooter`), toolbar, filter-panel, data-table, board, pagination, dashboard bars | `prototypes/unified-view/masterdata/CustomersScreen.tsx`, `CustomerSheet.tsx`, `CustomerViews.tsx`, `CustomerDetails.tsx`, `RecordViews.tsx`, `sheetParts.tsx` |
| Master Data | Ship-tos list + Ship-to 360 (figures, volume and spend trends; tabs — orders and deliveries, assets on site, invoices; rail of Location (site map) · Details, customer opens Customer 360) | template.list-page + template.record-sheet | record-sheet (`size="full"`), data-table, board, site map | `prototypes/unified-view/masterdata/ShipTosScreen.tsx`, `ShipToSheet.tsx` |
| Master Data | Products · Vendors — the 3PL Directory lists, same records (Products adds "Stocked at") | template.list-page + template.directory-record | standard list units, record-sheet | `prototypes/unified-view/threepl/DirectoryScreens.tsx` |
| Master Data | Terminals · Suppliers (lists + Directory record sheet; loading accounts tie them; terminal map with rack radius) | template.list-page + template.directory-record | standard list units, record-sheet, site map | `prototypes/unified-view/masterdata/FuelSourceScreens.tsx`, `terminals.ts` |
| Sales | Dashboard | template.dashboard | dashboard | `prototypes/unified-view/SalesDashboard.tsx` |
| Sales | Orders | template.list-page | as 3PL Delivery Orders (table + board) | `prototypes/unified-view/SalesOrdersScreen.tsx` |
| Sales | Quotes, Customers, Assets | template.list-page | view-row, toolbar, filter-panel, chip-shelf, view-bar, data-table, pagination | `QuotesScreen.tsx`, `CustomersScreen.tsx`, `AssetsScreen.tsx` |
| Sales | Order / Quote / Customer / Asset sheets | template.record-sheet | record-sheet, summary-rail, lines-table | `OrderSheet.tsx`, `QuoteSheet.tsx`, `CustomerSheet.tsx`, `AssetSheet.tsx` |
| Sales | Sales Settings | template.settings | — | `SalesSettingsScreen.tsx` |
| Service Work | Service Orders | template.list-page | as 3PL Delivery Orders (table + board) | `prototypes/unified-view/service/ServiceWorkScreen.tsx` |
| Service Work | Service order sheet | template.record-sheet | record-sheet, summary-rail, lines-table, delivery-timeline | `prototypes/unified-view/service/ServiceOrderSheet.tsx` |
| Service Work | Technicians, Price Book, Parts, Agreements, Maintenance, Compliance, Performance | template.list-page (table-only) | standard-list | `prototypes/unified-view/service/ServiceListScreen.tsx`, `PlatformScreens.tsx`, `TechniciansScreen.tsx` |
| Customer Portal | Dashboard | template.dashboard | dashboard, alert-banner | `prototypes/customer-portal/DashboardScreen.tsx` |
| Customer Portal | Orders | template.list-page | view-row, toolbar, filter-panel, chip-shelf, alert-banner, view-bar, data-table (stacked tank lines, top-aligned), board, map, pagination, status-and-awaiting | `prototypes/customer-portal/OrdersScreen.tsx` |
| Customer Portal | Order sheet | template.record-sheet | record-sheet, summary-rail, lines-table, documents-table, delivery-timeline, recurring-section | `prototypes/customer-portal/OrderRequestSheet.tsx` |
| Customer Portal | Recurring Orders, Invoices, Sites & Assets, Team & Access | template.list-page (table-only) | standard-list | `RecurringScreen.tsx`, `InvoicesScreen.tsx`, `SitesScreen.tsx`, `TeamScreen.tsx` |
| Every page | App frame | template.app-frame | app-shell | `prototypes/unified-view/UnifiedView.tsx`, `prototypes/customer-portal/CustomerPortal.tsx` |
