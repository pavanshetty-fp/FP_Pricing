# Customer Portal — questions for the team, and to-dos

Started 2026-10-20. Tick a box when it's answered or done: `- [ ]` → `- [x]`,
and write the answer under the question.

## Questions to ask the team

### Tank monitors
- [ ] **Monitor setup in the portal:** monitors are set up outside the portal, but the Asset and Ship-to forms still have "Tank monitor fitted" and a Monitor ID field. Should the customer see or edit these at all? (Kept as-is until answered.)
- [ ] **Daily usage:** where does "gallons used per day" come from? The monitor's own average, our calculation from readings, or the tenant?
- [ ] **A new monitor's first reading:** what does a tank show before its monitor has reported? Today it reads 0% (Urgent).
- [ ] **Offline or stale monitors:** how do we know a reading is old, and what should the customer see?
- [ ] **Battery:** are 40 / 20 / 10 / 5% the right steps? Who replaces batteries, and should a low battery alert anyone?
- [ ] **Level bands:** are they always set per monitor (≤10 urgent · <50 low · <80 moderate · 80+ fine), or does the tenant set them?

### Orders and deliveries
- [ ] **No approval at the tenant:** for tenants who skip approval, does a portal request become an order straight away? Who turns that on: a tenant setting, or per customer?
- [ ] **Merged orders:** can one tenant order really carry several requests from the same customer, and does the customer see that?
- [ ] **Change requests:** how fast does the tenant answer one, and what does the customer see if it's refused?
- [ ] **Running late:** today it's "planned date passed and not delivered". Will we ever get an ETA from dispatch?
- [ ] **Proof of delivery:** is the delivery ticket the proof, or something else (a photo, a signature)? Where does it come from?
- [ ] **Partial deliveries:** should the tank sums count only what actually arrived?
- [ ] **Actual delivery date:** can we store the day an order was really delivered, so late deliveries count usage to that day?

### Credit and invoices
- [ ] **Credit hold:** we only get yes/no today. Will a balance or limit ever come through?
- [ ] **Invoice disputes (hidden for now):** when they come back, what are the rules: time limit, effect on credit hold, who may dispute, paid invoices, whole or part of the due amount paused?

### Recurring
- [ ] **Order lead time:** the system should make recurring orders about 30 days ahead. Confirm 30, and whether the tenant can change it.

### Dashboard
- [ ] **By role:** which dashboard cards does each user role see?

## To-do

### Tank monitor data — detailed pass (Pavan, 2026-10-20)
- [ ] Go through every tank-monitor figure (level, battery, daily usage, days to empty, on fulfilment, suggested) against real monitor data once the team answers the questions above.
- [ ] Decide what the customer sees for a new monitor, a stale reading and a dead battery.
- [ ] Partial deliveries and the actual delivery date in the "on fulfilment" sums.

### From the Anirudh review, still to build
- [ ] Quote flow: open the quote, pick the delivery date, accept or reject.
- [ ] Recurring rules: remove "Make each order N days before"; the system makes orders ~30 days ahead.
- [ ] Ship-to as a full page: its assets and the site's whole activity history.
- [ ] Asset as a full page: monitor readings, last deliveries, order history; opened from the ship-to page too.
- [ ] Tenant setting: no approval → a request goes straight in as an order.
