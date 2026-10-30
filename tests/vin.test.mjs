import { describe, expect, it } from "bun:test";
import { decodeVin, vinCheckDigitMatches } from "../src/lib/vin.ts";

describe("VIN identity guardrails", () => {
  it("rejects short and forbidden VIN strings", () => {
    expect(decodeVin("JTE").valid).toBe(false);
    expect(decodeVin("JTEBU5JR0I5123456").valid).toBe(false);
    expect(decodeVin("JTEBU5JR0O5123456").valid).toBe(false);
  });

  it("does not silently pick a model year from a 30-year repeating code", () => {
    const decoded = decodeVin("JTEBU5JR0K5123456");
    expect(decoded.valid).toBe(true);
    expect(decoded.make).toBe("Toyota");
    expect(decoded.yearCandidates).toContain(1989);
    expect(decoded.yearCandidates).toContain(2019);
    expect(decoded.year).toBeUndefined();
    expect(decoded.confidence).toBe("preliminary");
  });

  it("does not treat an unknown WMI as a verified make", () => {
    const decoded = decodeVin("ZZZBU5JR0K5123456");
    expect(decoded.valid).toBe(false);
    expect(decoded.make).toBeUndefined();
  });

  it("calculates check digit without pretending all markets mandate it", () => {
    const example = "1HGCM82633A004352";
    expect(vinCheckDigitMatches(example)).toBe(true);
    expect(vinCheckDigitMatches("1HGCM82643A004352")).toBe(false);
  });
});
