import { canTransition } from "./order-state";
import type { CreateOrderInput, Order, OrderRepository, OrderStatus, Quote, TeamMember, UserRole } from "./types";

let orders: Order[] = [
  { id: "MW-2048", customerName: "Amara Okafor", customerPhone: "0803 555 0198", items: ["Tomatoes × 2 baskets", "Fresh pepper × 1 bag", "Plantain × 2 hands"], area: "Yaba", status: "requested", createdAt: "Today, 09:42", note: "Please choose firm plantain." },
  { id: "MW-2047", customerName: "Tunde Bello", customerPhone: "0802 765 0132", items: ["Rice 5kg", "Beans 2kg", "Palm oil 1L"], area: "Surulere", status: "quoted", total: 24800, vendor: "Kemi's Provisions", createdAt: "Today, 08:16" },
  { id: "MW-2046", customerName: "Ngozi Adeyemi", customerPhone: "0814 220 7011", items: ["Ugu × 4 bunches", "Catfish × 2", "Onions 1kg"], area: "Lekki", status: "assigned", total: 18300, vendor: "Mama Chidinma", rider: "Seyi A.", createdAt: "Yesterday" },
  { id: "MW-2045", customerName: "Folarin James", customerPhone: "0903 800 4420", items: ["Yam × 1 tuber", "Eggs × 1 crate"], area: "Ikeja", status: "picked_up", total: 14200, vendor: "Aunty Bisi Foods", rider: "Seyi A.", createdAt: "Yesterday" }
];
const quotes: Quote[] = [
  { id: "QT-101", orderId: "MW-2047", vendor: "Kemi's Provisions", amount: 24800, note: "All items fresh and available.", status: "pending" },
  { id: "QT-102", orderId: "MW-2048", vendor: "Mama Chidinma", amount: 16500, note: "Can substitute out-of-season pepper if needed.", status: "pending" }
];
let team: TeamMember[] = [
  { id: "admin", fullName: "Marketplace Owner", role: "super_admin", createdAt: "Today" },
  { id: "seyi-a", fullName: "Seyi A.", role: "rider", createdAt: "Today" },
  { id: "mama-chidinma", fullName: "Mama Chidinma", role: "vendor", createdAt: "Today" }
];
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export const mockOrderRepository: OrderRepository = {
  async listOrders() { return copy(orders); },
  async getOrder(id) { const order = orders.find((item) => item.id === id); return order ? copy(order) : undefined; },
  async createOrder(input: CreateOrderInput) { const order: Order = { id: `MW-${2050 + orders.length}`, ...input, status: "requested", createdAt: "Just now" }; orders = [order, ...orders]; return copy(order); },
  async updateStatus(id, status) { const order = orders.find((item) => item.id === id); if (!order) throw new Error("Order not found"); if (!canTransition(order.status, status)) throw new Error(`Cannot move ${order.id} from ${order.status} to ${status}`); order.status = status; return copy(order); },
  async listRiders() { return [{ id: "seyi-a", fullName: "Seyi A." }]; },
  async listVendors() { return [{ id: "mama-chidinma", fullName: "Mama Chidinma" }]; },
  async assignRider(id, riderId) { const order = orders.find((item) => item.id === id); if (!order) throw new Error("Order not found"); if (order.status !== "confirmed") throw new Error("Only confirmed orders can be assigned"); order.rider = riderId === "seyi-a" ? "Seyi A." : "Assigned rider"; order.status = "assigned"; return copy(order); },
  async assignVendor(id, vendorId) { const order = orders.find((item) => item.id === id); if (!order) throw new Error("Order not found"); order.vendor = vendorId === "mama-chidinma" ? "Mama Chidinma" : "Assigned vendor"; order.vendorId = vendorId; return copy(order); },
  async listQuotes(orderId) { return copy(orderId ? quotes.filter((quote) => quote.orderId === orderId) : quotes); },
  async createQuote({ orderId, amount, note }) { const quote: Quote = { id: `QT-${103 + quotes.length}`, orderId, amount, note: note ?? "", status: "pending", vendor: "Mama Chidinma" }; quotes.push(quote); return copy(quote); },
  async listTeamMembers() { return copy(team); },
  async updateProfileRole(id, role) { const member = team.find((item) => item.id === id); if (!member) throw new Error("User not found"); member.role = role as UserRole; return copy(member); }
};
