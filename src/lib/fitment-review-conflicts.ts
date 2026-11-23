import { checkFitmentReview } from "./fitment-review";

/**
 * Offline conflict detection for review intake. A clean batch does NOT authorize
 * publication, change permissions, or persist an audit trail.
 */
export function inspectFitmentReviewBatch(value: unknown): {
  readyForManualReconciliation: boolean;
  issues: string[];
} {
  if (!Array.isArray(value) || value.length === 0 || value.length > 1000) {
    return { readyForManualReconciliation: false, issues: ["reviews"] };
  }

  const issues: string[] = [];
  const decisions = new Map<string, { decision: string; claimedFit: string }>();
  for (const [index, candidate] of value.entries()) {
    const checked = checkFitmentReview(candidate);
    if (!checked.readyToRecord) {
      for (const field of checked.missing) issues.push(`reviews[${index}].${field}`);
      continue;
    }

    const review = candidate as Record<string, unknown>;
    const claim = review["claim"] as Record<string, unknown>;
    const key = JSON.stringify([claim["partId"], claim["vehicleId"], claim["sourceRecordId"]]);
    const decision = review["decision"] as string;
    const claimedFit = claim["claimedFit"] as string;
    const previous = decisions.get(key);
    if (previous !== undefined && previous.decision !== decision) {
      issues.push(`reviews[${index}].conflictingDecision`);
    }
    if (previous !== undefined && previous.claimedFit !== claimedFit) {
      issues.push(`reviews[${index}].conflictingClaimedFit`);
    }
    // Preserve the first valid decision as the reconciliation baseline. A later
    // conflicting entry must not silently redefine it for subsequent records.
    if (previous === undefined) decisions.set(key, { decision, claimedFit });
  }

  return { readyForManualReconciliation: issues.length === 0, issues };
}
