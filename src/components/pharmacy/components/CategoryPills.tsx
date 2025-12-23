"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/supabaseClient";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon?: string;
  product_count?: number;
}

interface CategoryPillsProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

export const CategoryPills = ({ selectedCategory, onCategorySelect }: CategoryPillsProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Use category_configs table instead of categories
        const { data } = await supabase
          .from("category_configs")
          .select("id, category_name")
          .order("category_name");

        // Get product counts per category
        const { data: products } = await supabase
          .from("products")
          .select("category");

        const categoryCounts: Record<string, number> = {};
        products?.forEach((p) => {
          if (p.category) {
            categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
          }
        });

        const categoriesWithCount = (data || []).map((cat) => ({
          id: cat.id,
          name: cat.category_name,
          product_count: categoryCounts[cat.category_name] || 0,
        }));

        setCategories(categoriesWithCount);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex gap-2 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Categories */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* All Products */}
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          className={`flex-shrink-0 rounded-full px-4 h-10 gap-2 ${
            selectedCategory === "all"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
          }`}
          onClick={() => onCategorySelect("all")}
        >
          <Sparkles className="h-4 w-4" />
          All Products
        </Button>

        {/* Category Pills */}
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.name ? "default" : "outline"}
            className={`flex-shrink-0 rounded-full px-4 h-10 gap-2 ${
              selectedCategory === category.name
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
            }`}
            onClick={() => onCategorySelect(category.name)}
          >
            {category.name}
            {category.product_count && category.product_count > 0 && (
              <Badge
                variant="secondary"
                className={`ml-1 h-5 px-1.5 text-[10px] ${
                  selectedCategory === category.name
                    ? "bg-white/20 text-white"
                    : "bg-gray-100"
                }`}
              >
                {category.product_count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default CategoryPills;
