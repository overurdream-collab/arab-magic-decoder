import { describe, expect, it } from "bun:test";
import { previewMeterVehicleCatalog, type MeterCatalog } from "../src/lib/meterapp-adapter";

const catalog: MeterCatalog = {
  getDataSources: () => [
    {
      sourceId: "official",
      sourceName: "Fixture register",
      sourceUrl: "https://example.org/data",
      license: "Test-only",
      yearBasis: "model-year",
    },
  ],
  getModels: () => [
    {
      makeId: 1,
      modelId: 2,
      makeName: "Toyota",
      modelName: "Corolla",
      vehicleTypeId: 2,
      sourceIds: ["official"],
    },
  ],
  getAvailableYears: () => [2020, 2022],
};

describe("MeterApp source-gated read-only adapter", () => {
  it("requires explicit approved sources", () => {
    expect(() => previewMeterVehicleCatalog(catalog, [], [])).toThrow();
  });
  it("rejects unknown sources even when package is installed", () => {
    expect(() => previewMeterVehicleCatalog(catalog, ["unknown"], [])).toThrow();
  });
  it("does not conflate catalog year with vehicle model year", () => {
    const unsafe: MeterCatalog = {
      ...catalog,
      getDataSources: () => [
        {
          ...catalog.getDataSources()[0]!,
          yearBasis: "catalog-year",
        },
      ],
    };
    expect(() => previewMeterVehicleCatalog(unsafe, ["official"], [])).toThrow();
  });
  it("preserves years and source evidence without database writes", () => {
    const preview = previewMeterVehicleCatalog(catalog, ["official"], []);
    expect(preview.candidates[0]?.years).toEqual([2020, 2022]);
    expect(preview.candidates[0]?.sourceIds).toEqual(["official"]);
    expect(preview.candidates[0]?.status).toBe("new_make");
  });
  it("fails closed on oversized source result", () => {
    expect(() => previewMeterVehicleCatalog(catalog, ["official"], [], { maxRows: 1 })).toThrow();
  });
});
