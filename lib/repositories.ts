import { mockOrderRepository } from "./mock-repository";
import type { OrderRepository } from "./types";

// Swap this implementation with SupabaseOrderRepository once env variables are present.
export const orderRepository: OrderRepository = mockOrderRepository;
