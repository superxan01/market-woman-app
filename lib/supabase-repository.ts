import { supabase } from "./supabase";
import type { CreateOrderInput, Order, OrderRepository, OrderStatus, Quote, Rider, TeamMember, UserRole } from "./types";

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
  id: row.id,
  customerName: row.customer?.full_name ?? "Customer",
  customerPhone: row.customer?.phone ?? "",
  items: Array.isArray(row.shopping_list) ? row.shopping_list.map(String) : [],
  area: row.area,
  status: row.status,
  total: row.total ?? undefined,
  vendor: row.vendor?.full_name,
  vendorId: row.vendor_id ?? undefined,
  rider: row.rider?.full_name,
  riderId: row.rider_id ?? undefined,
  createdAt: new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.created_at)),
  note: row.note ?? undefined
});

export const supabaseOrderRepository: OrderRepository = {
  async listOrders() {
    const client = requireClient();
    const { data, error } = await client.from("orders").select("id,status,area,shopping_list,note,total,vendor_id,rider_id,created_at,customer:profiles!orders_customer_id_fkey(full_name,phone),vendor:profiles!orders_vendor_id_fkey(full_name),rider:profiles!orders_rider_id_fkey(full_name)").order("created_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as OrderRow[]).map(mapOrder);
  },
  async getOrder(id) {
    const client = requireClient();
    const { data, error } = await client.from("orders").select("id,status,area,shopping_list,note,total,vendor_id,rider_id,created_at,customer:profiles!orders_customer_id_fkey(full_name,phone),vendor:profiles!orders_vendor_id_fkey(full_name),rider:profiles!orders_rider_id_fkey(full_name)").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapOrder(data as unknown as OrderRow) : undefined;
  },
  async createOrder(input: CreateOrderInput) {
    const client = requireClient();
    const { data: session } = await client.auth.getUser();
    if (!session.user) throw new Error("Sign in is required before placing an order.");
    const { data, error } = await client.from("orders").insert({ customer_id: session.user.id, area: input.area, shopping_list: input.items, note: input.note }).select("id,status,area,shopping_list,note,total,vendor_id,rider_id,created_at,customer:profiles!orders_customer_id_fkey(full_name,phone),vendor:profiles!orders_vendor_id_fkey(full_name),rider:profiles!orders_rider_id_fkey(full_name)").single();
    if (error) throw error;
    return mapOrder(data as unknown as OrderRow);
  },
  async updateStatus(id, status) {
    const client = requireClient();
    const { data, error } = await client.from("orders").update({ status }).eq("id", id).select("id,status,area,shopping_list,note,total,vendor_id,rider_id,created_at,customer:profiles!orders_customer_id_fkey(full_name,phone),vendor:profiles!orders_vendor_id_fkey(full_name),rider:profiles!orders_rider_id_fkey(full_name)").single();
    if (error) throw error;
    return mapOrder(data as unknown as OrderRow);
  },
  async listRiders() {
    const client = requireClient();
    const { data, error } = await client.from("profiles").select("id,full_name").eq("role", "rider").order("full_name");
    if (error) throw error;
    return (data ?? []).map((rider): Rider => ({ id: rider.id, fullName: rider.full_name }));
  },
  async listVendors() {
    const client = requireClient();
    const { data, error } = await client.from("profiles").select("id,full_name").eq("role", "vendor").order("full_name");
    if (error) throw error;
    return (data ?? []).map((vendor): Rider => ({ id: vendor.id, fullName: vendor.full_name }));
  },
  async assignRider(id, riderId) {
    const client = requireClient();
    const { data, error } = await client.from("orders").update({ rider_id: riderId, status: "assigned" }).eq("id", id).select("id,status,area,shopping_list,note,total,vendor_id,rider_id,created_at,customer:profiles!orders_customer_id_fkey(full_name,phone),vendor:profiles!orders_vendor_id_fkey(full_name),rider:profiles!orders_rider_id_fkey(full_name)").single();
    if (error) throw error;
    return mapOrder(data as unknown as OrderRow);
  },
  async assignVendor(id, vendorId) {
    const client = requireClient();
    const { data, error } = await client.from("orders").update({ vendor_id: vendorId }).eq("id", id).select("id,status,area,shopping_list,note,total,vendor_id,rider_id,created_at,customer:profiles!orders_customer_id_fkey(full_name,phone),vendor:profiles!orders_vendor_id_fkey(full_name),rider:profiles!orders_rider_id_fkey(full_name)").single();
    if (error) throw error;
    return mapOrder(data as unknown as OrderRow);
  },
  async listQuotes(orderId) {
    const client = requireClient();
    let query = client.from("vendor_quotes").select("id,order_id,amount,note,status,vendor:profiles!vendor_quotes_vendor_id_fkey(full_name)");
    if (orderId) query = query.eq("order_id", orderId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((quote: any): Quote => ({ id: quote.id, orderId: quote.order_id, amount: quote.amount, note: quote.note ?? "", status: quote.status, vendor: quote.vendor?.full_name ?? "Vendor" }));
  },
  async createQuote({ orderId, amount, note }) {
    const client = requireClient();
    const { data: session } = await client.auth.getUser();
    if (!session.user) throw new Error("Sign in is required before submitting a quote.");
    const { data, error } = await client.from("vendor_quotes").insert({ order_id: orderId, vendor_id: session.user.id, amount, note }).select("id,order_id,amount,note,status,vendor:profiles!vendor_quotes_vendor_id_fkey(full_name)").single();
    if (error) throw error;
    const vendor = Array.isArray(data.vendor) ? data.vendor[0] : data.vendor;
    return { id: data.id, orderId: data.order_id, amount: data.amount, note: data.note ?? "", status: data.status, vendor: vendor?.full_name ?? "Vendor" };
  },
  async acceptQuote(quoteId) {
    const client = requireClient();
    const { data, error } = await client.rpc("accept_vendor_quote", { quote_id: quoteId });
    if (error) throw error;
    const order = await supabaseOrderRepository.getOrder(data as string);
    if (!order) throw new Error("The accepted order could not be loaded.");
    return order;
  },
  async listTeamMembers() {
    const client = requireClient();
    const { data, error } = await client.from("profiles").select("id,full_name,phone,role,created_at").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((member): TeamMember => ({ id: member.id, fullName: member.full_name, phone: member.phone ?? undefined, role: member.role as UserRole, createdAt: new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(member.created_at)) }));
  },
  async updateProfileRole(id, role) {
    const client = requireClient();
    const { data, error } = await client.from("profiles").update({ role }).eq("id", id).select("id,full_name,phone,role,created_at").single();
    if (error) throw error;
    return { id: data.id, fullName: data.full_name, phone: data.phone ?? undefined, role: data.role as UserRole, createdAt: new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(data.created_at)) };
  }
};
