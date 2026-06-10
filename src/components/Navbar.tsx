"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import { ShoppingCart } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const cart = useStore((state) => state.cart);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  const totalItems = mounted ? cart.reduce((sum, item) => sum + item.quantity, 0) : 0;

  // Hide navbar entirely on staff pages (kitchen, admin, qr, staff-login)
  const staffPages = ["/kitchen", "/admin", "/qr", "/staff-login"];
  const isStaffPage = staffPages.some((p) => pathname.startsWith(p));
  if (isStaffPage) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-luxury-gold/15 bg-luxury-black/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#C9A84C] bg-[#0A0A0A] transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(201,168,76,0.3)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 8.5C15 7 13.5 6 12 6C8.5 6 6 8.5 6 12C6 15.5 8.5 18 12 18C14 18 15.5 16.8 16.2 15H12" stroke="#C9A84C" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="7" y1="21" x2="17" y2="21" stroke="#C9A84C" strokeWidth="0.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xl font-bold tracking-widest text-white group-hover:text-luxury-gold transition-colors duration-300">
              𝒢𝑜𝓁𝒹𝑒𝓃 𝐻𝑜𝓉𝑒𝓁
            </span>
            <span className="text-[9px] font-sans tracking-[0.25em] text-luxury-gold/80 uppercase">
              Restaurant &amp; Room Service
            </span>
          </div>
        </Link>

        {/* Cart Icon */}
        <div className="flex items-center gap-4">
          <Link
            href="/cart"
            prefetch={true}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-luxury-gold/20 bg-luxury-charcoal/80 text-gray-300 transition-all duration-300 hover:border-luxury-gold hover:text-luxury-gold hover:shadow-[0_0_8px_rgba(201,168,76,0.2)]"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-luxury-gold text-[10px] font-bold text-luxury-black animate-pulse">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
