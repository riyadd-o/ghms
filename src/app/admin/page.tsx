"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { MenuItem, Category, Order } from "@/types";
import { Plus, Edit, Trash2, Shield, ShoppingBag, History, ToggleLeft, ToggleRight, X, Filter, Calendar, QrCode as QrIcon, Download, Printer, DollarSign, TrendingUp, Package, Clock } from "lucide-react";
import QRCode from "qrcode";

import StaffLogoutButton from "@/components/StaffLogoutButton";
import Toast, { ToastMessage } from "@/components/Toast";

export default function AdminPanel() {
  // ---- Data State ----
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- UI State ----
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"menu" | "categories" | "orders" | "qr">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_active_tab");
      if (saved === "menu" || saved === "categories" || saved === "orders" || saved === "qr") return saved;
    }
    return "orders";
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Confirm Delete modal state
  const [confirmDelete, setConfirmDelete] = useState<{ type: "item" | "category"; id?: number | string; name: string } | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<string>("Starters");
  const [image, setImage] = useState("");
  const [available, setAvailable] = useState(true);

  // Categories UI
  const [newCategoryName, setNewCategoryName] = useState("");

  // Orders filter UI
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // QR Generator UI
  const [qrUrl, setQrUrl] = useState("");
  const [qrGenerated, setQrGenerated] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (msg: ToastMessage) => {
    setToasts((prev) => [...prev, msg]);
  };
  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const targetUrl = typeof window !== "undefined" ? `${window.location.origin}/` : `/`;

  // ---- Data fetching ----
  const fetchMenu = useCallback(async () => {
    try { const res = await fetch("/api/menu-items"); if (res.ok) setMenu(await res.json()); } catch (err) { console.error(err); }
  }, []);
  const fetchCategories = useCallback(async () => {
    try { const res = await fetch("/api/categories"); if (res.ok) setCategories(await res.json()); } catch (err) { console.error(err); }
  }, []);
  const fetchOrders = useCallback(async () => {
    try { const res = await fetch("/api/orders"); if (res.ok) setOrders(await res.json()); } catch (err) { console.error(err); }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchMenu(), fetchCategories(), fetchOrders()]);
    } catch (err) {
      console.error(err);
      addToast({ id: Date.now(), type: "error", message: "Failed to load data" });
    } finally {
      setLoading(false);
    }
  }, [fetchMenu, fetchCategories, fetchOrders]);

  useEffect(() => {
    setMounted(true);
    fetchAll();
  }, [fetchAll]);

  // Persist active tab
  useEffect(() => {
    if (mounted) localStorage.setItem("admin_active_tab", activeTab);
  }, [activeTab, mounted]);

  // Poll orders every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

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

  // ---- UI actions ----
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategory(categories.length > 0 ? categories[0].name : "Starters");
    setImage("");
    setAvailable(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description);
    setPrice(String(item.price));
    setCategory(item.category);
    setImage(item.image);
    setAvailable(item.available);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
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
        await updateMenuItem(editingItem.id, { name, description, price: priceNum, category, category_id, image, available });
        setIsModalOpen(false);
        addToast({ id: Date.now(), type: "success", message: "Item updated successfully" });
      } else {
        await createMenuItem({ name, description, price: priceNum, category, category_id, image, available });
        setIsModalOpen(false);
        addToast({ id: Date.now(), type: "success", message: "Menu item added" });
      }
      await fetchMenu();
    } catch (err) {
      console.error(err);
      addToast({ id: Date.now(), type: "error", message: (err as Error).message });
    }
  };

  const handleGenerateQR = async () => {
    try {
      const url = await QRCode.toDataURL(targetUrl, {
        width: 400,
        margin: 2,
        color: { dark: "#0A0A0A", light: "#FFFFFF" },
      });
      setQrUrl(url);
      setQrGenerated(true);
    } catch (err) {
      console.error(err);
      addToast({ id: Date.now(), type: "error", message: "QR generation failed" });
    }
  };

  const handlePrint = () => window.print();

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName.trim());
      addToast({ id: Date.now(), type: "success", message: "Category added" });
      setNewCategoryName("");
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

  // ---- Stats ----
  const totalRevenue = orders.filter((o) => o.status === "delivered").reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalOrders = orders.length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const pendingCount = orders.filter((o) => o.status === "new" || o.status === "in-progress").length;

  // ---- Filtered Orders ----
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    let matchesDate = true;
    if (dateFilter) {
      const orderDate = new Date(order.created_at).toISOString().split("T")[0];
      matchesDate = orderDate === dateFilter;
    }
    return matchesStatus && matchesDate;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-luxury-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-luxury-gold/20 bg-[#1A1A1A] p-6 shadow-2xl text-center">
            <h2 className="font-serif text-xl font-semibold text-white mb-2">Confirm Delete</h2>
            <p className="text-sm text-gray-400 mb-6">Are you sure you want to delete this? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded border border-luxury-gold/20 bg-luxury-charcoal/50 py-2.5 text-xs font-semibold tracking-widest text-luxury-gold uppercase hover:border-luxury-gold hover:text-white transition-all">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="flex-1 rounded bg-rose-600 py-2.5 text-xs font-semibold tracking-widest text-white uppercase hover:bg-rose-700 transition-all shadow-[0_0_12px_rgba(225,29,72,0.25)]">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-luxury-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-luxury-gold/20 bg-[#1A1A1A] p-6 shadow-2xl">
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
                  className="w-full rounded border border-luxury-gold/20 bg-luxury-black/50 p-3 text-xs text-white placeholder-gray-600 focus:border-luxury-gold focus:outline-none transition-all"
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
                    className="w-full rounded border border-luxury-gold/20 bg-luxury-black/50 p-3 text-xs text-white placeholder-gray-600 focus:border-luxury-gold focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded border border-luxury-gold/20 bg-luxury-black/50 p-3 text-xs text-white focus:border-luxury-gold focus:outline-none transition-all appearance-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name} className="bg-luxury-black text-white">
                        {cat.name}
                      </option>
                    ))}
                    {categories.length === 0 && (
                      <option value="Starters" className="bg-luxury-black text-white">Starters</option>
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
                  className="w-full rounded border border-luxury-gold/20 bg-luxury-black/50 p-3 text-xs text-white placeholder-gray-600 focus:border-luxury-gold focus:outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Image</label>
                <div className="flex items-center gap-4">
                  {image && (
                    <img src={image} alt="Preview" className="h-12 w-12 rounded object-cover border border-luxury-gold/15" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-luxury-gold/20 file:bg-luxury-charcoal/50 file:text-luxury-gold file:text-xs file:font-semibold file:uppercase file:tracking-wider hover:file:bg-luxury-charcoal/80 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="rounded border-luxury-gold/20 bg-luxury-black text-luxury-gold focus:ring-0"
                />
                <label htmlFor="available" className="text-[11px] font-semibold uppercase tracking-wider text-gray-300 select-none cursor-pointer">
                  Available for ordering
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-luxury-gold/15">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded border border-luxury-gold/20 bg-luxury-charcoal/50 py-3 text-xs font-semibold tracking-widest text-luxury-gold uppercase hover:border-luxury-gold hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded bg-luxury-gold py-3 text-xs font-semibold tracking-widest text-luxury-black uppercase hover:bg-luxury-gold-hover hover:shadow-[0_0_12px_rgba(201,168,76,0.25)] transition-all"
                >
                  {editingItem ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-8 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-luxury-gold/15 pb-6">
          <div>
            <h1 className="font-serif text-3xl font-light text-white">
              Management <span className="text-gold-gradient font-normal italic">Portal</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-light tracking-wide">Control menu, categories, and orders.</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span></span>
              <span>Live</span>
            </div>
            <StaffLogoutButton />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           <div className="bg-luxury-charcoal/40 border border-luxury-gold/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">Total Revenue</span>
                <DollarSign className="h-4 w-4 text-luxury-gold" />
              </div>
              <p className="font-serif text-2xl font-bold text-white">ETB {totalRevenue.toFixed(2)}</p>
           </div>
           <div className="bg-luxury-charcoal/40 border border-luxury-gold/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">Total Orders</span>
                <TrendingUp className="h-4 w-4 text-luxury-gold" />
              </div>
              <p className="font-serif text-2xl font-bold text-white">{totalOrders}</p>
           </div>
           <div className="bg-luxury-charcoal/40 border border-luxury-gold/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">Delivered</span>
                <Package className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="font-serif text-2xl font-bold text-white">{deliveredCount}</p>
           </div>
           <div className="bg-luxury-charcoal/40 border border-luxury-gold/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">Pending</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <p className="font-serif text-2xl font-bold text-white">{pendingCount}</p>
           </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 gap-8">
          {/* Sidebar (desktop) */}
          <aside className="hidden md:flex w-64 border-r border-luxury-gold/15 bg-luxury-charcoal/30 flex-col rounded-l-lg shrink-0">
          <div className="p-6 border-b border-luxury-gold/10">
            <div className="flex items-center gap-2 text-white">
              <Shield className="h-5 w-5 text-luxury-gold" />
              <span className="font-serif text-lg tracking-wider font-semibold">Management</span>
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Golden Hotel Staff Portal</p>
            <div className="mt-4"><StaffLogoutButton /></div>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {(["menu", "categories", "orders", "qr"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex w-full items-center gap-3 rounded px-4 py-3 text-sm font-semibold tracking-wide transition-all ${
                  activeTab === key
                    ? "bg-luxury-gold text-luxury-black shadow-[0_0_12px_rgba(201,168,76,0.15)] font-bold"
                    : "text-gray-400 hover:bg-luxury-charcoal/60 hover:text-white"
                }`}
              >
                {key === "menu" && <ShoppingBag className="h-4.5 w-4.5" />}
                {key === "categories" && <Filter className="h-4.5 w-4.5" />}
                {key === "orders" && <History className="h-4.5 w-4.5" />}
                {key === "qr" && <QrIcon className="h-4.5 w-4.5" />}
                <span className="capitalize">{key === "qr" ? "QR" : key}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Mobile Tabs */}
          <div className="md:hidden mb-6">
            <div className="flex bg-luxury-black/40 rounded-lg p-1 border border-luxury-gold/10">
              {(["menu", "categories", "orders", "qr"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2.5 text-[10px] font-semibold tracking-widest uppercase transition-all ${
                    activeTab === key ? "bg-luxury-gold text-luxury-black shadow-sm" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* MENU TAB */}
          {activeTab === "menu" && (
            <div>
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="font-serif text-2xl text-white tracking-wide">Menu Items</h1>
                  <p className="text-xs text-gray-500 mt-0.5">Manage items, availability, and tags for your menu.</p>
                </div>
                <button onClick={handleOpenAddModal} className="flex items-center justify-center gap-2 rounded bg-luxury-gold px-4 py-2.5 text-xs font-semibold tracking-widest text-luxury-black uppercase transition-all duration-300 hover:bg-luxury-gold-hover hover:shadow-[0_0_12px_rgba(201,168,76,0.25)]">
                  <Plus className="h-4 w-4" />
                  <span>Add New Item</span>
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-luxury-gold/10 bg-luxury-charcoal/20">
                <table className="w-full border-collapse text-left text-sm text-gray-400">
                  <thead className="border-b border-luxury-gold/15 bg-luxury-black/40 font-serif text-xs font-semibold text-white tracking-widest uppercase">
                    <tr>
                      <th className="px-6 py-4">Item</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4 text-center">Available</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury-gold/5">
                    {menu.map((item) => (
                      <tr key={item.id} className="hover:bg-luxury-charcoal/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="h-10 w-10 rounded object-cover border border-luxury-gold/10" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-luxury-black/60 border border-luxury-gold/10 flex items-center justify-center">
                                <span className="font-serif text-gray-500 uppercase">{item.name.charAt(0)}</span>
                              </div>
                            )}
                            <div>
                              <p className="font-serif text-sm font-semibold text-white">{item.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-400">{item.category}</td>
                        <td className="px-6 py-4 font-serif text-sm font-semibold text-luxury-gold">ETB {Number(item.price).toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => toggleAvailability(item.id, item.available)} className="inline-flex items-center justify-center p-1 text-gray-400 hover:text-white" title={item.available ? "Set Unavailable" : "Set Available"}>
                            {item.available ? <ToggleRight className="h-6 w-6 text-luxury-gold" /> : <ToggleLeft className="h-6 w-6 text-gray-600" />}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => handleOpenEditModal(item)} className="text-gray-400 hover:text-luxury-gold transition-colors p-1" title="Edit Item"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => setConfirmDelete({ type: "item", id: item.id, name: item.name })} className="text-gray-500 hover:text-rose-500 transition-colors p-1" title="Delete Item"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === "categories" && (
            <div>
              <div className="mb-8">
                <h1 className="font-serif text-2xl text-white tracking-wide">Categories</h1>
                <p className="text-xs text-gray-500 mt-0.5">Manage menu categories.</p>
              </div>
              <div className="max-w-md bg-luxury-charcoal/30 border border-luxury-gold/10 rounded-lg p-6">
                <div className="flex gap-3 mb-6">
                  <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name" className="flex-1 rounded border border-luxury-gold/15 bg-luxury-black/60 p-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-luxury-gold" />
                  <button onClick={handleAddCategory} className="rounded bg-luxury-gold px-4 py-2.5 text-xs font-semibold tracking-widest text-luxury-black uppercase hover:bg-luxury-gold-hover hover:shadow-[0_0_12px_rgba(201,168,76,0.25)] transition-all">Add</button>
                </div>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between p-3 rounded bg-luxury-black/40 border border-luxury-gold/5">
                      <span className="text-sm font-medium text-white">{cat.name}</span>
                      <button onClick={() => handleDeleteCategory(cat)} className="text-gray-500 hover:text-rose-500 p-1 transition-colors" title="Delete Category"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {categories.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">No categories added yet.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === "orders" && (
            <div>
              <div className="mb-8">
                <h1 className="font-serif text-2xl text-white tracking-wide">Orders History</h1>
                <p className="text-xs text-gray-500 mt-0.5">Review past orders. Filter by status or date.</p>
              </div>
              {/* Filter Bar */}
              <div className="mb-6 flex flex-wrap gap-4 items-center bg-luxury-charcoal/20 border border-luxury-gold/10 rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs"><Filter className="h-4 w-4 text-luxury-gold" /><span className="font-semibold text-gray-400 uppercase tracking-wider">Filters:</span></div>
                {/* Status filter */}
                <div className="flex gap-1 bg-luxury-black/60 rounded p-0.5 border border-luxury-gold/10">
                  {["All", "new", "in-progress", "delivered"].map((status) => (
                    <button key={status} onClick={() => setStatusFilter(status)} className={`rounded px-3 py-1 text-[10px] font-bold tracking-wider uppercase transition-all ${statusFilter === status ? "bg-luxury-gold text-luxury-black font-extrabold" : "text-gray-400 hover:text-white"}`}>{status}</button>
                  ))}
                </div>
                {/* Date filter */}
                <div className="relative flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500 absolute left-3 pointer-events-none" />
                  <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="rounded border border-luxury-gold/10 bg-luxury-black/60 py-1.5 pl-9 pr-3 text-[11px] font-semibold text-white outline-none focus:border-luxury-gold" />
                  {dateFilter && <button onClick={() => setDateFilter("")} className="text-xs text-gray-500 hover:text-white">Clear Date</button>}
                </div>
                <div className="ml-auto text-[11px] text-gray-500">Showing {filteredOrders.length} orders</div>
              </div>
              {/* Orders Table */}
              <div className="overflow-x-auto rounded-lg border border-luxury-gold/10 bg-luxury-charcoal/20">
                <table className="w-full border-collapse text-left text-sm text-gray-400">
                  <thead className="border-b border-luxury-gold/15 bg-luxury-black/40 font-serif text-xs font-semibold text-white tracking-widest uppercase">
                    <tr>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4">Items Summary</th>
                      <th className="px-6 py-4">Total Amount</th>
                      <th className="px-6 py-4">Placed At</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury-gold/5">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-luxury-charcoal/10 transition-colors">
                          <td className="px-6 py-4 font-serif text-sm font-bold text-white">#{order.id}</td>
                          <td className="px-6 py-4 text-xs font-bold text-luxury-gold uppercase">{order.delivery_location}</td>
                          <td className="px-6 py-4"><div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-xs text-gray-400">{order.items.map((c) => `${c.name} (x${c.quantity})`).join(", ")}</div></td>
                          <td className="px-6 py-4 font-serif text-sm font-semibold text-white">ETB {Number(order.total_amount).toFixed(2)}</td>
                          <td className="px-6 py-4 text-xs text-gray-500 font-mono">{new Date(order.created_at).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}</td>
                          <td className="px-6 py-4 text-right"><span className={`inline-block rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${order.status === "new" ? "bg-luxury-gold/10 text-luxury-gold border-luxury-gold/20" : order.status === "in-progress" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>{order.status}</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic font-serif">No orders found matching this filter.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* QR TAB */}
          {activeTab === "qr" && (
            <div>
              <div className="mb-8 border-b border-luxury-gold/15 pb-6">
                <h1 className="font-serif text-2xl text-white tracking-wide">QR Generator</h1>
                <p className="text-xs text-gray-500 mt-0.5">Generate ordering links and printable QR cards for tables and rooms.</p>
              </div>
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
                {/* Generator Controls */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-lg border border-luxury-gold/10 bg-luxury-charcoal/30 p-6">
                    <h2 className="font-serif text-lg font-semibold text-white tracking-wide mb-4 flex items-center gap-2"><QrIcon className="h-5 w-5 text-luxury-gold" /><span>Location Settings</span></h2>
                    <p className="text-xs text-gray-400 leading-relaxed">Click the button below to generate a universal QR code that links directly to the menu. Customers scan it and enter their own table or room number when placing an order.</p>
                    <button onClick={handleGenerateQR} className="w-full rounded bg-luxury-gold py-3 text-xs font-semibold tracking-widest text-luxury-black uppercase hover:bg-luxury-gold-hover hover:shadow-[0_0_10px_rgba(201,168,76,0.2)] transition-all mt-2">Generate QR Code</button>
                    {qrGenerated && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1 mt-4">Generated Link URL</label>
                        <div className="w-full rounded border border-luxury-gold/5 bg-luxury-black/35 p-3 text-[10px] font-mono text-gray-400 break-all select-all">{targetUrl}</div>
                      </div>
                    )}
                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      {qrGenerated && (
                        <a href={qrUrl} download={`Golden-Hotel-Menu-QR.png`} className="flex flex-1 items-center justify-center gap-2 rounded bg-luxury-gold py-3 text-xs font-semibold tracking-widest text-luxury-black uppercase hover:bg-luxury-gold-hover hover:shadow-[0_0_10px_rgba(201,168,76,0.2)] transition-all">
                          <Download className="h-4 w-4" />
                          <span>Download PNG</span>
                        </a>
                      )}
                      <button onClick={handlePrint} className="flex flex-1 items-center justify-center gap-2 rounded border border-luxury-gold/20 bg-luxury-charcoal/50 py-3 text-xs font-semibold tracking-widest text-luxury-gold uppercase hover:border-luxury-gold hover:text-white transition-all"> <Printer className="h-4 w-4" /> <span>Print Card</span> </button>
                    </div>
                  </div>
                </div>
                {/* Card Mockup */}
                <div className="lg:col-span-3 flex flex-col items-center">
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      @page { size: A4 portrait; margin: 5mm; }
                      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                      body * { visibility: hidden; }
                      #qr-print-card, #qr-print-card * { visibility: visible; }
                      #qr-print-card { page-break-inside: avoid; break-inside: avoid; position: static; margin: 0 auto; width: 100% !important; max-width: 190mm !important; max-height: 250mm !important; border: 12px solid #C9A84C !important; background-color: #1A1A1A !important; box-sizing: border-box; padding: 10mm !important; display: flex; flex-direction: column; align-items: center; }
                      #qr-print-card .star-row { margin-bottom: 5mm; }
                      #qr-print-card svg { fill: #C9A84C !important; color: #C9A84C !important; }
                    }
                  `}} />
                  <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-4">Printable Card Preview</span>
                  <div id="qr-print-card" className="relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-t-xl bg-[#1A1A1A] shadow-2xl print:shadow-none print:max-w-none border-b-[12px] border-luxury-gold print:justify-center print:p-4">
                    <div className="star-row flex gap-1 text-luxury-gold print:text-luxury-gold mb-2">{[...Array(5)].map((_, i) => (<svg key={i} className="h-4 w-4 fill-current print:h-3 print:w-3" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>))}</div>
                    <div className="absolute top-0 h-2 w-full bg-luxury-gold print:hidden" />
                    <div className="flex w-full flex-col items-center bg-[#1A1A1A] p-8 print:bg-[#1A1A1A]">
                      <div className="mb-6 flex gap-1 text-luxury-gold print:text-luxury-gold">{[...Array(5)].map((_, i) => (<svg key={i} className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>))}</div>
                      <span className="font-serif text-2xl font-bold tracking-widest text-white print:text-white uppercase">Golden Hotel</span>
                      <span className="text-[8px] font-sans tracking-[0.25em] text-luxury-gold print:text-luxury-gold uppercase mt-0.5">Restaurant &amp; Room Service</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center my-4 print:my-8 bg-[#1A1A1A]">
                      <span className="font-serif text-xs italic text-white print:text-xs print:mb-4 text-center">Scan below to view our menu <br /> and place your order.</span>
                      <div className="rounded-xl bg-white p-2 shadow-sm print:p-2 border-2 border-luxury-gold/50 print:border-none">
                        {qrUrl ? (<img src={qrUrl} alt="Golden Hotel Menu QR Code" className="h-44 w-44 object-contain print:h-40 print:w-40" />) : (<div className="h-44 w-44 flex items-center justify-center text-xs text-gray-400 print:h-64 print:w-64">Click Generate...</div>)}
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
