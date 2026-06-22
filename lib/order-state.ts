import type { OrderStatus } from "./types";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  requested: ["quoted", "cancelled"], quoted: ["confirmed", "cancelled"], confirmed: ["assigned", "cancelled"], assigned: ["picked_up", "cancelled"], picked_up: ["delivered"], delivered: [], cancelled: []
};
export const canTransition = (from: OrderStatus, to: OrderStatus) => transitions[from].includes(to);
export const statusLabel = (status: OrderStatus) => ({ requested: "New request", quoted: "Quoted", confirmed: "Confirmed", assigned: "Rider assigned", picked_up: "Picked up", delivered: "Delivered", cancelled: "Cancelled" }[status]);

export const customerTrackingStages: Array<Extract<OrderStatus, "requested" | "confirmed" | "assigned" | "picked_up" | "delivered">> = ["requested", "confirmed", "assigned", "picked_up", "delivered"];

export const trackingStageIndex = (status: OrderStatus) => {
  const index = customerTrackingStages.indexOf(status as (typeof customerTrackingStages)[number]);
  return index < 0 ? 0 : index;
};
