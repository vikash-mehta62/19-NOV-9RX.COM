"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Check, Truck, Eye } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { ProductDetails } from "../../types/product.types"

interface PharmacyProductCardProps {
  product: ProductDetails
}

export const PharmacyProductCard = ({ product }: PharmacyProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()

  // Get the lowest price from sizes or base price
  const getLowestPrice = () => {
    if (product.sizes && product.sizes.length > 0) {
      const prices = product.sizes.map(s => s.price)
      return Math.min(...prices)
    }
    return product.base_price || product.price || 0
  }

  // Get original price for discount display
  const getOriginalPrice = () => {
    if (product.sizes && product.sizes.length > 0) {
      const sizeWithOriginal = product.sizes.find(s => s.originalPrice && s.originalPrice > 0)
      if (sizeWithOriginal) return sizeWithOriginal.originalPrice
    }
    return null
  }

  const lowestPrice = getLowestPrice()
  const originalPrice = getOriginalPrice()
  const hasDiscount = originalPrice && originalPrice > lowestPrice
  const discountPercent = hasDiscount ? Math.round((1 - lowestPrice / originalPrice) * 100) : 0

  const stockStatus = product.stock && product.stock < 10 ? "Low Stock" : "In Stock"


  const getImageUrl = () => {
    const basePath = "https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/"
    if (product.image_url && product.image_url !== "/placeholder.svg") return product.image_url
    if (product.images && product.images.length > 0 && product.images[0]) return basePath + product.images[0]
    if (product.image && product.image !== "/placeholder.svg") return product.image
    return "/placeholder.svg"
  }

  const handleViewProduct = () => {
    navigate(`/pharmacy/product/${product.id}`)
  }

  return (
    <Card 
      className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-emerald-300 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleViewProduct}
    >
      {/* Discount Badge */}
      {hasDiscount && discountPercent > 5 && (
        <div className="absolute top-3 left-3 z-20">
          <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold px-2 py-1 text-xs">
            {discountPercent}% OFF
          </Badge>
        </div>
      )}

      {/* Category Badge */}
      <div className="absolute top-3 right-3 z-20">
        <Badge className="bg-emerald-100 text-emerald-700 font-medium px-2 py-1 text-xs">
          {product.category}
        </Badge>
      </div>

      {/* Product Image */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <img
          src={getImageUrl()}
          alt={product.name}
          className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg"
          }}
        />
        
        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-emerald-900/80 via-emerald-900/40 to-transparent flex items-end justify-center pb-6 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <Button
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-lg"
            onClick={(e) => {
              e.stopPropagation()
              handleViewProduct()
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-3 space-y-2">
        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-tight group-hover:text-emerald-700 transition-colors">
          {product.name}
        </h3>

        {/* Size Options Count */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs text-gray-500">
              {product.sizes.length} size{product.sizes.length > 1 ? 's' : ''} available
            </span>
          </div>
        )}

        {/* Price Section */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] text-gray-400">From</span>
          <span className="text-xl font-bold text-emerald-600">
            ${lowestPrice.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              ${originalPrice?.toFixed(2)}
            </span>
          )}
        </div>

        {/* Bottom Info */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {/* Stock Status */}
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${stockStatus === "In Stock" ? "bg-emerald-500" : "bg-amber-500"}`}></div>
            <span className={`text-[10px] font-medium ${stockStatus === "In Stock" ? "text-emerald-600" : "text-amber-600"}`}>
              {stockStatus}
            </span>
          </div>

          {/* Free Delivery */}
          <div className="flex items-center gap-1 text-[10px] text-blue-600">
            <Truck className="w-3 h-3" />
            <span className="font-medium">Free Delivery</span>
          </div>
        </div>

        {/* SKU */}
        {product.sku && (
          <p className="text-[10px] text-gray-400">
            SKU: {product.sku}
          </p>
        )}
      </div>
    </Card>
  )
}

export default PharmacyProductCard
