"use client";

import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import { Hotel, Bike, X } from "lucide-react";
import { OrderType } from "@/types";

interface OrderTypeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  forceOpen?: boolean;
}

export default function OrderTypeModal({ isOpen, onClose, forceOpen = false }: OrderTypeModalProps) {
  const searchParams = useSearchParams();
  const { orderType, setOrderType, hasChosenOrderType, setHasChosenOrderType } = useStore();

  // Inspect URL parameters for QR or deep link context
  useEffect(() => {
    const typeParam = searchParams.get("type");
    const tableParam = searchParams.get("table");
    const roomParam = searchParams.get("room");
    const qrParam = searchParams.get("qr");

    if (tableParam || roomParam || typeParam === "hotel" || qrParam) {
      setOrderType("HOTEL");
      setHasChosenOrderType(true);
    } else if (typeParam === "delivery") {
      setOrderType("DELIVERY");
      setHasChosenOrderType(true);
    }
  }, [searchParams, setOrderType, setHasChosenOrderType]);

  // Determine whether modal should be visible: only when explicitly set to open
  const shouldShow = forceOpen || Boolean(isOpen);

  if (!shouldShow) return null;

  const handleSelect = (type: OrderType) => {
    setOrderType(type);
    setHasChosenOrderType(true);
    if (onClose) onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        // Close if clicked on the backdrop
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-luxury-gold/30 bg-[#09170f] p-6 text-center shadow-2xl">
        {/* Close button always available */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Brand Accent */}
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-luxury-gold/15 border border-luxury-gold/30 text-luxury-gold">
          <span className="font-serif text-xl font-bold">GH</span>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-luxury-gold mb-1">
          Golden Hotel Dining
        </p>
        <h2 className="font-serif text-2xl font-bold text-white mb-2">
          How would you like to order?
        </h2>
        <p className="text-xs text-gray-400 mb-6 max-w-xs mx-auto leading-relaxed">
          Please select your preferred dining option to view our personalized menu and delivery options.
        </p>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {/* Hotel Option */}
          <button
            type="button"
            onClick={() => handleSelect("HOTEL")}
            className={`flex flex-col items-center justify-center p-5 rounded-xl border transition-all text-center group ${
              orderType === "HOTEL" && hasChosenOrderType
                ? "border-luxury-gold bg-luxury-gold/15 ring-1 ring-luxury-gold/50 shadow-[0_0_20px_rgba(201,168,76,0.15)]"
                : "border-luxury-gold/20 bg-[#0c2217] hover:border-luxury-gold/50 hover:bg-[#0f2a1c]"
            }`}
          >
            <div className="mb-3 rounded-full bg-luxury-gold/10 p-3 text-luxury-gold group-hover:scale-110 transition-transform">
              <Hotel className="h-6 w-6" />
            </div>
            <span className="font-serif text-base font-bold text-white mb-1">
              At the Hotel
            </span>
            <span className="text-[11px] text-gray-400 leading-snug">
              Order to your table or room
            </span>
          </button>

          {/* Home Delivery Option */}
          <button
            type="button"
            onClick={() => handleSelect("DELIVERY")}
            className={`flex flex-col items-center justify-center p-5 rounded-xl border transition-all text-center group ${
              orderType === "DELIVERY" && hasChosenOrderType
                ? "border-luxury-gold bg-luxury-gold/15 ring-1 ring-luxury-gold/50 shadow-[0_0_20px_rgba(201,168,76,0.15)]"
                : "border-luxury-gold/20 bg-[#0c2217] hover:border-luxury-gold/50 hover:bg-[#0f2a1c]"
            }`}
          >
            <div className="mb-3 rounded-full bg-luxury-gold/10 p-3 text-luxury-gold group-hover:scale-110 transition-transform">
              <Bike className="h-6 w-6" />
            </div>
            <span className="font-serif text-base font-bold text-white mb-1">
              Home Delivery
            </span>
            <span className="text-[11px] text-gray-400 leading-snug">
              Order food to your location
            </span>
          </button>
        </div>

        <div className="mt-5 pt-3 border-t border-luxury-gold/10 flex flex-col items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-luxury-gold hover:underline hover:text-white transition-colors py-1 px-3 rounded"
            >
              Continue Browsing Menu
            </button>
          )}
          <p className="text-[10px] text-gray-500">
            You can change your dining preference anytime during your visit.
          </p>
        </div>
      </div>
    </div>
  );
}
