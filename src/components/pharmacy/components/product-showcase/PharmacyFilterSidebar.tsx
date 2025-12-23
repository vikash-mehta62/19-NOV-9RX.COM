"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  ChevronDown, ChevronRight, X, Search, Layers, 
  Package, FolderOpen, Folder 
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/supabaseClient"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CategoryConfig {
  id: string
  category_name: string
}

interface SubcategoryConfig {
  id: string
  subcategory_name: string
  category_name: string
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
  products?: any[]
  allProducts?: any[]
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
  products = [],
  allProducts = [],
  onProductSelect,
}: PharmacyFilterSidebarProps) => {
  const [categories, setCategories] = useState<CategoryConfig[]>([])
  const [subcategories, setSubcategories] = useState<SubcategoryConfig[]>([])
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

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
      } catch (error) {
        console.error("Error fetching filters:", error)
      }
    }
    fetchFilters()
  }, [])

  // Auto-expand category when selected
  useEffect(() => {
    if (selectedCategory !== "all") {
      setExpandedCategory(selectedCategory.toLowerCase())
    }
  }, [selectedCategory])

  const sourceProducts = allProducts.length > 0 ? allProducts : products

  const getCategoryCount = (categoryName: string) => {
    if (categoryName === "all") return sourceProducts.length
    return sourceProducts.filter(p => 
      p.category?.toLowerCase() === categoryName.toLowerCase()
    ).length
  }

  const getSubcategoryCount = (subcategoryName: string) => {
    return sourceProducts.filter(p => 
      p.subcategory?.toLowerCase() === subcategoryName.toLowerCase()
    ).length
  }

  // Get subcategories for a specific category
  const getSubcategoriesForCategory = (categoryName: string) => {
    return subcategories.filter(sub => 
      sub.category_name.toLowerCase() === categoryName.toLowerCase()
    )
  }

  const handleCategoryClick = (categoryName: string) => {
    const lowerCat = categoryName.toLowerCase()
    
    if (expandedCategory === lowerCat) {
      // If clicking same category, collapse it and show all
      setExpandedCategory(null)
      setSelectedCategory("all")
      setSelectedSubcategory("all")
    } else {
      // Expand and select this category
      setExpandedCategory(lowerCat)
      setSelectedCategory(lowerCat)
      setSelectedSubcategory("all")
    }
  }

  const handleSubcategoryClick = (subcategoryName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedSubcategory(subcategoryName.toLowerCase())
  }

  const handleAllProductsClick = () => {
    setExpandedCategory(null)
    setSelectedCategory("all")
    setSelectedSubcategory("all")
    setSearchQuery("")
  }

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedSubcategory !== "all"

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-white" />
          <span className="font-semibold text-white">Categories</span>
        </div>
        {hasActiveFilters && (
          <button 
            onClick={handleAllProductsClick}
            className="text-xs text-emerald-100 hover:text-white transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 border-gray-200 rounded-lg text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Category Navigation */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {/* All Products */}
            <button
              onClick={handleAllProductsClick}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                selectedCategory === "all" && !selectedSubcategory
                  ? "bg-emerald-100 text-emerald-700 font-medium shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                All Products
              </span>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                {sourceProducts.length}
              </Badge>
            </button>

            {/* Categories with Subcategories */}
            {categories.map((cat) => {
              const catLower = cat.category_name.toLowerCase()
              const isExpanded = expandedCategory === catLower
              const isSelected = selectedCategory === catLower && selectedSubcategory === "all"
              const catSubcategories = getSubcategoriesForCategory(cat.category_name)
              const count = getCategoryCount(cat.category_name)

              return (
                <div key={cat.id} className="space-y-1">
                  {/* Category Button */}
                  <button
                    onClick={() => handleCategoryClick(cat.category_name)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                      isSelected
                        ? "bg-emerald-100 text-emerald-700 font-medium shadow-sm"
                        : isExpanded
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {isExpanded ? (
                        <FolderOpen className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="truncate">{cat.category_name}</span>
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs",
                          isSelected ? "bg-emerald-200 text-emerald-700" : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {count}
                      </Badge>
                      {catSubcategories.length > 0 && (
                        <ChevronRight className={cn(
                          "w-4 h-4 text-gray-400 transition-transform duration-200",
                          isExpanded && "rotate-90"
                        )} />
                      )}
                    </div>
                  </button>

                  {/* Subcategories (Expanded) */}
                  {isExpanded && catSubcategories.length > 0 && (
                    <div className="ml-3 pl-3 border-l-2 border-emerald-200 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                      {catSubcategories.map((sub) => {
                        const subLower = sub.subcategory_name.toLowerCase()
                        const isSubSelected = selectedSubcategory === subLower
                        const subCount = getSubcategoryCount(sub.subcategory_name)

                        return (
                          <button
                            key={sub.id}
                            onClick={(e) => handleSubcategoryClick(sub.subcategory_name, e)}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all",
                              isSubSelected
                                ? "bg-emerald-100 text-emerald-700 font-medium"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                          >
                            <span className="truncate">{sub.subcategory_name}</span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                isSubSelected && "border-emerald-300 bg-emerald-50"
                              )}
                            >
                              {subCount}
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
