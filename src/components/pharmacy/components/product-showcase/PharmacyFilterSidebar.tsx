"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronDown, ChevronRight, X, Search, Layers,
  Package, FolderOpen, Folder, Eye
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fetchCategories, fetchSubcategoryConfigs } from "@/utils/categoryUtils"
import { useNavigate } from "react-router-dom"

const DEFAULT_SUBCATEGORY = "General"

interface CategoryConfig {
  id: string
  category_name: string
}

interface SubcategoryConfig {
  id: string
  subcategory_name: string
  category_name: string
}

interface ProductFilterItem {
  id?: string | number
  name?: string
  description?: string
  sku?: string
  base_price?: number
  category?: string
  subcategory?: string
  sizes?: Array<{
    id?: string
    size_name?: string
    size_value?: string
    size_unit?: string
    stock?: number
  }>
  stock?: number
  hasOffer?: boolean
  customization?: {
    allowed?: boolean
  }
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
  showProducts: string
  setShowProducts: (value: string) => void
  products?: ProductFilterItem[]
  allProducts?: ProductFilterItem[]
  onProductSelect?: (product: ProductFilterItem) => void
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
  showProducts,
  setShowProducts,
  products = [],
  allProducts = [],
  onProductSelect,
}: PharmacyFilterSidebarProps) => {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<CategoryConfig[]>([])
  const [subcategories, setSubcategories] = useState<SubcategoryConfig[]>([])
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null)

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        // Fetch categories using utility (already ordered by display_order)
        const cats = await fetchCategories();
        const categoryData = cats.map(name => ({ id: name, category_name: name }));
        const subcategoryData = await fetchSubcategoryConfigs();

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
      setExpandedCategory(selectedCategory)
    }
  }, [selectedCategory])

  const sourceProducts = useMemo(() => {
    const baseProducts = allProducts.length > 0 ? allProducts : products
    const query = searchQuery.trim().toLowerCase()

    return baseProducts.filter((product) => {
      if (priceRange !== "all") {
        const [min, max] = priceRange.split("-").map((value) => (value === "+" ? Infinity : parseInt(value, 10)))
        const price = product.base_price || 0
        if (price < min || (max !== Infinity && price > max)) {
          return false
        }
      }

      if (showProducts === "in-stock") {
        const hasProductStock = (product.stock || 0) > 0
        const hasSizeStock = product.sizes?.some((size) => (size.stock || 0) > 0) || false
        if (!hasProductStock && !hasSizeStock) {
          return false
        }
      }

      if (showProducts === "on-sale" && !product.hasOffer) {
        return false
      }

      if (showProducts === "customizable" && !product.customization?.allowed) {
        return false
      }

      if (!query) {
        return true
      }

      const matchesProduct =
        product.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query)

      if (matchesProduct) {
        return true
      }

      return (
        product.sizes?.some((size) => {
          const sizeLabel = size.size_name?.trim() || `${size.size_value || ""} ${size.size_unit || ""}`.trim()
          return sizeLabel.toLowerCase().includes(query)
        }) || false
      )
    })
  }, [allProducts, priceRange, products, searchQuery, showProducts])

  const getCategoryCount = (categoryName: string) => {
    if (categoryName === "all") return sourceProducts.length

    return sourceProducts.filter(
      (p) => p.category?.toLowerCase() === categoryName.toLowerCase()
    ).length
  }

  const getSubcategoryCount = (subcategoryName: string) => {
    return sourceProducts.filter(p =>
      p.subcategory?.toLowerCase() === subcategoryName.toLowerCase()
    ).length
  }

  const getProductsForSubcategory = (subcategoryName: string) =>
    sourceProducts.filter(
      (product) => (product.subcategory?.trim() || DEFAULT_SUBCATEGORY).toLowerCase() === subcategoryName.toLowerCase()
    )

  const getSubcategorySizeCount = (subcategoryName: string) =>
    getProductsForSubcategory(subcategoryName).reduce(
      (total, product) => total + (product.sizes?.length || 0),
      0
    )

  const getSubcategorySizeOptions = (subcategoryName: string) => {
    const sizeMap = new Map<string, { label: string; product: ProductFilterItem; sizeId?: string }>()

    getProductsForSubcategory(subcategoryName).forEach((product) => {
      product.sizes?.forEach((size) => {
        const label = size.size_name?.trim() || `${size.size_value || ""} ${size.size_unit || ""}`.trim()
        const key = size.id || label
        if (label) {
          sizeMap.set(key, { label, product, sizeId: size.id })
        }
      })
    })

    return Array.from(sizeMap.values())
  }

  // Get subcategories for a specific category
  const getSubcategoriesForCategory = (categoryName: string) => {
    const configuredSubcategories = subcategories.filter(
      (sub) => sub.category_name.toLowerCase() === categoryName.toLowerCase()
    )
    const productSubcategories = Array.from(
      new Set(
        sourceProducts
          .filter((product) => product.category?.toLowerCase() === categoryName.toLowerCase())
          .map((product) => product.subcategory?.trim() || DEFAULT_SUBCATEGORY)
          .filter(Boolean)
      )
    )

    const missingSubcategories = productSubcategories
      .filter(
        (name) =>
          !configuredSubcategories.some(
            (sub) => sub.subcategory_name.toLowerCase() === name.toLowerCase()
          )
      )
      .map((name) => ({
        id: `derived-${categoryName}-${name}`,
        category_name: categoryName,
        subcategory_name: name,
      }))

    return [...configuredSubcategories, ...missingSubcategories]
  }

  const handleCategoryClick = (categoryName: string) => {
    // Always select the category, don't toggle off
    setExpandedCategory(categoryName)
    setExpandedSubcategory(null)
    setSelectedCategory(categoryName)
    setSelectedSubcategory("all")
  }

  const handleSubcategoryClick = (subcategoryName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedSubcategory(subcategoryName)
  }

  const handleAllProductsClick = () => {
    setExpandedCategory(null)
    setExpandedSubcategory(null)
    setSelectedCategory("all")
    setSelectedSubcategory("all")
    setSearchQuery("")
    setShowProducts("all")
  }

  const hasActiveFilters =
    searchQuery || selectedCategory !== "all" || selectedSubcategory !== "all" || showProducts !== "all"

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-white" />
          <span className="font-semibold text-white">Categories</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleAllProductsClick}
            className="text-xs text-blue-100 hover:text-white transition-colors"
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

        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            <Eye className="h-3.5 w-3.5" />
            Show Products
          </label>
          <Select value={showProducts} onValueChange={setShowProducts}>
            <SelectTrigger className="h-9 rounded-lg border-gray-200 text-sm">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="on-sale">On Sale</SelectItem>
              <SelectItem value="customizable">Customizable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Navigation */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {/* All Products */}
            <button
              onClick={handleAllProductsClick}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                selectedCategory === "all" && selectedSubcategory === "all"
                  ? "bg-blue-100 text-blue-700 font-medium shadow-sm"
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
            {categories
              .filter((cat) => {
                // Only show categories that have products
                const count = getCategoryCount(cat.category_name);
                return count > 0;
              })
              .map((cat) => {
              const isExpanded = expandedCategory === cat.category_name
              const isSelected = selectedCategory === cat.category_name && selectedSubcategory === "all"
              const catSubcategories = getSubcategoriesForCategory(cat.category_name)
              const count = getCategoryCount(cat.category_name)

              return (
                <div key={cat.id} className="space-y-1">
                  {/* Category Button */}
                  <button
                    onClick={() => handleCategoryClick(cat.category_name)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all",
                      isSelected
                        ? "bg-blue-100 text-blue-700 font-medium shadow-sm"
                        : isExpanded
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <span className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                      {isExpanded ? (
                        <FolderOpen className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="truncate text-[11px] leading-tight">{cat.category_name}</span>
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          isSelected ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {count}
                      </Badge>
                      {catSubcategories.length > 0 && (
                        <ChevronRight className={cn(
                          "w-3.5 h-3.5 text-gray-400 transition-transform duration-200",
                          isExpanded && "rotate-90"
                        )} />
                      )}
                    </div>
                  </button>

                  {isExpanded && catSubcategories.length > 0 && (
                    <div className="ml-3 pl-3 border-l-2 border-blue-200 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                      {catSubcategories
                        .filter((sub) => {
                          // Only show subcategories that have products
                          const subCount = getSubcategoryCount(sub.subcategory_name);
                          return subCount > 0;
                        })
                        .map((sub) => {
                        const isSubSelected = selectedSubcategory === sub.subcategory_name
                        const subCount = getSubcategorySizeCount(sub.subcategory_name)
                        const sizeOptions = getSubcategorySizeOptions(sub.subcategory_name)
                        const isSubExpanded = expandedSubcategory === sub.subcategory_name

                        return (
                          <div key={sub.id} className="space-y-1.5">
                            <button
                              onClick={(e) => handleSubcategoryClick(sub.subcategory_name, e)}
                              className={cn(
                                "w-full rounded-xl px-3 py-2 text-xs transition-all",
                                isSubSelected
                                  ? "bg-blue-100 text-blue-700 shadow-sm"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="min-w-0 flex-1 truncate text-[11px] text-left font-medium">
                                  {sub.subcategory_name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "min-w-[32px] justify-center rounded-full border px-2 py-0 text-[10px]",
                                    isSubSelected
                                      ? "border-blue-300 bg-white text-blue-700"
                                      : "border-gray-200 bg-white text-gray-600"
                                  )}
                                >
                                  {subCount}
                                </Badge>
                                {sizeOptions.length > 0 && (
                                  <button
                                    type="button"
                                    aria-label={isSubExpanded ? `Hide sizes for ${sub.subcategory_name}` : `Show sizes for ${sub.subcategory_name}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setExpandedSubcategory(isSubExpanded ? null : sub.subcategory_name)
                                    }}
                                    className={cn(
                                      "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-colors",
                                      isSubExpanded
                                        ? "border-blue-200 bg-white text-blue-700"
                                        : "border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:text-blue-700"
                                    )}
                                  >
                                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isSubExpanded && "rotate-180")} />
                                  </button>
                                )}
                              </div>
                            </button>

                            {isSubExpanded && sizeOptions.length > 0 && (
                              <div className="ml-2 rounded-xl border border-blue-100 bg-blue-50/70 p-2.5">
                                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-blue-700">
                                  Size Options
                                </div>
                                <div className="space-y-1.5">
                                  {sizeOptions.map((sizeOption, index) => (
                                    <button
                                      type="button"
                                      key={`${sub.id}-size-${index}`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const productId = sizeOption.product.id
                                        const sizeId = sizeOption.sizeId
                                        const userType = sessionStorage.getItem("userType")?.toLowerCase() || "pharmacy"

                                        if (productId && sizeId) {
                                          navigate(`/${userType}/product/${productId}/${sizeId}`, {
                                            state: {
                                              selectedCategory,
                                              selectedProductId: String(productId),
                                            },
                                          })
                                          return
                                        }

                                        if (sizeOption.product) {
                                          onProductSelect?.(sizeOption.product)
                                        }
                                      }}
                                      className="w-full rounded-lg border border-blue-100 bg-white px-2.5 py-1.5 text-left text-[11px] text-gray-700 transition-colors hover:border-blue-200 hover:bg-blue-100/60 hover:text-blue-800"
                                    >
                                      {sizeOption.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
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
