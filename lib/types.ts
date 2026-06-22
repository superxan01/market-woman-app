export const roles = ["admin", "vendor", "rider", "customer"] as const;
export type UserRole = (typeof roles)[number];
export const isUserRole = (value: string): value is UserRole => roles.includes(value as UserRole);

export const orderStatuses = ["requested", "quoted", "confirmed", "assigned", "picked_up", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export type Order = { id: string; customerName: string; customerPhone: string; items: string[]; area: string; status: OrderStatus; total?: number; vendor?: string; rider?: string; createdAt: string; note?: string };
export type Quote = { id: string; orderId: string; vendor: string; amount: number; note: string; status: "pending" | "accepted" | "declined" };
export type Delivery = { id: string; orderId: string; rider: string; status: Extract<OrderStatus, "assigned" | "picked_up" | "delivered"> };
export type CreateOrderInput = { customerName: string; customerPhone: string; items: string[]; area: string; note?: string };
export type OrderRepository = { listOrders(): Promise<Order[]>; getOrder(id: string): Promise<Order | undefined>; createOrder(input: CreateOrderInput): Promise<Order>; updateStatus(id: string, status: OrderStatus): Promise<Order>; assignRider(id: string, rider: string): Promise<Order>; listQuotes(orderId?: string): Promise<Quote[]>; };
