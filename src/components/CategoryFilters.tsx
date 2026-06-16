"use client";

import React from "react";
import { LayoutGrid, Soup, ConciergeBell, Coffee, CakeSlice, Utensils } from "lucide-react";

interface CategoryFiltersProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat === "all") return <LayoutGrid className="w-4 h-4" />;
  if (cat.includes("starter")) return <Soup className="w-4 h-4" />;
  if (cat.includes("main")) return <ConciergeBell className="w-4 h-4" />;
  if (cat.includes("drink") || cat.includes("beverage")) return <Coffee className="w-4 h-4" />;
  if (cat.includes("dessert") || cat.includes("sweet")) return <CakeSlice className="w-4 h-4" />;
  return <Utensils className="w-4 h-4" />;
};

export default function CategoryFilters({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFiltersProps) {
  const allCategories = ["All", ...categories];

  return (
    <div className="w-full border-y border-luxury-gold/15 bg-luxury-green-secondary/50 py-4">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="no-scrollbar flex overflow-x-auto gap-4 py-1">
          {allCategories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => onSelectCategory(category)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-6 py-2 text-xs font-semibold tracking-widest uppercase transition-all duration-300 ${
                  isSelected
                    ? "border-luxury-gold bg-luxury-gold text-luxury-green shadow-[0_0_12px_rgba(201,168,76,0.3)]"
                    : "border-luxury-gold/20 bg-luxury-green/60 text-gray-400 hover:border-luxury-gold/50 hover:text-white"
                }`}
              >
                {getCategoryIcon(category)}
                {category}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

