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

// Tuple encoding prevents make/model delimiter collisions (e.g. "A|B"/"C" vs "A"/"B|C").
const identityKey = (make: string, model: string) =>
  JSON.stringify([canonical(make), canonical(model)]);

const safeName = (name: unknown): name is string =>
  typeof name === "string" &&
  name.length >= 1 &&
  name.length <= 100 &&
  name.trim().length >= 1 &&
  // Compatibility normalization can turn fullwidth angle brackets into HTML
  // delimiters. Validate the canonical identity as well as the raw input.
  !/[<>]/.test(name.normalize("NFKC")) &&
  // Reject controls, format characters and Unicode line separators (e.g. bidi
  // overrides and zero-width joiners) that can disguise identities or source IDs.
  // Reject unpaired UTF-16 surrogates; valid emoji pairs remain allowed.
  !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(name) &&
  !Array.from(name).some(
    (character) => character.length === 1 && /[\uD800-\uDFFF]/.test(character),
  );

const MAX_PREVIEW_ROWS = 50_000;

const currentUpperBound = () => new Date().getUTCFullYear() + 2;

/** Preview source rows; retain provenance, reject invalid years, flag collisions. */
export function previewVehicleReferences(
  input: VehicleReferenceRow[],
  existing: ExistingVehicle[],
  options: { maxRows?: number; passengerOnly?: boolean } = {},
): VehiclePreview {
  if (!options || typeof options !== "object" || Array.isArray(options))
    throw new Error("Invalid vehicle preview options");
  // An omitted limit uses the default; an explicit null is malformed input.
  const maxRows = options.maxRows === undefined ? MAX_PREVIEW_ROWS : options.maxRows;
  if (options.passengerOnly !== undefined && typeof options.passengerOnly !== "boolean")
    throw new Error("Invalid passenger-only preview option");
  if (
    !Array.isArray(input) ||
    !Number.isSafeInteger(maxRows) ||
    maxRows < 1 ||
    maxRows > MAX_PREVIEW_ROWS ||
    input.length > maxRows
  )
    throw new Error("Invalid vehicle import size");
  // Fail closed on malformed existing identities rather than matching against
  // disguised names or throwing an unhelpful normalization TypeError.
  if (
    !Array.isArray(existing) ||
    existing.some((v) => !v || !safeName(v.makeName) || !safeName(v.modelName))
  )
    throw new Error("Invalid existing vehicle identity");
  const existingMakes = new Set(existing.map((v) => canonical(v.makeName)));
  const existingModels = new Map<string, ExistingVehicle[]>();
  for (const row of existing) {
    const key = identityKey(row.makeName, row.modelName);
    existingModels.set(key, [...(existingModels.get(key) ?? []), row]);
  }

  const groups = new Map<
    string,
    {
      make: string;
      model: string;
      years: Set<number>;
      vehicleTypes: Set<number>;
      sources: Set<string>;
      names: Set<string>;
    }
  >();
  let rejected = 0;
  for (const row of input) {
    if (
      !row ||
      !safeName(row.make) ||
      !safeName(row.model) ||
      !safeName(row.sourceId) ||
      !Number.isInteger(row.year) ||
      row.year < 1886 ||
      row.year > currentUpperBound() ||
      !Number.isInteger(row.vehicleTypeId) ||
      row.vehicleTypeId < 1 ||
      row.vehicleTypeId > 20 ||
      (options.passengerOnly && row.vehicleTypeId !== 2)
    ) {
      rejected++;
      continue;
    }
    const key = identityKey(row.make, row.model);
    const group = groups.get(key) ?? {
      make: row.make.trim(),
      model: row.model.trim(),
      years: new Set<number>(),
      vehicleTypes: new Set<number>(),
      sources: new Set<string>(),
      names: new Set<string>(),
    };
    group.years.add(row.year);
    group.vehicleTypes.add(row.vehicleTypeId);
    group.sources.add(row.sourceId.trim());
    group.names.add(row.make.trim() + " / " + row.model.trim());
    groups.set(key, group);
  }

  const candidates: VehicleCandidate[] = [];
  for (const [key, group] of groups) {
    const years = [...group.years].sort((a, b) => a - b);
    const rows = existingModels.get(key) ?? [];
    const invalidExistingRange = rows.some(
      (r) =>
        !Number.isInteger(r.yearStart) ||
        !Number.isInteger(r.yearEnd) ||
        r.yearStart < 1886 ||
        r.yearStart > r.yearEnd ||
        r.yearEnd > currentUpperBound(),
    );
    // A partial overlap is not enough: every observed source year must be
    // covered before treating the candidate as an existing catalog match.
    const allYearsCovered = years.every((year) =>
      rows.some((r) => year >= r.yearStart && year <= r.yearEnd),
    );
    const status: VehicleCandidate["status"] =
      invalidExistingRange || group.vehicleTypes.size > 1 || group.names.size > 1
        ? "review"
        : rows.length > 1
          ? "review"
          : rows.length === 1 && !allYearsCovered
            ? "review"
            : rows.length === 1
              ? "existing"
              : existingMakes.has(canonical(group.make))
                ? "new_model"
                : "new_make";
    const reason = invalidExistingRange
      ? "invalid existing year range; verify catalog record before matching"
      : group.vehicleTypes.size > 1
        ? "conflicting vehicle types; verify source identity before import"
        : group.names.size > 1
          ? "conflicting source spellings"
          : rows.length > 1
            ? "multiple existing records"
            : rows.length === 1 && !allYearsCovered
              ? "year range outside existing record"
              : rows.length === 1
                ? "existing model (not a verified generation match)"
                : "new identity needs human review before database insert";
    candidates.push({
      make: group.make,
      model: group.model,
      years,
      sourceIds: [...group.sources].sort(),
      status,
      reason,
    });
  }
  candidates.sort(
    (a, b) => a.make.localeCompare(b.make, "en") || a.model.localeCompare(b.model, "en"),
  );
  return {
    candidates,
    rejected,
    inputCount: input.length,
    warnings: [
      "PREVIEW ONLY: no database writes; verify every source's redistribution rights.",
      "Model-year catalog entries do not prove engine, trim, generation, OEM or part fitment.",
      "Do not expand a single contiguous year range across missing years.",
      "Manual approval and source provenance are required before any import.",
    ],
  };
}
