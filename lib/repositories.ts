import { mockOrderRepository } from "./mock-repository";
import { supabaseOrderRepository } from "./supabase-repository";
import type { OrderRepository } from "./types";

// Local development can still run without credentials; deployed environments use Supabase.
export const orderRepository: OrderRepository = process.env.NEXT_PUBLIC_SUPABASE_URL ? supabaseOrderRepository : mockOrderRepository;
