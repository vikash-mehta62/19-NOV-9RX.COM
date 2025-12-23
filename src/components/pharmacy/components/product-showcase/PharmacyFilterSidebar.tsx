"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ChevronDown, X, Search, SlidersHorizontal } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/supabaseClient"

interface CategoryConfig {
  id: string
  category_name: string
}

interface SubcategoryConfig {
  id: string
  subcategory_name: string
  category_name: string  // Uses category_name, not category_id
}

interface PharmacyFilterSidebarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  selectedSubcategory: string
  setSelectedSubcategory: (subcategory: string) => void
  priceRange: string
  setPriceRange: (range: string) => void
  products?: any[]  // Made optional
  onProductSelect?: (product: any) => void
}

export const PharmacyFilterSidebar = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  priceRange,
  setPriceRange,
  products = [],  // Default to empty array
  onProductSelect,
}: PharmacyFilterSidebarProps) => {
  const [categories, setCategories] = useState<CategoryConfig[]>([])
  const [subcategories, setSubcategories] = useState<SubcategoryConfig[]>([])
  const [filteredSubcategories, setFilteredSubcategories] = useState<SubcategoryConfig[]>([])
  const [showCategory, setShowCategory] = useState(true)
  const [showSubcategory, setShowSubcategory] = useState(true)

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const { data: categoryData } = await supabase
          .from("category_configs")
          .select("*")
          .order("category_name", { ascending: true })

        const { data: subcategoryData } = await supabase
          .from("subcategory_configs")
          .select("*")
          .order("subcategory_name", { ascending: true })

        setCategories(categoryData || [])
        setSubcategories(subcategoryData || [])
        setFilteredSubcategories(subcategoryData || [])
      } catch (error) {
        console.error("Error fetching filters:", error)
      }
    }
    fetchFilters()
  }, [])

  useEffect(() => {
    if (selectedCategory === "all") {
      setFilteredSubcategories(subcategories)
    } else {
      // Filter subcategories by category_name (not category_id)
      setFilteredSubcategories(
        subcategories.filter((sub) => 
          sub.category_name.toLowerCase() === selectedCategory.toLowerCase()
        )
      )
    }
    // Reset subcategory selection when category changes
    setSelectedSubcategory("all")
  }, [selectedCategory, subcategories])

  const clearAllFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSelectedSubcategory("all")
    setPriceRange("all")
  }

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedSubcategory !== "all" || priceRange !== "all"

  const getCategoryCount = (categoryName: string) => {
    if (categoryName === "all") return products.length
    return products.filter(p => p.category?.toLowerCase() === categoryName.toLowerCase()).length
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-emerald-600 px-4 py-3 flex items-center gap-2">
        <SlidersHorizontal className="w-5 h-5 text-white" />
        <span className="font-semibold text-white">Filters</span>
      </div>

      <div className="p-4 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-gray-200 rounded-lg"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Active Filters</span>
              <button onClick={clearAllFilters} className="text-xs text-red-500 hover:text-red-600">
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedCategory !== "all" && (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer rounded-full text-xs px-2 py-0.5">
                  {selectedCategory}
                  <X className="w-3 h-3 ml-1" onClick={() => setSelectedCategory("all")} />
                </Badge>
              )}
              {selectedSubcategory !== "all" && (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer rounded-full text-xs px-2 py-0.5">
                  {selectedSubcategory}
                  <X className="w-3 h-3 ml-1" onClick={() => setSelectedSubcategory("all")} />
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Category */}
        <div>
          <button
            onClick={() => setShowCategory(!showCategory)}
            className="flex items-center justify-between w-full mb-3"
          >
            <span className="font-semibold text-gray-800 text-sm">Category</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCategory ? 'rotate-180' : ''}`} />
          </button>
          
          {showCategory && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {/* All Categories */}
              <button
                onClick={() => setSelectedCategory("all")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === "all" 
                    ? "bg-emerald-50 text-emerald-700 font-medium" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>All Categories</span>
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                  {getCategoryCount("all")}
                </Badge>
              </button>

              {categories.map((cat) => {
                const count = getCategoryCount(cat.category_name)
                const isSelected = selectedCategory.toLowerCase() === cat.category_name.toLowerCase()
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.category_name.toLowerCase())}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      isSelected 
                        ? "bg-emerald-50 text-emerald-700 font-medium" 
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="truncate pr-2">{cat.category_name}</span>
                    <Badge variant="secondary" className={`text-xs ${isSelected ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {count}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Subcategory */}
        {filteredSubcategories.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowSubcategory(!showSubcategory)}
              className="flex items-center justify-between w-full mb-3"
            >
              <span className="font-semibold text-gray-800 text-sm">Subcategory</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSubcategory ? 'rotate-180' : ''}`} />
            </button>
            
            {showSubcategory && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <button
                  onClick={() => setSelectedSubcategory("all")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedSubcategory === "all" 
                      ? "bg-blue-50 text-blue-700 font-medium" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  All Subcategories
                </button>
                {filteredSubcategories.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubcategory(sub.subcategory_name.toLowerCase())}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                      selectedSubcategory.toLowerCase() === sub.subcategory_name.toLowerCase() 
                        ? "bg-blue-50 text-blue-700 font-medium" 
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {sub.subcategory_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
