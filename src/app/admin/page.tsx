"use client";

import React, { useEffect, useState, useCallback } from "react";
import { MenuItem, Category, Order, Payment } from "@/types";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  ShoppingBag, 
  History, 
  ToggleLeft, 
  ToggleRight, 
  X, 
  Filter, 
  Calendar, 
  QrCode as QrIcon, 
  Download, 
  Printer, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Clock, 
  GripVertical,
  CreditCard,
  Banknote,
  CheckCircle,
  AlertCircle,
  Eye,
  Check,
  LayoutDashboard,
  Search,
  RefreshCw,
  ChefHat,
  Hotel,
  Bike,
  Truck,
  Phone,
  MapPin,
  User
} from "lucide-react";
import QRCode from "qrcode";

import StaffLogoutButton from "@/components/StaffLogoutButton";
import Toast, { ToastMessage } from "@/components/Toast";

interface PaymentStats {
  totalRevenue: number;
  cashRevenue: number;
  digitalRevenue: number;
  outstandingRevenue: number;
  totalOrders: number;
  paidOrdersCount: number;
  unpaidOrdersCount: number;
  pendingOrdersCount: number;
}

export default function AdminPanel() {
  // ---- Data State ----
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [, setLoading] = useState(true);

  // ---- UI State ----
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "menu" | "categories" | "orders" | "payments" | "qr">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_active_tab");
      if (saved === "dashboard" || saved === "menu" || saved === "categories" || saved === "orders" || saved === "payments" || saved === "qr") {
        return saved;
      }
    }
    return "dashboard";
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Confirm Delete modal state
  const [confirmDelete, setConfirmDelete] = useState<{ type: "item" | "category"; id?: number | string; name: string } | null>(null);

  // Payment Details Modal
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Menu Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<string>("Starters");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [available, setAvailable] = useState(true);

  // Categories UI
  const [newCategoryName, setNewCategoryName] = useState("");

  // Orders filter & selection UI
  const [statusFilter, setStatusFilter] = useState("All");
  const [orderTypeFilter, setOrderTypeFilter] = useState<"ALL" | "HOTEL" | "DELIVERY">("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Payments filter UI
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentDateFilter, setPaymentDateFilter] = useState("");

  // QR Generator UI
  const [qrUrl, setQrUrl] = useState("");
  const [qrGenerated, setQrGenerated] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (msg: ToastMessage) => setToasts((prev) => [...prev, msg]);
  const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newMenu = [...menu];
    const [draggedItem] = newMenu.splice(draggedIndex, 1);
    newMenu.splice(index, 0, draggedItem);
    setMenu(newMenu);
    setDraggedIndex(index);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    setDraggedIndex(null);
    try {
      const ids = menu.map((m) => m.id);
      const res = await fetch("/api/menu-items/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        addToast({ id: Date.now(), type: "success", message: "Menu order updated" });
      } else {
        throw new Error("Failed to save order");
      }
    } catch (err) {
      addToast({ id: Date.now(), type: "error", message: (err as Error).message });
      await fetchMenu();
    }
  };

  const targetUrl = typeof window !== "undefined" ? `${window.location.origin}/` : `/`;

  // ---- Data fetching ----
  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/menu-items");
      if (res.ok) setMenu(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/payments", { cache: "no-store" });
      if (res.ok) setPayments(await res.json());

      const statsRes = await fetch("/api/payments/stats", { cache: "no-store" });
      if (statsRes.ok) setPaymentStats(await statsRes.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchMenu(), fetchCategories(), fetchOrders(), fetchPayments()]);
    } catch (err) {
      console.error(err);
      addToast({ id: Date.now(), type: "error", message: "Failed to load data" });
    } finally {
      setLoading(false);
    }
  }, [fetchMenu, fetchCategories, fetchOrders, fetchPayments]);

  useEffect(() => {
    setMounted(true);
    fetchAll();
  }, [fetchAll]);

  // Persist active tab
  useEffect(() => {
    if (mounted) localStorage.setItem("admin_active_tab", activeTab);
  }, [activeTab, mounted]);

  // Periodic poll for real-time order and payment sync
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
      fetchPayments();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchPayments]);

  // ---- CRUD helpers ----
  const createMenuItem = async (item: Omit<MenuItem, "id">) => {
    const res = await fetch("/api/menu-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error("Failed to create menu item");
  };

  const updateMenuItem = async (id: number | string, item: Partial<MenuItem>) => {
    const res = await fetch(`/api/menu-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error("Failed to update menu item");
  };

  const deleteMenuItem = async (id: number | string) => {
    const res = await fetch(`/api/menu-items/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete menu item");
  };

  const toggleAvailability = async (id: number | string, current: boolean) => {
    await updateMenuItem(id, { available: !current });
  };

  const createCategory = async (name: string) => {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to create category");
  };

  const deleteCategory = async (id: number | string) => {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete category");
  };

  // Staff action: confirm cash payment
  const handleConfirmCashPayment = async (orderId: number) => {
    try {
      const res = await fetch("/api/payments/confirm-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (res.ok) {
        addToast({ id: Date.now(), type: "success", message: `Cash payment confirmed for Order #${orderId}` });
        await fetchOrders();
        await fetchPayments();
      } else {
        const errData = await res.json();
        addToast({ id: Date.now(), type: "error", message: errData.error || "Failed to confirm cash." });
      }
    } catch {
      addToast({ id: Date.now(), type: "error", message: "Network error confirming cash." });
    }
  };

  // Staff action: update order status
  const handleUpdateOrderStatus = async (orderId: number, status: Order["status"]) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const label = status === "out_for_delivery" ? "Out for Delivery" : status.charAt(0).toUpperCase() + status.slice(1);
        addToast({ id: Date.now(), type: "success", message: `Order #${orderId} marked as ${label}` });
        await fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) => prev ? { ...prev, status } : null);
        }
      } else {
        addToast({ id: Date.now(), type: "error", message: `Failed to update order to ${status}.` });
      }
    } catch {
      addToast({ id: Date.now(), type: "error", message: "Network error updating order." });
    }
  };

  // Staff action: mark order delivered
  const handleMarkOrderDelivered = async (orderId: number) => {
    await handleUpdateOrderStatus(orderId, "delivered");
  };

  // UI actions
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategory(categories.length > 0 ? categories[0].name : "Starters");
    setImageUrl("");
    setAvailable(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description);
    setPrice(String(item.price));
    setCategory(item.category);
    setImageUrl(item.image_url || item.image || "");
    setAvailable(item.available);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: reader.result }),
          });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          setImageUrl(data.url);
        } catch {
          addToast({ id: Date.now(), type: "error", message: "Failed to upload image" });
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) {
      addToast({ id: Date.now(), type: "error", message: "Name and price are required" });
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      addToast({ id: Date.now(), type: "error", message: "Invalid price" });
      return;
    }
    const selectedCategory = categories.find((c) => c.name === category);
    const category_id = selectedCategory ? selectedCategory.id : null;

    try {
      if (editingItem) {
        await updateMenuItem(editingItem.id, { name, description, price: priceNum, category, category_id, image_url: imageUrl, available });
        setIsModalOpen(false);
        addToast({ id: Date.now(), type: "success", message: "Item updated successfully" });
      } else {
        await createMenuItem({ name, description, price: priceNum, category, category_id, image_url: imageUrl, available });
        setIsModalOpen(false);
        addToast({ id: Date.now(), type: "success", message: "Menu item added" });
      }
      await fetchMenu();
    } catch (err) {
      console.error(err);
      addToast({ id: Date.now(), type: "error", message: (err as Error).message });
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName.trim());
      setNewCategoryName("");
      addToast({ id: Date.now(), type: "success", message: "Category created" });
      await fetchCategories();
    } catch (err) {
      addToast({ id: Date.now(), type: "error", message: (err as Error).message });
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    setConfirmDelete({ type: "category", id: cat.id, name: cat.name });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "item" && confirmDelete.id != null) {
        await deleteMenuItem(confirmDelete.id);
        addToast({ id: Date.now(), type: "success", message: "Item deleted" });
        await fetchMenu();
      } else if (confirmDelete.type === "category" && confirmDelete.id != null) {
        await deleteCategory(confirmDelete.id);
        addToast({ id: Date.now(), type: "success", message: "Category deleted" });
        await fetchCategories();
      }
    } catch (err) {
      addToast({ id: Date.now(), type: "error", message: (err as Error).message });
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleGenerateQR = async () => {
    try {
      const url = await QRCode.toDataURL(targetUrl, { width: 300, margin: 2, color: { dark: "#06110b", light: "#ffffff" } });
      setQrUrl(url);
      setQrGenerated(true);
    } catch (err) {
      console.error(err);
      addToast({ id: Date.now(), type: "error", message: "Failed to generate QR" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ---- REVENUE AND ORDER STATS (STRICTLY FROM PAID PAYMENTS) ----
  const totalRevenue = paymentStats?.totalRevenue ?? 0;
  const cashRevenue = paymentStats?.cashRevenue ?? 0;
  const digitalRevenue = paymentStats?.digitalRevenue ?? 0;
  const outstandingRevenue = paymentStats?.outstandingRevenue ?? 0;

  const totalOrdersCount = orders.length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const cookingCount = orders.filter((o) => o.status === "cooking" || o.status === "in-progress").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;
  const newCount = orders.filter((o) => o.status === "new").length;

  // ---- Filtered Orders ----
  const filteredOrders = orders.filter((order) => {
    let matchesStatus = true;
    if (statusFilter !== "All") {
      const normalizedStatus = order.status === "in-progress" ? "cooking" : order.status;
      matchesStatus = normalizedStatus === statusFilter;
    }
    let matchesOrderType = true;
    if (orderTypeFilter !== "ALL") {
      const orderType = order.order_type || "HOTEL";
      matchesOrderType = orderType === orderTypeFilter;
    }
    let matchesDate = true;
    if (dateFilter) {
      const orderDate = new Date(order.created_at).toISOString().split("T")[0];
      matchesDate = orderDate === dateFilter;
    }
    return matchesStatus && matchesOrderType && matchesDate;
  });

  // ---- Filtered Payments ----
  const filteredPayments = payments.filter((payment) => {
    if (paymentStatusFilter !== "ALL" && payment.status !== paymentStatusFilter) {
      return false;
    }
    if (paymentMethodFilter !== "ALL" && payment.method !== paymentMethodFilter) {
      return false;
    }
    if (paymentDateFilter) {
      const pDate = new Date(payment.created_at).toISOString().split("T")[0];
      if (pDate !== paymentDateFilter) return false;
    }
    if (paymentSearch.trim()) {
      const q = paymentSearch.toLowerCase();
      const matchesOrder = String(payment.order_id).includes(q);
      const matchesTx = (payment.provider_payment_id || "").toLowerCase().includes(q) || (payment.transaction_id || "").toLowerCase().includes(q);
      if (!matchesOrder && !matchesTx) return false;
    }
    return true;
  });

  if (!mounted) return null;

  return (
    <>
      <div className="fixed top-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-luxury-green/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-luxury-gold/20 bg-[#112920] p-6 shadow-2xl text-center">
            <h2 className="font-serif text-xl font-semibold text-white mb-2">Confirm Delete</h2>
            <p className="text-sm text-gray-400 mb-6">Are you sure you want to delete this? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded border border-luxury-gold/20 bg-luxury-green-secondary/50 py-2.5 text-xs font-semibold tracking-widest text-luxury-gold uppercase hover:border-luxury-gold hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded bg-rose-600 py-2.5 text-xs font-semibold tracking-widest text-white uppercase hover:bg-rose-700 transition-all shadow-[0_0_12px_rgba(225,29,72,0.25)]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Audit Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-luxury-green/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-luxury-gold/25 bg-[#0e241b] p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-luxury-gold/15 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-luxury-gold" />
                <h3 className="font-serif text-lg font-bold text-white">Payment Details</h3>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between border-b border-[#1b3a2c] pb-2">
                <span className="text-gray-400">Order Reference</span>
                <span className="font-bold text-white">#{selectedPayment.order_id}</span>
              </div>
              <div className="flex justify-between border-b border-[#1b3a2c] pb-2">
                <span className="text-gray-400">Amount</span>
                <span className="font-serif font-bold text-luxury-gold text-sm">ETB {Number(selectedPayment.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-[#1b3a2c] pb-2">
                <span className="text-gray-400">Payment Method</span>
                <span className="font-bold text-white uppercase">{selectedPayment.method}</span>
              </div>
              <div className="flex justify-between border-b border-[#1b3a2c] pb-2">
                <span className="text-gray-400">Provider</span>
                <span className="font-bold text-luxury-gold">{selectedPayment.provider || (selectedPayment.method === "CASH" ? "Cash (On-Site)" : "—")}</span>
              </div>
              <div className="flex justify-between border-b border-[#1b3a2c] pb-2">
                <span className="text-gray-400">Payment Status</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                  selectedPayment.status === "PAID"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : selectedPayment.status === "UNPAID"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : selectedPayment.status === "PENDING"
                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}>
                  {selectedPayment.status}
                </span>
              </div>
              {selectedPayment.provider_payment_id && (
                <div className="flex justify-between border-b border-[#1b3a2c] pb-2">
                  <span className="text-gray-400">Provider Reference</span>
                  <span className="font-mono text-[11px] text-gray-200 select-all">{selectedPayment.provider_payment_id}</span>
                </div>
              )}
              {selectedPayment.transaction_id && (
                <div className="flex justify-between border-b border-[#1b3a2c] pb-2">
                  <span className="text-gray-400">Transaction ID</span>
                  <span className="font-mono text-[11px] text-luxury-gold select-all">{selectedPayment.transaction_id}</span>
                </div>
              )}
              {selectedPayment.paid_at && (
                <div className="flex justify-between border-b border-[#1b3a2c] pb-2">
                  <span className="text-gray-400">Paid Timestamp</span>
                  <span className="font-mono text-emerald-300">{new Date(selectedPayment.paid_at).toLocaleString()}</span>
                </div>
              )}
              {selectedPayment.paid_by_email && (
                <div className="flex justify-between border-b border-[#1b3a2c] pb-2">
                  <span className="text-gray-400">Confirmed By Staff</span>
                  <span className="text-gray-200">{selectedPayment.paid_by_email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Created At</span>
                <span className="text-gray-400">{new Date(selectedPayment.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              {selectedPayment.status === "UNPAID" && selectedPayment.method === "CASH" && (
                <button
                  onClick={async () => {
                    await handleConfirmCashPayment(selectedPayment.order_id);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 rounded-lg bg-luxury-gold py-2.5 text-xs font-bold uppercase tracking-widest text-luxury-green hover:bg-luxury-gold-hover transition-all"
                >
                  Confirm Cash Now
                </button>
              )}
              <button
                onClick={() => setSelectedPayment(null)}
                className="flex-1 rounded-lg border border-luxury-gold/20 bg-luxury-green/40 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-luxury-green/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-luxury-gold/25 bg-[#0e241b] p-6 shadow-2xl text-left my-8">
            <div className="flex items-center justify-between border-b border-luxury-gold/15 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                {selectedOrder.order_type === "DELIVERY" ? (
                  <div className="h-9 w-9 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Bike className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-luxury-gold/15 border border-luxury-gold/30 flex items-center justify-center text-luxury-gold">
                    <Hotel className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">
                    Order #{selectedOrder.id} Details
                  </h3>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    selectedOrder.order_type === "DELIVERY"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      : "bg-luxury-gold/15 text-luxury-gold border border-luxury-gold/30"
                  }`}>
                    {selectedOrder.order_type === "DELIVERY" ? "Home Delivery" : "At the Hotel"}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Delivery or Hotel Location Info */}
              {selectedOrder.order_type === "DELIVERY" ? (
                <div className="rounded-xl bg-[#08170f] border border-luxury-gold/15 p-4 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#1b3a2c] pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold">Delivery Destination</span>
                    {selectedOrder.delivery_area && (
                      <span className="font-bold text-sky-400 font-mono text-[11px]">{selectedOrder.delivery_area}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Customer Name</span>
                      <span className="font-semibold text-white">{selectedOrder.delivery_name || selectedOrder.customer_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Phone Number</span>
                      <span className="font-semibold text-white font-mono">{selectedOrder.delivery_phone || "—"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Delivery Address</span>
                    <span className="font-semibold text-white">{selectedOrder.delivery_address || "—"}</span>
                  </div>
                  {selectedOrder.delivery_address_details && (
                    <div>
                      <span className="text-gray-400 block text-[10px]">Additional Address Details</span>
                      <span className="text-gray-300">{selectedOrder.delivery_address_details}</span>
                    </div>
                  )}
                  {selectedOrder.delivery_notes && (
                    <div>
                      <span className="text-gray-400 block text-[10px]">Delivery Notes</span>
                      <span className="text-gray-300 italic">&ldquo;{selectedOrder.delivery_notes}&rdquo;</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-[#08170f] border border-luxury-gold/15 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold block mb-1">Hotel Dining Location</span>
                  <span className="font-serif text-base font-bold text-white uppercase">{selectedOrder.delivery_location}</span>
                </div>
              )}

              {/* Special Instructions */}
              {selectedOrder.special_instructions && selectedOrder.special_instructions.trim() !== "" && (
                <div className="rounded-lg bg-amber-950/20 border border-amber-500/20 p-3 text-xs">
                  <span className="text-[10px] font-bold uppercase text-amber-400 block mb-0.5">Special Instructions</span>
                  <p className="italic text-gray-300">&ldquo;{selectedOrder.special_instructions}&rdquo;</p>
                </div>
              )}

              {/* Items List */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Items Ordered</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 border-b border-[#183626] text-xs">
                      <span className="text-gray-200">
                        {it.name} <span className="text-luxury-gold font-bold">× {it.quantity}</span>
                      </span>
                      <span className="font-mono text-gray-300">
                        ETB {(Number(it.price) * it.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="rounded-lg bg-[#08170f] border border-[#183626] p-3 space-y-1.5">
                {selectedOrder.order_type === "DELIVERY" && (
                  <>
                    <div className="flex justify-between text-gray-400">
                      <span>Items Total</span>
                      <span className="text-gray-200 font-mono">
                        ETB {(Number(selectedOrder.total_amount) - Number(selectedOrder.delivery_fee || 0)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Delivery Fee</span>
                      <span className="text-luxury-gold font-mono font-medium">
                        ETB {Number(selectedOrder.delivery_fee || 0).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-baseline pt-1 border-t border-luxury-gold/10 font-bold">
                  <span className="text-white">Total Amount</span>
                  <span className="font-serif text-base text-luxury-gold font-bold">
                    ETB {Number(selectedOrder.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Status and Payment Information */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-[#08170f] p-3 border border-[#183626]">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Order Status</span>
                  <span className="font-bold text-white uppercase text-xs">
                    {selectedOrder.status === "out_for_delivery" ? "Out for Delivery" : selectedOrder.status}
                  </span>
                </div>
                <div className="rounded-lg bg-[#08170f] p-3 border border-[#183626]">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Payment ({selectedOrder.payment_method || "CASH"})</span>
                  <span className={`font-bold uppercase text-xs ${
                    selectedOrder.payment_status === "PAID" ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {selectedOrder.payment_status || "UNPAID"}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-wrap gap-2 pt-3 border-t border-[#1b3a2c]">
              {selectedOrder.order_type === "DELIVERY" ? (
                <>
                  {selectedOrder.status === "ready" && (
                    <button
                      onClick={async () => {
                        await handleUpdateOrderStatus(selectedOrder.id, "out_for_delivery");
                      }}
                      className="flex-1 rounded-lg bg-sky-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-sky-500 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Truck className="h-4 w-4" />
                      <span>Dispatch: Out For Delivery</span>
                    </button>
                  )}
                  {selectedOrder.status === "out_for_delivery" && (
                    <button
                      onClick={async () => {
                        await handleUpdateOrderStatus(selectedOrder.id, "delivered");
                      }}
                      className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>Mark Delivered</span>
                    </button>
                  )}
                </>
              ) : (
                selectedOrder.status === "ready" && (
                  <button
                    onClick={async () => {
                      await handleUpdateOrderStatus(selectedOrder.id, "delivered");
                    }}
                    className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>Mark Delivered</span>
                  </button>
                )
              )}

              {/* Confirm Cash */}
              {(selectedOrder.payment_status === "UNPAID" || !selectedOrder.payment_status) && (
                <button
                  onClick={async () => {
                    await handleConfirmCashPayment(selectedOrder.id);
                    setSelectedOrder((prev) => prev ? { ...prev, payment_status: "PAID" } : null);
                  }}
                  className="rounded-lg border border-luxury-gold/30 bg-luxury-gold/15 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-luxury-gold hover:bg-luxury-gold hover:text-luxury-green transition-all flex items-center gap-1.5"
                >
                  <Banknote className="h-4 w-4" />
                  <span>Confirm Cash</span>
                </button>
              )}

              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg border border-luxury-gold/20 bg-luxury-green/40 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Item Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-luxury-green/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-luxury-gold/20 bg-[#112920] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-luxury-gold/15 pb-4 mb-6">
              <h2 className="font-serif text-xl font-light text-white">
                {editingItem ? "Edit" : "Add"} <span className="text-gold-gradient font-normal italic">Menu Item</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Item Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wagyu Ribeye"
                  className="w-full rounded border border-luxury-gold/20 bg-luxury-green/50 p-3 text-xs text-white placeholder-gray-600 focus:border-luxury-gold focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Price (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 1200"
                    className="w-full rounded border border-luxury-gold/20 bg-luxury-green/50 p-3 text-xs text-white placeholder-gray-600 focus:border-luxury-gold focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded border border-luxury-gold/20 bg-luxury-green/50 p-3 text-xs text-white focus:border-luxury-gold focus:outline-none transition-all appearance-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name} className="bg-luxury-green text-white">
                        {cat.name}
                      </option>
                    ))}
                    {categories.length === 0 && (
                      <option value="Starters" className="bg-luxury-green text-white">Starters</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the dish, ingredients, preparation..."
                  rows={3}
                  className="w-full rounded border border-luxury-gold/20 bg-luxury-green/50 p-3 text-xs text-white placeholder-gray-600 focus:border-luxury-gold focus:outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Image</label>
                <div className="flex items-center gap-4">
                  {imageUrl && (
                    <img src={imageUrl} alt="Preview" className="h-12 w-12 rounded object-cover border border-luxury-gold/15" />
                  )}
                  {isUploading && <span className="text-xs text-luxury-gold">Uploading image...</span>}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-luxury-gold/20 file:bg-luxury-green-secondary/50 file:text-luxury-gold file:text-xs file:font-semibold file:uppercase file:tracking-wider hover:file:bg-luxury-green-secondary/80 cursor-pointer disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="h-4 w-4 rounded border-luxury-gold/20 bg-luxury-green/50 text-luxury-gold focus:ring-0 cursor-pointer"
                />
                <label htmlFor="available" className="text-xs text-gray-300 cursor-pointer">Available on menu</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-luxury-gold/15">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded border border-luxury-gold/20 bg-luxury-green-secondary/50 px-4 py-2 text-xs font-semibold tracking-widest text-luxury-gold uppercase hover:border-luxury-gold hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-luxury-gold px-6 py-2 text-xs font-semibold tracking-widest text-luxury-green uppercase hover:bg-luxury-gold-hover transition-all"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Admin Screen */}
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 py-8 flex-1 flex flex-col">
        {/* Executive Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-luxury-gold/15 pb-6">
          <div>
            <h1 className="font-serif text-3xl font-light text-white">
              Admin <span className="text-gold-gradient font-normal italic">Portal</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Golden Hotel Restaurant, Kitchen &amp; Payment Operations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/kitchen"
              className="flex items-center gap-1.5 rounded-lg border border-luxury-gold/30 bg-luxury-gold/15 px-3 py-1.5 text-xs text-luxury-gold hover:bg-luxury-gold/25 transition-all font-medium"
              title="Open Kitchen Display System"
            >
              <ChefHat className="h-3.5 w-3.5" />
              <span>Kitchen Display</span>
            </a>
            <button
              onClick={() => { fetchOrders(); fetchPayments(); }}
              className="flex items-center gap-1.5 rounded-lg border border-luxury-gold/20 bg-luxury-green-secondary/30 px-3 py-1.5 text-xs text-luxury-gold hover:text-white transition-all"
              title="Refresh Data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sync</span>
            </button>
            <StaffLogoutButton />
          </div>
        </div>

        {/* TOP KPI CARDS: STRICTLY BASED ON PAID PAYMENTS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-luxury-green-secondary/40 border border-luxury-gold/15 rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-gray-400 text-[10px] font-bold tracking-wider uppercase">Total Received</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="font-serif text-2xl font-bold text-white">ETB {totalRevenue.toFixed(2)}</p>
            <p className="text-[10px] text-gray-500 mt-1">Verified PAID revenue</p>
          </div>

          <div className="bg-luxury-green-secondary/40 border border-luxury-gold/15 rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-gray-400 text-[10px] font-bold tracking-wider uppercase">Cash Received</span>
              <Banknote className="h-4 w-4 text-luxury-gold" />
            </div>
            <p className="font-serif text-2xl font-bold text-luxury-gold">ETB {cashRevenue.toFixed(2)}</p>
            <p className="text-[10px] text-gray-500 mt-1">Confirmed on-site cash</p>
          </div>

          <div className="bg-luxury-green-secondary/40 border border-luxury-gold/15 rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-gray-400 text-[10px] font-bold tracking-wider uppercase">Digital Received</span>
              <CreditCard className="h-4 w-4 text-sky-400" />
            </div>
            <p className="font-serif text-2xl font-bold text-sky-300">ETB {digitalRevenue.toFixed(2)}</p>
            <p className="text-[10px] text-gray-500 mt-1">Chapa online payments</p>
          </div>

          <div className="bg-luxury-green-secondary/40 border border-amber-500/20 rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-amber-400 text-[10px] font-bold tracking-wider uppercase">Outstanding</span>
              <AlertCircle className="h-4 w-4 text-amber-400" />
            </div>
            <p className="font-serif text-2xl font-bold text-amber-300">ETB {outstandingRevenue.toFixed(2)}</p>
            <p className="text-[10px] text-gray-500 mt-1">Unpaid / pending orders</p>
          </div>
        </div>

        {/* MAIN BODY: SIDEBAR + CONTENT */}
        <div className="flex flex-col md:flex-row flex-1 gap-8 min-w-0">
          {/* Sidebar Navigation */}
          <aside className="hidden md:flex w-60 border border-luxury-gold/15 bg-luxury-green-secondary/30 flex-col rounded-xl shrink-0 p-4 h-fit space-y-2">
            <div className="pb-3 border-b border-luxury-gold/10 mb-2">
              <div className="flex items-center gap-2 text-white">
                <Shield className="h-4 w-4 text-luxury-gold" />
                <span className="font-serif text-sm font-bold tracking-wider">Navigation</span>
              </div>
            </div>

            {([
              { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { key: "menu", label: "Menu Items", icon: ShoppingBag },
              { key: "categories", label: "Categories", icon: Filter },
              { key: "orders", label: "Orders", icon: History },
              { key: "payments", label: "Payments", icon: CreditCard },
              { key: "qr", label: "QR Codes", icon: QrIcon },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all ${
                  activeTab === key
                    ? "bg-luxury-gold text-luxury-green shadow font-bold"
                    : "text-gray-400 hover:bg-luxury-green-secondary/60 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </aside>

          {/* Mobile Tab Navigation */}
          <div className="md:hidden flex overflow-x-auto gap-1 bg-luxury-green/40 rounded-lg p-1 border border-luxury-gold/10 mb-4">
            {([
              { key: "dashboard", label: "Dash" },
              { key: "menu", label: "Menu" },
              { key: "categories", label: "Categories" },
              { key: "orders", label: "Orders" },
              { key: "payments", label: "Payments" },
              { key: "qr", label: "QR" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 min-w-[70px] py-2 text-[10px] font-bold uppercase tracking-wider rounded-md text-center transition-all ${
                  activeTab === key ? "bg-luxury-gold text-luxury-green font-extrabold" : "text-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* CONTENT TABS */}
          <main className="flex-1 min-w-0">
            {/* 1. DASHBOARD TAB */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl text-white tracking-wide">Executive Dashboard</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Overview of hotel dining performance and active operations.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-luxury-gold/15 bg-[#0e241b] p-4 text-center">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Total Orders</p>
                    <p className="font-serif text-2xl font-bold text-white mt-1">{totalOrdersCount}</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-[#0e241b] p-4 text-center">
                    <p className="text-[10px] uppercase font-bold text-amber-400">Kitchen Active</p>
                    <p className="font-serif text-2xl font-bold text-amber-300 mt-1">{newCount + cookingCount}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-[#0e241b] p-4 text-center">
                    <p className="text-[10px] uppercase font-bold text-emerald-400">Ready for Pickup</p>
                    <p className="font-serif text-2xl font-bold text-emerald-300 mt-1">{readyCount}</p>
                  </div>
                  <div className="rounded-xl border border-gray-700 bg-[#0e241b] p-4 text-center">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Delivered</p>
                    <p className="font-serif text-2xl font-bold text-gray-300 mt-1">{deliveredCount}</p>
                  </div>
                </div>

                {/* Quick Order Highlights */}
                <div className="rounded-xl border border-luxury-gold/15 bg-luxury-green-secondary/30 p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-luxury-gold/10 pb-3">
                    <h3 className="font-serif text-base font-bold text-white">Recent Incoming Orders</h3>
                    <button onClick={() => setActiveTab("orders")} className="text-xs text-luxury-gold hover:underline">
                      View All Orders &rarr;
                    </button>
                  </div>

                  <div className="space-y-3">
                    {orders.slice(0, 5).map((ord) => (
                      <div key={ord.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-luxury-green/40 border border-luxury-gold/5 gap-2">
                        <div>
                          <span className="font-serif font-bold text-white">#{ord.id}</span>
                          <span className="ml-2 font-bold text-luxury-gold text-xs uppercase">{ord.delivery_location}</span>
                          <p className="text-xs text-gray-400 mt-0.5">{ord.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}</p>
                        </div>
                        <div className="flex items-center gap-2 sm:justify-end">
                          <span className="font-serif text-sm font-semibold text-white">ETB {Number(ord.total_amount).toFixed(2)}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${ord.status === "delivered" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-300"}`}>
                            {ord.status}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${ord.payment_status === "PAID" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-300"}`}>
                            {ord.payment_status || "UNPAID"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. MENU TAB */}
            {activeTab === "menu" && (
              <div>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-2xl text-white tracking-wide">Menu Items</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Manage dishes, prices, descriptions, and availability.</p>
                  </div>
                  <button
                    onClick={handleOpenAddModal}
                    className="flex items-center justify-center gap-2 rounded bg-luxury-gold px-4 py-2.5 text-xs font-semibold tracking-widest text-luxury-green uppercase transition-all hover:bg-luxury-gold-hover shadow-[0_0_12px_rgba(201,168,76,0.25)]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Item</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-luxury-gold/10 bg-luxury-green-secondary/20">
                  <table className="w-full border-collapse text-left text-sm text-gray-400">
                    <thead className="border-b border-luxury-gold/15 bg-luxury-green/40 font-serif text-xs font-semibold text-white tracking-widest uppercase">
                      <tr>
                        <th className="px-4 py-4 w-8"></th>
                        <th className="px-6 py-4">Item</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4 text-center">Available</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-luxury-gold/5">
                      {menu.map((item, index) => (
                        <tr
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={handleDrop}
                          onDragEnd={(e) => handleDrop(e)}
                          className={`hover:bg-luxury-green-secondary/10 transition-colors ${draggedIndex === index ? "opacity-50 bg-luxury-green-secondary/20" : ""}`}
                        >
                          <td className="px-4 py-4 cursor-grab text-gray-500 hover:text-luxury-gold">
                            <GripVertical className="h-4 w-4" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {item.image_url || item.image ? (
                                <img src={item.image_url || item.image} alt={item.name} className="h-10 w-10 rounded object-cover border border-luxury-gold/10" />
                              ) : (
                                <div className="h-10 w-10 rounded bg-luxury-green/60 border border-luxury-gold/10 flex items-center justify-center font-serif text-gray-500">
                                  {item.name.charAt(0)}
                                </div>
                              )}
                              <p className="font-serif text-sm font-semibold text-white">{item.name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-gray-400">{item.category}</td>
                          <td className="px-6 py-4 font-serif text-sm font-semibold text-luxury-gold">ETB {Number(item.price).toFixed(2)}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => toggleAvailability(item.id, item.available)}
                              className="inline-flex items-center justify-center p-1 text-gray-400 hover:text-white"
                              title={item.available ? "Set Unavailable" : "Set Available"}
                            >
                              {item.available ? <ToggleRight className="h-6 w-6 text-luxury-gold" /> : <ToggleLeft className="h-6 w-6 text-gray-600" />}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button onClick={() => handleOpenEditModal(item)} className="text-gray-400 hover:text-luxury-gold transition-colors p-1" title="Edit Item">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button onClick={() => setConfirmDelete({ type: "item", id: item.id, name: item.name })} className="text-gray-500 hover:text-rose-500 transition-colors p-1" title="Delete Item">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. CATEGORIES TAB */}
            {activeTab === "categories" && (
              <div>
                <div className="mb-6">
                  <h2 className="font-serif text-2xl text-white tracking-wide">Categories</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Manage menu categories and food groupings.</p>
                </div>
                <div className="max-w-md bg-luxury-green-secondary/30 border border-luxury-gold/10 rounded-xl p-6">
                  <div className="flex gap-3 mb-6">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name"
                      className="flex-1 rounded border border-luxury-gold/15 bg-luxury-green/60 p-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold"
                    />
                    <button onClick={handleAddCategory} className="rounded bg-luxury-gold px-4 py-2.5 text-xs font-semibold tracking-widest text-luxury-green uppercase hover:bg-luxury-gold-hover transition-all">
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between p-3 rounded-lg bg-luxury-green/40 border border-luxury-gold/5">
                        <span className="text-sm font-medium text-white">{cat.name}</span>
                        <button onClick={() => handleDeleteCategory(cat)} className="text-gray-500 hover:text-rose-500 p-1 transition-colors" title="Delete Category">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {categories.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">No categories added yet.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* 4. ORDERS TAB: DECOUPLED FOOD STATUS & PAYMENT STATUS */}
            {activeTab === "orders" && (
              <div>
                <div className="mb-6">
                  <h2 className="font-serif text-2xl text-white tracking-wide">Orders Management</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Independent food preparation and payment collection tracking.</p>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-4 items-center bg-luxury-green-secondary/20 border border-luxury-gold/10 rounded-xl p-4">
                  {/* Order Type Filter */}
                  <div className="flex items-center gap-1 bg-luxury-green/60 rounded-lg p-0.5 border border-luxury-gold/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-gold px-2">Type:</span>
                    {(["ALL", "HOTEL", "DELIVERY"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setOrderTypeFilter(type)}
                        className={`rounded px-3 py-1 text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1 ${
                          orderTypeFilter === type ? "bg-luxury-gold text-luxury-green font-extrabold" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {type === "HOTEL" && <Hotel className="h-3 w-3" />}
                        {type === "DELIVERY" && <Bike className="h-3 w-3" />}
                        <span>{type}</span>
                      </button>
                    ))}
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-2 text-xs">
                    <Filter className="h-4 w-4 text-luxury-gold" />
                    <span className="font-semibold text-gray-400 uppercase tracking-wider">Status:</span>
                  </div>
                  <div className="flex flex-wrap gap-1 bg-luxury-green/60 rounded-lg p-0.5 border border-luxury-gold/10">
                    {["All", "new", "cooking", "ready", "out_for_delivery", "delivered"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`rounded px-3 py-1 text-[10px] font-bold tracking-wider uppercase transition-all ${
                          statusFilter === status ? "bg-luxury-gold text-luxury-green font-extrabold" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {status === "out_for_delivery" ? "Out for Delivery" : status}
                      </button>
                    ))}
                  </div>

                  {/* Date Filter */}
                  <div className="relative flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500 absolute left-3 pointer-events-none" />
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="rounded border border-luxury-gold/10 bg-luxury-green/60 py-1.5 pl-9 pr-3 text-[11px] font-semibold text-white outline-none focus:border-luxury-gold"
                    />
                    {dateFilter && (
                      <button onClick={() => setDateFilter("")} className="text-xs text-gray-500 hover:text-white">
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="ml-auto text-[11px] text-gray-400">
                    Showing {filteredOrders.length} orders
                  </div>
                </div>

                {/* Orders Table */}
                <div className="overflow-x-auto rounded-xl border border-luxury-gold/10 bg-luxury-green-secondary/20">
                  <table className="w-full min-w-[940px] border-collapse text-left text-sm text-gray-400">
                    <thead className="border-b border-luxury-gold/15 bg-luxury-green/40 font-serif text-xs font-semibold text-white tracking-widest uppercase">
                      <tr>
                        <th className="px-3.5 py-3.5 whitespace-nowrap">Order ID</th>
                        <th className="px-3.5 py-3.5 whitespace-nowrap">Type</th>
                        <th className="px-3.5 py-3.5">Location / Address</th>
                        <th className="px-3.5 py-3.5">Items Summary</th>
                        <th className="px-3.5 py-3.5 whitespace-nowrap">Total</th>
                        <th className="px-3.5 py-3.5 whitespace-nowrap">Order Status</th>
                        <th className="px-3.5 py-3.5 whitespace-nowrap">Payment</th>
                        <th className="px-4 py-3.5 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-luxury-gold/5">
                      {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => {
                          const orderStatusNormalized = order.status === "in-progress" ? "cooking" : order.status;
                          const paymentStatus = order.payment_status || "UNPAID";
                          const isDelivery = order.order_type === "DELIVERY";

                          return (
                            <tr key={order.id} className="hover:bg-luxury-green-secondary/10 transition-colors group">
                              {/* Order ID */}
                              <td className="px-3.5 py-3 font-serif text-sm font-bold text-white whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="text-luxury-gold hover:underline font-bold"
                                  title="View full order details"
                                >
                                  #{order.id}
                                </button>
                              </td>

                              {/* Order Type Badge */}
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                {isDelivery ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300">
                                    <Bike className="h-3 w-3" />
                                    <span>Delivery</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded bg-luxury-gold/15 border border-luxury-gold/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-luxury-gold">
                                    <Hotel className="h-3 w-3" />
                                    <span>Hotel</span>
                                  </span>
                                )}
                              </td>

                              {/* Location or Address */}
                              <td className="px-3.5 py-3 max-w-[180px]">
                                {isDelivery ? (
                                  <div>
                                    <p className="text-xs font-bold text-white uppercase truncate" title={order.delivery_address || order.delivery_area || "Delivery"}>
                                      {order.delivery_address || order.delivery_area || "Delivery"}
                                    </p>
                                    <p className="text-[11px] text-gray-400 truncate">
                                      {order.delivery_name || order.customer_name}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-luxury-gold uppercase">
                                    {order.delivery_location}
                                  </span>
                                )}
                              </td>

                              {/* Items Summary */}
                              <td className="px-3.5 py-3 max-w-[180px]">
                                <div className="truncate text-xs text-gray-300" title={order.items.map((c) => `${c.name} (x${c.quantity})`).join(", ")}>
                                  {order.items.map((c) => `${c.name} (x${c.quantity})`).join(", ")}
                                </div>
                              </td>

                              {/* Total Amount */}
                              <td className="px-3.5 py-3 font-serif text-sm font-semibold text-white whitespace-nowrap">
                                ETB {Number(order.total_amount).toFixed(2)}
                              </td>

                              {/* FOOD STATUS BADGE */}
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                                  orderStatusNormalized === "new"
                                    ? "bg-luxury-gold/10 text-luxury-gold border-luxury-gold/25"
                                    : orderStatusNormalized === "cooking"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                                    : orderStatusNormalized === "ready"
                                    ? "bg-sky-500/10 text-sky-400 border-sky-500/25 animate-pulse"
                                    : orderStatusNormalized === "out_for_delivery"
                                    ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                }`}>
                                  {orderStatusNormalized === "out_for_delivery" ? "Out for Delivery" : orderStatusNormalized}
                                </span>
                              </td>

                              {/* PAYMENT STATUS BADGE */}
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                                  paymentStatus === "PAID"
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : paymentStatus === "UNPAID"
                                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                    : paymentStatus === "PENDING"
                                    ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                                    : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                }`}>
                                  {paymentStatus === "PAID" && <Check className="h-3 w-3" />}
                                  {paymentStatus} ({order.payment_method || "CASH"})
                                </span>
                              </td>

                              {/* ACTIONS */}
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5 min-w-[110px]">
                                  {/* View Details modal button */}
                                  <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="rounded border border-luxury-gold/20 bg-luxury-green/40 p-1.5 text-gray-300 hover:text-white hover:border-luxury-gold transition-all"
                                    title="View full order details"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>

                                  {/* Hotel Ready -> Deliver */}
                                  {!isDelivery && orderStatusNormalized === "ready" && (
                                    <button
                                      onClick={() => handleMarkOrderDelivered(order.id)}
                                      className="rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-500 transition-all"
                                      title="Mark order as delivered by waiter"
                                    >
                                      Deliver
                                    </button>
                                  )}

                                  {/* Delivery Ready -> Out for Delivery */}
                                  {isDelivery && orderStatusNormalized === "ready" && (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, "out_for_delivery")}
                                      className="rounded bg-sky-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-sky-500 transition-all flex items-center gap-1"
                                      title="Dispatch order out for delivery"
                                    >
                                      <Truck className="h-3 w-3" />
                                      <span>Out</span>
                                    </button>
                                  )}

                                  {/* Delivery Out for Delivery -> Deliver */}
                                  {isDelivery && orderStatusNormalized === "out_for_delivery" && (
                                    <button
                                      onClick={() => handleMarkOrderDelivered(order.id)}
                                      className="rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-500 transition-all"
                                      title="Mark order as delivered"
                                    >
                                      Delivered
                                    </button>
                                  )}

                                  {/* Confirm Cash */}
                                  {paymentStatus === "UNPAID" && (
                                    <button
                                      onClick={() => handleConfirmCashPayment(order.id)}
                                      className="rounded border border-luxury-gold/30 bg-luxury-gold/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-luxury-gold hover:bg-luxury-gold hover:text-luxury-green transition-all"
                                      title="Confirm cash received from customer"
                                    >
                                      Cash
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-500 italic font-serif">
                            No orders found matching this filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. PAYMENTS TAB (NEW DEDICATED SECTION) */}
            {activeTab === "payments" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl text-white tracking-wide">Payments Management</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Real-time transaction tracking, Chapa digital logs, and cash reconciliation.
                  </p>
                </div>

                {/* Filters & Search Bar */}
                <div className="flex flex-wrap gap-4 items-center bg-luxury-green-secondary/20 border border-luxury-gold/10 rounded-xl p-4">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search order #, transaction reference..."
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      className="w-full rounded border border-luxury-gold/10 bg-luxury-green/60 py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 outline-none focus:border-luxury-gold"
                    />
                  </div>

                  {/* Status filter */}
                  <div className="flex items-center gap-1 bg-luxury-green/60 rounded-lg p-1 border border-luxury-gold/10">
                    <span className="text-[10px] text-gray-400 uppercase font-bold px-2">Status:</span>
                    {["ALL", "PAID", "UNPAID", "PENDING", "FAILED"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setPaymentStatusFilter(st)}
                        className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
                          paymentStatusFilter === st
                            ? "bg-luxury-gold text-luxury-green font-extrabold"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {/* Method filter */}
                  <div className="flex items-center gap-1 bg-luxury-green/60 rounded-lg p-1 border border-luxury-gold/10">
                    <span className="text-[10px] text-gray-400 uppercase font-bold px-2">Method:</span>
                    {["ALL", "CASH", "DIGITAL"].map((m) => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethodFilter(m)}
                        className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
                          paymentMethodFilter === m
                            ? "bg-luxury-gold text-luxury-green font-extrabold"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Date Filter */}
                  <div className="relative">
                    <input
                      type="date"
                      value={paymentDateFilter}
                      onChange={(e) => setPaymentDateFilter(e.target.value)}
                      className="rounded border border-luxury-gold/10 bg-luxury-green/60 py-1.5 px-3 text-[11px] font-semibold text-white outline-none focus:border-luxury-gold"
                    />
                    {paymentDateFilter && (
                      <button
                        onClick={() => setPaymentDateFilter("")}
                        className="text-xs text-gray-500 hover:text-white ml-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Payments Table */}
                <div className="overflow-x-auto rounded-xl border border-luxury-gold/10 bg-luxury-green-secondary/20">
                  <table className="w-full border-collapse text-left text-sm text-gray-400">
                    <thead className="border-b border-luxury-gold/15 bg-luxury-green/40 font-serif text-xs font-semibold text-white tracking-widest uppercase">
                      <tr>
                        <th className="px-5 py-4">Order ID</th>
                        <th className="px-5 py-4">Amount</th>
                        <th className="px-5 py-4">Method</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Reference / Provider</th>
                        <th className="px-5 py-4">Paid At</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-luxury-gold/5">
                      {filteredPayments.length > 0 ? (
                        filteredPayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-luxury-green-secondary/10 transition-colors">
                            <td className="px-5 py-4 font-serif text-sm font-bold text-white">#{payment.order_id}</td>
                            <td className="px-5 py-4 font-serif text-sm font-semibold text-luxury-gold">
                              ETB {Number(payment.amount).toFixed(2)}
                            </td>
                            <td className="px-5 py-4 text-xs font-medium text-gray-300">
                              <span className="flex items-center gap-1.5">
                                {payment.method === "DIGITAL" ? (
                                  <CreditCard className="h-3.5 w-3.5 text-sky-400" />
                                ) : (
                                  <Banknote className="h-3.5 w-3.5 text-luxury-gold" />
                                )}
                                <span>{payment.method}</span>
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                                payment.status === "PAID"
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : payment.status === "UNPAID"
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                  : payment.status === "PENDING"
                                  ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs font-mono text-gray-400">
                              {payment.transaction_id || payment.provider_payment_id || (payment.provider ? `${payment.provider}` : "—")}
                            </td>
                            <td className="px-5 py-4 text-xs font-mono text-gray-500">
                              {payment.paid_at
                                ? new Date(payment.paid_at).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })
                                : "—"}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedPayment(payment)}
                                  className="rounded border border-luxury-gold/20 bg-luxury-green/40 p-1.5 text-gray-300 hover:text-white hover:border-luxury-gold transition-all"
                                  title="View Full Payment Audit Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                {payment.status === "UNPAID" && payment.method === "CASH" && (
                                  <button
                                    onClick={() => handleConfirmCashPayment(payment.order_id)}
                                    className="rounded bg-luxury-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-luxury-green hover:bg-luxury-gold-hover transition-all"
                                  >
                                    Confirm Cash
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic font-serif">
                            No payment records found matching this filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. QR GENERATOR TAB */}
            {activeTab === "qr" && (
              <div>
                <div className="mb-8 border-b border-luxury-gold/15 pb-6">
                  <h2 className="font-serif text-2xl text-white tracking-wide">QR Generator</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Generate ordering links and printable QR cards for tables and rooms.</p>
                </div>
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-xl border border-luxury-gold/10 bg-luxury-green-secondary/30 p-6">
                      <h3 className="font-serif text-lg font-semibold text-white tracking-wide mb-4 flex items-center gap-2">
                        <QrIcon className="h-5 w-5 text-luxury-gold" />
                        <span>Location Settings</span>
                      </h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Click below to generate the hotel universal QR code linking directly to the menu. Customers scan it and enter their table or room number.
                      </p>
                      <button
                        onClick={handleGenerateQR}
                        className="w-full rounded bg-luxury-gold py-3 text-xs font-semibold tracking-widest text-luxury-green uppercase hover:bg-luxury-gold-hover transition-all mt-3"
                      >
                        Generate QR Code
                      </button>
                      {qrGenerated && (
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1 mt-4">
                            Generated Link URL
                          </label>
                          <div className="w-full rounded border border-luxury-gold/5 bg-luxury-green/35 p-3 text-[10px] font-mono text-gray-400 break-all select-all">
                            {targetUrl}
                          </div>
                        </div>
                      )}
                      <div className="pt-4 flex flex-col sm:flex-row gap-3">
                        {qrGenerated && (
                          <a
                            href={qrUrl}
                            download="Golden-Hotel-Menu-QR.png"
                            className="flex flex-1 items-center justify-center gap-2 rounded bg-luxury-gold py-3 text-xs font-semibold tracking-widest text-luxury-green uppercase hover:bg-luxury-gold-hover transition-all"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download PNG</span>
                          </a>
                        )}
                        <button
                          onClick={handlePrint}
                          className="flex flex-1 items-center justify-center gap-2 rounded border border-luxury-gold/20 bg-luxury-green-secondary/50 py-3 text-xs font-semibold tracking-widest text-luxury-gold uppercase hover:border-luxury-gold hover:text-white transition-all"
                        >
                          <Printer className="h-4 w-4" />
                          <span>Print Card</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3 flex flex-col items-center">
                    <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-4">
                      Printable Card Preview
                    </span>
                    <div id="qr-print-card" className="relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-t-xl bg-[#112920] shadow-2xl border-b-[12px] border-luxury-gold">
                      <div className="flex w-full flex-col items-center bg-[#112920] p-8">
                        <span className="font-serif text-2xl font-bold tracking-widest text-white uppercase">
                          Golden Hotel
                        </span>
                        <span className="text-[8px] font-sans tracking-[0.25em] text-luxury-gold uppercase mt-0.5">
                          Restaurant &amp; Room Service
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center my-4 bg-[#112920]">
                        <span className="font-serif text-xs italic text-white mb-4 text-center">
                          Scan below to view our menu <br /> and place your order.
                        </span>
                        <div className="rounded-xl bg-white p-2 shadow-sm border-2 border-luxury-gold/50">
                          {qrUrl ? (
                            <img src={qrUrl} alt="Golden Hotel Menu QR Code" className="h-44 w-44 object-contain" />
                          ) : (
                            <div className="h-44 w-44 flex items-center justify-center text-xs text-gray-400">
                              Click Generate...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
