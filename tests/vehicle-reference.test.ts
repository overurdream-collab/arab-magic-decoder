import { describe, expect, it } from "bun:test";
import { previewVehicleReferences, type VehicleReferenceRow } from "../src/lib/vehicle-reference";

const row = (
  make: string,
  model: string,
  year: number,
  sourceId = "fixture",
): VehicleReferenceRow => ({ make, model, year, sourceId, vehicleTypeId: 2 });

describe("Qitaa offline vehicle-reference preview", () => {
  it("never guesses years between disjoint source observations", () => {
    const result = previewVehicleReferences(
      [row("Toyota", "Corolla", 2017), row("Toyota", "Corolla", 2020)],
      [],
    );
    expect(result.candidates[0]?.years).toEqual([2017, 2020]);
    expect(result.candidates[0]?.status).toBe("new_make");
  });
  it("deduplicates identical source observations but keeps provenance", () => {
    const result = previewVehicleReferences(
      [row("Toyota", "Corolla", 2020, "gov"), row("Toyota", "Corolla", 2020, "maker")],
      [],
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.sourceIds).toEqual(["gov", "maker"]);
  });
  it("flags existing identity outside known years for review", () => {
    const result = previewVehicleReferences(
      [row("Toyota", "Corolla", 2026)],
      [
        {
          makeName: "Toyota",
          modelName: "Corolla",
          yearStart: 2010,
          yearEnd: 2020,
        },
      ],
    );
    expect(result.candidates[0]?.status).toBe("review");
  });
  it("never silently resolves two existing records as one", () => {
    const result = previewVehicleReferences(
      [row("Toyota", "Corolla", 2020)],
      [
        { makeName: "Toyota", modelName: "Corolla", yearStart: 2018, yearEnd: 2022 },
        { makeName: "Toyota", modelName: "Corolla", yearStart: 2019, yearEnd: 2023 },
      ],
    );
    expect(result.candidates[0]?.status).toBe("review");
  });
  it("does not import motorcycles as passenger cars", () => {
    const result = previewVehicleReferences(
      [{ ...row("Honda", "CBR", 2022), vehicleTypeId: 1 }],
      [],
      { passengerOnly: true },
    );
    expect(result.rejected).toBe(1);
    expect(result.candidates).toHaveLength(0);
  });
  it("rejects malicious and invalid names and years", () => {
    const result = previewVehicleReferences(
      [row("<script>", "Car", 2020), row("Toyota", "Corolla", 3000)],
      [],
    );
    expect(result.rejected).toBe(2);
  });
  it("limits file size and never mutates source objects", () => {
    const input = [row("Toyota", "Camry", 2020)];
    expect(() => previewVehicleReferences(input, [], { maxRows: 0 })).toThrow();
    const snapshot = JSON.stringify(input);
    previewVehicleReferences(input, []);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
