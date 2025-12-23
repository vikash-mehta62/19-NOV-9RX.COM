"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Search, Grid3X3, List, ChevronDown, ChevronUp, 
  X, Filter, Package, SlidersHorizontal
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ProductCard } from "./ProductCard"
import { ProductsTable } from "./ProductsTable"
import { PaginationControls } from "@/components/ui/PaginationControls"
import type { Product } from "@/types/product"
import { PRODUCT_CATEGORIES } from "@/types/product"

interface ProductCatalogProps {
  products: Product[]
  currentPage: number
  totalProducts: number
  pageSize: number
  onPageChange: (page: number) => void
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
  searchQuery: string
  selectedCategory: string
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  groupId?: string
}

export const ProductCatalog = ({
  products,
  currentPage,
  totalProducts,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
  searchQuery,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
  groupId,
}: ProductCatalogProps) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState("featured")
  const [expandedFilters, setExpandedFilters] = useState({
    category: true,
  })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const toggleFilter = (filter: keyof typeof expandedFilters) => {
    setExpandedFilters(prev => ({ ...prev, [filter]: !prev[filter] }))
  }

  const clearAllFilters = () => {
    onSearchChange("")
    onCategoryChange("all")
  }

  const hasActiveFilters = searchQuery || selectedCategory !== "all"

  // Filter Sidebar Component
  const FilterSidebar = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`space-y-6 ${isMobile ? '' : ''}`}>
      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Active Filters</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters} 
              className="text-emerald-600 hover:text-emerald-700 h-auto p-0 text-xs"
            >
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                "{searchQuery}"
                <X className="w-3 h-3 cursor-pointer hover:text-emerald-900" onClick={() => onSearchChange("")} />
              </Badge>
            )}
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                {selectedCategory}
                <X className="w-3 h-3 cursor-pointer hover:text-emerald-900" onClick={() => onCategoryChange("all")} />
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div>
        <button
          onClick={() => toggleFilter("category")}
          className="flex items-center justify-between w-full text-left font-semibold text-gray-900 mb-3 text-sm"
        >
          <span>Categories</span>
          {expandedFilters.category ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedFilters.category && (
          <div className="space-y-1">
            <div
              className={`cursor-pointer text-sm py-2 px-3 rounded-lg transition-colors ${
                selectedCategory === "all" 
                  ? "font-medium text-emerald-700 bg-emerald-50" 
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => onCategoryChange("all")}
            >
              All Categories
            </div>
            {PRODUCT_CATEGORIES.map((category) => (
              <div
                key={category}
                className={`cursor-pointer text-sm py-2 px-3 rounded-lg transition-colors ${
                  selectedCategory === category 
                    ? "font-medium text-emerald-700 bg-emerald-50" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => onCategoryChange(category)}
              >
                {category}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Select */}
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-full sm:w-[180px] h-11 bg-gray-50 border-gray-200">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {PRODUCT_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mobile Filter Button */}
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden h-11 gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 ml-1">
                      {(searchQuery ? 1 : 0) + (selectedCategory !== "all" ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)] mt-4">
                  <FilterSidebar isMobile />
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{totalProducts.toLocaleString()}</span> products
              {selectedCategory !== "all" && (
                <span> in <span className="font-medium text-emerald-600">{selectedCategory}</span></span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] text-sm bg-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="name-asc">Name: A to Z</SelectItem>
                <SelectItem value="name-desc">Name: Z to A</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="hidden md:flex items-center bg-white border rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`rounded-none h-9 px-3 ${
                  viewMode === "grid" 
                    ? "bg-emerald-50 text-emerald-600" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-none h-9 px-3 ${
                  viewMode === "list" 
                    ? "bg-emerald-50 text-emerald-600" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <Card className="sticky top-24 border-0 shadow-sm">
              <CardContent className="p-4">
                <FilterSidebar />
              </CardContent>
            </Card>
          </aside>

          {/* Products Grid/List */}
          <main className="flex-1 min-w-0">
            {products.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-500 mb-6 text-center max-w-md">
                    We couldn't find any products matching your criteria. Try adjusting your search or filters.
                  </p>
                  <Button onClick={clearAllFilters} variant="outline" className="gap-2">
                    <X className="w-4 h-4" />
                    Clear all filters
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={onEdit}
                    onView={(p) => console.log("View product:", p)}
                    onAddToCart={(p) => console.log("Add to cart:", p)}
                  />
                ))}
              </div>
            ) : (
              <ProductsTable
                products={products}
                currentPage={currentPage}
                totalProducts={totalProducts}
                pageSize={pageSize}
                onPageChange={onPageChange}
                onEdit={onEdit}
                onDelete={onDelete}
                groupId={groupId}
              />
            )}

            {/* Pagination */}
            {products.length > 0 && viewMode === "grid" && (
              <div className="mt-8">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 flex justify-center">
                    <PaginationControls
                      currentPage={currentPage}
                      totalItems={totalProducts}
                      pageSize={pageSize}
                      onPageChange={onPageChange}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
