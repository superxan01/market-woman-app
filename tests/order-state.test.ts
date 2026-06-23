import { describe, expect, it } from "vitest";
import { canTransition, customerTrackingStages, statusLabel, trackingStageIndex } from "../lib/order-state";

describe("order lifecycle", () => {
  it("allows the normal customer-to-delivery path", () => {
    expect(canTransition("requested", "quoted")).toBe(true);
    expect(canTransition("quoted", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "assigned")).toBe(true);
    expect(canTransition("assigned", "picked_up")).toBe(true);
    expect(canTransition("picked_up", "delivered")).toBe(true);
  });
  it("rejects invalid jumps and terminal transitions", () => {
    expect(canTransition("requested", "delivered")).toBe(false);
    expect(canTransition("delivered", "requested")).toBe(false);
    expect(statusLabel("assigned")).toBe("Rider assigned");
  });
  it("keeps cancellation available until delivery and blocks it afterwards", () => {
    expect(canTransition("requested", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("assigned", "cancelled")).toBe(true);
    expect(canTransition("picked_up", "cancelled")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
  });
  it("maps customer tracking to the expected delivery milestones", () => {
    expect(customerTrackingStages).toEqual(["requested", "confirmed", "assigned", "picked_up", "delivered"]);
    expect(trackingStageIndex("requested")).toBe(0);
    expect(trackingStageIndex("delivered")).toBe(4);
    expect(trackingStageIndex("cancelled")).toBe(0);
  });
});
