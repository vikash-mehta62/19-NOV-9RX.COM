"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Heart, ShoppingCart, Eye, Check, Truck } from "lucide-react"
import type { Product } from "@/types/product"
import { formatPrice } from "@/lib/utils"
import { ProductThumbnail } from "./ProductThumbnail"

interface ProductCardProps {
  product: Product
  onView?: (product: Product) => void
  onAddToCart?: (product: Product) => void
  onEdit?: (product: Product) => void
  showActions?: boolean
}

export const ProductCard = ({ product, onView, onAddToCart, onEdit, showActions = true }: ProductCardProps) => {
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Get the lowest price from sizes or base price
  const getLowestPrice = () => {
    if (product.sizes && product.sizes.length > 0) {
      const prices = product.sizes.map(s => s.price)
      return Math.min(...prices)
    }
    return product.base_price
  }

  // Get the highest price for "was" price display
  const getHighestPrice = () => {
    if (product.sizes && product.sizes.length > 0) {
      const prices = product.sizes.map(s => s.price)
      return Math.max(...prices)
    }
    return product.base_price * 1.2 // Show 20% higher as original
  }

  const lowestPrice = getLowestPrice()
  const highestPrice = getHighestPrice()
  const hasDiscount = highestPrice > lowestPrice
  const discountPercent = hasDiscount ? Math.round((1 - lowestPrice / highestPrice) * 100) : 0

  // Generate random rating for demo (in real app, this would come from data)
  const rating = 4 + Math.random() * 0.9
  const reviewCount = Math.floor(Math.random() * 500) + 50

  const getImageUrl = () => {
    const basePath = "https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/"
    if (product.image_url) return product.image_url
    if (product.images && product.images.length > 0) return basePath + product.images[0]
    if (product.sizes && product.sizes.length > 0) {
      const sizeWithImage = product.sizes.find(s => s.image)
      if (sizeWithImage) return basePath + sizeWithImage.image
    }
    return "/placeholder.svg"
  }

  return (
    <Card 
      className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-orange-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Wishlist Button */}
      <button
        onClick={() => setIsWishlisted(!isWishlisted)}
        className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/90 hover:bg-white shadow-sm transition-all"
      >
        <Heart 
          className={`w-5 h-5 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`} 
        />
      </button>

      {/* Discount Badge */}
      {hasDiscount && discountPercent > 5 && (
        <div className="absolute top-3 left-3 z-20">
          <Badge className="bg-red-600 text-white font-bold px-2 py-1">
            -{discountPercent}%
          </Badge>
        </div>
      )}

      {/* Product Image */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <img
          src={getImageUrl()}
          alt={product.name}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg"
          }}
        />
        
        {/* Quick Actions Overlay */}
        <div className={`absolute inset-0 bg-black/5 flex items-center justify-center gap-2 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {onView && (
            <Button
              size="sm"
              variant="secondary"
              className="bg-white hover:bg-gray-100 shadow-md"
              onClick={() => onView(product)}
            >
              <Eye className="w-4 h-4 mr-1" />
              Quick View
            </Button>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Category Badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-50 text-blue-700 border-blue-200">
            {product.category}
          </Badge>
          {product.subcategory && (
            <Badge variant="outline" className="text-[10px] sm:text-xs bg-purple-50 text-purple-700 border-purple-200">
              {product.subcategory}
            </Badge>
          )}
        </div>

        {/* Product Name */}
        <h3 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 min-h-[36px] sm:min-h-[48px] hover:text-orange-600 cursor-pointer transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3 h-3 sm:w-4 sm:h-4 ${star <= Math.floor(rating) ? 'fill-orange-400 text-orange-400' : 'fill-gray-200 text-gray-200'}`}
              />
            ))}
          </div>
          <span className="text-xs sm:text-sm text-blue-600 hover:text-orange-600 cursor-pointer">
            {reviewCount.toLocaleString()}
          </span>
        </div>

        {/* Price Section */}
        <div className="space-y-0.5">
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold text-gray-900">
              ${formatPrice(lowestPrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs sm:text-sm text-gray-500 line-through">
                ${formatPrice(highestPrice)}
              </span>
            )}
          </div>
          {product.sizes && product.sizes.length > 1 && (
            <p className="text-[10px] sm:text-xs text-gray-500">
              {product.sizes.length} size options available
            </p>
          )}
        </div>

        {/* Prime-like Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-1 text-emerald-600">
            <Truck className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="font-medium">FREE Delivery</span>
          </div>
        </div>

        {/* Stock Status */}
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
          <span className="text-emerald-600">In Stock</span>
        </div>

        {/* SKU */}
        <p className="text-[10px] sm:text-xs text-gray-400">
          SKU: {product.sku}
        </p>

        {/* Action Buttons */}
        {showActions && (
          <div className="pt-1.5 sm:pt-2 space-y-1.5 sm:space-y-2">
            <Button 
              className="w-full h-9 sm:h-10 text-xs sm:text-sm bg-gradient-to-b from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-medium border border-yellow-600 shadow-sm"
              onClick={() => onAddToCart?.(product)}
            >
              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Add to Cart
            </Button>
            {onEdit && (
              <Button 
                variant="outline"
                className="w-full h-9 sm:h-10 text-xs sm:text-sm border-gray-300 hover:bg-gray-50"
                onClick={() => onEdit(product)}
              >
                Edit Product
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
