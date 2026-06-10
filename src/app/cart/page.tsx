"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import { Order } from "@/types";
import { Plus, Minus, Trash2, ArrowLeft, Clock, CheckCircle } from "lucide-react";
import confetti from "canvas-confetti";

function CartPageContent() {
  const searchParams = useSearchParams();
  const { cart, updateCartQuantity, removeFromCart, specialInstructions, setSpecialInstructions, clearCart } = useStore();

  const [mounted, setMounted] = useState(false);
  const [locationType, setLocationType] = useState<"Table" | "Room">("Table");
  const [locationNumber, setLocationNumber] = useState("");
  const [tableError, setTableError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  useEffect(() => {
    setMounted(true);
  }, [searchParams]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (placedOrder) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/orders/${placedOrder.id}`);
          if (res.ok) {
            const updatedOrder = await res.json();
            setPlacedOrder(updatedOrder);
          }
        } catch (err) {
          console.error("Failed to poll order status:", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [placedOrder?.id]);

  if (!mounted) return null;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.item.price) * item.quantity, 0);
  const total = subtotal;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (!locationNumber.trim()) {
      setTableError("Please enter your table or room number.");
      return;
    }
    setTableError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_location: `${locationType} ${locationNumber}`,
          special_instructions: specialInstructions,
          total_amount: total,
          items: cart.map((c) => ({
            menu_item_id: c.item.id,
            name: c.item.name,
            price: Number(c.item.price),
            quantity: c.quantity,
          })),
        }),
      });

      if (res.ok) {
        const order = await res.json();
        setPlacedOrder(order);
        clearCart();
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#C9A84C", "#FFFFFF", "#111111"] });
      } else {
        setTableError("Failed to place order. Please try again.");
      }
    } catch {
      setTableError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-luxury-black px-6 py-16 text-center">
        <div className="absolute top-1/3 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-luxury-gold/5 blur-[100px]" />
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-luxury-gold bg-luxury-charcoal/50 text-luxury-gold shadow-[0_0_20px_rgba(201,168,76,0.3)]">
          <CheckCircle className="h-10 w-10 animate-bounce" />
        </div>
        <p className="text-[10px] font-semibold tracking-[0.25em] text-luxury-gold uppercase mb-2">Order Placed Successfully</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-light text-white mb-2">Thank You</h1>
        <p className="text-sm text-gray-400 mb-8 max-w-md">Our kitchen has received your order and is preparing it now.</p>

        {/* Status Tracker */}
        <div className="mb-10 w-full max-w-sm relative z-10">
          <div className="absolute left-0 top-4 w-full h-1 bg-luxury-gold/10 -z-10 rounded"></div>
          <div className="absolute left-0 top-4 h-1 bg-luxury-gold -z-10 transition-all duration-500 rounded" style={{ width: placedOrder.status === 'delivered' ? '100%' : placedOrder.status === 'in-progress' ? '50%' : '0%' }}></div>
          <div className="flex justify-between items-start">
            {["new", "in-progress", "delivered"].map((status, index) => {
              const isActive = placedOrder.status === status;
              const isPast = ["new", "in-progress", "delivered"].indexOf(placedOrder.status) >= index;
              return (
                <div key={status} className="flex flex-col items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-luxury-black ${isPast ? 'border-luxury-gold text-luxury-gold' : 'border-gray-700 text-gray-600'} ${isActive ? 'shadow-[0_0_15px_rgba(201,168,76,0.5)] scale-110 bg-luxury-charcoal/80' : ''}`}>
                    {isPast && !isActive ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${isActive ? 'text-luxury-gold' : isPast ? 'text-gray-300' : 'text-gray-600'}`}>
                    {status.replace('-', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-12 w-full max-w-md rounded-lg border border-luxury-gold/15 bg-luxury-charcoal/50 p-6 text-left">
          <div className="flex justify-between border-b border-luxury-gold/10 pb-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Order ID</p>
              <p className="font-serif text-lg font-bold text-white">#{placedOrder.id}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Delivery Location</p>
              <p className="font-serif text-lg font-bold text-luxury-gold">{placedOrder.delivery_location}</p>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Items Ordered</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {placedOrder.items.map((oi, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-300">{oi.name} <span className="text-xs text-luxury-gold">x{oi.quantity}</span></span>
                  <span className="text-gray-400">ETB {(Number(oi.price) * oi.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-luxury-gold/10 pt-4 text-sm text-gray-300">
            <Clock className="h-5 w-5 text-luxury-gold" />
            <div><span className="font-medium">Estimated Delivery:</span><span className="text-luxury-gold ml-1.5 font-bold">15 - 20 minutes</span></div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm justify-center">
          <Link href="/" className="flex items-center justify-center gap-2 rounded px-6 py-3 text-xs font-semibold tracking-widest text-luxury-black bg-luxury-gold uppercase transition-all duration-300 hover:bg-luxury-gold-hover hover:shadow-[0_0_10px_rgba(201,168,76,0.2)]">View Menu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-8">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 hover:text-luxury-gold transition-colors duration-300 uppercase mb-8">
        <ArrowLeft className="h-4 w-4" /><span>Back to Menu</span>
      </Link>
      <h1 className="font-serif text-3xl font-light text-white mb-8">Order <span className="text-gold-gradient font-normal italic">Review</span></h1>
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-luxury-gold/15 rounded-lg bg-luxury-charcoal/10">
          <p className="font-serif text-lg text-gray-500 italic mb-4">Your cart is empty.</p>
          <Link href="/" className="rounded bg-luxury-gold px-6 py-3 text-xs font-semibold tracking-widest text-luxury-black uppercase transition-all duration-300 hover:bg-luxury-gold-hover">Browse Menu</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-luxury-gold/10 bg-luxury-charcoal/30 divide-y divide-luxury-gold/10">
              {cart.map(({ item, quantity }) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4">
                  <div className="flex items-center gap-4">
                    {item.image ? <img src={item.image} alt={item.name} className="h-16 w-16 rounded object-cover border border-luxury-gold/10" /> : null}
                    <div>
                      <h3 className="font-serif text-base font-semibold text-white">{item.name}</h3>
                      <p className="text-xs text-luxury-gold font-medium">ETB {Number(item.price).toFixed(2)} each</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="flex items-center rounded border border-luxury-gold/20 bg-luxury-black/40">
                      <button onClick={() => updateCartQuantity(item.id, quantity - 1)} className="flex h-8 w-8 items-center justify-center text-gray-400 hover:text-white" aria-label="Decrease quantity"><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center text-xs font-medium text-white">{quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, quantity + 1)} className="flex h-8 w-8 items-center justify-center text-gray-400 hover:text-white" aria-label="Increase quantity"><Plus className="h-3 w-3" /></button>
                    </div>
                    <div className="text-right min-w-[70px]"><span className="font-serif text-sm font-semibold text-white">ETB {(Number(item.price) * quantity).toFixed(2)}</span></div>
                    <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-rose-500 transition-colors" aria-label="Remove item"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-luxury-gold/10 bg-luxury-charcoal/30 p-6 flex flex-col">
                <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase mb-4">Delivery Location</label>
                <div className="flex bg-luxury-black/40 rounded p-1 mb-4 border border-luxury-gold/20">
                  <button onClick={() => setLocationType("Table")} className={`flex-1 rounded py-2 text-xs font-semibold tracking-widest uppercase transition-all ${locationType === "Table" ? "bg-luxury-gold text-luxury-black shadow-sm" : "text-gray-400 hover:text-white"}`}>Table</button>
                  <button onClick={() => setLocationType("Room")} className={`flex-1 rounded py-2 text-xs font-semibold tracking-widest uppercase transition-all ${locationType === "Room" ? "bg-luxury-gold text-luxury-black shadow-sm" : "text-gray-400 hover:text-white"}`}>Room</button>
                </div>
                <input type="number" inputMode="numeric" pattern="[0-9]*" placeholder={locationType === "Table" ? "Please enter your table number e.g. 4" : "Please enter your room number e.g. 343"} value={locationNumber} onKeyDown={(e) => { if (['e','E','+','-','.'].includes(e.key)) e.preventDefault(); }} onChange={(e) => { const numericValue = e.target.value.replace(/[^0-9]/g, ""); setLocationNumber(numericValue); if (tableError) setTableError(""); }} className={`w-full rounded border ${tableError ? 'border-red-500' : 'border-luxury-gold/25'} bg-luxury-black/40 p-3 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} />
                {tableError ? (<p className="text-xs text-red-500 mt-2 font-medium">{tableError}</p>) : (<p className="text-[10px] text-gray-500 mt-2">Please confirm your {locationType.toLowerCase()} number so we can deliver your order.</p>)}
              </div>
              <div className="rounded-lg border border-luxury-gold/10 bg-luxury-charcoal/30 p-6 flex flex-col">
                <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase mb-2">Additional Requests</label>
                <textarea placeholder="Allergies, preferences, or special requests..." value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={3} className="w-full rounded border border-luxury-gold/25 bg-luxury-black/40 p-3 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold resize-none" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-luxury-gold/15 bg-luxury-charcoal/35 p-6 h-fit">
            <h2 className="font-serif text-lg font-semibold text-white tracking-wide border-b border-luxury-gold/10 pb-4 mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm border-b border-luxury-gold/10 pb-4 mb-4">
              <div className="flex justify-between text-gray-400"><span>Items Total ({totalItems} items)</span><span>ETB {subtotal.toFixed(2)}</span></div>
            </div>
            <div className="flex justify-between items-baseline mb-8">
              <span className="text-base text-white font-medium">Total</span>
              <span className="font-serif text-2xl font-bold text-luxury-gold">ETB {total.toFixed(2)}</span>
            </div>
            <button onClick={handlePlaceOrder} disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded bg-luxury-gold py-4 text-xs font-semibold tracking-widest text-luxury-black uppercase transition-all duration-300 hover:bg-luxury-gold-hover disabled:bg-gray-800 disabled:text-gray-500 hover:shadow-[0_0_20px_rgba(201,168,76,0.25)]">
              {isSubmitting ? (<div className="h-4 w-4 animate-spin rounded-full border-t border-luxury-black" />) : (<span>Place Order</span>)}
            </button>
            <p className="text-[10px] text-center text-gray-500 mt-4 leading-relaxed">By confirming, your order will be sent to the kitchen. Payment is handled at checkout or added to your room bill.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-luxury-black flex flex-col items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-t-2 border-luxury-gold" /><p className="mt-4 font-serif text-sm text-luxury-gold tracking-widest uppercase">Loading Cart...</p></div>}>
      <CartPageContent />
    </Suspense>
  );
}
