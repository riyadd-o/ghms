"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import { Order, PaymentMethod } from "@/types";
import { APP_CONFIG } from "@/lib/config";
import {
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  Clock,
  CheckCircle,
  Banknote,
  CreditCard,
  AlertCircle,
  RefreshCw,
  ChefHat,
  Hotel,
  Bike,
  MapPin,
  Phone,
  User,
  FileText,
  Truck
} from "lucide-react";
import confetti from "canvas-confetti";

function CartPageContent() {
  const searchParams = useSearchParams();
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    specialInstructions,
    setSpecialInstructions,
    clearCart,
    orderType,
    setOrderType,
    deliveryInfo,
    setDeliveryInfo
  } = useStore();

  const [mounted, setMounted] = useState(false);
  const [locationType, setLocationType] = useState<"Table" | "Room">("Table");
  const [locationNumber, setLocationNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [tableError, setTableError] = useState("");
  const [deliveryErrors, setDeliveryErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [actionError, setActionError] = useState("");

  const orderIdParam = searchParams.get("order_id");
  const paymentParam = searchParams.get("payment");

  useEffect(() => {
    setMounted(true);
    // Reset delivery info on fresh page load/refresh
    setDeliveryInfo({
      name: "",
      phone: "",
      address: "",
      area: "",
      details: "",
      notes: "",
    });
  }, [setDeliveryInfo]);

  // Handle return from digital payment checkout or direct order tracking
  useEffect(() => {
    if (!orderIdParam) return;

    const checkOrder = async () => {
      setVerifyingPayment(true);
      try {
        // If returning from checkout, verify with server-side provider first
        if (paymentParam === "success" || searchParams.get("tx_ref")) {
          await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: Number(orderIdParam) }),
          });
        }

        const res = await fetch(`/api/orders/${orderIdParam}`);
        if (res.ok) {
          const data: Order = await res.json();
          setPlacedOrder(data);
          clearCart();
          if (data.payment_status === "PAID") {
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ["#D4AF37", "#FFFFFF", "#0F2318"],
            });
          }
        }
      } catch (err) {
        console.error("Failed to verify/fetch order:", err);
      } finally {
        setVerifyingPayment(false);
      }
    };

    checkOrder();
  }, [orderIdParam, paymentParam, searchParams, clearCart]);

  // Status polling for placed order with automatic live re-verification for pending digital payments
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (placedOrder) {
      interval = setInterval(async () => {
        try {
          // If digital payment is currently pending, query verification endpoint automatically
          if (placedOrder.payment_method === "DIGITAL" && placedOrder.payment_status === "PENDING") {
            try {
              await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order_id: placedOrder.id }),
              });
            } catch {
              // Ignore background verify network glitch
            }
          }

          const res = await fetch(`/api/orders/${placedOrder.id}`);
          if (res.ok) {
            const updatedOrder: Order = await res.json();
            setPlacedOrder(updatedOrder);
            if (updatedOrder.payment_status === "PAID" && placedOrder.payment_status !== "PAID") {
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ["#D4AF37", "#FFFFFF", "#0F2318"],
              });
            }
          }
        } catch (err) {
          console.error("Failed to poll order status:", err);
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [placedOrder?.id, placedOrder?.payment_method, placedOrder?.payment_status]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-luxury-green py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl animate-pulse">
          <div className="h-8 w-48 rounded bg-luxury-gold/15 mb-8" />
          <div className="space-y-4 mb-8">
            <div className="h-20 rounded-lg border border-luxury-gold/10 bg-luxury-green-secondary/30" />
            <div className="h-20 rounded-lg border border-luxury-gold/10 bg-luxury-green-secondary/30" />
          </div>
          <div className="h-32 rounded-lg border border-luxury-gold/10 bg-luxury-green-secondary/30" />
        </div>
      </div>
    );
  }

  const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const subtotal = cart.reduce((sum, item) => sum + (Number(item.item.price) || 0) * (Number(item.quantity) || 0), 0);
  const deliveryFee = orderType === "DELIVERY" ? APP_CONFIG.DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    if (!paymentMethod) {
      setPaymentError("Please choose how you wish to pay (Cash or Digital Payment).");
      return;
    }

    if (orderType === "HOTEL") {
      if (!locationNumber.trim()) {
        setTableError("Please enter your table or room number.");
        return;
      }
    } else {
      const errors: Record<string, string> = {};
      if (!deliveryInfo.name.trim()) errors.name = "Full name is required";
      if (!deliveryInfo.phone.trim()) errors.phone = "Phone number is required";
      if (!deliveryInfo.address.trim()) errors.address = "Delivery address is required";

      if (Object.keys(errors).length > 0) {
        setDeliveryErrors(errors);
        return;
      }
    }

    setTableError("");
    setDeliveryErrors({});
    setPaymentError("");
    setActionError("");
    setIsSubmitting(true);

    try {
      const payload = {
        order_type: orderType,
        delivery_location: orderType === "HOTEL" ? `${locationType} ${locationNumber}` : undefined,
        delivery_name: orderType === "DELIVERY" ? deliveryInfo.name.trim() : undefined,
        delivery_phone: orderType === "DELIVERY" ? deliveryInfo.phone.trim() : undefined,
        delivery_address: orderType === "DELIVERY" ? deliveryInfo.address.trim() : undefined,
        delivery_area: orderType === "DELIVERY" ? deliveryInfo.area.trim() : undefined,
        delivery_address_details: orderType === "DELIVERY" ? deliveryInfo.addressDetails?.trim() || deliveryInfo.details?.trim() || undefined : undefined,
        delivery_notes: orderType === "DELIVERY" ? deliveryInfo.notes.trim() || undefined : undefined,
        special_instructions: specialInstructions,
        total_amount: total,
        payment_method: paymentMethod,
        customer_name: orderType === "HOTEL" ? `${locationType} ${locationNumber} Guest` : deliveryInfo.name.trim(),
        return_url: typeof window !== "undefined" ? `${window.location.origin}/cart?payment=success` : undefined,
        items: cart.map((c) => ({
          menu_item_id: c.item.id,
          name: c.item.name,
          price: Number(c.item.price),
          quantity: c.quantity,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();

        // If digital payment has checkout URL, redirect to Chapa hosted payment
        if (paymentMethod === "DIGITAL" && data.checkout_url) {
          clearCart();
          window.location.href = data.checkout_url;
          return;
        }

        setPlacedOrder(data);
        clearCart();
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#D4AF37", "#FFFFFF", "#0F2318"],
        });
      } else {
        const errData = await res.json();
        setTableError(errData.error || "Failed to place order. Please try again.");
      }
    } catch {
      setTableError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retry digital payment for placed order
  const handleRetryDigitalPayment = async () => {
    if (!placedOrder) return;
    setIsSubmitting(true);
    setActionError("");
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: placedOrder.id,
          method: "DIGITAL",
        }),
      });
      const data = await res.json();
      if (res.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setActionError(data.error || "Unable to initialize digital payment. Please try Cash.");
      }
    } catch {
      setActionError("Network error initializing payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switch order payment to Cash
  const handleSwitchToCash = async () => {
    if (!placedOrder) return;
    setIsSubmitting(true);
    setActionError("");
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: placedOrder.id,
          method: "CASH",
        }),
      });
      if (res.ok) {
        const orderRes = await fetch(`/api/orders/${placedOrder.id}`);
        if (orderRes.ok) {
          const updated = await orderRes.json();
          setPlacedOrder(updated);
        }
      } else {
        setActionError("Failed to switch to cash payment.");
      }
    } catch {
      setActionError("Network error switching to cash.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual verify trigger
  const handleManualVerify = async () => {
    if (!placedOrder) return;
    setVerifyingPayment(true);
    try {
      await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: placedOrder.id }),
      });
      const res = await fetch(`/api/orders/${placedOrder.id}`);
      if (res.ok) {
        const updated = await res.json();
        setPlacedOrder(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVerifyingPayment(false);
    }
  };

  // ORDER CONFIRMATION & TRACKING VIEW
  if (placedOrder) {
    const isPaid = placedOrder.payment_status === "PAID";
    const isUnpaid = placedOrder.payment_status === "UNPAID";
    const isPending = placedOrder.payment_status === "PENDING";
    const isFailed = placedOrder.payment_status === "FAILED";

    const isDelivery = placedOrder.order_type === "DELIVERY";

    const orderStages = isDelivery
      ? (["new", "cooking", "ready", "out_for_delivery", "delivered"] as const)
      : (["new", "cooking", "ready", "delivered"] as const);

    const currentStatus = placedOrder.status === "in-progress" ? "cooking" : placedOrder.status;
    const currentIndex = (orderStages as readonly string[]).indexOf(currentStatus);

    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-luxury-green px-6 py-16 text-center">
        <div className="absolute top-1/3 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-luxury-gold/5 blur-[100px]" />

        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-luxury-gold bg-luxury-green-secondary/50 text-luxury-gold shadow-[0_0_20px_rgba(201,168,76,0.3)]">
          {isPaid ? (
            <CheckCircle className="h-10 w-10 text-emerald-400 animate-bounce" />
          ) : isDelivery ? (
            <Bike className="h-10 w-10 text-luxury-gold animate-bounce" />
          ) : (
            <ChefHat className="h-10 w-10 text-luxury-gold animate-bounce" />
          )}
        </div>

        <p className="text-[10px] font-semibold tracking-[0.25em] text-luxury-gold uppercase mb-2">
          Order #{placedOrder.id} Confirmed &bull; {isDelivery ? "Delivery" : "Pick up"}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-light text-white mb-2">
          {isPaid ? "Thank You for Your Payment" : "Order Received"}
        </h1>
        <p className="text-sm text-gray-400 mb-8 max-w-md">
          {isDelivery
            ? "Our kitchen is preparing your dishes. They will be dispatched directly to your address."
            : "Our kitchen is preparing your dishes with the finest ingredients."}
        </p>

        {/* FOOD PREPARATION & DELIVERY STATUS TRACKER (Order Status) */}
        <div className="mb-8 w-full max-w-md relative z-10 bg-luxury-green-secondary/40 border border-luxury-gold/15 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-left">
              {isDelivery ? "Delivery Progress" : "Kitchen Preparation Status"}
            </p>
            <span className="flex items-center gap-1.5 text-[10px] text-luxury-gold font-semibold bg-luxury-gold/10 px-2.5 py-0.5 rounded-full border border-luxury-gold/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-luxury-gold opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-luxury-gold"></span>
              </span>
              Live Tracking
            </span>
          </div>

          <div className="relative mb-4">
            <div className="absolute left-0 top-3.5 w-full h-1 bg-luxury-gold/10 -z-10 rounded" />
            <div
              className="absolute left-0 top-3.5 h-1 bg-luxury-gold -z-10 transition-all duration-500 rounded"
              style={{
                width:
                  orderStages.length === 5
                    ? currentIndex === 4
                      ? "100%"
                      : currentIndex === 3
                        ? "75%"
                        : currentIndex === 2
                          ? "50%"
                          : currentIndex === 1
                            ? "25%"
                            : "0%"
                    : currentIndex === 3
                      ? "100%"
                      : currentIndex === 2
                        ? "66%"
                        : currentIndex === 1
                          ? "33%"
                          : "0%",
              }}
            />
            <div className="flex justify-between items-start">
              {orderStages.map((st, idx) => {
                const isActive = currentStatus === st;
                const isPast = currentIndex >= idx;
                const displayLabel = st === "out_for_delivery" ? "On the Way" : st;
                return (
                  <div key={st} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-luxury-green ${isPast
                          ? "border-luxury-gold text-luxury-gold"
                          : "border-gray-700 text-gray-600"
                        } ${isActive ? "shadow-[0_0_15px_rgba(201,168,76,0.5)] scale-110 bg-luxury-green-secondary/80 font-bold" : ""}`}
                    >
                      {isPast && !isActive ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : st === "out_for_delivery" ? (
                        <Truck className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <span
                      className={`text-[8px] sm:text-[9px] uppercase font-bold tracking-wider ${isActive
                          ? "text-luxury-gold font-extrabold"
                          : isPast
                            ? "text-gray-300"
                            : "text-gray-600"
                        }`}
                    >
                      {displayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Stage Explanation */}
          <div className="rounded-lg bg-luxury-green/60 border border-luxury-gold/15 p-3 text-xs text-gray-300 text-left">
            {currentStatus === "new" && (
              <p className="text-luxury-gold font-medium">Order Queued &mdash; Kitchen received your order and the chef will begin shortly.</p>
            )}
            {currentStatus === "cooking" && (
              <p className="text-amber-300 font-medium">Chef is Cooking &mdash; Your dishes are actively being prepared on the line.</p>
            )}
            {currentStatus === "ready" && (
              <p className="text-emerald-400 font-medium">
                {isDelivery
                  ? "Food is Ready &mdash; Plated, securely packaged, and waiting for courier pickup."
                  : `Food is Ready &mdash; Plated and waiting for staff to deliver to ${placedOrder.delivery_location}.`}
              </p>
            )}
            {currentStatus === "out_for_delivery" && (
              <p className="text-sky-400 font-medium">
                Out for Delivery &mdash; Our courier is currently on the road delivering to {placedOrder.delivery_address || placedOrder.delivery_area}.
              </p>
            )}
            {currentStatus === "delivered" && (
              <p className="text-luxury-gold font-medium">
                {isDelivery ? "Delivered &mdash; Your order has been delivered to your location. Enjoy your meal!" : "Delivered &mdash; Your order has been served. Enjoy your meal!"}
              </p>
            )}
          </div>
        </div>

        {/* PAYMENT STATUS CARD (Strictly Separate from Order Status) */}
        <div className="mb-8 w-full max-w-md rounded-xl border border-luxury-gold/20 bg-luxury-green-secondary/50 p-5 text-left shadow-lg">
          <div className="flex items-center justify-between border-b border-luxury-gold/10 pb-3 mb-3">
            <div className="flex items-center gap-2">
              {placedOrder.payment_method === "DIGITAL" ? (
                <CreditCard className="h-4 w-4 text-luxury-gold" />
              ) : (
                <Banknote className="h-4 w-4 text-luxury-gold" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Payment: {placedOrder.payment_method === "DIGITAL" ? "Digital Payment" : "Cash"}
              </span>
            </div>

            {/* Status Badges */}
            {isPaid && (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Paid
              </span>
            )}
            {isUnpaid && (
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                Unpaid (Cash)
              </span>
            )}
            {isPending && (
              <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 text-[10px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Pending
              </span>
            )}
            {isFailed && (
              <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Failed
              </span>
            )}
          </div>

          {/* Payment Guidance Notes */}
          {isPaid && (
            <div className="space-y-1">
              <p className="text-xs text-emerald-300/90 leading-relaxed">
                Payment of <strong className="text-white">ETB {Number(placedOrder.total_amount).toFixed(2)}</strong> has been verified successfully.
              </p>
            </div>
          )}

          {isUnpaid && (
            <p className="text-xs text-gray-300 leading-relaxed">
              {isDelivery ? (
                <>Please have <strong className="text-luxury-gold">ETB {Number(placedOrder.total_amount).toFixed(2)}</strong> in cash ready for the courier upon arrival.</>
              ) : (
                <>Please have <strong className="text-luxury-gold">ETB {Number(placedOrder.total_amount).toFixed(2)}</strong> in cash ready for the waiter upon delivery or at the cashier counter.</>
              )}
            </p>
          )}

          {isPending && (
            <div className="space-y-4">
              <div className="rounded-lg bg-sky-950/60 border border-sky-500/30 p-4 text-left">
                <div className="flex items-center gap-2 mb-1.5">
                  <RefreshCw className="h-4 w-4 animate-spin text-sky-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                    Awaiting Payment Confirmation
                  </span>
                </div>
                <p className="text-xs text-sky-200/90 leading-relaxed">
                  Your transaction is pending in Chapa. If you have not finished your payment yet, open the checkout page below. (In sandbox/test mode, click <strong>&quot;Simulate Success&quot;</strong> on Chapa).
                </p>
              </div>

              {placedOrder.payment?.checkout_url && (
                <a
                  href={placedOrder.payment.checkout_url}
                  className="flex w-full items-center justify-center gap-2 rounded bg-luxury-gold py-3 text-xs font-bold uppercase tracking-widest text-luxury-green hover:bg-luxury-gold-hover transition-all shadow-[0_0_15px_rgba(201,168,76,0.3)]"
                >
                  <span>Open Chapa Payment Page</span>
                </a>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleManualVerify}
                  disabled={verifyingPayment}
                  className="flex-1 rounded bg-sky-600/30 border border-sky-500/40 py-2.5 text-[10px] font-bold uppercase tracking-wider text-sky-200 hover:bg-sky-600/50 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`h-3 w-3 ${verifyingPayment ? "animate-spin" : ""}`} />
                  <span>Verify Status Now</span>
                </button>
                <button
                  onClick={handleSwitchToCash}
                  disabled={isSubmitting}
                  className="flex-1 rounded border border-luxury-gold/30 bg-luxury-green/50 py-2.5 text-[10px] font-bold uppercase tracking-wider text-luxury-gold hover:text-white transition-all"
                >
                  Switch to Cash
                </button>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="space-y-3">
              <p className="text-xs text-rose-300 leading-relaxed">
                Your digital payment could not be completed. You can retry with digital payment or switch to cash payment.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleRetryDigitalPayment}
                  disabled={isSubmitting}
                  className="flex-1 rounded bg-luxury-gold py-2 text-[10px] font-bold uppercase tracking-wider text-luxury-green hover:bg-luxury-gold-hover transition-all"
                >
                  Try Again
                </button>
                <button
                  onClick={handleSwitchToCash}
                  disabled={isSubmitting}
                  className="flex-1 rounded border border-luxury-gold/30 bg-luxury-green/50 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:border-luxury-gold transition-all"
                >
                  Choose Cash
                </button>
              </div>
            </div>
          )}

          {actionError && (
            <p className="text-xs text-rose-400 mt-2 font-medium">{actionError}</p>
          )}
        </div>

        {/* ORDER DETAILS SUMMARY */}
        <div className="mb-10 w-full max-w-md rounded-xl border border-luxury-gold/15 bg-luxury-green-secondary/50 p-6 text-left">
          <div className="flex justify-between border-b border-luxury-gold/10 pb-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Order Reference</p>
              <p className="font-serif text-lg font-bold text-white">#{placedOrder.id}</p>
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20">
                {isDelivery ? <Bike className="h-3 w-3" /> : <Hotel className="h-3 w-3" />}
                {isDelivery ? "Delivery" : "Pick up"}
              </span>
            </div>
            <div className="text-right max-w-[55%]">
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {isDelivery ? "Delivery Destination" : "Table / Room"}
              </p>
              {isDelivery ? (
                <div>
                  <p className="font-serif text-sm font-bold text-luxury-gold truncate">
                    {placedOrder.delivery_address || placedOrder.delivery_area}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {placedOrder.delivery_name} ({placedOrder.delivery_phone})
                  </p>
                </div>
              ) : (
                <p className="font-serif text-lg font-bold text-luxury-gold">{placedOrder.delivery_location}</p>
              )}
            </div>
          </div>

          {/* If Delivery: Show specific delivery notes if available */}
          {isDelivery && (placedOrder.delivery_address_details || placedOrder.delivery_notes) && (
            <div className="mb-4 rounded-lg bg-luxury-green/60 border border-luxury-gold/10 p-2.5 text-xs text-gray-400 space-y-1">
              {placedOrder.delivery_address_details && (
                <p><span className="text-gray-500 font-medium">Details:</span> {placedOrder.delivery_address_details}</p>
              )}
              {placedOrder.delivery_notes && (
                <p><span className="text-gray-500 font-medium">Notes:</span> {placedOrder.delivery_notes}</p>
              )}
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Items Ordered</p>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {placedOrder.items.map((oi, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-300">
                    {oi.name} <span className="text-xs text-luxury-gold">x{oi.quantity}</span>
                  </span>
                  <span className="text-gray-400">ETB {(Number(oi.price) * oi.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="border-t border-luxury-gold/10 pt-3 space-y-1.5 text-xs">
            {isDelivery && (
              <>
                <div className="flex justify-between text-gray-400">
                  <span>Items Total</span>
                  <span className="text-gray-200">
                    ETB {(Number(placedOrder.total_amount) - Number(placedOrder.delivery_fee || 0)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Delivery Fee</span>
                  <span className="text-luxury-gold font-medium">
                    ETB {Number(placedOrder.delivery_fee || APP_CONFIG.DELIVERY_FEE).toFixed(2)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-luxury-gold/10">
              <span className="text-sm font-semibold text-gray-300">Total Amount</span>
              <span className="font-serif text-xl font-bold text-luxury-gold">
                ETB {Number(placedOrder.total_amount).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-300 mt-4 pt-3 border-t border-luxury-gold/10">
            <Clock className="h-5 w-5 text-luxury-gold shrink-0" />
            <div>
              <span className="font-medium">{isDelivery ? "Estimated Delivery:" : "Estimated Service:"}</span>
              <span className="text-luxury-gold ml-1.5 font-bold">
                {isDelivery ? "30 - 45 minutes" : "15 - 20 minutes"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded px-6 py-3 text-xs font-semibold tracking-widest text-luxury-green bg-luxury-gold uppercase transition-all duration-300 hover:bg-luxury-gold-hover hover:shadow-[0_0_10px_rgba(201,168,76,0.2)]"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  // CART & ORDER REVIEW VIEW
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 hover:text-luxury-gold transition-colors duration-300 uppercase mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Menu</span>
      </Link>
      <h1 className="font-serif text-3xl font-light text-white mb-8">
        Order <span className="text-gold-gradient font-normal italic">Review</span>
      </h1>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-luxury-gold/15 rounded-lg bg-luxury-green-secondary/10">
          <p className="font-serif text-lg text-gray-500 italic mb-4">Your cart is empty.</p>
          <Link
            href="/"
            className="rounded bg-luxury-gold px-6 py-3 text-xs font-semibold tracking-widest text-luxury-green uppercase transition-all duration-300 hover:bg-luxury-gold-hover"
          >
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Cart Items */}
            <div className="rounded-lg border border-luxury-gold/10 bg-luxury-green-secondary/30 divide-y divide-luxury-gold/10">
              {cart.map(({ item, quantity }) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4">
                  <div className="flex items-center gap-4">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-16 w-16 rounded object-cover border border-luxury-gold/10" />
                    ) : null}
                    <div>
                      <h3 className="font-serif text-base font-semibold text-white">{item.name}</h3>
                      <p className="text-xs text-luxury-gold font-medium">ETB {Number(item.price).toFixed(2)} each</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="flex items-center rounded border border-luxury-gold/20 bg-luxury-green/40">
                      <button
                        onClick={() => updateCartQuantity(item.id, quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center text-gray-400 hover:text-white"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-medium text-white">{quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center text-gray-400 hover:text-white"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-right min-w-[70px]">
                      <span className="font-serif text-sm font-semibold text-white">
                        ETB {(Number(item.price) * quantity).toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-500 hover:text-rose-500 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Dining Mode Selector */}
            <div className="rounded-xl border border-luxury-gold/15 bg-luxury-green-secondary/40 p-5">
              <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase block mb-3">
                How would you like to receive your order?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType("HOTEL")}
                  className={`flex items-center justify-center gap-2.5 rounded-lg py-3 px-4 text-xs font-bold tracking-wider uppercase transition-all ${orderType === "HOTEL"
                      ? "bg-luxury-gold text-luxury-green shadow-[0_0_15px_rgba(201,168,76,0.3)] ring-1 ring-luxury-gold"
                      : "border border-luxury-gold/20 bg-luxury-green/40 text-gray-400 hover:text-white hover:border-luxury-gold/40"
                    }`}
                >
                  <Hotel className="h-4 w-4 shrink-0" />
                  <span>Pick up</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("DELIVERY")}
                  className={`flex items-center justify-center gap-2.5 rounded-lg py-3 px-4 text-xs font-bold tracking-wider uppercase transition-all ${orderType === "DELIVERY"
                      ? "bg-luxury-gold text-luxury-green shadow-[0_0_15px_rgba(201,168,76,0.3)] ring-1 ring-luxury-gold"
                      : "border border-luxury-gold/20 bg-luxury-green/40 text-gray-400 hover:text-white hover:border-luxury-gold/40"
                    }`}
                >
                  <Bike className="h-4 w-4 shrink-0" />
                  <span>Delivery</span>
                </button>
              </div>
            </div>

            {/* HOTEL FLOW: Table / Room Number */}
            {orderType === "HOTEL" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border border-luxury-gold/10 bg-luxury-green-secondary/30 p-6 flex flex-col">
                  <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase mb-4">
                    Table or Room Selection
                  </label>
                  <div className="flex bg-luxury-green/40 rounded p-1 mb-4 border border-luxury-gold/20">
                    <button
                      type="button"
                      onClick={() => setLocationType("Table")}
                      className={`flex-1 rounded py-2 text-xs font-semibold tracking-widest uppercase transition-all ${locationType === "Table"
                          ? "bg-luxury-gold text-luxury-green shadow-sm"
                          : "text-gray-400 hover:text-white"
                        }`}
                    >
                      Table
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationType("Room")}
                      className={`flex-1 rounded py-2 text-xs font-semibold tracking-widest uppercase transition-all ${locationType === "Room"
                          ? "bg-luxury-gold text-luxury-green shadow-sm"
                          : "text-gray-400 hover:text-white"
                        }`}
                    >
                      Room
                    </button>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={locationType === "Table" ? "Please enter your table number" : "Please enter your room number"}
                    value={locationNumber}
                    onKeyDown={(e) => {
                      if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, "");
                      setLocationNumber(numericValue);
                      if (tableError) setTableError("");
                    }}
                    className={`w-full rounded border ${tableError ? "border-red-500" : "border-luxury-gold/25"} bg-luxury-green/40 p-3 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  />
                  {tableError ? (
                    <p className="text-xs text-red-500 mt-2 font-medium">{tableError}</p>
                  ) : (
                    <p className="text-[10px] text-gray-500 mt-2">
                      Please confirm your {locationType.toLowerCase()} number so we can serve your order.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-luxury-gold/10 bg-luxury-green-secondary/30 p-6 flex flex-col">
                  <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase mb-2">
                    Additional Requests
                  </label>
                  <textarea
                    placeholder="Allergies, preferences, or special requests..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={3}
                    className="w-full rounded border border-luxury-gold/25 bg-luxury-green/40 p-3 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold resize-none"
                  />
                </div>
              </div>
            )}

            {/* DELIVERY FLOW: Customer Delivery Information */}
            {orderType === "DELIVERY" && (
              <div className="rounded-xl border border-luxury-gold/15 bg-luxury-green-secondary/30 p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-luxury-gold/10 pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-luxury-gold" />
                    <h3 className="font-serif text-base font-semibold text-white">Delivery Information</h3>
                  </div>
                  <span className="text-[11px] text-luxury-gold bg-luxury-gold/10 px-2.5 py-0.5 rounded-full border border-luxury-gold/20 font-medium">
                    Fixed Delivery Fee: ETB {APP_CONFIG.DELIVERY_FEE.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase block mb-1.5">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Mohammed Ali"
                        value={deliveryInfo.name}
                        onChange={(e) => {
                          setDeliveryInfo({ name: e.target.value });
                          if (deliveryErrors.name) setDeliveryErrors((prev) => ({ ...prev, name: "" }));
                        }}
                        className={`w-full rounded border ${deliveryErrors.name ? "border-red-500" : "border-luxury-gold/25"} bg-luxury-green/40 p-3 pl-10 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold`}
                      />
                      <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                    </div>
                    {deliveryErrors.name && (
                      <p className="text-xs text-red-400 mt-1">{deliveryErrors.name}</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase block mb-1.5">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        placeholder="e.g. 0911223344"
                        value={deliveryInfo.phone}
                        onChange={(e) => {
                          setDeliveryInfo({ phone: e.target.value });
                          if (deliveryErrors.phone) setDeliveryErrors((prev) => ({ ...prev, phone: "" }));
                        }}
                        className={`w-full rounded border ${deliveryErrors.phone ? "border-red-500" : "border-luxury-gold/25"} bg-luxury-green/40 p-3 pl-10 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold`}
                      />
                      <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                    </div>
                    {deliveryErrors.phone && (
                      <p className="text-xs text-red-400 mt-1">{deliveryErrors.phone}</p>
                    )}
                  </div>

                  {/* Delivery Address */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase block mb-1.5">
                      Delivery Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Near Edna Mall, Behind Medhanialem"
                        value={deliveryInfo.address}
                        onChange={(e) => {
                          setDeliveryInfo({ address: e.target.value });
                          if (deliveryErrors.address) setDeliveryErrors((prev) => ({ ...prev, address: "" }));
                        }}
                        className={`w-full rounded border ${deliveryErrors.address ? "border-red-500" : "border-luxury-gold/25"} bg-luxury-green/40 p-3 pl-10 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold`}
                      />
                      <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                    </div>
                    {deliveryErrors.address && (
                      <p className="text-xs text-red-400 mt-1">{deliveryErrors.address}</p>
                    )}
                  </div>

                  {/* Area / Sub-city */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase block mb-1.5">
                      Area / Sub-city <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Bole, Kirkos, Kazanchis"
                        value={deliveryInfo.area || ""}
                        onChange={(e) => setDeliveryInfo({ area: e.target.value })}
                        className="w-full rounded border border-luxury-gold/25 bg-luxury-green/40 p-3 pl-10 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold"
                      />
                      <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                    </div>
                  </div>

                  {/* Additional Address Details (Optional) */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase block mb-1.5">
                      Additional Details <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Blue building, 3rd floor, Apt 302"
                        value={deliveryInfo.addressDetails || deliveryInfo.details || ""}
                        onChange={(e) => setDeliveryInfo({ addressDetails: e.target.value, details: e.target.value })}
                        className="w-full rounded border border-luxury-gold/25 bg-luxury-green/40 p-3 pl-10 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold"
                      />
                      <FileText className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                    </div>
                  </div>

                  {/* Delivery Notes (Optional) */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase block mb-1.5">
                      Delivery Notes <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Please call when you arrive"
                        value={deliveryInfo.notes}
                        onChange={(e) => setDeliveryInfo({ notes: e.target.value })}
                        className="w-full rounded border border-luxury-gold/25 bg-luxury-green/40 p-3 pl-10 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold"
                      />
                      <FileText className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                    </div>
                  </div>
                </div>

                {/* Additional Requests (Kitchen) */}
                <div>
                  <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase block mb-1.5">
                    Kitchen Preparation Requests <span className="text-gray-500 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    placeholder="Allergies, spice preferences, or food preparation notes..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={2}
                    className="w-full rounded border border-luxury-gold/25 bg-luxury-green/40 p-3 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold resize-none"
                  />
                </div>
              </div>
            )}

          </div>

          {/* CHECKOUT & PAYMENT CARD (Unified in Right Column, visible without scrolling) */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6 h-fit">
            <div className={`rounded-xl border bg-luxury-green-secondary/40 p-6 shadow-xl transition-all ${paymentError ? "border-red-500/80 ring-1 ring-red-500/40" : "border-luxury-gold/20"
              }`}>
              <h2 className="font-serif text-xl font-semibold text-white tracking-wide border-b border-luxury-gold/15 pb-4 mb-5">
                Payment & Checkout
              </h2>

              {/* 1. PAYMENT METHOD SELECTOR */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold tracking-wider text-luxury-gold uppercase block">
                    Payment Method <span className="text-red-400">*</span>
                  </label>
                  {!paymentMethod && (
                    <span className="text-[10px] text-amber-400 font-medium animate-pulse">
                      Select method
                    </span>
                  )}
                </div>

                {paymentError && (
                  <div className="mb-3 rounded-lg border border-red-500/30 bg-red-950/50 p-2.5 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{paymentError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* Cash Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("CASH");
                      setPaymentError("");
                    }}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${paymentMethod === "CASH"
                        ? "border-luxury-gold bg-luxury-gold/15 shadow-[0_0_15px_rgba(201,168,76,0.15)] ring-1 ring-luxury-gold/40"
                        : "border-luxury-gold/15 bg-luxury-green/30 hover:border-luxury-gold/30 hover:bg-luxury-green/50"
                      }`}
                  >
                    <div className={`rounded-lg p-2 mb-1.5 ${paymentMethod === "CASH" ? "bg-luxury-gold text-luxury-green" : "bg-luxury-green text-gray-400"}`}>
                      <Banknote className="h-5 w-5" />
                    </div>
                    <span className="font-serif text-xs font-bold text-white">Cash</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">On Delivery</span>
                  </button>

                  {/* Digital Payment Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("DIGITAL");
                      setPaymentError("");
                    }}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${paymentMethod === "DIGITAL"
                        ? "border-luxury-gold bg-luxury-gold/15 shadow-[0_0_15px_rgba(201,168,76,0.15)] ring-1 ring-luxury-gold/40"
                        : "border-luxury-gold/15 bg-luxury-green/30 hover:border-luxury-gold/30 hover:bg-luxury-green/50"
                      }`}
                  >
                    <div className={`rounded-lg p-2 mb-1.5 ${paymentMethod === "DIGITAL" ? "bg-luxury-gold text-luxury-green" : "bg-luxury-green text-gray-400"}`}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <span className="font-serif text-xs font-bold text-white">Digital</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Online via Chapa</span>
                  </button>
                </div>
              </div>

              {/* Digital Payment Quick Info */}
              {paymentMethod === "DIGITAL" && (
                <div className="mb-5 p-3.5 rounded-lg bg-luxury-green/60 border border-luxury-gold/20">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-luxury-gold" />
                    <span className="text-xs font-semibold text-white">Instant Online Payment</span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    Pay seamlessly with <strong>Telebirr, CBEBirr, or Debit Card</strong> via Chapa. No form filling required.
                  </p>
                </div>
              )}

              {/* 3. ORDER SUMMARY TOTAL */}
              <div className="space-y-2.5 border-t border-luxury-gold/15 pt-4 mb-4 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Items Total ({totalItems} items)</span>
                  <span className="text-gray-200">ETB {subtotal.toFixed(2)}</span>
                </div>
                {orderType === "DELIVERY" && (
                  <div className="flex justify-between text-gray-400">
                    <span>Delivery Fee</span>
                    <span className="text-luxury-gold font-medium">ETB {deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span>Payment Option</span>
                  <span className="font-medium">
                    {paymentMethod === "DIGITAL" ? (
                      <span className="text-luxury-gold">Digital (Telebirr / Cards)</span>
                    ) : paymentMethod === "CASH" ? (
                      <span className="text-luxury-gold">Cash on Delivery</span>
                    ) : (
                      <span className="text-amber-400">Not selected</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-luxury-gold/10">
                  <span className="text-sm font-semibold text-white">Total</span>
                  <span className="font-serif text-2xl font-bold text-luxury-gold">
                    ETB {total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Errors if any */}
              {tableError && (
                <p className="text-xs text-red-400 font-medium mb-3 text-center">{tableError}</p>
              )}
              {actionError && (
                <p className="text-xs text-red-400 font-medium mb-3 text-center">{actionError}</p>
              )}

              {/* 4. SUBMIT ACTION BUTTON */}
              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded bg-luxury-gold py-4 text-xs font-semibold tracking-widest text-luxury-green uppercase transition-all duration-300 hover:bg-luxury-gold-hover disabled:bg-gray-800 disabled:text-gray-500 hover:shadow-[0_0_20px_rgba(201,168,76,0.25)]"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-luxury-green" />
                ) : (
                  <span>
                    {paymentMethod === "DIGITAL"
                      ? "Proceed to Online Payment"
                      : paymentMethod === "CASH"
                        ? "Place Order (Cash)"
                        : "Select Payment Method"}
                  </span>
                )}
              </button>

              <p className="text-[10px] text-center text-gray-500 mt-3 leading-relaxed">
                By confirming, your order will be sent to the kitchen.
                {paymentMethod === "DIGITAL"
                  ? " You will complete checkout via our secure Chapa gateway."
                  : " Payment is handled upon delivery by our staff."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-luxury-green flex flex-col items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-luxury-gold" />
          <p className="mt-4 font-serif text-sm text-luxury-gold tracking-widest uppercase">Loading Cart...</p>
        </div>
      }
    >
      <CartPageContent />
    </Suspense>
  );
}
