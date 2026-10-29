# Table columns — characters and widths

Measured 2026-10-21 in the preview, every row of every list, all dates. Same-named columns are merged (worst case kept).

**Applied 2026-10-21 (Pavan):** the table below is the first, text-only pass. The widths now in code were re-measured from every rendered cell (chips, pills and day grids included), per table: each column = its widest cell, rounded up to 10px. Customer is 250 everywhere; Ship-to / Ship-Tos 170; rule tables give Schedule +20 and the column before it +20. Columns no longer stretch to fill the screen — an empty last column takes the spare width.

- **Max chars** — longest value in the data today (either line of a two-line cell).
- **Now** — the width set in code (a range when the column is set differently on different screens).
- **Needs** — longest text + 24px cell padding; at least the header + its sort arrow; +20px for pill columns; rounded up to 10px.

| Column | Screens | Max chars | Longest value | Now (px) | Needs (px) | Change |
|---|---:|---:|---|---:|---:|---:|
| Accounting Mapping | 1 | 22 | 4155 · Product Revenue | 230 | 180 | -50 |
| Address | 4 | 24 | Salt Lake City, UT 84104 | 240–260 | 170 | -90 |
| Agreement | 1 | 7 | SA-1140 | 120 | 110 | -10 |
| Amount | 1 | 10 | $17,640.11 | 130 | 100 | -30 |
| Asset | 5 | 23 | Ridgeline Depot Tank 45 | 180–200 | 190 | -10 |
| Asset ID / Type | 1 | 15 | Nozzle Assembly | 180 | 130 | -50 |
| Asset Name | 1 | 19 | Dispensing Unit 443 | 200 | 170 | -30 |
| Assets | 1 | 7 | Tank A1 | 170–200 | 90 | -110 |
| Assigned Orders | 1 | 2 | 30 | 150 | 140 | -10 |
| Authority | 1 | 9 | State EPA | 130 | 100 | -30 |
| Base | 1 | 15 | Bray North Yard | 180 | 130 | -50 |
| Base Price | 1 | 9 | $1,083.35 | 140 | 110 | -30 |
| Bin | 1 | 4 | A-03 | 100 | 70 | -30 |
| Business Lines | 1 | 18 | Emergency Response | 230 | 170 | -60 |
| Category | 2 | 25 | Adding or replacing parts | 140–220 | 190 | -30 |
| Classification | 1 | 16 | Diesel / gas oil | 240 | 130 | -110 |
| Code | 1 | 7 | LEA-CHE | 140 | 90 | -50 |
| Contact | 1 | 14 | (713) 555-0142 | 180 | 120 | -60 |
| Cost | 1 | 7 | $320.00 | 110 | 90 | -20 |
| Created By | 1 | 18 | System — Recurring | 150–170 | 160 | -10 |
| Created On | 1 | 12 | Jul 17, 2026 | 150 | 120 | -30 |
| Credit | 1 | 17 | $250,000.00 limit | 170 | 130 | -40 |
| Current Balance ($) | 1 | 11 | $141,250.00 | 180 | 160 | -20 |
| Customer | 10 | 33 | Tri-County Transit Authority 8340 | 190–280 | 250 | -30 |
| Customer email | 1 | 26 | alicia@brayraymond.example | 220 | 210 | -10 |
| Customers | 2 | 3 | 150 | 130 | 110 | -20 |
| Date of Delivery | 1 | 12 | Oct 15, 2026 | 140 | 140 | 0 |
| Deactivated | 1 | 12 | Sep 16, 2026 | 140 | 120 | -20 |
| Default Rate Card | 1 | 13 | $0.25 per gal | 180 | 150 | -30 |
| Delivery hours | 1 | 17 | 5:00 AM – 7:00 PM | 170 | 160 | -10 |
| Delivery Window | 1 | 18 | 8:00 AM – 12:00 PM | 160 | 160 | 0 |
| Description | 1 | 28 | Weeping at the bottom collar | 250 | 210 | -40 |
| Dispatch | 1 | 27 | dispatch@redlinecarrier.com | 240 | 230 | -10 |
| Documents | 1 | 11 | 2 documents | 130 | 110 | -20 |
| Download | 1 | 0 | (icon) | 100 | 100 | 0 |
| Driver | 1 | 12 | — Unassigned | 140 | 120 | -20 |
| Due | 1 | 17 | Paused · disputed | 150 | 130 | -20 |
| Due on | 1 | 12 | Nov 10, 2026 | 140 | 120 | -20 |
| ERP ID | 2 | 16 | 4182230000114772 | 120–190 | 170 | -20 |
| Estimated Customer Price | 1 | 9 | $1,010.75 | 210 | 200 | -10 |
| Estimated Margin | 1 | 7 | $241.59 | 170 | 150 | -20 |
| Estimated Partner Price | 1 | 9 | $1,064.74 | 200 | 180 | -20 |
| Every | 1 | 2 | mo | 100 | 80 | -20 |
| Fee | 1 | 7 | $100.00 | 120 | 90 | -30 |
| Flat rate | 1 | 7 | $290.00 | 130 | 90 | -40 |
| Frequency | 1 | 25 | First week of every month | 240 | 170 | -70 |
| Hub | 1 | 15 | Bakersfield, CA | 150–160 | 130 | -30 |
| Invite Status | 1 | 7 | Pending | 140 | 140 | 0 |
| Invoice | 1 | 8 | INV-5415 | 130–140 | 90 | -50 |
| Issued | 1 | 12 | Sep 30, 2026 | 130 | 120 | -10 |
| Item | 1 | 5 | CP-71 | 100 | 70 | -30 |
| Job | 1 | 15 | Monitor install | 200 | 120 | -80 |
| Jobs / Day | 1 | 1 | 5 | 120 | 110 | -10 |
| Labor | 1 | 3 | 1.5 | 110 | 90 | -20 |
| Lanes Live | 1 | 22 | waiting on the partner | 160 | 150 | -10 |
| Last cert | 1 | 12 | Nov 10, 2025 | 140 | 120 | -20 |
| Last Delivery | 1 | 12 | Oct 21, 2026 | 140 | 120 | -20 |
| Last done | 1 | 12 | Jul 13, 2026 | 140 | 110 | -30 |
| Last Login | 1 | 15 | Oct 21, 7:17 PM | 170 | 120 | -50 |
| Linked Product | 1 | 19 | Hydraulic Oil AW-46 | 190 | 160 | -30 |
| Load Order | 1 | 3 | Yes | 110–130 | 110 | -20 |
| Loading Account | 1 | 17 | GKM-50431 | 170–180 | 160 | -20 |
| LOS | 2 | 14 | Packaged Goods | 150–260 | 140 | -120 |
| Maintenance | 1 | 14 | Out of service | 150 | 140 | -10 |
| Market | 1 | 17 | Dallas–Fort Worth | 150 | 140 | -10 |
| Monthly | 1 | 7 | $160.00 | 110 | 90 | -20 |
| Name | 1 | 32 | pavan@cardinal-logistics.example | 240 | 220 | -20 |
| Net $/gal | 1 | 6 | $3.423 | 110 | 100 | -10 |
| Next Delivery | 2 | 12 | Oct 27, 2026 | 140–165 | 120 | -45 |
| Next due | 1 | 12 | Jan 13, 2028 | 140 | 110 | -30 |
| Notes | 4 | 1 | – | 64 | 80 | +16 |
| On hand | 1 | 2 | 11 | 110 | 90 | -20 |
| Open Jobs | 1 | 1 | 6 | 120 | 110 | -10 |
| Order | 1 | 8 | ORD-8814 | 120 | 100 | -20 |
| Order # | 2 | 8 | D-105375 | 120 | 100 | -20 |
| Orders | 1 | 8 | ORD-8801 | 170 | 100 | -70 |
| Orders Made | 1 | 1 | 2 | 120 | 120 | 0 |
| Part | 1 | 19 | Regulator diaphragm | 220 | 160 | -60 |
| Partner | 1 | 19 | Pacific Tank Movers | 190–210 | 160 | -50 |
| Parts | 1 | 13 | Pump assembly | 240 | 130 | -110 |
| Phone | 2 | 15 | +1 559-555-0114 | 150–170 | 140 | -30 |
| Plan | 2 | 24 | Master service agreement | 110–200 | 200 | 0 |
| Planned Date | 2 | 18 | 6:00 AM – 10:00 AM | 140–165 | 140 | -25 |
| Planned Date & Time | 1 | 12 | Oct 21, 2026 | 150 | 170 | +20 |
| Preferred windows | 1 | 19 | 10:00 AM – 11:00 AM | 190 | 160 | -30 |
| Primary POC | 1 | 17 | Marisol Lindqvist | 210 | 150 | -60 |
| Priority | 1 | 6 | Urgent | 110 | 110 | 0 |
| Product / Asset | 1 | 24 | 200* Diesel Onroad clear | 190 | 190 | 0 |
| Product and Code | 1 | 31 | Tank Inspection Recertification | 250 | 230 | -20 |
| Product Compatibility | 1 | 9 | Additives | 200 | 170 | -30 |
| Product(s) | 6 | 24 | 200* Diesel Onroad clear | 120–230 | 190 | -40 |
| Program # / Created | 1 | 12 | Oct 18, 2026 | 190 | 180 | -10 |
| Qty (gal) | 5 | 17 | 2,500 + 1 top off | 100–140 | 130 | -10 |
| Quote # | 1 | 6 | Q-2050 | 110 | 90 | -20 |
| Quote total | 1 | 10 | $25,670.50 | 130 | 110 | -20 |
| Rate | 1 | 7 | $285.00 | 120 | 90 | -30 |
| Renews | 1 | 12 | Mar 30, 2027 | 170 | 120 | -50 |
| Rental Start and End Date | 1 | 27 | Feb 14, 2026 – Sep 27, 2026 | 230 | 220 | -10 |
| Reorder at | 1 | 2 | 10 | 120 | 110 | -10 |
| Request # | 1 | 12 | Oct 21, 2026 | 130 | 100 | -30 |
| Requirement | 1 | 25 | DOT cargo tank inspection | 230 | 200 | -30 |
| Role | 1 | 7 | Manager | 120 | 100 | -20 |
| Rule | 1 | 6 | R-2001 | 180 | 80 | -100 |
| Sales Rep | 1 | 14 | Dana Whitfield | 150 | 120 | -30 |
| Schedule | 1 | 25 | First week of every month | 190 | 170 | -20 |
| Scheduled | 1 | 13 | Not scheduled | 175 | 120 | -55 |
| Service Area | 1 | 10 | California | 200 | 120 | -80 |
| Service Order # | 1 | 7 | SO-1042 | 150 | 140 | -10 |
| Ship-to | 6 | 27 | Gonzalez, Palmer and Miller | 140–190 | 210 | +20 |
| Ship-to / Location | 1 | 21 | Morris Group - 505118 | 200 | 170 | -30 |
| Ship-Tos | 2 | 27 | Gonzalez, Palmer and Miller | 230–260 | 210 | -50 |
| Site | 1 | 21 | Morris Group - 505118 | 180 | 170 | -10 |
| Sites | 1 | 1 | 3 | 110 | 80 | -30 |
| Size (Gal) | 1 | 6 | 10,000 | 100–130 | 100 | -30 |
| Skills | 1 | 11 | Inspections | 260 | 90 | -170 |
| SKU | 1 | 7 | HOS-100 | 130 | 90 | -40 |
| Status | 19 | 22 | Cancellation requested | 100–230 | 180 | -50 |
| Supported Products | 1 | 31 | Tank Inspection Recertification | 230 | 230 | 0 |
| Tags | 1 | 10 | Split Load | 160–200 | 100 | -100 |
| Tank Monitor | 1 | 8 | TM4K9P2Q | 130–150 | 120 | -30 |
| Tanks & assets | 1 | 16 | Reefer Truck R-7 | 150 | 140 | -10 |
| Task | 1 | 15 | Monitor install | 170 | 120 | -50 |
| Tax Code | 1 | 9 | TX-EXEMPT | 140 | 100 | -40 |
| Technician | 2 | 15 | Nobody assigned | 165–200 | 140 | -60 |
| Terminal | 1 | 16 | Partner supplies | 160–170 | 130 | -40 |
| Terms | 1 | 14 | Due on receipt | 130 | 120 | -10 |
| TopOff | 1 | 9 | Supported | 130 | 100 | -30 |
| Total | 1 | 7 | $333.70 | 120 | 80 | -40 |
| Type | 4 | 15 | Monitor install | 110–165 | 140 | -25 |
| UOM | 1 | 4 | drum | 100 | 80 | -20 |
| Updated | 1 | 12 | Oct 20, 2026 | 140 | 110 | -30 |
| Valid through | 1 | 12 | Oct 31, 2026 | 130 | 120 | -10 |
| Vendor | 2 | 26 | High Desert Fuel Logistics | 160–210 | 200 | -10 |
| Vendor ID | 1 | 9 | VEND-3001 | 130 | 110 | -20 |
| Vendor Name | 1 | 31 | Compliance expired Jun 30, 2026 | 250 | 220 | -30 |
| Vendors | 1 | 2 | 10 | 120 | 90 | -30 |
| Visit | 1 | 11 | Raise visit | 150 | 90 | -60 |
| Visits | 1 | 2 | 12 | 100 | 80 | -20 |
