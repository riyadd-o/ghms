"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Order } from "@/types";
import { 
  Clock, 
  Play, 
  Check, 
  RotateCcw, 
  AlertTriangle, 
  Flame, 
  UtensilsCrossed, 
  CheckCircle2, 
  ChefHat,
  Hotel,
  Bike,
  MapPin,
  Phone,
  Truck
} from "lucide-react";

import StaffLogoutButton from "@/components/StaffLogoutButton";
import Toast, { ToastMessage } from "@/components/Toast";

export default function KitchenDashboard() {
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [time, setTime] = useState(new Date());
  const [mobileTab, setMobileTab] = useState<"new" | "cooking" | "ready">("new");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (msg: ToastMessage) => setToasts((prev) => [...prev, msg]);
  const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data: Order[] = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to fetch kitchen orders:", err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchOrders();
    const timer = setInterval(() => setTime(new Date()), 1000);
    const pollInterval = setInterval(fetchOrders, 4000);
    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
    };
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: number, newStatus: Order["status"]) => {
    const previousOrders = [...orders];
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setOrders(previousOrders);
        addToast({ id: Date.now(), type: "error", message: "Failed to update order status." });
      } else {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o))
        );
      }
    } catch (err) {
      setOrders(previousOrders);
      addToast({ id: Date.now(), type: "error", message: "Network error. Status reverted." });
      console.error("Failed to update status:", err);
    }
  };

  // Status-based order groupings
  const newOrders = orders.filter((o) => o.status === "new");
  const cookingOrders = orders.filter((o) => o.status === "cooking" || o.status === "in-progress");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const completedOrders = orders.filter((o) => o.status === "delivered");

  // Time calculations
  const getElapsedString = (timestamp?: string | null) => {
    if (!timestamp || !mounted) return { display: "--:--", totalMins: 0 };
    const date = new Date(timestamp);
    const diffMs = Math.max(0, time.getTime() - date.getTime());
    const totalMins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return {
      display: `${String(totalMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      totalMins,
    };
  };

  const getUrgencyBadge = (totalMins: number) => {
    if (totalMins <= 7) {
      return {
        cardBorder: "border-emerald-500/25 hover:border-emerald-500/50",
        badgeBg: "bg-emerald-950/60 text-emerald-300 border-emerald-500/30",
        text: "text-emerald-400",
        label: "Normal",
      };
    }
    if (totalMins <= 15) {
      return {
        cardBorder: "border-amber-500/35 hover:border-amber-500/60",
        badgeBg: "bg-amber-950/60 text-amber-300 border-amber-500/30",
        text: "text-amber-400",
        label: "Medium",
      };
    }
    return {
      cardBorder: "border-rose-500/50 ring-1 ring-rose-500/20 animate-pulse",
      badgeBg: "bg-rose-950/80 text-rose-300 border-rose-500/40",
      text: "text-rose-400 font-bold",
      label: "URGENT",
    };
  };

  const renderKitchenCard = (order: Order) => {
    const elapsedPlaced = getElapsedString(order.created_at);
    const elapsedCooking = getElapsedString(order.started_at);
    const elapsedReady = getElapsedString(order.ready_at);
    const urgency = getUrgencyBadge(elapsedPlaced.totalMins);

    const isDelivery = order.order_type === "DELIVERY";

    return (
      <div
        key={order.id}
        className={`flex flex-col rounded-xl border bg-[#0d1f16] p-4 sm:p-5 transition-all duration-200 shadow-lg ${urgency.cardBorder}`}
      >
        {/* Card Header: Order ID, Type Badge, Location */}
        <div className="flex items-start justify-between border-b border-[#244533] pb-3 mb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Order</span>
            <h3 className="font-serif text-xl sm:text-2xl font-extrabold text-white tracking-wide">
              #{order.id}
            </h3>
            {/* Order Type Badge */}
            <div className="mt-1">
              {isDelivery ? (
                <span className="inline-flex items-center gap-1 rounded bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">
                  <Bike className="h-3 w-3" />
                  <span>Delivery</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-luxury-gold/15 border border-luxury-gold/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-luxury-gold">
                  <Hotel className="h-3 w-3" />
                  <span>Hotel</span>
                </span>
              )}
            </div>
          </div>

          <div className="text-right max-w-[55%]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {isDelivery ? "Destination" : "Location"}
            </span>
            {isDelivery ? (
              <div>
                <p className="font-serif text-sm sm:text-base font-bold text-luxury-gold uppercase truncate">
                  {order.delivery_address || order.delivery_area || "Delivery"}
                </p>
                <p className="text-[11px] text-gray-300 font-medium truncate">
                  {order.delivery_name || order.customer_name}
                </p>
                {order.delivery_phone && (
                  <p className="text-[10px] text-gray-400 font-mono flex items-center justify-end gap-1">
                    <Phone className="h-2.5 w-2.5 text-gray-400" />
                    <span>{order.delivery_phone}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="font-serif text-base sm:text-lg font-bold text-luxury-gold uppercase">
                {order.delivery_location}
              </p>
            )}
          </div>
        </div>

        {/* Timers & Status context */}
        <div className="mb-3 flex items-center justify-between rounded-lg bg-[#08150e] px-3 py-2 border border-[#1b3b2a]">
          <div className="flex items-center gap-1.5">
            <Clock className={`h-4 w-4 ${urgency.text}`} />
            <span suppressHydrationWarning className={`text-xs font-mono font-bold tracking-wider ${urgency.text}`}>
              {elapsedPlaced.display}
            </span>
          </div>
          <span className={`rounded border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${urgency.badgeBg}`}>
            {urgency.label}
          </span>
        </div>

        {/* Delivery Details Note if applicable */}
        {isDelivery && (order.delivery_address || order.delivery_notes) && (
          <div className="mb-3 rounded-lg bg-[#08150e] border border-[#1b3b2a] p-2 text-xs text-gray-300 space-y-0.5">
            {order.delivery_address && (
              <p className="flex items-start gap-1">
                <MapPin className="h-3 w-3 text-luxury-gold shrink-0 mt-0.5" />
                <span className="truncate">{order.delivery_address}</span>
              </p>
            )}
            {order.delivery_notes && (
              <p className="text-[11px] text-gray-400 italic pl-4">
                &ldquo;{order.delivery_notes}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 space-y-2.5 my-2">
          {order.items.map((oi, idx) => (
            <div key={idx} className="flex justify-between items-start text-sm border-b border-[#162f22] pb-2 last:border-none">
              <span className="font-medium text-gray-200 pr-3 leading-snug">
                {oi.name}
              </span>
              <span className="rounded bg-luxury-gold/15 px-2 py-0.5 text-xs font-bold text-luxury-gold border border-luxury-gold/30 shrink-0">
                {oi.quantity} ×
              </span>
            </div>
          ))}
        </div>

        {/* Special Instructions / Requests */}
        {order.special_instructions && order.special_instructions.trim() !== "" && (
          <div className="mt-2 mb-3 rounded-lg border border-amber-500/20 bg-amber-950/20 p-2.5 text-xs">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Special Instructions</span>
            </div>
            <p className="italic text-gray-300 leading-normal">
              &ldquo;{order.special_instructions}&rdquo;
            </p>
          </div>
        )}

        {/* Column-specific details & Action Buttons */}
        <div className="mt-3 border-t border-[#244533] pt-3">
          {order.status === "new" && (
            <button
              onClick={() => updateOrderStatus(order.id, "cooking")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-luxury-gold py-3 text-xs font-extrabold uppercase tracking-widest text-luxury-green transition-all hover:bg-luxury-gold-hover shadow-[0_0_15px_rgba(201,168,76,0.3)] active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Start Cooking</span>
            </button>
          )}

          {(order.status === "cooking" || order.status === "in-progress") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-amber-400 font-mono font-medium px-1">
                <span className="flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 fill-current animate-pulse" />
                  <span>Cooking for:</span>
                </span>
                <span className="font-bold text-xs">{elapsedCooking.display}</span>
              </div>
              <button
                onClick={() => updateOrderStatus(order.id, "ready")}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-xs font-extrabold uppercase tracking-widest text-white transition-all hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-[0.98]"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Mark Ready</span>
              </button>
            </div>
          )}

          {order.status === "ready" && (
            <div className="space-y-2.5 text-center">
              {isDelivery ? (
                <div className="rounded-lg bg-sky-950/40 border border-sky-500/30 p-2.5 text-sky-300 text-xs font-semibold flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
                    <Truck className="h-4 w-4 text-sky-400" />
                    <span>Ready for Delivery</span>
                  </div>
                  <span className="text-[11px] text-sky-200/80 font-normal">Waiting for delivery pickup</span>
                </div>
              ) : (
                <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/30 p-2 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Waiting for pickup / table delivery</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono px-1">
                <span>Ready duration:</span>
                <span className="text-emerald-400 font-bold">{elapsedReady.display}</span>
              </div>

              {/* For Delivery Orders, staff can dispatch Out for Delivery */}
              {isDelivery ? (
                <div className="space-y-1.5">
                  <button
                    onClick={() => updateOrderStatus(order.id, "out_for_delivery")}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-xs font-extrabold uppercase tracking-widest text-white transition-all hover:bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)] active:scale-[0.98]"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Dispatch: Out for Delivery</span>
                  </button>
                  <button
                    onClick={() => updateOrderStatus(order.id, "cooking")}
                    className="flex w-full items-center justify-center gap-1 rounded border border-[#244533] py-1 text-[10px] font-medium text-gray-400 hover:text-white hover:border-gray-500 transition-all"
                    title="Revert back to cooking if needed"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Revert to Cooking</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => updateOrderStatus(order.id, "cooking")}
                  className="flex w-full items-center justify-center gap-1 rounded border border-[#244533] py-1.5 text-[10px] font-medium text-gray-400 hover:text-white hover:border-gray-500 transition-all"
                  title="Revert back to cooking if needed"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Revert to Cooking</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const getMobileTabOrders = () => {
    switch (mobileTab) {
      case "new":
        return newOrders;
      case "cooking":
        return cookingOrders;
      case "ready":
        return readyOrders;
    }
  };

  return (
    <div className="min-h-screen bg-[#06110b] text-gray-100 flex flex-col font-sans">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      {/* Top KDS Header */}
      <header className="sticky top-0 z-40 border-b border-luxury-gold/20 bg-[#0a1b12]/95 backdrop-blur px-4 sm:px-8 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Title */}
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-luxury-gold/15 border border-luxury-gold/30 text-luxury-gold">
                <ChefHat className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-wider text-white">
                  GOLDEN HOTEL <span className="text-luxury-gold">KITCHEN</span>
                </h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                  Kitchen Display System (KDS)
                </p>
              </div>
            </div>
          </div>

          {/* Metric Badges: 4 New, 3 Cooking, 2 Ready, Completed */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 rounded-md border border-luxury-gold/30 bg-luxury-gold/10 px-2.5 py-1.5">
                <span className="h-2 w-2 rounded-full bg-luxury-gold animate-pulse" />
                <span className="font-serif font-bold text-xs sm:text-sm text-luxury-gold">{newOrders.length}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-300 font-medium">New</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="font-serif font-bold text-xs sm:text-sm text-amber-400">{cookingOrders.length}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-300 font-medium">Cooking</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-serif font-bold text-xs sm:text-sm text-emerald-400">{readyOrders.length}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-300 font-medium">Ready</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-800/40 px-2.5 py-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-gray-400">{completedOrders.length}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Done</span>
              </div>
            </div>

            {/* Utility Controls: Logout */}
            <div className="flex items-center gap-2">
              <StaffLogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 mx-auto w-full max-w-7xl flex flex-col">
        {/* Mobile Navigation Tabs */}
        <div className="lg:hidden mb-4">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#09170f] p-1.5 border border-[#203c2b]">
            <button
              onClick={() => setMobileTab("new")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                mobileTab === "new"
                  ? "bg-luxury-gold text-luxury-green shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span>New</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${mobileTab === "new" ? "bg-luxury-green text-luxury-gold" : "bg-luxury-gold/20 text-luxury-gold"}`}>
                {newOrders.length}
              </span>
            </button>
            <button
              onClick={() => setMobileTab("cooking")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                mobileTab === "cooking"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span>Cooking</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${mobileTab === "cooking" ? "bg-black text-amber-400" : "bg-amber-500/20 text-amber-400"}`}>
                {cookingOrders.length}
              </span>
            </button>
            <button
              onClick={() => setMobileTab("ready")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                mobileTab === "ready"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span>Ready</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${mobileTab === "ready" ? "bg-white text-emerald-700 font-bold" : "bg-emerald-500/20 text-emerald-400"}`}>
                {readyOrders.length}
              </span>
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {getMobileTabOrders().length > 0 ? (
              getMobileTabOrders().map(renderKitchenCard)
            ) : (
              <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-[#1f3f2e] bg-[#09170f]/50 p-6 text-center text-gray-500">
                <UtensilsCrossed className="h-8 w-8 text-gray-600 mb-2" />
                <p className="font-serif italic text-sm">No orders in this column right now.</p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop 3 Columns */}
        <div className="hidden lg:grid flex-1 grid-cols-3 gap-6 items-start">
          {/* COLUMN 1: NEW ORDERS */}
          <div className="flex flex-col rounded-2xl border border-luxury-gold/25 bg-[#09170f] p-4 shadow-xl min-h-[680px]">
            <div className="flex items-center justify-between border-b border-[#244533] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-luxury-gold animate-ping" />
                <h2 className="font-serif text-lg font-bold tracking-wider text-white uppercase">
                  New Orders
                </h2>
              </div>
              <span className="rounded-full bg-luxury-gold/15 border border-luxury-gold/30 px-2.5 py-0.5 font-mono text-xs font-bold text-luxury-gold">
                {newOrders.length}
              </span>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[78vh] pr-1">
              {newOrders.length > 0 ? (
                newOrders.map(renderKitchenCard)
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center text-gray-500">
                  <ChefHat className="h-10 w-10 text-gray-700 mb-2" />
                  <p className="font-serif text-sm italic">All caught up! No incoming new orders.</p>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: COOKING */}
          <div className="flex flex-col rounded-2xl border border-amber-500/25 bg-[#09170f] p-4 shadow-xl min-h-[680px]">
            <div className="flex items-center justify-between border-b border-[#244533] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" />
                <h2 className="font-serif text-lg font-bold tracking-wider text-white uppercase">
                  Cooking
                </h2>
              </div>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-400">
                {cookingOrders.length}
              </span>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[78vh] pr-1">
              {cookingOrders.length > 0 ? (
                cookingOrders.map(renderKitchenCard)
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center text-gray-500">
                  <Flame className="h-10 w-10 text-gray-700 mb-2" />
                  <p className="font-serif text-sm italic">Stove is clear. Nothing currently cooking.</p>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: READY */}
          <div className="flex flex-col rounded-2xl border border-emerald-500/25 bg-[#09170f] p-4 shadow-xl min-h-[680px]">
            <div className="flex items-center justify-between border-b border-[#244533] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h2 className="font-serif text-lg font-bold tracking-wider text-white uppercase">
                  Ready for Pickup
                </h2>
              </div>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-400">
                {readyOrders.length}
              </span>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[78vh] pr-1">
              {readyOrders.length > 0 ? (
                readyOrders.map(renderKitchenCard)
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center text-gray-500">
                  <CheckCircle2 className="h-10 w-10 text-gray-700 mb-2" />
                  <p className="font-serif text-sm italic">No dishes waiting for pickup.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
