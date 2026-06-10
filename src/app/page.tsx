"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MenuItem } from "@/types";
import CategoryFilters from "@/components/CategoryFilters";
import MenuItemCard from "@/components/MenuItemCard";
import CartStickyButton from "@/components/CartStickyButton";
import { Search } from "lucide-react";
import { useStore } from "@/store/useStore";
import Toast, { ToastMessage } from "@/components/Toast";

export default function Home() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [keyboardPadding, setKeyboardPadding] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const addToCart = useStore((state) => state.addToCart);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const addToast = (msg: ToastMessage) => setToasts((prev) => [...prev, msg]);
  const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const handleOrderSpecial = (item: MenuItem) => {
    addToCart(item, 1);
    addToast({ id: Date.now(), type: "success", message: `${item.name} added to cart!` });
  };

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setIsLoaded(true), 100);

    const fetchData = async () => {
      try {
        const [menuRes, catRes] = await Promise.all([
          fetch("/api/menu-items", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
        ]);
        if (menuRes.ok) setMenu(await menuRes.json());
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.map((c: { name: string }) => c.name));
        }
      } catch (err) {
        console.error("Failed to fetch menu data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const handleResize = () => {
      const keyboardHeight = window.innerHeight - viewport.height;
      if (keyboardHeight > 100 && window.innerWidth < 768) {
        setKeyboardPadding(keyboardHeight);
      } else {
        setKeyboardPadding(0);
      }
    };
    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleResize);
    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleResize);
    };
  }, []);

  const handleSearchFocus = useCallback(() => {
    setTimeout(() => {
      searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-luxury-black flex flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-luxury-gold" />
        <p className="mt-4 font-serif text-sm text-luxury-gold tracking-widest uppercase">Loading Menu...</p>
      </div>
    );
  }

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredMenu = menu.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    if (!trimmedQuery) return matchesCategory;
    const nameMatch = item.name.toLowerCase().includes(trimmedQuery);
    const descMatch = item.description ? item.description.toLowerCase().includes(trimmedQuery) : false;
    return matchesCategory && (nameMatch || descMatch);
  });

  const specialItem = menu.find(item => item.available);

  return (
    <div className="min-h-screen bg-luxury-black pb-28">
      <div className="fixed top-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>
      <section className="relative flex flex-col items-center justify-center bg-luxury-charcoal/30 py-8 px-6 text-center border-b border-luxury-gold/10">
        <div className="absolute top-1/2 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-luxury-gold/5 blur-[80px]" />
        
        <div className={`mb-4 transition-all duration-1000 ease-out ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <span className="rounded-full border border-luxury-gold px-4 py-1.5 text-[10px] font-bold tracking-[0.2em] text-luxury-gold uppercase">✦ Welcome to Golden Hotel ✦</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-light tracking-wide text-white mb-2">
          Discover <span className="text-gold-gradient font-normal italic">Our Menu</span>
        </h1>
        <p className="text-xs sm:text-sm font-light tracking-widest text-gray-400 uppercase">Order from your table or hotel room</p>
        <div className="relative mt-4 w-full max-w-md">
          <input ref={searchInputRef} type="text" placeholder="What would you like today?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={handleSearchFocus} className="w-full rounded-full border border-luxury-gold/10 bg-luxury-black/60 py-3 pl-12 pr-6 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300 focus:border-luxury-gold/45 focus:ring-1 focus:ring-luxury-gold/20" />
          <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-gray-500" />
        </div>
      </section>

      {/* Today's Special */}
      {specialItem && (
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-4 pt-2">
          <div className="bg-[#1A1A1A] rounded-lg border border-luxury-gold/10 flex flex-row items-center justify-between gap-2 p-2 sm:p-3 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-luxury-gold" />
            
            <div className="flex flex-row items-center gap-3 pl-2 flex-1 min-w-0">
              {specialItem.image ? (
                <img src={specialItem.image} alt={specialItem.name} className="w-12 h-12 sm:w-[60px] sm:h-[60px] rounded object-cover border border-luxury-gold/20 shrink-0" />
              ) : (
                <div className="w-12 h-12 sm:w-[60px] sm:h-[60px] rounded bg-luxury-black flex items-center justify-center border border-luxury-gold/20 shrink-0"><span className="text-luxury-gold text-sm">🍽️</span></div>
              )}
              <div className="flex flex-col justify-center min-w-0">
                <div className="text-luxury-gold text-[8px] sm:text-[10px] font-bold tracking-widest uppercase mb-0.5">⚡ Today's Special</div>
                <div className="text-white font-bold text-xs sm:text-sm truncate">{specialItem.name}</div>
                <div className="text-luxury-gold font-serif text-[10px] sm:text-xs">ETB {Number(specialItem.price).toFixed(2)}</div>
              </div>
            </div>
            <button onClick={() => handleOrderSpecial(specialItem)} className="bg-luxury-gold text-luxury-black font-bold uppercase tracking-widest text-[9px] sm:text-xs py-2 px-3 sm:py-2.5 sm:px-5 rounded hover:bg-luxury-gold-hover hover:shadow-[0_0_10px_rgba(201,168,76,0.2)] transition-all shrink-0">
              Order Now
            </button>
          </div>
        </div>
      )}

      <CategoryFilters categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      <main ref={resultsRef} className="mx-auto max-w-7xl px-6 py-12 sm:px-8" style={{ paddingBottom: keyboardPadding > 0 ? `${keyboardPadding}px` : undefined }}>
        {filteredMenu.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMenu.map((item) => (<MenuItemCard key={item.id} item={item} />))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-serif text-lg text-gray-500 italic mb-2">No items found for your search.</p>
            <p className="text-xs text-gray-600">Try a different category or adjust your search.</p>
          </div>
        )}
      </main>
      {mounted && <CartStickyButton />}
    </div>
  );
}
