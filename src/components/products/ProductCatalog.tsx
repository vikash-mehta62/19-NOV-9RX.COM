"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Search, Grid3X3, List, SlidersHorizontal, Star, ChevronDown, ChevronUp, 
  X, Filter, Package
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

  const [priceRange, setPriceRange] = useState([0, 500])
  const [expandedFilters, setExpandedFilters] = useState({
    category: true,
    price: true,
    rating: false,
  })
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const toggleFilter = (filter: keyof typeof expandedFilters) => {
    setExpandedFilters(prev => ({ ...prev, [filter]: !prev[filter] }))
  }

  const clearAllFilters = () => {
    onSearchChange("")
    onCategoryChange("all")
    setPriceRange([0, 500])
    setSelectedRating(null)
  }

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedRating !== null

  // Filter Sidebar Component
  const FilterSidebar = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`space-y-6 ${isMobile ? '' : 'pr-4'}`}>
      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Active Filters</h3>
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-blue-600 hover:text-blue-800 h-auto p-0">
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-gray-100">
                Search: {searchQuery}
                <X className="w-3 h-3 cursor-pointer" onClick={() => onSearchChange("")} />
              </Badge>
            )}
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-gray-100">
                {selectedCategory}
                <X className="w-3 h-3 cursor-pointer" onClick={() => onCategoryChange("all")} />
              </Badge>
            )}
            {selectedRating && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-gray-100">
                {selectedRating}+ Stars
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedRating(null)} />
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="border-b pb-4">
        <button
          onClick={() => toggleFilter("category")}
          className="flex items-center justify-between w-full text-left font-semibold text-gray-900 mb-3"
        >
          <span>Department</span>
          {expandedFilters.category ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedFilters.category && (
          <div className="space-y-2">
            <div
              className={`cursor-pointer text-sm py-1 px-2 rounded hover:bg-gray-100 ${selectedCategory === "all" ? "font-semibold text-orange-600" : "text-gray-700"}`}
              onClick={() => onCategoryChange("all")}
            >
              All Categories
            </div>
            {PRODUCT_CATEGORIES.map((category) => (
              <div
                key={category}
                className={`cursor-pointer text-sm py-1 px-2 rounded hover:bg-gray-100 ${selectedCategory === category ? "font-semibold text-orange-600 bg-orange-50" : "text-gray-700"}`}
                onClick={() => onCategoryChange(category)}
              >
                {category}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Reviews Filter */}
      <div className="border-b pb-4">
        <button
          onClick={() => toggleFilter("rating")}
          className="flex items-center justify-between w-full text-left font-semibold text-gray-900 mb-3"
        >
          <span>Customer Reviews</span>
          {expandedFilters.rating ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedFilters.rating && (
          <div className="space-y-2">
            {[4, 3, 2, 1].map((rating) => (
              <div
                key={rating}
                className={`flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-gray-100 ${selectedRating === rating ? "bg-orange-50" : ""}`}
                onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
              >
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= rating ? "fill-orange-400 text-orange-400" : "fill-gray-200 text-gray-200"}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-700">& Up</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price Filter */}
      <div className="border-b pb-4">
        <button
          onClick={() => toggleFilter("price")}
          className="flex items-center justify-between w-full text-left font-semibold text-gray-900 mb-3"
        >
          <span>Price</span>
          {expandedFilters.price ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedFilters.price && (
          <div className="space-y-4">
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              max={500}
              step={10}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                className="w-20 h-8 text-sm"
                placeholder="Min"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="number"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                className="w-20 h-8 text-sm"
                placeholder="Max"
              />
              <Button size="sm" variant="outline" className="h-8">
                Go
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )


  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Search Bar - Amazon Style */}
      <div className="bg-[#232f3e] py-3 px-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex">
              <Select value={selectedCategory} onValueChange={onCategoryChange}>
                <SelectTrigger className="w-[140px] rounded-r-none bg-gray-100 border-gray-300 text-gray-700 text-sm">
                  <SelectValue placeholder="All" />
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
              <div className="relative flex-1">
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="rounded-none border-l-0 h-10 pr-12"
                />
                <Button 
                  size="sm" 
                  className="absolute right-0 top-0 h-10 rounded-l-none bg-orange-400 hover:bg-orange-500 px-4"
                >
                  <Search className="w-5 h-5 text-gray-900" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            {/* Mobile Filter Button */}
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
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

            <div className="text-sm text-gray-700">
              <span className="font-semibold">{totalProducts.toLocaleString()}</span> results
              {selectedCategory !== "all" && (
                <span> for <span className="text-orange-600 font-medium">"{selectedCategory}"</span></span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Avg. Customer Review</SelectItem>
                <SelectItem value="newest">Newest Arrivals</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="hidden md:flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`rounded-none ${viewMode === "grid" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-none ${viewMode === "list" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-20">
              <FilterSidebar />
            </div>
          </aside>

          {/* Products Grid/List */}
          <main className="flex-1">
            {products.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria</p>
                <Button onClick={clearAllFilters} variant="outline">
                  Clear all filters
                </Button>
              </div>
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
              <div className="mt-8 flex justify-center">
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <PaginationControls
                    currentPage={currentPage}
                    totalItems={totalProducts}
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
