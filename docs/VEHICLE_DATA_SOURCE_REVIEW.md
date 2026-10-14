# Qitaa — Vehicle Reference Data Source Review (15 October 2026)

## Decision
**Adopt an isolated offline preview/adapter, NOT an automatic production import.**

Candidate: https://github.com/MeterApp/vehicle-db
- npm package: `@meterapp/vehicle-db`, inspected version 2.19.0, ISC package license.
- TypeScript, offline, zero runtime dependencies, 23 source groups claimed in README.
- Exposes `getMakes`, `getModels`, `getAvailableYears`, and optional `searchVehicles` and `resolveVehicle`.
- README snapshot currently reports 1,608 normalized makes, 42,294 models and 196,745 model-year identities (1990–2027). The repository description and README are not synchronized; these counts are upstream claims, **not independently reproduced Qitaa import counts**.
- Each source may carry independent data-use terms; package ISC alone does not establish redistribution rights to each bundled source. The upstream project explicitly documents restrictions on GSO website extraction and unresolved access/reuse for SASO. **Do not copy a bundled bulk dataset into our public repository or production DB until provenance and permissions are reviewed.**
- Years can represent model year, registration year, or evidence of catalog presence depending on source; not generation, engine or spare-part fitment.
- Upstream identity resolver deliberately reports ambiguity instead of guessing generations; this is desirable for Qitaa.

## Existing Qitaa schema limits
- `vehicle_makes` contains `name_ar`, `name_en`, country and WMI codes.
- `vehicle_models` contains a single `year_start`/`year_end` interval, optional engine/body. This cannot represent gaps or source-specific year meaning safely.
- `part_fitments` has model and year-range only; no OEM-authoritative provenance.
- Arabic naming and Yemen-market aliases require human validation. Never auto-translate to publishable `name_ar`.
- Live Supabase migration state and admin permission testing remain separate gates.

## Work delivered
- `src/lib/vehicle-reference.ts` creates a bounded, pure, offline, provenance-preserving candidate preview from normalized make/model/year/source/type rows.
- `tests/vehicle-reference.test.ts` exercises missing years, deduplication, existing record conflicts, type filters, malformed inputs, and immutability.
- No external data bundled; no paid API; no live DB writes; no new runtime dependency.

## Next gates
1. Review source-by-source commercial redistribution and attribution, especially U.S./EU/UK/Asia inputs.
2. Inspect actual export shapes and adapt upstream data into the preview; validate sample Toyota, Hyundai, Kia, Nissan, BYD, and Chinese/Japanese domestic models.
3. Add provenance-aware staging tables, source-year basis, and an admin approval flow on a **disposable** DB before any live migration.
4. Add bilingual aliases via human-reviewed dictionary; measure coverage improvement against the current Qitaa catalog.
5. Validate authoritative VIN decoder separately; do not infer part compatibility from the vehicle list.
