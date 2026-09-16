"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/store/useStore";
import { ShoppingBag, ArrowRight } from "lucide-react";

export default function CartStickyButton() {
  const cart = useStore((state) => state.cart);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || cart.length === 0) return null;

  const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const subtotal = cart.reduce((sum, item) => sum + (Number(item.item.price) || 0) * (Number(item.quantity) || 0), 0);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 px-4 md:px-0 pointer-events-none">
      <Link
        href="/cart"
        prefetch={true}
        id="sticky-view-cart-button"
        className="group pointer-events-auto flex items-center justify-between gap-4 rounded-full border border-luxury-gold bg-luxury-green/95 p-2 pl-6 shadow-[0_10px_35px_rgba(201,168,76,0.25)] backdrop-blur-md cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:border-luxury-gold-hover hover:shadow-[0_10px_40px_rgba(201,168,76,0.35)]"
        aria-label="View Cart"
      >
        {/* Cart Info */}
        <div className="flex items-center gap-3 select-none">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-luxury-gold text-luxury-green transition-transform duration-300 group-hover:scale-105">
            <ShoppingBag className="h-5 w-5 pointer-events-none" />
            <span className="absolute -top-1.5 -right-1.5 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-white text-[9px] font-bold text-luxury-green border border-luxury-green pointer-events-none">
              {totalItems}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-medium tracking-wider text-gray-400 uppercase">
              Your Cart
            </span>
            <span className="font-serif text-sm font-semibold text-white">
              ETB {subtotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Button styling inside the link */}
        <div className="flex items-center gap-2 rounded-full bg-luxury-gold px-6 py-3 text-xs font-semibold tracking-widest text-luxury-green uppercase transition-all duration-300 group-hover:bg-luxury-gold-hover group-hover:shadow-[0_0_15px_rgba(201,168,76,0.3)]">
          <span>View Cart</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </Link>
    </div>
  );
}
