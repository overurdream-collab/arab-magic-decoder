import { describe, expect, it } from "bun:test";
import { checkSourceEvidence } from "../src/lib/source-evidence";

const complete = {
  datasetUrl: "https://example.org/dataset/2026.csv",
  version: "2026-11",
  termsUrl: "https://example.org/terms",
  attribution: "Example agency, 2026",
  retrievedAt: "2026-11-17T00:00:00Z",
  sha256: "a".repeat(64),
  yearMeaning: "registration_year",
  rightsReviewed: true,
  reviewedBy: "human-reviewer",
};

describe("offline source provenance review gate", () => {
  it("allows only a complete manifest to reach human review, not import", () => {
    expect(checkSourceEvidence(complete)).toEqual({ readyForHumanReview: true, missing: [] });
  });
  it("fails closed for absent evidence and missing rights review", () => {
    expect(checkSourceEvidence(null).readyForHumanReview).toBe(false);
    expect(checkSourceEvidence({ ...complete, rightsReviewed: false }).missing).toContain("rightsReviewed");
    expect(checkSourceEvidence({ ...complete, reviewedBy: "" }).missing).toContain("reviewedBy");
  });
  it("rejects non-HTTPS links, credentials, invalid hash, year semantics and timestamp", () => {
    const invalid = {
      ...complete,
      datasetUrl: "http://example.org/data",
      termsUrl: "https://user:password@example.org/terms",
      sha256: "not-a-hash",
      yearMeaning: "fitment",
      retrievedAt: "yesterday",
    };
    expect(checkSourceEvidence(invalid).missing).toEqual([
      "datasetUrl", "termsUrl", "sha256", "retrievedAt", "yearMeaning",
    ]);
  });
  it("does not mutate the supplied manifest", () => {
    const before = JSON.stringify(complete);
    checkSourceEvidence(complete);
    expect(JSON.stringify(complete)).toBe(before);
  });
});
