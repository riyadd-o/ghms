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

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.item.price) * item.quantity, 0);

  return (
    <div className="fixed bottom-6 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 px-4 md:px-0">
      <div className="flex items-center justify-between gap-4 rounded-full border border-luxury-gold bg-luxury-black/90 p-2 pl-6 shadow-[0_10px_35px_rgba(201,168,76,0.2)] backdrop-blur-md">
        {/* Cart Info */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-luxury-gold text-luxury-black">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-luxury-black border border-luxury-black">
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

        {/* Action Link */}
        <Link
          href="/cart"
          prefetch={true}
          className="flex items-center gap-2 rounded-full bg-luxury-gold px-6 py-3 text-xs font-semibold tracking-widest text-luxury-black uppercase transition-all duration-300 hover:bg-luxury-gold-hover hover:shadow-[0_0_15px_rgba(201,168,76,0.3)]"
        >
          <span>View Cart</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
