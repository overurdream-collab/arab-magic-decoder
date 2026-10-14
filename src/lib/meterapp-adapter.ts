import {
  previewVehicleReferences,
  type ExistingVehicle,
  type VehiclePreview,
  type VehicleReferenceRow,
} from "./vehicle-reference";

/** Narrow interface matching MeterApp's published TypeScript API, without a runtime dependency. */
export type MeterVehicleModel = {
  makeName: string;
  modelName: string;
  makeId: number;
  modelId: number;
  vehicleTypeId: number;
  sourceIds: string[];
};

export type MeterSource = {
  sourceId: string;
  sourceName: string;
  license: string;
  sourceUrl: string;
  yearBasis?: "model-year" | "catalog-year";
};

export type MeterCatalog = {
  getDataSources(): MeterSource[];
  getModels(options: { vehicleTypeId: number; sourceId: string }): MeterVehicleModel[];
  getAvailableYears(options: {
    makeId: number; modelId: number; vehicleTypeId: number; sourceId: string;
  }): number[];
};

/**
 * Requires an explicit, pre-reviewed allowlist. No source is enabled by default.
 * The package's ISC license does NOT authorize copying every upstream dataset.
 */
export function previewMeterVehicleCatalog(
  catalog: MeterCatalog,
  approvedSourceIds: readonly string[],
  existing: ExistingVehicle[],
  options: { maxRows?: number } = {},
): VehiclePreview {
  if (!approvedSourceIds.length) throw new Error("No approved data sources");
  const sources = new Map(catalog.getDataSources().map((s) => [s.sourceId, s]));
  const rows: VehicleReferenceRow[] = [];
  for (const sourceId of new Set(approvedSourceIds)) {
    const source = sources.get(sourceId);
    if (!source || !source.license || !source.sourceUrl) {
      throw new Error("Unverified source provenance: " + sourceId);
    }
    if (source.yearBasis !== "model-year") {
      throw new Error("Source year basis is not model-year: " + sourceId);
    }
    const models = catalog.getModels({ vehicleTypeId: 2, sourceId });
    for (const model of models) {
      if (model.vehicleTypeId !== 2 || !model.sourceIds.includes(sourceId)) continue;
      const years = catalog.getAvailableYears({
        makeId: model.makeId,
        modelId: model.modelId,
        vehicleTypeId: 2,
        sourceId,
      });
      for (const year of years) {
        rows.push({
          make: model.makeName, model: model.modelName,
          year, sourceId, vehicleTypeId: 2,
        });
        if (rows.length > (options.maxRows ?? 50000))
          throw new Error("Source data exceeds preview limit");
      }
    }
  }
  return previewVehicleReferences(rows, existing, { ...options, passengerOnly: true });
}
