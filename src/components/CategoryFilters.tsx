"use client";

import React from "react";

interface CategoryFiltersProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryFilters({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFiltersProps) {
  const allCategories = ["All", ...categories];

  return (
    <div className="w-full border-y border-luxury-gold/15 bg-luxury-charcoal/50 py-4">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="no-scrollbar flex overflow-x-auto gap-4 py-1">
          {allCategories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => onSelectCategory(category)}
                className={`whitespace-nowrap rounded-full border px-6 py-2 text-xs font-semibold tracking-widest uppercase transition-all duration-300 ${
                  isSelected
                    ? "border-luxury-gold bg-luxury-gold text-luxury-black shadow-[0_0_12px_rgba(201,168,76,0.3)]"
                    : "border-luxury-gold/20 bg-luxury-black/60 text-gray-400 hover:border-luxury-gold/50 hover:text-white"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
