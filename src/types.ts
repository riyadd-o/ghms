// Shared types used across API routes and frontend

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string; // category name (from JOIN)
  category_id: number | null;
  image: string; // image_base64 or URL
  available: boolean;
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

export interface Order {
  id: number;
  delivery_location: string;
  special_instructions: string;
  total_amount: number;
  status: "new" | "in-progress" | "delivered";
  created_at: string;
  items: OrderItem[];
}

export interface Category {
  id: number;
  name: string;
  created_at: string;
}
