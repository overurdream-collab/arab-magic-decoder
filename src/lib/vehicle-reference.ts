/**
 * Qitaa vehicle-reference staging. Pure, offline and READ-ONLY.
 *
 * Source catalog years establish only the existence of a make/model in that
 * source. They are NOT evidence of a generation, engine, VIN, or parts fitment.
 * Never write this preview directly into production tables.
 */
export type VehicleReferenceRow = {
  make: string;
  model: string;
  year: number;
  sourceId: string;
  vehicleTypeId: number;
};

export type ExistingVehicle = {
  makeName: string;
  modelName: string;
  yearStart: number;
  yearEnd: number;
};

export type VehicleCandidate = {
  make: string;
  model: string;
  years: number[];
  sourceIds: string[];
  status: "new_make" | "new_model" | "existing" | "review";
  reason: string;
};

export type VehiclePreview = {
  candidates: VehicleCandidate[];
  rejected: number;
  inputCount: number;
  warnings: string[];
};

const canonical = (name: string) =>
  name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");

const safeName = (name: unknown): name is string =>
  typeof name === "string" &&
  name.length >= 1 &&
  name.length <= 100 &&
  name.trim().length >= 1 &&
  !/[<>\x00-\x1f]/.test(name);

const currentUpperBound = () => new Date().getUTCFullYear() + 2;

/** Preview source rows; retain provenance, reject invalid years, flag collisions. */
export function previewVehicleReferences(
  input: VehicleReferenceRow[],
  existing: ExistingVehicle[],
  options: { maxRows?: number; passengerOnly?: boolean } = {},
): VehiclePreview {
  const maxRows = options.maxRows ?? 50000;
  if (!Array.isArray(input) || input.length > maxRows || maxRows < 1)
    throw new Error("Invalid vehicle import size");
  const existingMakes = new Set(existing.map((v) => canonical(v.makeName)));
  const existingModels = new Map<string, ExistingVehicle[]>();
  for (const row of existing) {
    const key = canonical(row.makeName) + "|" + canonical(row.modelName);
    existingModels.set(key, [...(existingModels.get(key) ?? []), row]);
  }

  const groups = new Map<string, {
    make: string; model: string; years: Set<number>; sources: Set<string>; names: Set<string>;
  }>();
  let rejected = 0;
  for (const row of input) {
    if (!row || !safeName(row.make) || !safeName(row.model) ||
      !safeName(row.sourceId) || !Number.isInteger(row.year) ||
      row.year < 1886 || row.year > currentUpperBound() ||
      !Number.isInteger(row.vehicleTypeId) || row.vehicleTypeId < 1 ||
      row.vehicleTypeId > 20 || (options.passengerOnly && row.vehicleTypeId !== 2)) {
      rejected++;
      continue;
    }
    const key = canonical(row.make) + "|" + canonical(row.model);
    const group = groups.get(key) ?? {
      make: row.make.trim(), model: row.model.trim(),
      years: new Set<number>(), sources: new Set<string>(), names: new Set<string>(),
    };
    group.years.add(row.year);
    group.sources.add(row.sourceId.trim());
    group.names.add(row.make.trim() + " / " + row.model.trim());
    groups.set(key, group);
  }

  const candidates: VehicleCandidate[] = [];
  for (const [key, group] of groups) {
    const years = [...group.years].sort((a, b) => a - b);
    const rows = existingModels.get(key) ?? [];
    const matchingYear = years.some((year) =>
      rows.some((r) => year >= r.yearStart && year <= r.yearEnd));
    const status: VehicleCandidate["status"] =
      group.names.size > 1 ? "review" :
      rows.length > 1 ? "review" :
      rows.length === 1 && !matchingYear ? "review" :
      rows.length === 1 ? "existing" :
      existingMakes.has(canonical(group.make)) ? "new_model" : "new_make";
    const reason = group.names.size > 1 ? "conflicting source spellings" :
      rows.length > 1 ? "multiple existing records" :
      rows.length === 1 && !matchingYear ? "year range outside existing record" :
      rows.length === 1 ? "existing model (not a verified generation match)" :
      "new identity needs human review before database insert";
    candidates.push({
      make: group.make, model: group.model, years,
      sourceIds: [...group.sources].sort(), status, reason,
    });
  }
  candidates.sort((a, b) =>
    a.make.localeCompare(b.make, "en") || a.model.localeCompare(b.model, "en"));
  return {
    candidates, rejected, inputCount: input.length,
    warnings: [
      "PREVIEW ONLY: no database writes; verify every source's redistribution rights.",
      "Model-year catalog entries do not prove engine, trim, generation, OEM or part fitment.",
      "Do not expand a single contiguous year range across missing years.",
      "Manual approval and source provenance are required before any import.",
    ],
  };
}
