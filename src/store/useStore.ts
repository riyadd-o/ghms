import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MenuItem } from "@/types";

export interface CartItem {
  item: MenuItem;
  quantity: number;
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
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Cart State
      cart: [],
      addToCart: (item, quantity) => {
        if (quantity <= 0) return;
        set((state) => {
          const existing = state.cart.find((c) => c.item.id === item.id);
          if (existing) {
            return {
              cart: state.cart.map((c) =>
                c.item.id === item.id ? { ...c, quantity: c.quantity + quantity } : c
              ),
            };
          }
          return { cart: [...state.cart, { item, quantity }] };
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
      clearCart: () => set({ cart: [], specialInstructions: "" }),
    }),
    {
      name: "golden-hotel-cart-v3",
    }
  )
);
