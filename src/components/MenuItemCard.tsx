"use client";

import React, { useState } from "react";
import { MenuItem } from "@/types";
import { useStore } from "@/store/useStore";
import { Plus, Minus, ShoppingBag, Check } from "lucide-react";

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const addToCart = useStore((state) => state.addToCart);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const increment = () => setQuantity((q) => q + 1);
  const decrement = () => setQuantity((q) => Math.max(1, q - 1));

  const handleAdd = () => {
    addToCart(item, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleMobileAdd = () => {
    addToCart(item, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-luxury-gold/10 bg-luxury-green-secondary/40 transition-all duration-500 hover:-translate-y-1 hover:border-luxury-gold/30 hover:shadow-[0_8px_30px_rgb(201,168,76,0.05)]">
      {/* Food Image Container */}
      <div className="relative h-36 md:h-56 w-full overflow-hidden">
        {/* Availability overlay */}
        {!item.available && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <span className="font-serif text-xs md:text-sm font-bold tracking-widest text-luxury-gold uppercase border border-luxury-gold/40 px-3 py-1.5 md:px-4 md:py-2">
              Currently Unavailable
            </span>
          </div>
        )}
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-luxury-green/80 transition-transform duration-700 group-hover:scale-105">
            <span className="font-serif text-3xl md:text-5xl text-gray-700 uppercase">
              {item.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-luxury-green via-transparent to-transparent opacity-60" />
      </div>

      {/* Details Container */}
      <div className="flex flex-1 flex-col p-3 md:p-6">
        {/* Mobile layout: name + price stacked */}
        <div className="mb-1 md:mb-2 flex flex-col md:flex-row md:items-start md:justify-between md:gap-4">
          <h3 className="font-serif text-sm md:text-lg font-semibold tracking-wide text-white group-hover:text-luxury-gold transition-colors duration-300 line-clamp-1 md:line-clamp-none">
            {item.name}
          </h3>
          <span className="font-serif text-sm md:text-lg font-bold text-luxury-gold">
            ETB {Number(item.price).toFixed(2)}
          </span>
        </div>

        {/* Description: hidden on mobile, shown on desktop only when non-empty */}
        {item.description && (
          <p className="hidden md:block mb-6 flex-1 text-sm leading-relaxed text-gray-400 line-clamp-3">
            {item.description}
          </p>
        )}
        {/* Spacer for desktop when no description */}
        {!item.description && <div className="hidden md:block mb-6 flex-1" />}

        {/* Action Row */}
        {item.available ? (
          <>
            {/* DESKTOP: full quantity selector + add to cart */}
            <div className="hidden md:flex items-center gap-3 mt-auto">
              {/* Quantity Selector */}
              <div className="flex items-center rounded border border-luxury-gold/20 bg-luxury-green/40">
                <button
                  onClick={decrement}
                  className="flex h-9 w-9 items-center justify-center text-gray-400 hover:text-white transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center text-sm font-medium text-white">
                  {quantity}
                </span>
                <button
                  onClick={increment}
                  className="flex h-9 w-9 items-center justify-center text-gray-400 hover:text-white transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAdd}
                className={`flex flex-1 items-center justify-center gap-2 rounded px-4 py-2.5 text-xs font-semibold tracking-widest uppercase transition-all duration-300 ${
                  added
                    ? "bg-emerald-600 text-white"
                    : "bg-luxury-gold text-luxury-green hover:bg-luxury-gold-hover hover:shadow-[0_0_12px_rgba(201,168,76,0.3)]"
                }`}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            </div>

            {/* MOBILE: compact + button only, no quantity selector */}
            <div className="flex md:hidden mt-auto">
              <button
                onClick={handleMobileAdd}
                className={`flex w-full items-center justify-center gap-1.5 rounded px-3 py-2 text-[10px] font-semibold tracking-widest uppercase transition-all duration-300 ${
                  added
                    ? "bg-emerald-600 text-white"
                    : "bg-luxury-gold text-luxury-green hover:bg-luxury-gold-hover"
                }`}
              >
                {added ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <button
            disabled
            className="w-full rounded border border-gray-800 bg-gray-900/40 py-2 md:py-2.5 text-[10px] md:text-xs font-semibold tracking-widest text-gray-600 uppercase cursor-not-allowed mt-auto"
          >
            Sold Out
          </button>
        )}
      </div>
    </article>
  );
}
