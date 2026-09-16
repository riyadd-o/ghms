import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MenuItem, OrderType } from "@/types";

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface DeliveryInfo {
  name: string;
  phone: string;
  address: string;
  area: string;
  details: string;
  addressDetails?: string;
  notes: string;
}

interface StoreState {
  // Cart State
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity: number) => void;
  removeFromCart: (itemId: number) => void;
  updateCartQuantity: (itemId: number, quantity: number) => void;
  specialInstructions: string;
  setSpecialInstructions: (text: string) => void;
  clearCart: () => void;

  // Order Type & Location State
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  hasChosenOrderType: boolean;
  setHasChosenOrderType: (chosen: boolean) => void;

  hotelLocation: {
    type: "Table" | "Room";
    number: string;
  };
  setHotelLocation: (loc: { type: "Table" | "Room"; number: string }) => void;

  deliveryInfo: DeliveryInfo;
  setDeliveryInfo: (info: Partial<DeliveryInfo>) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Cart State
      cart: [],
      addToCart: (item, quantity) => {
        if (quantity <= 0) return;
        const cleanItem: MenuItem = {
          ...item,
          price: Number(item.price),
          image: item.image && !item.image.startsWith("data:") ? item.image : (item.image_url || undefined),
        };
        set((state) => {
          const existing = state.cart.find((c) => c.item.id === cleanItem.id);
          if (existing) {
            return {
              cart: state.cart.map((c) =>
                c.item.id === cleanItem.id ? { ...c, quantity: c.quantity + quantity } : c
              ),
            };
          }
          return { cart: [...state.cart, { item: cleanItem, quantity }] };
        });
      },
      removeFromCart: (itemId) =>
        set((state) => ({
          cart: state.cart.filter((c) => c.item.id !== itemId),
        })),
      updateCartQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(itemId);
          return;
        }
        set((state) => ({
          cart: state.cart.map((c) => (c.item.id === itemId ? { ...c, quantity } : c)),
        }));
      },
      specialInstructions: "",
      setSpecialInstructions: (text) => set({ specialInstructions: text }),
      clearCart: () =>
        set({
          cart: [],
          specialInstructions: "",
          deliveryInfo: {
            name: "",
            phone: "",
            address: "",
            area: "",
            details: "",
            notes: "",
          },
        }),

      // Order Type & Location Defaults
      orderType: "HOTEL",
      setOrderType: (type) => set({ orderType: type, hasChosenOrderType: true }),
      hasChosenOrderType: false,
      setHasChosenOrderType: (chosen) => set({ hasChosenOrderType: chosen }),

      hotelLocation: {
        type: "Table",
        number: "",
      },
      setHotelLocation: (loc) => set({ hotelLocation: loc }),

      deliveryInfo: {
        name: "",
        phone: "",
        address: "",
        area: "",
        details: "",
        notes: "",
      },
      setDeliveryInfo: (info) =>
        set((state) => ({
          deliveryInfo: { ...state.deliveryInfo, ...info },
        })),
    }),
    {
      name: "golden-hotel-cart-v5",
      partialize: (state) => ({
        cart: state.cart.map((c) => ({
          quantity: c.quantity,
          item: {
            id: c.item.id,
            name: c.item.name,
            description: c.item.description || "",
            price: Number(c.item.price),
            category: c.item.category,
            category_id: c.item.category_id,
            image_url: c.item.image_url,
            image: c.item.image && !c.item.image.startsWith("data:") ? c.item.image : (c.item.image_url || undefined),
            available: c.item.available,
          },
        })),
        specialInstructions: state.specialInstructions,
        orderType: state.orderType,
        hasChosenOrderType: state.hasChosenOrderType,
        hotelLocation: state.hotelLocation,
      }),
    }
  )
);
