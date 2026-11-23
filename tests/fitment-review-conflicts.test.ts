import { describe, expect, it } from "bun:test";
import { inspectFitmentReviewBatch } from "../src/lib/fitment-review-conflicts";

const source = {
  datasetUrl: "https://example.org/dataset.csv",
  version: "2026-11",
  termsUrl: "https://example.org/terms",
  attribution: "Example agency",
  retrievedAt: "2026-11-17T00:00:00Z",
  sha256: "a".repeat(64),
  yearMeaning: "model_year" as const,
  rightsReviewed: true,
  reviewedBy: "reviewer-1",
};

const review = {
  reviewerId: "reviewer-1",
  decision: "approved",
  reason: "Source and part identifiers reviewed.",
  reviewedAt: "2026-11-23T00:00:00Z",
  claim: {
    partId: "OEM-123",
    vehicleId: "make:model:2026",
    sourceRecordId: "row-42",
    claimedFit: "fits",
    source,
  },
};

describe("offline fitment review conflict detection", () => {
  it("accepts a single complete record without granting publication", () => {
    expect(inspectFitmentReviewBatch([review])).toEqual({
      readyForManualReconciliation: true,
      issues: [],
    });
  });

  it("flags contradictory decisions about the same sourced claim", () => {
    const conflicting = { ...review, decision: "rejected", reviewerId: "reviewer-2" };
    expect(inspectFitmentReviewBatch([review, conflicting]).issues).toEqual([
      "reviews[1].conflictingDecision",
    ]);
  });

  it("keeps the first valid decision as baseline across alternating decisions", () => {
    const rejected = { ...review, decision: "rejected" };
    expect(inspectFitmentReviewBatch([review, rejected, review, rejected]).issues).toEqual([
      "reviews[1].conflictingDecision",
      "reviews[3].conflictingDecision",
    ]);
    expect(inspectFitmentReviewBatch([rejected, review, rejected]).issues).toEqual([
      "reviews[1].conflictingDecision",
    ]);
  });

  it("flags conflicting claimed fit even when review decisions agree", () => {
    const opposite = {
      ...review,
      claim: { ...review.claim, claimedFit: "does_not_fit" },
    };
    expect(inspectFitmentReviewBatch([review, opposite, review, opposite]).issues).toEqual([
      "reviews[1].conflictingClaimedFit",
      "reviews[3].conflictingClaimedFit",
    ]);
  });

  it("reports both claim and decision contradictions independently", () => {
    const opposite = {
      ...review,
      decision: "rejected",
      claim: { ...review.claim, claimedFit: "does_not_fit" },
    };
    expect(inspectFitmentReviewBatch([review, opposite]).issues).toEqual([
      "reviews[1].conflictingDecision",
      "reviews[1].conflictingClaimedFit",
    ]);
  });

  it("flags different source evidence for the same source record", () => {
    const changedSource = {
      ...review,
      claim: {
        ...review.claim,
        source: { ...source, sha256: "b".repeat(64) },
      },
    };
    expect(inspectFitmentReviewBatch([review, changedSource]).issues).toEqual([
      "reviews[1].conflictingSourceEvidence",
    ]);
  });

  it("preserves the original evidence baseline after repeated conflicting revisions", () => {
    const changed = {
      ...review,
      claim: { ...review.claim, source: { ...source, sha256: "b".repeat(64) } },
    };
    expect(inspectFitmentReviewBatch([review, changed, review, changed]).issues).toEqual([
      "reviews[1].conflictingSourceEvidence",
      "reviews[3].conflictingSourceEvidence",
    ]);
  });

  it("reports evidence, fit, and decision contradictions independently", () => {
    const changed = {
      ...review,
      decision: "rejected",
      claim: {
        ...review.claim,
        claimedFit: "does_not_fit",
        source: { ...source, sha256: "b".repeat(64) },
      },
    };
    expect(inspectFitmentReviewBatch([review, changed]).issues).toEqual([
      "reviews[1].conflictingDecision",
      "reviews[1].conflictingClaimedFit",
      "reviews[1].conflictingSourceEvidence",
    ]);
  });

  it("treats equivalent source evidence with reordered properties as identical", () => {
    const reorderedSource = Object.fromEntries(Object.entries(source).reverse());
    const reorderedReview = {
      ...review,
      claim: { ...review.claim, source: reorderedSource },
    };
    expect(inspectFitmentReviewBatch([review, reorderedReview])).toEqual({
      readyForManualReconciliation: true,
      issues: [],
    });
  });

  it("does not confuse distinct source records or vehicles", () => {
    const other = {
      ...review,
      decision: "rejected",
      claim: { ...review.claim, sourceRecordId: "row-43" },
    };
    expect(inspectFitmentReviewBatch([review, other]).issues).toEqual([]);
  });

  it("rejects invalid review entries with indexed diagnostics", () => {
    expect(inspectFitmentReviewBatch([review, { ...review, reviewerId: "" }]).issues).toEqual([
      "reviews[1].reviewerId",
    ]);
  });

  it("rejects empty, oversized, and non-array batches", () => {
    expect(inspectFitmentReviewBatch([]).issues).toEqual(["reviews"]);
    expect(inspectFitmentReviewBatch(null).issues).toEqual(["reviews"]);
    expect(inspectFitmentReviewBatch(Array(1001).fill(review)).issues).toEqual(["reviews"]);
  });

  it("accepts the documented maximum of 1000 valid reviews", () => {
    const batch = Array.from({ length: 1000 }, (_, index) => ({
      ...review,
      claim: { ...review.claim, sourceRecordId: `row-${index}` },
    }));
    expect(inspectFitmentReviewBatch(batch)).toEqual({
      readyForManualReconciliation: true,
      issues: [],
    });
  });

  it("does not let an invalid first record establish the conflict baseline", () => {
    const invalid = { ...review, reviewerId: "" };
    const rejected = { ...review, decision: "rejected" };
    expect(inspectFitmentReviewBatch([invalid, rejected, review]).issues).toEqual([
      "reviews[0].reviewerId",
      "reviews[2].conflictingDecision",
    ]);
  });

  it("isolates contradictory reviews across different part identifiers", () => {
    const otherPart = {
      ...review,
      decision: "rejected",
      claim: { ...review.claim, partId: "OEM-456" },
    };
    expect(inspectFitmentReviewBatch([review, otherPart])).toEqual({
      readyForManualReconciliation: true,
      issues: [],
    });
  });

  it("does not let invalid source evidence establish a conflict baseline", () => {
    const invalid = {
      ...review,
      claim: { ...review.claim, source: { ...source, sha256: "invalid" } },
    };
    const rejected = { ...review, decision: "rejected" };
    const result = inspectFitmentReviewBatch([invalid, rejected, review]);
    expect(result.readyForManualReconciliation).toBe(false);
    expect(result.issues).toContain("reviews[2].conflictingDecision");
    expect(result.issues.some((issue) => issue.startsWith("reviews[0].claim."))).toBe(true);
  });

  it("does not modify the input", () => {
    const batch = [review, { ...review, decision: "rejected" }];
    const snapshot = JSON.stringify(batch);
    inspectFitmentReviewBatch(batch);
    expect(JSON.stringify(batch)).toBe(snapshot);
  });
});
