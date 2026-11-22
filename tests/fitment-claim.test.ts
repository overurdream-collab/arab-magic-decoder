import { describe, expect, it } from "bun:test";
import { checkFitmentClaim } from "../src/lib/fitment-claim";

const complete = {
  partId: "OEM-123",
  vehicleId: "make:model:2026",
  sourceRecordId: "row-42",
  claimedFit: "fits",
  source: {
    datasetUrl: "https://example.org/dataset.csv",
    version: "2026-11",
    termsUrl: "https://example.org/terms",
    attribution: "Example agency",
    retrievedAt: "2026-11-17T00:00:00Z",
    sha256: "a".repeat(64),
    yearMeaning: "model_year" as const,
    rightsReviewed: true,
    reviewedBy: "reviewer-1",
  },
};

describe("offline fitment claim intake", () => {
  it("accepts complete claims only for human review", () => {
    expect(checkFitmentClaim(complete)).toEqual({ readyForHumanReview: true, missing: [] });
  });
  it("rejects missing and ambiguous identity or unsupported assertions", () => {
    expect(checkFitmentClaim(null).missing).toEqual(["fitment claim object"]);
    const invalid = {
      ...complete,
      partId: "  ",
      vehicleId: "car\nother",
      sourceRecordId: "row\u202E42",
      claimedFit: "maybe",
    };
    expect(checkFitmentClaim(invalid).missing).toEqual([
      "partId",
      "vehicleId",
      "sourceRecordId",
      "claimedFit",
    ]);
  });
  it("requires traceable source rights and reviewer metadata", () => {
    const result = checkFitmentClaim({
      ...complete,
      source: { ...complete.source, rightsReviewed: false, reviewedBy: "" },
    });
    expect(result.missing).toContain("source.rightsReviewed");
    expect(result.missing).toContain("source.reviewedBy");
  });
  it("rejects malformed or absent provenance rather than assuming a verified fit", () => {
    expect(checkFitmentClaim({ ...complete, source: null }).missing).toContain(
      "source.source evidence object",
    );
    expect(
      checkFitmentClaim({
        ...complete,
        source: { ...complete.source, datasetUrl: "http://localhost/data" },
      }).missing,
    ).toContain("source.datasetUrl");
  });
  it("does not modify source claims", () => {
    const before = JSON.stringify(complete);
    checkFitmentClaim(complete);
    expect(JSON.stringify(complete)).toBe(before);
  });
});
