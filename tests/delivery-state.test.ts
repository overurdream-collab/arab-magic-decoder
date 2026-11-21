import { describe, expect, test } from "bun:test";
import { initialDeliverySnapshot, transitionDelivery } from "../src/lib/delivery-state";

describe("delivery state contract (pure, no payments)", () => {
  test("requires assignment, pickup and proof before delivered", () => {
    const assigned = transitionDelivery(initialDeliverySnapshot, { type: "assign", courierId: "driver-1" });
    const transit = transitionDelivery(assigned, { type: "pickup" });
    const delivered = transitionDelivery(transit, { type: "confirm_delivery", proofReference: "proof-123" });
    expect(delivered).toEqual({
      status: "delivered",
      courierId: "driver-1",
      proofReference: "proof-123",
      failureReason: null,
    });
    expect(initialDeliverySnapshot.status).toBe("awaiting_dispatch");
  });

  test("rejects skipping states or empty delivery proof", () => {
    expect(() => transitionDelivery(initialDeliverySnapshot, { type: "pickup" })).toThrow();
    expect(() => transitionDelivery(initialDeliverySnapshot, { type: "confirm_delivery", proofReference: "proof" })).toThrow();
    const assigned = transitionDelivery(initialDeliverySnapshot, { type: "assign", courierId: "driver" });
    expect(() => transitionDelivery(assigned, { type: "confirm_delivery", proofReference: "proof" })).toThrow();
    const transit = transitionDelivery(assigned, { type: "pickup" });
    expect(() => transitionDelivery(transit, { type: "confirm_delivery", proofReference: "  " })).toThrow();
  });

  test("keeps terminal states immutable", () => {
    const assigned = transitionDelivery(initialDeliverySnapshot, { type: "assign", courierId: "driver" });
    const failed = transitionDelivery(assigned, { type: "report_failure", reason: "recipient unavailable" });
    expect(() => transitionDelivery(failed, { type: "assign", courierId: "other" })).toThrow();
    const cancelled = transitionDelivery(initialDeliverySnapshot, { type: "cancel", reason: "buyer withdrew" });
    expect(() => transitionDelivery(cancelled, { type: "assign", courierId: "driver" })).toThrow();
    const delivered = transitionDelivery(transitionDelivery(assigned, { type: "pickup" }), { type: "confirm_delivery", proofReference: "proof" });
    expect(() => transitionDelivery(delivered, { type: "cancel", reason: "late" })).toThrow();
  });

  test("validates courier and failure metadata", () => {
    expect(() => transitionDelivery(initialDeliverySnapshot, { type: "assign", courierId: " " })).toThrow();
    const assigned = transitionDelivery(initialDeliverySnapshot, { type: "assign", courierId: "driver" });
    expect(() => transitionDelivery(assigned, { type: "report_failure", reason: "\u0000" })).toThrow();
  });
});
