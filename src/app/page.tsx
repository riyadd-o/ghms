"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MenuItem } from "@/types";
import CategoryFilters from "@/components/CategoryFilters";
import MenuItemCard from "@/components/MenuItemCard";
import CartStickyButton from "@/components/CartStickyButton";
import { Search } from "lucide-react";

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

  useEffect(() => {
    setMounted(true);
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

  return (
    <div className="min-h-screen bg-luxury-black pb-28">
      <section className="relative flex flex-col items-center justify-center bg-luxury-charcoal/30 py-16 px-6 text-center border-b border-luxury-gold/10">
        <div className="absolute top-1/2 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-luxury-gold/5 blur-[80px]" />
        <h1 className="font-serif text-3xl sm:text-5xl font-light tracking-wide text-white mb-2">
          Discover <span className="text-gold-gradient font-normal italic">Our Menu</span>
        </h1>
        <p className="text-xs sm:text-sm font-light tracking-widest text-gray-400 uppercase">Order from your table or hotel room</p>
        <div className="relative mt-8 w-full max-w-md">
          <input ref={searchInputRef} type="text" placeholder="What would you like today?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={handleSearchFocus} className="w-full rounded-full border border-luxury-gold/10 bg-luxury-black/60 py-3 pl-12 pr-6 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300 focus:border-luxury-gold/45 focus:ring-1 focus:ring-luxury-gold/20" />
          <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-gray-500" />
        </div>
      </section>
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
