// Shared types used across API routes and frontend

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string; // category name (from JOIN)
  category_id: number | null;
  image?: string; // image_base64 or URL
  image_url?: string;
  available: boolean;
  sort_order?: number;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  menu_item_id?: number;
}

export type OrderType = "HOTEL" | "DELIVERY";
export type OrderStatus = "new" | "cooking" | "ready" | "out_for_delivery" | "delivered" | "in-progress";
export type PaymentStatus = "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type PaymentMethod = "CASH" | "DIGITAL";
export type PaymentProvider = "CHAPA" | "BIRRPAY" | null;

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: PaymentProvider;
  provider_payment_id?: string | null;
  transaction_id?: string | null;
  checkout_url?: string | null;
  paid_at?: string | null;
  paid_by?: number | null;
  paid_by_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  customer_name?: string | null;
  order_type: OrderType;
  delivery_location?: string | null;
  delivery_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  delivery_area?: string | null;
  delivery_address_details?: string | null;
  delivery_notes?: string | null;
  delivery_fee?: number;
  special_instructions: string;
  total_amount: number;
  status: OrderStatus;
  started_at?: string | null;
  ready_at?: string | null;
  out_for_delivery_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  items: OrderItem[];
  payment?: Payment | null;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
  paid_at?: string | null;
}

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

