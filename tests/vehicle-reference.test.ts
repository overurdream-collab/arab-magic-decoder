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
  it("requires review when only some observed years overlap an existing range", () => {
    const result = previewVehicleReferences(
      [row("Toyota", "Corolla", 2020), row("Toyota", "Corolla", 2025)],
      [{ makeName: "Toyota", modelName: "Corolla", yearStart: 2018, yearEnd: 2022 }],
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.years).toEqual([2020, 2025]);
    expect(result.candidates[0]?.status).toBe("review");
    expect(result.candidates[0]?.reason).toContain("year range outside existing record");
  });
  it("keeps fully covered observed years as existing", () => {
    const result = previewVehicleReferences(
      [row("Toyota", "Corolla", 2019), row("Toyota", "Corolla", 2021)],
      [{ makeName: "Toyota", modelName: "Corolla", yearStart: 2018, yearEnd: 2022 }],
    );
    expect(result.candidates[0]?.status).toBe("existing");
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
  it("fails closed on malformed existing make and model identities", () => {
    const valid = { makeName: "Toyota", modelName: "Corolla", yearStart: 2018, yearEnd: 2022 };
    for (const invalid of [
      { ...valid, makeName: "Toy\u202eota" },
      { ...valid, modelName: "Cor\u200bolla" },
      { ...valid, makeName: "<script>" },
      { ...valid, modelName: " " },
      { ...valid, makeName: "Toy\uD800ota" },
      { ...valid, makeName: null },
    ]) {
      expect(() =>
        previewVehicleReferences([row("Toyota", "Corolla", 2020)], [invalid] as never),
      ).toThrow("Invalid existing vehicle identity");
    }
    expect(() => previewVehicleReferences([], null as never)).toThrow(
      "Invalid existing vehicle identity",
    );
  });
  it("rejects malformed options containers with a clear error", () => {
    const input = [row("Toyota", "Corolla", 2020)];
    for (const options of [null, false, 0, "passenger", []]) {
      expect(() => previewVehicleReferences(input, [], options as never)).toThrow(
        "Invalid vehicle preview options",
      );
    }
    expect(previewVehicleReferences(input, []).candidates).toHaveLength(1);
    expect(previewVehicleReferences(input, [], {}).candidates).toHaveLength(1);
  });
  it("rejects nonboolean passenger-only filters instead of silently coercing them", () => {
    const input = [row("Toyota", "Corolla", 2020)];
    for (const passengerOnly of ["false", 1, null, {}]) {
      expect(() => previewVehicleReferences(input, [], { passengerOnly } as never)).toThrow(
        "Invalid passenger-only preview option",
      );
    }
    expect(previewVehicleReferences(input, [], { passengerOnly: false }).rejected).toBe(0);
    expect(previewVehicleReferences(input, [], { passengerOnly: true }).rejected).toBe(0);
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
  it("rejects compatibility characters that normalize into forbidden delimiters", () => {
    const result = previewVehicleReferences(
      [
        row("Toyota\uFF1Cscript\uFF1E", "Corolla", 2020),
        row("Toyota", "Corolla\uFF1C", 2020),
        row("Toyota", "Corolla", 2020, "source\uFF1E"),
        row("Toyota", "Corolla", 2020, "valid-source"),
      ],
      [],
    );
    expect(result.rejected).toBe(3);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.sourceIds).toEqual(["valid-source"]);

    expect(() =>
      previewVehicleReferences(
        [row("Toyota", "Corolla", 2020)],
        [{ makeName: "Toyota\uFF1C", modelName: "Corolla", yearStart: 2018, yearEnd: 2022 }],
      ),
    ).toThrow("Invalid existing vehicle identity");
  });
  it("rejects invisible Unicode controls in make, model and source IDs", () => {
    const result = previewVehicleReferences(
      [
        row("Toy\u200bota", "Corolla", 2020),
        row("Toyota", "Cor\u202eolla", 2020),
        row("Toyota", "Corolla", 2020, "gov\u2066"),
        row("Toyota", "Corolla", 2020, "gov\u007f"),
        row("Toyota\u2028Fake", "Corolla", 2020),
        row("Toyota", "Corolla\u2029Fake", 2020),
        row("Toyota", "Corolla", 2020, "gov\u2028hidden"),
        row("Toyota", "Corolla", 2020, "gov"),
      ],
      [],
    );
    expect(result.rejected).toBe(7);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.sourceIds).toEqual(["gov"]);
  });
  it("rejects malformed UTF-16 in vehicle identities and source IDs", () => {
    const result = previewVehicleReferences(
      [
        row("Toy\uD800ota", "Corolla", 2020),
        row("Toyota", "Cor\uDC00olla", 2020),
        row("Toyota", "Corolla", 2020, "src\uD800"),
        row("Toyota", "Corolla", 2020, "valid-\uD83D\uDE97"),
      ],
      [],
    );
    expect(result.rejected).toBe(3);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.sourceIds).toEqual(["valid-\uD83D\uDE97"]);
    expect(result.candidates[0]?.make).toBe("Toyota");
  });
  it("accepts valid supplementary Unicode in names and source IDs", () => {
    const result = previewVehicleReferences(
      [row("Brand-\uD83D\uDE97", "Model-\uD83D\uDE99", 2020, "source-\uD83D\uDE97")],
      [],
    );
    expect(result.rejected).toBe(0);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.sourceIds).toEqual(["source-\uD83D\uDE97"]);
  });
  it("limits file size and never mutates source objects", () => {
    const input = [row("Toyota", "Camry", 2020)];
    expect(() => previewVehicleReferences(input, [], { maxRows: 0 })).toThrow();
    for (const maxRows of [
      NaN,
      Infinity,
      -Infinity,
      0.5,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      null,
      50_001,
    ]) {
      expect(() => previewVehicleReferences(input, [], { maxRows: maxRows as number })).toThrow(
        "Invalid vehicle import size",
      );
    }
    expect(() => previewVehicleReferences(input, [], { maxRows: 1 })).not.toThrow();
    const snapshot = JSON.stringify(input);
    previewVehicleReferences(input, []);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
