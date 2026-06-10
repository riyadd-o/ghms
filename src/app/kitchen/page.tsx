"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Order } from "@/types";
import { Clock, Play, Check, RotateCcw, AlertTriangle } from "lucide-react";

import StaffLogoutButton from "@/components/StaffLogoutButton";
import Toast, { ToastMessage } from "@/components/Toast";

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [time, setTime] = useState(new Date());
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [mobileTab, setMobileTab] = useState<"new" | "in-progress" | "delivered">("new");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (msg: ToastMessage) => setToasts((prev) => [...prev, msg]);
  const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    }
    setLastRefreshed(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, []);

  useEffect(() => {
    fetchOrders();
    const timer = setInterval(() => setTime(new Date()), 1000);
    const refreshTimer = setInterval(fetchOrders, 5000);
    return () => { clearInterval(timer); clearInterval(refreshTimer); };
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: number, status: string) => {
    const previousOrders = [...orders];
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: status as Order["status"] } : o));

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setOrders(previousOrders);
        addToast({ id: Date.now(), type: "error", message: "Failed to update status." });
      }
    } catch (err) {
      setOrders(previousOrders);
      addToast({ id: Date.now(), type: "error", message: "Network error. Status reverted." });
      console.error("Failed to update order:", err);
    }
  };

  const newOrders = orders.filter((o) => o.status === "new");
  const inProgressOrders = orders.filter((o) => o.status === "in-progress");
  const deliveredOrders = orders.filter((o) => o.status === "delivered");

  const getElapsedTime = (timestamp: string) => {
    const orderTime = new Date(timestamp);
    const diffMs = time.getTime() - orderTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return { mins: diffMins, secs: diffSecs, totalMins: diffMs / 60000 };
  };

  const getUrgencyStyles = (elapsedMins: number) => {
    if (elapsedMins <= 5) return { border: "border-emerald-500/20 hover:border-emerald-500/50", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", glow: "shadow-[0_0_15px_rgba(16,185,129,0.05)]", text: "text-emerald-400", indicator: "bg-emerald-500" };
    if (elapsedMins <= 15) return { border: "border-amber-500/20 hover:border-amber-500/50", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", glow: "shadow-[0_0_15px_rgba(245,158,11,0.05)]", text: "text-amber-400", indicator: "bg-amber-500" };
    return { border: "border-rose-500/30 hover:border-rose-500/60 animate-pulse", badge: "bg-rose-500/10 text-rose-400 border-rose-500/25", glow: "shadow-[0_0_20px_rgba(239,68,68,0.1)]", text: "text-rose-400 font-bold", indicator: "bg-rose-500" };
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const elapsed = getElapsedTime(order.created_at);
    const style = getUrgencyStyles(elapsed.totalMins);
    const getPriority = (m: number) => { if (m <= 5) return "Normal"; if (m <= 15) return "Medium"; return "URGENT"; };

    return (
      <div className={`rounded-lg border bg-luxury-charcoal/40 p-5 transition-all duration-300 ${style.border} ${style.glow}`}>
        <div className="flex items-start justify-between border-b border-luxury-gold/10 pb-3 mb-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Order ID</span>
            <h4 className="font-serif text-base font-bold text-white">#{order.id}</h4>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Location</span>
            <p className="font-serif text-base font-bold text-luxury-gold">{order.delivery_location}</p>
          </div>
        </div>
        <div className="mb-4 space-y-2">
          {order.items.map((oi, idx) => (
            <div key={idx} className="flex justify-between items-start text-xs">
              <span className="text-gray-300 pr-4">{oi.name}</span>
              <span className="text-luxury-gold font-semibold shrink-0">x{oi.quantity}</span>
            </div>
          ))}
        </div>
        {order.special_instructions && order.special_instructions.trim() !== "" && (
          <div className="mb-4 rounded border border-luxury-gold/10 bg-luxury-black/30 p-2.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-luxury-gold flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3 shrink-0 text-luxury-gold" /><span>Notes</span>
            </span>
            <p className="text-[10px] italic leading-normal text-gray-400">&ldquo;{order.special_instructions}&rdquo;</p>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-luxury-gold/10 pt-3 mt-3">
          <div className="flex items-center gap-1.5">
            <Clock className={`h-4 w-4 ${style.text}`} />
            <span className={`text-[11px] font-mono tracking-wide ${style.text}`}>{String(elapsed.mins).padStart(2, "0")}:{String(elapsed.secs).padStart(2, "0")}</span>
            <span className={`rounded-full border px-1.5 py-0.5 text-[8px] tracking-wider uppercase font-semibold ${style.badge}`}>{getPriority(elapsed.totalMins)}</span>
          </div>
          <div className="flex gap-2">
            {order.status === "new" && (
              <button onClick={() => updateOrderStatus(order.id, "in-progress")} className="flex h-8 items-center gap-1 rounded bg-luxury-gold px-3 text-[10px] font-bold uppercase tracking-widest text-luxury-black transition-all hover:bg-luxury-gold-hover" title="Start Preparation">
                <Play className="h-3 w-3 fill-current" /><span>Start</span>
              </button>
            )}
            {order.status === "in-progress" && (
              <button onClick={() => updateOrderStatus(order.id, "delivered")} className="flex h-8 items-center gap-1 rounded bg-emerald-600 px-3 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-emerald-700" title="Mark as Delivered">
                <Check className="h-3.5 w-3.5" /><span>Mark as Delivered</span>
              </button>
            )}
            {order.status === "delivered" && (
              <button onClick={() => updateOrderStatus(order.id, "new")} className="flex h-8 w-8 items-center justify-center rounded border border-luxury-gold/20 text-gray-400 hover:text-white transition-all" title="Revert to New">
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getMobileTabOrders = () => {
    switch (mobileTab) { case "new": return newOrders; case "in-progress": return inProgressOrders; case "delivered": return deliveredOrders; }
  };
  const getMobileTabEmptyMessage = () => {
    switch (mobileTab) { case "new": return "No new orders."; case "in-progress": return "Nothing in progress."; case "delivered": return "No delivered orders yet."; }
  };

  return (
    <>
      <div className="fixed top-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>
      <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-8 flex-1 flex flex-col">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-luxury-gold/15 pb-6">
          <div>
            <h1 className="font-serif text-3xl font-light text-white">Kitchen <span className="text-gold-gradient font-normal italic">Dashboard</span></h1>
            <p className="text-xs text-gray-400 mt-1 font-light tracking-wide">Track and manage all incoming orders in real time.</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span></span>
              <span>Live</span>
            </div>
            <div className="rounded border border-luxury-gold/15 bg-luxury-charcoal/20 px-3 py-1.5 text-[10px] font-mono text-luxury-gold">Auto-Refreshed: {lastRefreshed}</div>
            <StaffLogoutButton />
          </div>
        </div>

        {/* MOBILE TABS */}
        <div className="md:hidden mb-6">
          <div className="flex bg-luxury-black/40 rounded-lg p-1 border border-luxury-gold/10">
            {([["new", "New", newOrders.length], ["in-progress", "In Progress", inProgressOrders.length], ["delivered", "Delivered", deliveredOrders.length]] as const).map(([key, label, count]) => (
              <button key={key} onClick={() => setMobileTab(key)} className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2.5 text-[10px] font-semibold tracking-widest uppercase transition-all ${mobileTab === key ? "bg-luxury-gold text-luxury-black shadow-sm" : "text-gray-400 hover:text-white"}`}>
                <span>{label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${mobileTab === key ? "bg-luxury-black/20 text-luxury-black" : "bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/25"}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="md:hidden flex-1 space-y-4">
          {getMobileTabOrders().length > 0 ? getMobileTabOrders().map((order) => <OrderCard key={order.id} order={order} />) : (
            <div className="flex h-40 flex-col items-center justify-center text-center"><p className="text-xs text-gray-500 font-serif italic">{getMobileTabEmptyMessage()}</p></div>
          )}
        </div>

        {/* DESKTOP COLUMNS */}
        <div className="hidden md:grid flex-1 grid-cols-3 gap-8">
          {([
            { title: "New Orders", items: newOrders, dot: "bg-luxury-gold", badgeCls: "bg-luxury-gold/10 border-luxury-gold/25 text-luxury-gold" },
            { title: "In Progress", items: inProgressOrders, dot: "bg-amber-500", badgeCls: "bg-amber-500/10 border-amber-500/25 text-amber-400" },
            { title: "Delivered", items: deliveredOrders, dot: "bg-emerald-500 animate-pulse", badgeCls: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" },
          ]).map((col) => (
            <div key={col.title} className="flex flex-col rounded-lg border border-luxury-gold/10 bg-luxury-black/30 p-4">
              <div className="mb-4 flex items-center justify-between border-b border-luxury-gold/10 pb-3">
                <h3 className="font-serif text-base font-semibold text-white tracking-wide flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} /><span>{col.title}</span>
                </h3>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${col.badgeCls}`}>{col.items.length}</span>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] pr-1">
                {col.items.length > 0 ? col.items.map((order) => <OrderCard key={order.id} order={order} />) : (
                  <div className="flex h-40 flex-col items-center justify-center text-center"><p className="text-xs text-gray-500 font-serif italic">No orders.</p></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
