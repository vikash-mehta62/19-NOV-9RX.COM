"use client"

import { useEffect, useState, useMemo } from "react"
import { Package, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PharmacySizeCard } from "./PharmacySizeCard"
import { ProductDetails } from "../../types/product.types"

// Flattened size item type - each size becomes its own card
export interface FlattenedSizeItem {
  productId: string
  productName: string
  productCategory: string
  productSubcategory?: string
  productDescription?: string
  productSku: string
  sizeId: string
  sizeValue: string
  sizeUnit: string
  sizeSku: string
  price: number
  originalPrice: number
  stock: number
  quantityPerCase: number
  rollsPerCase?: number
  image: string
  productImages: string[]
  shippingCost: number
  caseEnabled: boolean
  unitEnabled: boolean
  pricePerCase: number
  keyFeatures?: string
}

interface PharmacyProductGridProps {
  products: ProductDetails[]
  viewMode?: "grid" | "compact"
  onViewModeChange?: (mode: "grid" | "compact") => void
}

export const PharmacyProductGrid = ({ 
  products, 
  viewMode = "grid",
  onViewModeChange 
}: PharmacyProductGridProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [localViewMode, setLocalViewMode] = useState<"grid" | "compact">(viewMode)

  const currentViewMode = onViewModeChange ? viewMode : localViewMode

  // Flatten products - each size becomes its own card
  const flattenedItems = useMemo(() => {
    const items: FlattenedSizeItem[] = []
    
    products.forEach(product => {
      if (product.sizes && product.sizes.length > 0) {
        // Create a card for each size
        product.sizes.forEach(size => {
          items.push({
            productId: product.id?.toString() || '',
            productName: product.name,
            productCategory: product.category || '',
            productSubcategory: product.subcategory,
            productDescription: product.description,
            productSku: product.sku || '',
            sizeId: size.id,
            sizeValue: size.size_value,
            sizeUnit: size.size_unit || '',
            sizeSku: size.sku || '',
            price: size.price,
            originalPrice: size.originalPrice || 0,
            stock: size.stock || 0,
            quantityPerCase: size.quantity_per_case || 0,
            rollsPerCase: size.rolls_per_case,
            image: size.image || (product.images && product.images[0]) || '',
            productImages: product.images || [],
            shippingCost: size.shipping_cost || 0,
            caseEnabled: size.case || false,
            unitEnabled: size.unit || false,
            pricePerCase: size.price_per_case || size.pricePerCase || 0,
            keyFeatures: size.key_features || product.key_features,
          })
        })
      } else {
        // Product without sizes - create single card
        items.push({
          productId: product.id?.toString() || '',
          productName: product.name,
          productCategory: product.category || '',
          productSubcategory: product.subcategory,
          productDescription: product.description,
          productSku: product.sku || '',
          sizeId: product.id?.toString() || '',
          sizeValue: '',
          sizeUnit: '',
          sizeSku: product.sku || '',
          price: product.base_price || product.price || 0,
          originalPrice: 0,
          stock: product.stock || 0,
          quantityPerCase: product.quantityPerCase || 0,
          image: (product.images && product.images[0]) || product.image_url || '',
          productImages: product.images || [],
          shippingCost: Number(product.shipping_cost) || 0,
          caseEnabled: false,
          unitEnabled: false,
          pricePerCase: 0,
          keyFeatures: product.key_features,
        })
      }
    })
    
    return items
  }, [products])

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [products])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse"></div>
            <div className="p-3 space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (flattenedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-100 rounded-full blur-2xl opacity-50"></div>
          <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-full">
            <Search className="h-16 w-16 text-emerald-500" />
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-gray-800 mb-2">No Products Found</h3>
        <p className="text-gray-600 text-center max-w-md mb-6">
          We couldn't find any products matching your criteria. Try adjusting your filters.
        </p>
        
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          <Package className="h-4 w-4" />
          View All Products
        </Button>
      </div>
    )
  }

  return (
    <div className={
      currentViewMode === "grid" 
        ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
    }>
      {flattenedItems.map((item, index) => (
        <div
          key={`${item.productId}-${item.sizeId}`}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 20}ms`, animationFillMode: 'both' }}
        >
          <PharmacySizeCard item={item} />
        </div>
      ))}
    </div>
  )
}

export default PharmacyProductGrid
