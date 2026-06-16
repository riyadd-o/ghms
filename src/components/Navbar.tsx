"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    <header className="sticky top-0 z-50 w-full border-b border-luxury-gold/15 bg-luxury-green/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-4 group">
          <Image
            src="/chef-logo.png"
            alt="Chef Logo"
            width={70}
            height={70}
            className="object-contain h-[65px] w-auto"
            priority
          />
          <div className="flex flex-col justify-center">
            <span className="font-rampart text-2xl tracking-[0.1em] transition-colors duration-300">
              <span
                style={{
                  background: 'linear-gradient(to right, #FFFFFF, #D4AF37)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Golden Hotel
              </span>
            </span>
            <span className="text-[9px] font-sans tracking-[0.25em] text-luxury-gold/80 uppercase mt-0.5">
              EXQUISITE CUISINE,amp; SEAMLESS SERVICE
            </span>
          </div>
        </Link>

        {/* Cart Icon */}
        <div className="flex items-center gap-4">
          <Link
            href="/cart"
            prefetch={true}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-luxury-gold/20 bg-luxury-green-secondary/80 text-gray-300 transition-all duration-300 hover:border-luxury-gold hover:text-luxury-gold hover:shadow-[0_0_8px_rgba(201,168,76,0.2)]"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-luxury-gold text-[10px] font-bold text-luxury-green animate-pulse">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
