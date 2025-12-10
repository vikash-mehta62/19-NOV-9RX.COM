"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, ChevronUp, X, Search, Filter } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/supabaseClient"

interface CategoryConfig {
  id: string
  category_name: string
}

interface SubcategoryConfig {
  id: string
  subcategory_name: string
  category_id: string
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
}: PharmacyFilterSidebarProps) => {
  const [categories, setCategories] = useState<CategoryConfig[]>([])
  const [subcategories, setSubcategories] = useState<SubcategoryConfig[]>([])
  const [filteredSubcategories, setFilteredSubcategories] = useState<SubcategoryConfig[]>([])
  const [expandedFilters, setExpandedFilters] = useState({
    category: true,
    subcategory: true,
    price: true,
  })
  const [inStockOnly, setInStockOnly] = useState(false)


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
      const selectedCat = categories.find(
        (cat) => cat.category_name.toLowerCase() === selectedCategory.toLowerCase()
      )
      if (selectedCat) {
        const filtered = subcategories.filter((sub) => sub.category_id === selectedCat.id)
        setFilteredSubcategories(filtered)
      } else {
        setFilteredSubcategories([])
      }
    }
  }, [selectedCategory, categories, subcategories])

  const toggleFilter = (filter: keyof typeof expandedFilters) => {
    setExpandedFilters(prev => ({ ...prev, [filter]: !prev[filter] }))
  }

  const clearAllFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSelectedSubcategory("all")
    setPriceRange("all")
    setInStockOnly(false)
  }

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedSubcategory !== "all" || priceRange !== "all"

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4">
        <div className="flex items-center gap-2 text-white">
          <Filter className="w-5 h-5" />
          <h3 className="font-semibold">Filters</h3>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-xl border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
          />
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="space-y-2 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Active Filters</span>
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-emerald-600 hover:text-emerald-700 h-auto p-0 text-xs">
                Clear all
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-0.5">
                  "{searchQuery}"
                  <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setSearchQuery("")} />
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs rounded-full px-2 py-0.5">
                  {selectedCategory}
                  <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setSelectedCategory("all")} />
                </Badge>
              )}
              {selectedSubcategory !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs rounded-full px-2 py-0.5">
                  {selectedSubcategory}
                  <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setSelectedSubcategory("all")} />
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* In Stock Toggle */}
        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
          <span className="text-sm font-medium text-gray-700">In Stock Only</span>
          <Switch
            checked={inStockOnly}
            onCheckedChange={setInStockOnly}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>

        {/* Category Filter */}
        <div className="border-b border-gray-100 pb-4">
          <button
            onClick={() => toggleFilter("category")}
            className="flex items-center justify-between w-full text-left font-semibold text-gray-800 mb-3 text-sm"
          >
            <span>Category</span>
            {expandedFilters.category ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedFilters.category && (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              <div
                className={`cursor-pointer text-sm py-2 px-3 rounded-lg transition-all ${selectedCategory === "all" ? "bg-emerald-100 text-emerald-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                onClick={() => setSelectedCategory("all")}
              >
                All Categories
              </div>
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`cursor-pointer text-sm py-2 px-3 rounded-lg transition-all ${selectedCategory.toLowerCase() === category.category_name.toLowerCase() ? "bg-emerald-100 text-emerald-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                  onClick={() => setSelectedCategory(category.category_name.toLowerCase())}
                >
                  {category.category_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subcategory Filter */}
        {filteredSubcategories.length > 0 && (
          <div className="border-b border-gray-100 pb-4">
            <button
              onClick={() => toggleFilter("subcategory")}
              className="flex items-center justify-between w-full text-left font-semibold text-gray-800 mb-3 text-sm"
            >
              <span>Subcategory</span>
              {expandedFilters.subcategory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {expandedFilters.subcategory && (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                <div
                  className={`cursor-pointer text-sm py-2 px-3 rounded-lg transition-all ${selectedSubcategory === "all" ? "bg-purple-100 text-purple-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                  onClick={() => setSelectedSubcategory("all")}
                >
                  All Subcategories
                </div>
                {filteredSubcategories.map((sub) => (
                  <div
                    key={sub.id}
                    className={`cursor-pointer text-sm py-2 px-3 rounded-lg transition-all ${selectedSubcategory.toLowerCase() === sub.subcategory_name.toLowerCase() ? "bg-purple-100 text-purple-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                    onClick={() => setSelectedSubcategory(sub.subcategory_name.toLowerCase())}
                  >
                    {sub.subcategory_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Price Filter */}
        <div>
          <button
            onClick={() => toggleFilter("price")}
            className="flex items-center justify-between w-full text-left font-semibold text-gray-800 mb-3 text-sm"
          >
            <span>Price Range</span>
            {expandedFilters.price ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedFilters.price && (
            <div className="space-y-1">
              {[
                { value: "all", label: "All Prices" },
                { value: "0-20", label: "Under $20" },
                { value: "21-50", label: "$21 - $50" },
                { value: "51-100", label: "$51 - $100" },
                { value: "101+", label: "$101 & Above" },
              ].map((range) => (
                <div
                  key={range.value}
                  className={`cursor-pointer text-sm py-2 px-3 rounded-lg transition-all ${priceRange === range.value ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                  onClick={() => setPriceRange(range.value)}
                >
                  {range.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
