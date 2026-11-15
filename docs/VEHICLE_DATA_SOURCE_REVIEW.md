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

## Updated source and rights review — 15 November 2026

This appendix updates the 15 October snapshot; it does not approve or import data.

### Upstream inventory and limits

The current upstream README for [MeterApp/vehicle-db](https://github.com/MeterApp/vehicle-db#data-sources) lists multiple independent sources and terms. It identifies, among others, U.S. government vPIC/FuelEconomy data, UK OGL 3.0, NZTA/Malaysia/EEA CC BY 4.0 datasets, Netherlands RDW and Brazil RENAVAM public-domain datasets, and several manufacturer or product-name sources with attribution wording. The package's ISC software license is separate from rights in the source datasets. Upstream documentation is a discovery aid, not proof that each upstream row or transformation can be redistributed by Qitaa.

### Candidate source review

| Candidate source | Publicly stated terms found | Qitaa status and limits |
|---|---|---|
| UK vehicle licensing statistics | OGL v3.0 publication terms | Candidate only; preserve attribution and verify the exact downloadable dataset/version and field semantics. |
| New Zealand vehicle fleet/open data | CC BY 4.0 indicated by the source inventory | Candidate only; verify the exact dataset record, attribution, update date and permitted fields before use. |
| Malaysia vehicle registration data | CC BY 4.0 indicated by the official data portal | Candidate only; transactional registration records do not by themselves establish model-year or spare-part fitment. |
| EEA vehicle CO2 data | CC BY 4.0 dataset metadata | Candidate only; emissions records are not an authoritative fitment catalog. |
| Netherlands RDW vehicle data | Public-domain terms indicated by RDW | Candidate only; confirm exact dataset and its scope; registration presence is not factory model year. |
| Brazil RENAVAM aggregate data | Official Ministry portal identifies public domain | Candidate only; aggregate make/model/year counts do not prove OEM compatibility. |
| Manufacturer/catalogue sources | Upstream describes source attribution/factual product names for some sources | Not cleared for redistribution/import; assess each source and any database, trademark, or contractual limits separately. |
| GSO/SASO material | Upstream documents unresolved access/reuse dependencies | Excluded until written access and reuse terms are established. |

### Source links checked

- [Upstream source inventory and year semantics](https://github.com/MeterApp/vehicle-db#data-sources)
- [Creative Commons Attribution 4.0 deed](https://creativecommons.org/licenses/by/4.0/)
- [UK Department for Transport publications and OGL](https://www.gov.uk/government/organisations/department-for-transport/about/publication-scheme)
- [Malaysia official open data portal](https://data.gov.my/data-catalogue/car_reg)
- [EEA vehicle CO2 dataset catalogue](https://www.eea.europa.eu/en/datahub/datahubitem-view/5b7d4c74-722a-4a3a-a3c2-8d17f1a6d3bc)
- [Netherlands RDW open data portal](https://opendata.rdw.nl/)
- [Brazil Ministry of Transport dataset portal](https://dados.transportes.gov.br/dataset/renavam)

### Import gate

No candidate is approved for production import by this review. Before staging any source, record its exact dataset URL and version/date, terms as published by the originating portal, attribution text, retrieval timestamp and content hash; document year/identity semantics and run a human-reviewed sample comparison. Keep the source data isolated and disposable through review. Do not infer part fitment from make/model/year records, and do not publish Arabic translations or aliases without human validation.
