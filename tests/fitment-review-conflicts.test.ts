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

  it("does not modify the input", () => {
    const batch = [review, { ...review, decision: "rejected" }];
    const snapshot = JSON.stringify(batch);
    inspectFitmentReviewBatch(batch);
    expect(JSON.stringify(batch)).toBe(snapshot);
  });
});
