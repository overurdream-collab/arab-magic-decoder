# Qitaa — Requirements Traceability Matrix

Status legend: **Existing** = supported by existing code/database structure, not necessarily production-tested; **Partial** = implemented but incomplete or unverified; **Planned** = target specification without working implementation; **Unverified** = source code is under review and requires tests.

| Domain | PDF source | Target acceptance criterion | Baseline / next action |
|---|---|---|---|
| Customer storefront | 00, 05, 08 | Arabic RTL, browse/search category, images, inventory offers | **Partial:** landing/catalog/part pages; real imagery and production data missing |
| Vehicle identity | 01, 02, 03, 05 | select vehicle or decode VIN into correct configuration | **Partial:** heuristic WMI/year only; no authoritative model/engine feed |
| Fitment | 02, 03, 08 | verified part-to-car match with provenance | **Partial:** model/year sample matches, no verified supplier provenance |
| Master catalog | 02, 06, 08 | OEM/alternate IDs, variants, assets, review and CSV staged import | **Partial:** core catalog exists; CSV approval workflow and image pipeline planned |
| Seller onboarding | 05, 06 | merchant can request entry; admin accepts/rejects; approval recorded | **Unverified:** phase-one code and DB controls added, pending E2E approval tests |
| Seller catalog offers | 05, 06, 08 | approved seller adds/updates own price, stock, quality, warranty | **Unverified:** /seller implementation under build/security review |
| Official brand/authorized vendor | 00, 06, 08 | verified seller/category, evidence and provenance | **Planned:** formal evidence verification separate from self-declared quality |
| Checkout/orders | 03, 05, 06 | customer confirms and tracks an itemized order | **Planned:** no active order engine |
| Payments/COD | 01, 03, 07 | collect, reconcile/refund securely; local methods only when enabled | **Planned:** no live wallets or ledger, no payments in phase one |
| Delivery | 01, 05, 06 | delivery queue/status and customer evidence of completion | **Planned:** delivery role only |
| Workshop | 01, 03, 05, 06, 07 | inspect vehicle; quote parts+labor, client approval and work history | **Planned:** workshop role only |
| Quick service | 00, 05 | oil/filters/tires service management | **Planned:** role only |
| Lathe service | 07 | structured machining request/quote/workflow | **Planned:** no service interface |
| My vehicles | 02, 03, 05 | multiple vehicles, odometer, maintenance logs | **Partial:** /garage exists, needs browser and RLS scenario testing |
| Maintenance alerts | 05, 07 | timed/km based notifications | **Partial:** in-page banners; SMS/push not integrated |
| Identity/security | 01, 02, 03 | safe roles, private vehicles, isolated merchant data, audit trails | **Partial:** PostgreSQL RLS + application routes; penetration testing pending |
| Admin dashboard | 06 | approve merchants, manage catalog, users, orders, disputes | **Unverified:** seller approvals and read-only catalog drafted; broader modules planned |
| Admin CSV import | 06, 08 | validated import/dry-run/diff/approval and rollback procedure | **Planned:** current UI documents workflow only |
| Pricing comparisons | 00, 03, 08 | list multiple sellers same item, condition/quality/guarantees | **Partial:** display sorted YER offers, no price history or provenance |
| Customer support/chat | 03, 04, 05 | human handoff and traceable communication | **Planned** |
| AI orchestration | 04 | bounded tool execution, logs, human approval for consequential actions | **Planned** |
| Marketing AI | 04, 07 | authorized campaign targeting/measurement | **Planned** |
| Analytics AI | 04, 09 | reliable business analytics, demand and anomalies | **Planned** |
| Research/Pricing AI | 04 | supplier trends and price recommendations based on evidence | **Planned** |
| Zero-results analytics | 09 | capture unsuccessful queries and recommend catalog opportunities | **Planned** |
| React dashboards | 06 | admin, seller, workshop, analytics views | **Partial:** admin/seller drafts only |
| Flutter customer/workshop/seller/delivery | 01, 05 | installable native apps / released builds | **Planned:** no Flutter code at baseline |

## Prioritized execution gates
- **G0:** repository identified; GitHub/Lovable code sync checked; no deployment actions.
- **G1:** build, lint, typecheck and secure seller/admin onboarding tested with isolated accounts. Current PR is for this stage.
- **G2:** catalog enrichment, fitment provenance and safe import; no false 'verified compatibility' claim.
- **G3:** order lifecycle, clear seller ownership and audit, then delivery/COD staging.
- **G4:** workshop, quick services and mobile workflows; service/part linkage.
- **G5:** analytics, loyalty, notifications and bounded AI agents.
- **G6:** production security, data migration rehearsals, performance, backups, real user acceptance, deployment approval.

## Conflicts and pending input
- The PDFs discuss custom add-on modules on top of pre-existing Active eCommerce. Owner explicitly overrode this: build from THIS repository only.
- Flutter and Laravel are target specifications, not existing projects. Architecture choice requires cost/benefit analysis.
- '10_IMPLEMENTATION_GUIDE.md' is referenced in document index but not provided.
- Future owner additions will update this matrix rather than silently replacing the original requirements.
