import { supabase } from "./supabase";
import type { CreateOrderInput, Order, OrderRepository, OrderStatus, Quote } from "./types";

type OrderRow = {
  id: string; status: OrderStatus; area: string; shopping_list: unknown; note: string | null;
  total: number | null; vendor_id: string | null; rider_id: string | null; created_at: string;
  customer: { full_name: string; phone: string | null } | null;
  vendor: { full_name: string } | null;
  rider: { full_name: string } | null;
};

const requireClient = () => {
  if (!supabase) throw new Error("Supabase environment variables are not configured.");
  return supabase;
};

const mapOrder = (row: OrderRow): Order => ({
  id: row.id.slice(0, 8).toUpperCase(),
  customerName: row.customer?.full_name ?? "Customer",
  customerPhone: row.customer?.phone ?? "",
  items: Array.isArray(row.shopping_list) ? row.shopping_list.map(String) : [],
  area: row.area,
  status: row.status,
  total: row.total ?? undefined,
  vendor: row.vendor?.full_name,
  rider: row.rider?.full_name,
  createdAt: new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.created_at)),
  note: row.note ?? undefined
});

export const supabaseOrderRepository: OrderRepository = {
  async listOrders() {
    const client = requireClient();
    const { data, error } = await client.from("orders").select("id,status,area,shopping_list,note,total,created_at,customer:profiles!orders_customer_id_fkey(full_name,phone),vendor:profiles!orders_vendor_id_fkey(full_name),rider:profiles!orders_rider_id_fkey(full_name)").order("created_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as OrderRow[]).map(mapOrder);
  },
  async getOrder(id) {
    const client = requireClient();
    const { data, error } = await client.from("orders").select("id,status,area,shopping_list,note,total,created_at,customer:profiles!orders_customer_id_fkey(full_name,phone),vendor:profiles!orders_vendor_id_fkey(full_name),rider:profiles!orders_rider_id_fkey(full_name)").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapOrder(data as unknown as OrderRow) : undefined;
  },
  async createOrder(input: CreateOrderInput) {
    const client = requireClient();
    const { data: session } = await client.auth.getUser();
    if (!session.user) throw new Error("Sign in is required before placing an order.");
    const { data, error } = await client.from("orders").insert({ customer_id: session.user.id, area: input.area, shopping_list: input.items, note: input.note }).select("id,status,area,shopping_list,note,total,created_at,customer:profiles!orders_customer_id_fkey(full_name,phone),vendor:profiles!orders_vendor_id_fkey(full_name),rider:profiles!orders_rider_id_fkey(full_name)").single();
    if (error) throw error;
    return mapOrder(data as unknown as OrderRow);
  },
  async updateStatus(id, status) {
    const client = requireClient();
    const { data, error } = await client.from("orders").update({ status }).eq("id", id).select("id,status,area,shopping_list,note,total,created_at,customer:profiles!orders_customer_id_fkey(full_name,phone),vendor:profiles!orders_vendor_id_fkey(full_name),rider:profiles!orders_rider_id_fkey(full_name)").single();
    if (error) throw error;
    return mapOrder(data as unknown as OrderRow);
  },
  async assignRider(id, rider) {
    throw new Error(`Rider assignment for ${id} requires an authenticated admin profile. Real admin controls are the next workflow step.`);
  },
  async listQuotes(orderId) {
    const client = requireClient();
    let query = client.from("vendor_quotes").select("id,order_id,amount,note,status,vendor:profiles!vendor_quotes_vendor_id_fkey(full_name)");
    if (orderId) query = query.eq("order_id", orderId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((quote: any): Quote => ({ id: quote.id, orderId: quote.order_id, amount: quote.amount, note: quote.note ?? "", status: quote.status, vendor: quote.vendor?.full_name ?? "Vendor" }));
  }
};
