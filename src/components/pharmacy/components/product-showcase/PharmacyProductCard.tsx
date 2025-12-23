"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, ShoppingCart, Truck, Percent, Eye } from "lucide-react"
import { ProductDetails } from "../../types/product.types"

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
  const navigate = useNavigate()
  const [imageLoaded, setImageLoaded] = useState(false)

  const isOutOfStock = product.totalStock <= 0
  const sizesCount = product.sizes?.length || 0
  const inWishlist = isInWishlist ? isInWishlist(product.id) : false
  
  // Check if product has any offer/discount
  const hasOffer = product.sizes?.some(s => s.originalPrice && s.originalPrice > s.price)
  const discountPercent = hasOffer && product.sizes?.[0]?.originalPrice 
    ? Math.round((1 - product.displayPrice / product.sizes[0].originalPrice) * 100)
    : 0

  // Check shipping cost
  const hasFreeShipping = product.sizes?.some(s => !s.shipping_cost || s.shipping_cost === 0)

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
    } else {
      // Check user type and navigate to appropriate product detail page
      const userType = sessionStorage.getItem('userType')
      if (userType === 'admin') {
        // Admin users use the public product route
        navigate(`/product/${product.id}`)
      } else {
        // Pharmacy users use the pharmacy-specific route
        navigate(`/pharmacy/product/${product.id}`)
      }
    }
  }

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onAddToWishlist || !onRemoveFromWishlist || !isInWishlist) return
    if (inWishlist) {
      await onRemoveFromWishlist(product.id)
    } else {
      await onAddToWishlist(product)
    }
  }

  return (
    <Card 
      className={`group bg-white rounded-2xl overflow-hidden cursor-pointer border border-gray-200 hover:border-emerald-400 hover:shadow-xl transition-all duration-300 ${isOutOfStock ? "opacity-60" : ""}`}
      onClick={handleCardClick}
    >
      {/* Image Section */}
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Top Left Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          {/* Sizes Badge */}
          {sizesCount > 0 && (
            <Badge className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm">
              {sizesCount} {sizesCount === 1 ? 'Size' : 'Sizes'}
            </Badge>
          )}
          
          {/* Offer Badge */}
          {hasOffer && discountPercent > 0 && (
            <Badge className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
              <Percent className="w-3 h-3" />
              {discountPercent}% OFF
            </Badge>
          )}
        </div>

        {/* Wishlist - Top Right */}
        {onAddToWishlist && (
          <button
            className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all ${
              inWishlist 
                ? 'bg-red-50 text-red-500 border border-red-200' 
                : 'bg-white text-gray-400 hover:text-red-500 border border-gray-200'
            }`}
            onClick={handleWishlistToggle}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Category Badge - Top Right Below Wishlist */}
        <div className="absolute top-14 right-3 z-10">
          <Badge variant="outline" className="bg-white/90 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-md border-gray-300">
            {product.category}
          </Badge>
        </div>

        {/* Product Image */}
        <div className="aspect-[4/3] p-6 flex items-center justify-center">
          {!imageLoaded && (
            <div className="w-full h-full bg-gray-200 animate-pulse rounded-xl" />
          )}
          <img
            src={getImageUrl()}
            alt={product.name}
            className={`max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-110 ${imageLoaded ? '' : 'hidden'}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg"
              setImageLoaded(true)
            }}
          />
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Product Name - Bigger and clearer */}
        <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 min-h-[48px] group-hover:text-emerald-600 transition-colors">
          {product.name}
        </h3>

        {/* SKU & Sizes Row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">SKU: {product.sku || 'N/A'}</span>
          {sizesCount > 0 && (
            <span className="text-emerald-600 font-medium">
              {sizesCount} sizes available
            </span>
          )}
        </div>

        {/* Price Section */}
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Starting at</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              ${product.displayPrice.toFixed(2)}
            </span>
            {hasOffer && product.sizes?.[0]?.originalPrice && (
              <span className="text-sm text-gray-400 line-through">
                ${product.sizes[0].originalPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!isOutOfStock && (
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold h-10 rounded-xl"
              onClick={(e) => {
                e.stopPropagation()
                handleCardClick()
              }}
            >
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              Add to Cart
            </Button>
            <Button
              variant="outline"
              className="h-10 px-3 rounded-xl border-gray-300 hover:bg-gray-50"
              onClick={(e) => {
                e.stopPropagation()
                const userType = sessionStorage.getItem('userType')
                if (userType === 'admin') {
                  navigate(`/product/${product.id}`)
                } else {
                  navigate(`/pharmacy/product/${product.id}`)
                }
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Bottom Info Row */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {/* Stock Status */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOutOfStock ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span className={`text-xs font-medium whitespace-nowrap ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
              {isOutOfStock ? 'Out of Stock' : 'In Stock'}
            </span>
          </div>

          {/* Shipping Info */}
          {hasFreeShipping ? (
            <div className="flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full whitespace-nowrap">
              <Truck className="w-3 h-3 flex-shrink-0" />
              <span>Free Ship</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
              <Truck className="w-3 h-3 flex-shrink-0" />
              <span>Shipping</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default PharmacyProductCard
