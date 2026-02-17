"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/supabaseClient";
import { Search, X, Clock, TrendingUp, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  name: string;
  category: string;
  image_url: string;
  base_price: number;
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onProductSelect?: (productId: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchAutocomplete = ({
  value,
  onChange,
  onProductSelect,
  placeholder = "Search products...",
  className = "",
}: SearchAutocompleteProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches] = useState(["Paper Rolls", "Thermal Paper", "Receipt Paper", "Labels"]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recentSearches");
    if (stored) {
      setRecentSearches(JSON.parse(stored).slice(0, 5));
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (value.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data } = await supabase
          .from("products")
          .select("id, name, category, image_url, base_price")
          .eq("is_active", true)
          .or(`name.ilike.%${value}%,sku.ilike.%${value}%,category.ilike.%${value}%`)
          .limit(6);

        setResults(data || []);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [value]);

  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const handleSelect = (productId: string, productName: string) => {
    saveRecentSearch(productName);
    setIsOpen(false);
    if (onProductSelect) {
      onProductSelect(productId);
    } else {
      const userType = sessionStorage.getItem('userType')?.toLowerCase() || 'pharmacy'
      navigate(`/${userType}/product/${productId}`);
    }
  };

  const handleSearchSubmit = (term: string) => {
    if (term.trim()) {
      saveRecentSearch(term);
      onChange(term);
      setIsOpen(false);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearchSubmit(value);
            }
          }}
          placeholder={placeholder}
          className="pl-10 pr-10 h-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500"
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto">
          {/* Loading */}
          {loading && (
            <div className="p-4 text-center text-gray-500 text-sm">
              Searching...
            </div>
          )}

          {/* Search Results */}
          {!loading && results.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-gray-500 px-2 py-1 font-medium">Products</p>
              {results.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product.id, product.name)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    <img
                      src={product.image_url || "/placeholder.svg"}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">{product.category}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">
                    ${product.base_price?.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && value.length >= 2 && results.length === 0 && (
            <div className="p-4 text-center">
              <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No products found</p>
              <p className="text-xs text-gray-400">Try a different search term</p>
            </div>
          )}

          {/* Recent & Trending (when no search query) */}
          {!loading && value.length < 2 && (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="p-2 border-b border-gray-100">
                  <div className="flex items-center justify-between px-2 py-1">
                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Recent Searches
                    </p>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {recentSearches.map((term, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-gray-200"
                        onClick={() => {
                          onChange(term);
                          handleSearchSubmit(term);
                        }}
                      >
                        {term}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              <div className="p-2">
                <p className="text-xs text-gray-500 font-medium px-2 py-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Trending
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {trendingSearches.map((term, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                      onClick={() => {
                        onChange(term);
                        handleSearchSubmit(term);
                      }}
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
