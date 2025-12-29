"use client"

import { useEffect, useState, useMemo } from "react"
import { Search, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PharmacyProductCard } from "./PharmacyProductCard"
import { ProductDetails } from "../../types/product.types"

interface PharmacyProductGridProps {
  products: ProductDetails[]
  viewMode?: "grid" | "compact"
  onViewModeChange?: (mode: "grid" | "compact") => void
  onProductClick?: (product: ProductDetails) => void
}

export const PharmacyProductGrid = ({ 
  products, 
  viewMode = "grid",
  onViewModeChange,
  onProductClick
}: PharmacyProductGridProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const currentViewMode = onViewModeChange ? viewMode : "grid"

  const productItems = useMemo(() => {
    return products.map(product => {
      // Find minimum price from all sizes
      let minPrice = product.base_price || product.price || 0;
      
      if (product.sizes && product.sizes.length > 0) {
        const sizePrices = product.sizes.map(size => size.price || 0).filter(price => price > 0);
        if (sizePrices.length > 0) {
          minPrice = Math.min(...sizePrices);
        }
      }
      
      return {
        ...product,
        displayPrice: minPrice,
        displayImage: product.image_url || 
          (product.images && product.images[0]) || 
          '/placeholder.svg',
        totalStock: product.sizes 
          ? product.sizes.reduce((sum, size) => sum + (size.stock || 0), 0)
          : product.stock || 0
      }
    })
  }, [products])

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [products])

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={currentViewMode === "grid" 
        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4"
        : "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
      }>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-200">
            <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-3 bg-gray-200 rounded-lg w-2/3 animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (productItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 bg-white rounded-xl sm:rounded-2xl border border-gray-200">
        <div className="bg-emerald-50 p-6 sm:p-8 rounded-full mb-4 sm:mb-6">
          <Search className="h-12 w-12 sm:h-16 sm:w-16 text-emerald-400" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">No Products Found</h3>
        <p className="text-gray-500 text-center text-sm sm:text-base max-w-md mb-4 sm:mb-6">
          We couldn't find any products matching your criteria. Try adjusting your filters.
        </p>
        <Button 
          onClick={() => window.location.reload()} 
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg sm:rounded-xl px-4 sm:px-6 h-9 sm:h-10 text-sm"
        >
          <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          Reset Filters
        </Button>
      </div>
    )
  }

  return (
    <div className={currentViewMode === "grid" 
      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4"
      : "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
    }>
      {productItems.map((product) => (
        <div 
          key={product.id} 
        >
          <PharmacyProductCard 
            product={product} 
            onProductClick={onProductClick}
          />
        </div>
      ))}
    </div>
  )
}

export default PharmacyProductGrid
