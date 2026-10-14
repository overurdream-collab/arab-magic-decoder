import { describe, expect, it } from "bun:test";
import { decodeVinOfficial } from "../src/lib/nhtsa-vin";

const sample = "1HGCM82633A004352";
const fake = (data: unknown, ok = true) =>
  (async (_url: string | URL | Request) => ({
    ok,
    json: async () => data,
  })) as unknown as typeof fetch;

describe("NHTSA VIN decoding, offline mocked responses", () => {
  it("reads make/model/year from a valid official response", async () => {
    const result = await decodeVinOfficial(sample, fake({
      Results: [{
        Make: "HONDA", Model: "Accord", ModelYear: "2003",
        ErrorCode: "0", Manufacturer: "HONDA MOTOR CO.",
      }],
    }));
    expect(result.make).toBe("HONDA");
    expect(result.model).toBe("Accord");
    expect(result.year).toBe(2003);
    expect(result.note).toContain("لا يثبت توافق");
  });
  it("rejects malformed VIN before contacting the network", async () => {
    await expect(decodeVinOfficial("abc", fake({ Results: [] }))).rejects.toThrow();
  });
  it("rejects a response without a verified model", async () => {
    await expect(decodeVinOfficial(sample, fake({
      Results: [{ Make: "HONDA", Model: "", ErrorCode: "1" }],
    }))).rejects.toThrow();
  });
  it("rejects upstream error codes", async () => {
    await expect(decodeVinOfficial(sample, fake({
      Results: [{ Make: "HONDA", Model: "Accord", ErrorCode: "1" }],
    }))).rejects.toThrow();
  });
  it("handles failed upstream request", async () => {
    await expect(decodeVinOfficial(sample, fake({}, false))).rejects.toThrow();
  });
  it("rejects malformed response shape", async () => {
    await expect(decodeVinOfficial(sample, fake({ Results: [] }))).rejects.toThrow();
  });
});
