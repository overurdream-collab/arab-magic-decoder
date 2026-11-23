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

const baseline = {
  reviewerId: "reviewer-1",
  decision: "approved",
  reason: "Source provenance was reviewed.",
  reviewedAt: "2026-11-23T00:00:00Z",
  claim: {
    partId: "OEM-123",
    vehicleId: "make:model:2026",
    sourceRecordId: "row-42",
    claimedFit: "fits",
    source,
  },
};

describe("fitment source provenance regressions", () => {
  it("flags changed attribution even when the source checksum is unchanged", () => {
    const changed = {
      ...baseline,
      claim: {
        ...baseline.claim,
        source: { ...source, attribution: "Different agency" },
      },
    };
    expect(inspectFitmentReviewBatch([baseline, changed]).issues).toEqual([
      "reviews[1].conflictingSourceEvidence",
    ]);
  });

  it("does not silently accept an unreviewed source as an alternate baseline", () => {
    const invalid = {
      ...baseline,
      claim: {
        ...baseline.claim,
        source: { ...source, rightsReviewed: false },
      },
    };
    const changed = {
      ...baseline,
      decision: "rejected",
      claim: {
        ...baseline.claim,
        source: { ...source, attribution: "Different agency" },
      },
    };
    const result = inspectFitmentReviewBatch([invalid, baseline, changed]);
    expect(result.readyForManualReconciliation).toBe(false);
    expect(result.issues.some((issue) => issue.startsWith("reviews[0].claim."))).toBe(true);
    expect(result.issues).toContain("reviews[2].conflictingDecision");
    expect(result.issues).toContain("reviews[2].conflictingSourceEvidence");
  });
});
