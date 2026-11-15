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
  it("flags same make/model with conflicting vehicle categories for human review", () => {
    const result = previewVehicleReferences(
      [
        row("Example", "Transit", 2020, "passenger-source"),
        { ...row("Example", "Transit", 2021, "truck-source"), vehicleTypeId: 3 },
      ],
      [],
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.status).toBe("review");
    expect(result.candidates[0]?.reason).toContain("conflicting vehicle types");
    expect(result.candidates[0]?.sourceIds).toEqual(["passenger-source", "truck-source"]);
    expect(result.candidates[0]?.years).toEqual([2020, 2021]);
    // Passenger-only previews must not accidentally retain the truck row.
    const passenger = previewVehicleReferences(
      [row("Example", "Transit", 2020), { ...row("Example", "Transit", 2021), vehicleTypeId: 3 }],
      [],
      { passengerOnly: true },
    );
    expect(passenger.rejected).toBe(1);
    expect(passenger.candidates[0]?.status).toBe("new_make");
    expect(passenger.candidates[0]?.years).toEqual([2020]);
  });
  it("keeps distinct make/model tuples separate when names contain delimiters", () => {
    const result = previewVehicleReferences(
      [row("A|B", "C", 2020), row("A", "B|C", 2021)],
      [{ makeName: "A|B", modelName: "C", yearStart: 2019, yearEnd: 2022 }],
    );
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.find((item) => item.make === "A|B")?.status).toBe("existing");
    expect(result.candidates.find((item) => item.make === "A")?.status).toBe("new_make");
    expect(result.candidates.find((item) => item.make === "A")?.years).toEqual([2021]);
  });
  it("requires review for malformed existing catalog year ranges", () => {
    for (const [yearStart, yearEnd] of [
      [2022, 2020],
      [1800, 2020],
      [2020.5, 2022],
      [2020, 9999],
    ]) {
      const result = previewVehicleReferences(
        [row("Toyota", "Corolla", 2020)],
        [{ makeName: "Toyota", modelName: "Corolla", yearStart, yearEnd }],
      );
      expect(result.candidates[0]?.status).toBe("review");
      expect(result.candidates[0]?.reason).toContain("invalid existing year range");
    }
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
  it("rejects invisible Unicode controls in make, model and source IDs", () => {
    const result = previewVehicleReferences(
      [
        row("Toy\u200bota", "Corolla", 2020),
        row("Toyota", "Cor\u202eolla", 2020),
        row("Toyota", "Corolla", 2020, "gov\u2066"),
        row("Toyota", "Corolla", 2020, "gov\u007f"),
        row("Toyota", "Corolla", 2020, "gov"),
      ],
      [],
    );
    expect(result.rejected).toBe(4);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.sourceIds).toEqual(["gov"]);
  });
  it("limits file size and never mutates source objects", () => {
    const input = [row("Toyota", "Camry", 2020)];
    expect(() => previewVehicleReferences(input, [], { maxRows: 0 })).toThrow();
    for (const maxRows of [NaN, Infinity, -Infinity, 0.5, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => previewVehicleReferences(input, [], { maxRows })).toThrow(
        "Invalid vehicle import size",
      );
    }
    expect(() => previewVehicleReferences(input, [], { maxRows: 1 })).not.toThrow();
    const snapshot = JSON.stringify(input);
    previewVehicleReferences(input, []);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
