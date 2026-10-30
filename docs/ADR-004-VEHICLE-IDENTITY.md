# ADR-004: Vehicle identity and data-source adoption

**Date:** 2026-10-15  
**Status:** Partially implemented — identity safety changes tested on a feature branch; external dataset import not approved for production.

## Decision
Retain Qitaa's React/TanStack + Supabase implementation. Do not replace the app with Medusa or Saleor. Evaluate @meterapp/vehicle-db (GitHub MeterApp/vehicle-db, package v2.19.0) as a vehicle *identity candidate source*, not a parts-fitment or OEM source.

## Verified upstream observations
- Upstream package.json declares ISC. No top-level LICENSE file was found in the checked repository. Its records combine 23 sources with different provenance and year semantics; a package-level declaration does **not** settle every underlying source's redistribution/commercial-use rights.
- The repository README advertises an offline TypeScript API, search and conservative identity resolution, with 1990–2027 coverage. These are upstream claims, not validated Qitaa accuracy.
- The source includes a large generated compact.json. Do not blindly commit or import it into our production DB. No paid image API or third-party network request is required for our preliminary integration.
- No OEM part number or verified part-to-vehicle fitment is supplied by the source.

## Data admission gates (must pass before a production import)
1. Inspect and document rights/attribution for **each** upstream data source, not merely the npm package. Exclude any unclear source.
2. Validate source version and hashes; create bounded preview, provenance, source_id and raw external ID.
3. Map normalized make/model aliases to existing UUIDs without overwriting Arabic names or user data.
4. Record import dry-run counts, duplicate/conflict samples, and human approval; only then run a reversible, additive migration.
5. Model-year values vary by region/source. Never infer verified generation, engine, trim or fitment from make/model/year alone.
6. Require disposable PostgreSQL tests, TypeScript/lint/build and end-to-end checks before merging.

## Phase 1 completed here
- VIN parsing now returns ambiguous model-year candidates rather than inventing a single year from the cyclic 10th character.
- UI labels make/year inference as preliminary and asks for manual selection.
- Check-digit verification is informative only; not a blanket rejection for markets where it is not mandatory.
- This change is backward-compatible for valid known WMIs; no database records or production configurations are altered.

## Follow-up
Prototype MeterApp data in an isolated test fixture and produce a provenance/license report; then implement an admin-reviewed vehicle import workflow. Evaluate official NHTSA vPIC separately with explicit network, privacy, availability and country-coverage constraints. Medusa is deferred until the Qitaa order lifecycle is designed and a quantitative build-vs-integrate test is complete.
