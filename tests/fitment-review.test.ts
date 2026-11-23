import { describe, expect, it } from "bun:test";
import { checkFitmentReview } from "../src/lib/fitment-review";

const review = {
  reviewerId: "reviewer-1",
  decision: "approved",
  reason: "Source evidence inspected and identifiers checked.",
  reviewedAt: "2026-11-23T00:00:00Z",
  claim: {
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
  },
};

describe("offline fitment review decision intake", () => {
  it("accepts a complete human decision for recording, not publication", () => {
    expect(checkFitmentReview(review)).toEqual({ readyToRecord: true, missing: [] });
  });
  it("rejects malformed decisions and missing human attribution", () => {
    const result = checkFitmentReview({
      ...review,
      reviewerId: " ",
      decision: "published",
      reason: "short",
      reviewedAt: "2026-02-30T00:00:00Z",
    });
    expect(result.missing).toEqual(["reviewerId", "decision", "reason", "reviewedAt"]);
  });
  it("rejects hidden control characters in reasons", () => {
    expect(
      checkFitmentReview({ ...review, reason: "Reviewed and approved\u202Ehidden" }).missing,
    ).toContain("reason");
  });
  it("rejects bidi markers, line separators and unpaired surrogates in audit reasons", () => {
    const unsafeCharacters = [0x061c, 0x200e, 0x200f, 0x2028, 0x2029, 0xd800, 0xdc00];
    for (const codePoint of unsafeCharacters) {
      const unsafe = String.fromCharCode(codePoint);
      expect(
        checkFitmentReview({ ...review, reason: `Evidence inspected ${unsafe} and checked.` })
          .missing,
      ).toContain("reason");
    }
    expect(
      checkFitmentReview({ ...review, reason: "Evidence inspected 😀 and checked." }).readyToRecord,
    ).toBe(true);
  });
  it("rejects invalid claims even with an approved decision", () => {
    expect(
      checkFitmentReview({ ...review, claim: { ...review.claim, sourceRecordId: "" } }).missing,
    ).toContain("claim.sourceRecordId");
  });
  it("accepts a documented rejection and does not mutate inputs", () => {
    const rejected = { ...review, decision: "rejected" };
    const before = JSON.stringify(rejected);
    expect(checkFitmentReview(rejected).readyToRecord).toBe(true);
    expect(JSON.stringify(rejected)).toBe(before);
    expect(checkFitmentReview(null).missing).toEqual(["review object"]);
  });
});
