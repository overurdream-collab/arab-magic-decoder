# منصة قِطَع — Project Baseline

**Snapshot:** 2026-10-14
**Canonical GitHub:** https://github.com/overurdream-collab/arab-magic-decoder
**Lovable Project:** https://lovable.dev/projects/2cd1dcdb-8759-5603-8cb7-c9203cfe8fd3

## Authoritative rule: build from the only actual codebase
The *only* implemented platform at baseline is this Lovable-synced React/TanStack Start project with a Supabase/PostgreSQL backend. The ten original project PDFs (00–09) define **target requirements**, not pre-existing code. In particular:
- There is NO pre-installed 'Active eCommerce' Laravel core.
- There is NO existing Flutter customer/merchant/workshop/delivery application.
- There is NO deployed MySQL/Redis/Elasticsearch backend for this project.
- Do not treat examples in the PDF documents as executed source code.
- An eleventh document ('10_IMPLEMENTATION_GUIDE') is referenced in the index but was not supplied.

**Owner direction:** build the entire agreed system from the inspected codebase; reuse correct modules and data; never assume any other completed projects exist. Future owner-provided additions must be assessed against this baseline.

## Actual code and persistence
Frontend: TypeScript, React 19, TanStack Start/Router, Tailwind, Arabic RTL. Supabase client with row-level-security controls. Key routes:
- '/' Arabic landing page, featured parts, VIN/make/model/year selector.
- '/catalog' text/OEM search, category, condition, quality and city filters.
- '/part/$id' master part details, model-year fitment list and offer price comparison.
- '/garage' email/password login, vehicles, odometer, maintenance log and in-app due banners.
- '/seller' phase-one seller application, catalog picker and editing the owner's offers; requires acceptance and verification.
- '/admin' phase-one admin-gated seller approval/rejection, read-only catalog table, CSV import plan (NOT yet CSV execution).

Existing core tables from original migrations: profiles, user_roles, categories, vehicle_makes, vehicle_models, catalog_parts, part_fitments, sellers, seller_offers, customer_vehicles, vehicle_maintenance_logs. New seller_applications table and additional functions/policies were introduced by Lovable in phase one. Existing test dataset from inspection: 10 categories, 7 makes, 14 models, 18 master parts, 127 compatibility records, 8 sellers and 77 offers. Sample data is not verified commercial fitment evidence.

### Important gaps
- VIN WMI+year heuristic is **not a complete/authoritative VIN decoder**; model and some fitment must be selected/verified.
- Master-catalog CSV import and image processing are not implemented.
- Orders, carts, financial settlement, refunds, fulfilment, delivery dispatch and external wallet/SMS/OTP services are not implemented.
- Workshop, quick service, lathe, native Flutter, advanced analytics, loyalty and agent execution remain future modules.
- Internal due warnings are not external phone notifications.
- Front-end authorization does not substitute for server-side authorization and DB RLS.
- New seller/admin code has been edited on a review branch; functionality needs CI and browser/security checks before acceptance.

## Target capabilities from the owner's PDFs
00 PROJECT MASTER: Yemeni multi-party automotive marketplace (authorized sellers, aftermarket, used parts, customers, workshops, services, delivery, AI).
01 ARCHITECTURE: native app/dashboards, REST+WebSocket, modular backend, storage, search and integrations. Old Laravel-on-Active-eCommerce assumption is explicitly rejected.
02 DATABASE SCHEMA: vehicles/variants, catalog and fitment, workshops, transactions, loyalty, marketing and analytics. Translate to *current* PostgreSQL schema with forward-only migrations.
03 API SPECIFICATION: user, vehicle, catalog, order, workshop, payment and AI API contracts; examples are contract goals, not deployed endpoints.
04 AI AGENTS: orchestrator with marketing, analytics, research, pricing, customer/content responsibilities, event triggers, auditable logs and human oversight.
05 FLUTTER APPS: target customer/workshop/seller/delivery workflows; none should be marked implemented natively.
06 REACT DASHBOARDS: target admin/seller/workshop/analytics dashboards.
07 LARAVEL PACKAGES: fourteen desired domain modules (catalog, fitment, VIN, image search, comparison, workshop, loyalty, lathe, payments, agents, analytics, marketing, notifications, search); they are **not** installed Laravel packages.
08 MASTER CATALOG: canonical product/OEM/alternate IDs; merchants attach offers, prices, stock and quality to approved central records rather than re-create catalog items.
09 ANALYTICS SYSTEM: real-time/near-real-time/deep analysis, zero-result queries and demand gaps.

## Acceptance boundaries
1. Preserve all existing records, and do not modify other user projects.
2. Use branches, pull requests and reversible migrations. Never commit secrets.
3. Every critical operation must enforce role and tenant constraints on the server, not only in navigation.
4. For mechanical fitment: distinguish 'unverified/needs confirmation' from validated compatibility.
5. Until real end-to-end testing, do not claim business-readiness, verified AI accuracy, production security or payment readiness.
6. No paid service subscription, live external integration, irreversible production data changes or public go-live without explicit owner approval.

## Technology decision pending
Current stack is React/TanStack Start + Supabase. The PDFs propose Flutter native apps and a Laravel/MySQL architecture. Do not migrate reflexively: first complete an architecture decision record based on portability, capabilities, operating cost, maintainability and fidelity to the desired mobile distribution channels.
