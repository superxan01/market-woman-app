import { describe, expect, it } from "vitest";
import { canTransition, statusLabel } from "../lib/order-state";

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
});
