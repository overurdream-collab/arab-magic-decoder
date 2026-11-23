import { checkFitmentClaim } from "./fitment-claim";

/**
 * Offline decision intake only. An accepted decision is NOT permission to
 * publish a fitment, mutate production data, or bypass administrator review.
 */
function hasForbiddenControl(text: string): boolean {
  return Array.from(text).some((char) => {
    const code = char.codePointAt(0)!;
    return (
      code <= 31 ||
      (code >= 127 && code <= 159) ||
      code === 0x200b ||
      (code >= 0x202a && code <= 0x202e) ||
      code === 0x2060 ||
      (code >= 0x2066 && code <= 0x2069) ||
      code === 0xfeff
    );
  });
}

export function checkFitmentReview(value: unknown): {
  readyToRecord: boolean;
  missing: string[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { readyToRecord: false, missing: ["review object"] };
  }
  const review = value as Record<string, unknown>;
  const missing: string[] = [];
  const safeId = (value: unknown) =>
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value);

  if (!safeId(review["reviewerId"])) missing.push("reviewerId");
  if (review["decision"] !== "approved" && review["decision"] !== "rejected") {
    missing.push("decision");
  }
  if (
    typeof review["reason"] !== "string" ||
    review["reason"].trim().length < 10 ||
    review["reason"].length > 1000 ||
    hasForbiddenControl(review["reason"])
  ) {
    missing.push("reason");
  }
  if (
    typeof review["reviewedAt"] !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(review["reviewedAt"]) ||
    !Number.isFinite(Date.parse(review["reviewedAt"])) ||
    new Date(review["reviewedAt"]).toISOString().slice(0, 19) !== review["reviewedAt"].slice(0, 19)
  ) {
    missing.push("reviewedAt");
  }

  const claim = checkFitmentClaim(review["claim"]);
  for (const field of claim.missing) missing.push(`claim.${field}`);
  return { readyToRecord: missing.length === 0, missing };
}
