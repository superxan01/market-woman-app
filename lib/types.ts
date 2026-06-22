export const roles = ["super_admin", "support_rep", "vendor", "rider", "customer"] as const;
export type UserRole = (typeof roles)[number];
export const isUserRole = (value: string): value is UserRole => roles.includes(value as UserRole);

export const orderStatuses = ["requested", "quoted", "confirmed", "assigned", "picked_up", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export type Order = { id: string; customerName: string; customerPhone: string; items: string[]; area: string; status: OrderStatus; total?: number; vendor?: string; vendorId?: string; rider?: string; riderId?: string; createdAt: string; note?: string };
export type Quote = { id: string; orderId: string; vendor: string; amount: number; note: string; status: "pending" | "accepted" | "declined" };
export type Delivery = { id: string; orderId: string; rider: string; status: Extract<OrderStatus, "assigned" | "picked_up" | "delivered"> };
export type Rider = { id: string; fullName: string };
export type TeamMember = { id: string; fullName: string; phone?: string; role: UserRole; createdAt: string };
export type CreateOrderInput = { customerName: string; customerPhone: string; items: string[]; area: string; note?: string };
export type OrderRepository = {
  listOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  updateStatus(id: string, status: OrderStatus): Promise<Order>;
  listRiders(): Promise<Rider[]>;
  listVendors(): Promise<Rider[]>;
  assignRider(id: string, riderId: string): Promise<Order>;
  assignVendor(id: string, vendorId: string): Promise<Order>;
  listQuotes(orderId?: string): Promise<Quote[]>;
  createQuote(input: { orderId: string; amount: number; note?: string }): Promise<Quote>;
  listTeamMembers(): Promise<TeamMember[]>;
  updateProfileRole(id: string, role: UserRole): Promise<TeamMember>;
};
