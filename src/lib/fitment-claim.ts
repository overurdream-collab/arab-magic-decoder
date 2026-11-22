import { checkSourceEvidence } from "./source-evidence";
import type { SourceEvidence } from "./source-evidence";

/**
 * Offline fitment-claim intake only. Passing this gate is NOT a verified match,
 * publication approval, or permission to import supplier data.
 */
export type FitmentClaim = {
  partId: string;
  vehicleId: string;
  source: SourceEvidence;
  sourceRecordId: string;
  claimedFit: "fits" | "does_not_fit";
};

export function checkFitmentClaim(value: unknown): {
  readyForHumanReview: boolean;
  missing: string[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { readyForHumanReview: false, missing: ["fitment claim object"] };
  }
  const claim = value as Record<string, unknown>;
  const missing: string[] = [];
  const safeId = (key: string) =>
    typeof claim[key] === "string" &&
    claim[key].length > 0 &&
    claim[key].length <= 128 &&
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(claim[key]);
  for (const key of ["partId", "vehicleId", "sourceRecordId"]) {
    if (!safeId(key)) missing.push(key);
  }
  if (claim["claimedFit"] !== "fits" && claim["claimedFit"] !== "does_not_fit") {
    missing.push("claimedFit");
  }
  const evidence = checkSourceEvidence(claim["source"]);
  for (const field of evidence.missing) missing.push(`source.${field}`);
  return { readyForHumanReview: missing.length === 0, missing };
}
