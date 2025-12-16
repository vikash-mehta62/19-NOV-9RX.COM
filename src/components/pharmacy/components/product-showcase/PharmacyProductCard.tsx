"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Truck, Eye, Heart, ShoppingCart, Layers } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProductDetails } from "../types/product.types"

interface PharmacyProductCardProps {
  product: ProductDetails & {
    displayPrice: number
    displayImage: string
    totalStock: number
  }
  onProductClick?: (product: ProductDetails) => void
  onAddToWishlist?: (product: ProductDetails, sizeId?: string) => Promise<boolean>
  onRemoveFromWishlist?: (productId: string, sizeId?: string) => Promise<boolean>
  isInWishlist?: (productId: string, sizeId?: string) => boolean
}

export const PharmacyProductCard = ({ 
  product, 
  onProductClick,
  onAddToWishlist,
  onRemoveFromWishlist,
  isInWishlist
}: PharmacyProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const { toast } = useToast()

  const stockStatus = product.totalStock <= 0 ? "Out of Stock" : product.totalStock < 10 ? "Low Stock" : "In Stock"
  const isOutOfStock = product.totalStock <= 0
  const sizesCount = product.sizes?.length || 0

  const getImageUrl = () => {
    const basePath = "https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/"
    if (product.displayImage) {
      if (product.displayImage.startsWith("http")) return product.displayImage
      return basePath + product.displayImage
    }
    return "/placeholder.svg"
  }

  const handleCardClick = () => {
    if (onProductClick) {
      onProductClick(product)
    }
  }

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!onAddToWishlist || !onRemoveFromWishlist || !isInWishlist) return

    if (isInWishlist(product.id)) {
      await onRemoveFromWishlist(product.id)
    } else {
      await onAddToWishlist(product)
    }
  }

  const handleViewSizes = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onProductClick) {
      onProductClick(product)
    }
  }

  return (
    <Card 
      className={`group relative bg-white border rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${
        isOutOfStock 
          ? "border-gray-200 opacity-60" 
          : "border-gray-200 hover:shadow-lg hover:border-emerald-300"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Wishlist & Category */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
        {/* Wishlist Button */}
        {onAddToWishlist && onRemoveFromWishlist && isInWishlist && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
            onClick={handleWishlistToggle}
          >
            <Heart 
              className={`w-4 h-4 ${
                isInWishlist(product.id) 
                  ? 'text-red-500 fill-red-500' 
                  : 'text-gray-400 hover:text-red-500'
              }`} 
            />
          </Button>
        )}
        
        {/* Category Badge */}
        <Badge className="bg-emerald-100 text-emerald-700 font-medium px-1.5 py-0.5 text-[10px]">
          {product.category}
        </Badge>
      </div>

      {/* Sizes Count Badge */}
      {sizesCount > 1 && (
        <div className="absolute top-2 left-2 z-20">
          <Badge className="bg-blue-500 text-white font-bold px-1.5 py-0.5 text-[10px] flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {sizesCount} sizes
          </Badge>
        </div>
      )}

      {/* Product Image */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <img
          src={getImageUrl()}
          alt={product.name}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg"
          }}
        />
        
        {/* Hover Overlay - View Sizes */}
        <div className={`absolute inset-0 bg-gradient-to-t from-emerald-900/80 via-emerald-900/40 to-transparent flex items-end justify-center pb-4 transition-opacity duration-300 ${isHovered && !isOutOfStock ? 'opacity-100' : 'opacity-0'}`}>
          <Button
            size="sm"
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-lg text-xs"
            onClick={handleViewSizes}
          >
            <Eye className="w-3 h-3 mr-1" />
            View Sizes
          </Button>
        </div>
        
        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm font-bold">
              Out of Stock
            </Badge>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-2.5 space-y-1.5">
        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 text-xs leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors min-h-[32px]">
          {product.name}
        </h3>

        {/* SKU */}
        {product.sku && (
          <p className="text-[9px] text-gray-400 truncate">
            SKU: {product.sku}
          </p>
        )}

        {/* Sizes Info */}
        {sizesCount > 0 && (
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-blue-500" />
            <span className="text-[10px] text-gray-500">
              {sizesCount} size{sizesCount > 1 ? 's' : ''} available
            </span>
          </div>
        )}

        {/* Price Section */}
        <div className="pt-1 border-t border-gray-100">
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-gray-500">Starting at</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-emerald-600">
              ${product.displayPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* View Sizes Button */}
        {!isOutOfStock && (
          <Button
            className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            onClick={handleViewSizes}
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            View Sizes & Add to Cart
          </Button>
        )}

        {/* Bottom Info */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          {/* Stock Status */}
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${
              stockStatus === "In Stock" ? "bg-emerald-500" : 
              stockStatus === "Low Stock" ? "bg-amber-500" : "bg-red-500"
            }`}></div>
            <span className={`text-[9px] font-medium ${
              stockStatus === "In Stock" ? "text-emerald-600" : 
              stockStatus === "Low Stock" ? "text-amber-600" : "text-red-600"
            }`}>
              {stockStatus}
            </span>
          </div>

          {/* Free Delivery */}
          <div className="flex items-center gap-0.5 text-[9px] text-blue-600">
            <Truck className="w-2.5 h-2.5" />
            <span className="font-medium">Free Delivery</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default PharmacyProductCard