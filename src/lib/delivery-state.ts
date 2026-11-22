/**
 * Pure, non-persistent delivery workflow contract.
 * No payment/COD settlement, database mutation, or courier dispatch occurs here.
 * Caller must enforce authentication, ownership, and evidence authorization.
 */
export type DeliveryStatus =
  "awaiting_dispatch" | "assigned" | "in_transit" | "delivered" | "failed" | "cancelled";

export type DeliveryEvent =
  | { type: "assign"; courierId: string }
  | { type: "pickup" }
  | { type: "confirm_delivery"; proofReference: string }
  | { type: "report_failure"; reason: string }
  | { type: "cancel"; reason: string };

export type DeliverySnapshot = Readonly<{
  status: DeliveryStatus;
  courierId: string | null;
  proofReference: string | null;
  failureReason: string | null;
}>;

export const initialDeliverySnapshot: DeliverySnapshot = {
  status: "awaiting_dispatch",
  courierId: null,
  proofReference: null,
  failureReason: null,
};

function requiredText(value: string, field: string): string {
  const trimmed = value.trim();
  // Reject invisible and bidi formatting controls in audit-facing identifiers and reasons.
  if (/[\u061C\u200B\u200E-\u200F\u2060\u202A-\u202E\u2066-\u2069\uFEFF]/u.test(trimmed))
    throw new Error(`Invalid ${field}`);
  if (
    !trimmed ||
    trimmed.length > 500 ||
    Array.from(trimmed).some((char) => {
      const code = char.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  )
    throw new Error(`Invalid ${field}`);
  return trimmed;
}

/** Returns a new snapshot, or throws for an invalid transition. */
export function transitionDelivery(
  current: DeliverySnapshot,
  event: DeliveryEvent,
): DeliverySnapshot {
  switch (event.type) {
    case "assign":
      if (current.status !== "awaiting_dispatch") break;
      return {
        status: "assigned",
        courierId: requiredText(event.courierId, "courierId"),
        proofReference: null,
        failureReason: null,
      };
    case "pickup":
      if (current.status !== "assigned" || !current.courierId) break;
      return { ...current, status: "in_transit" };
    case "confirm_delivery":
      if (current.status !== "in_transit" || !current.courierId) break;
      return {
        ...current,
        status: "delivered",
        proofReference: requiredText(event.proofReference, "proofReference"),
      };
    case "report_failure":
      if (current.status !== "assigned" && current.status !== "in_transit") break;
      return {
        ...current,
        status: "failed",
        failureReason: requiredText(event.reason, "reason"),
      };
    case "cancel":
      if (current.status !== "awaiting_dispatch" && current.status !== "assigned") break;
      return {
        ...current,
        status: "cancelled",
        failureReason: requiredText(event.reason, "reason"),
      };
  }
  throw new Error(`Invalid delivery transition: ${current.status} -> ${event.type}`);
}
