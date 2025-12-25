"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Eye, Palette } from "lucide-react"
import { ProductDetails } from "../../types/product.types"
import { ScaleOnTap } from "@/components/ui/MicroInteractions"

interface PharmacyProductCardProps {
  product: ProductDetails & {
    displayPrice: number
    displayImage: string
    totalStock: number
  }
  onProductClick?: (product: ProductDetails) => void
}

export const PharmacyProductCard = ({ 
  product, 
  onProductClick
}: PharmacyProductCardProps) => {
  const navigate = useNavigate()
  const [imageLoaded, setImageLoaded] = useState(false)

  const isOutOfStock = product.totalStock <= 0
  const sizesCount = product.sizes?.length || 0
  
  // Check if customization is available
  const hasCustomization = product.customization?.allowed === true

  // Calculate units per case from first size
  const unitsPerCase = product.sizes?.[0]?.quantity_per_case || 0
  const unitPrice = unitsPerCase > 0 ? product.displayPrice / unitsPerCase : 0

  const getImageUrl = () => {
    const basePath = "https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/"
    if (product.images && product.images.length > 0) {
      if (product.images[0].startsWith("http")) return product.images[0]
      return basePath + product.images[0]
    }
    return "/placeholder.svg"
  }

  const handleCardClick = () => {
    if (onProductClick) {
      onProductClick(product)
    } else {
      const userType = sessionStorage.getItem('userType')
      if (userType === 'admin') {
        navigate(`/product/${product.id}`)
      } else {
        navigate(`/pharmacy/product/${product.id}`)
      }
    }
  }

  return (
    <ScaleOnTap>
      <Card 
        className={`relative bg-white border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
          isOutOfStock 
            ? "border-gray-200 opacity-60" 
            : "border-gray-200 hover:border-emerald-300 hover:shadow-md hover:-translate-y-1"
        }`}
        onClick={handleCardClick}
        tabIndex={0}
        role="article"
        aria-label={`${product.name}. Starting at $${product.displayPrice.toFixed(2)} per case. ${isOutOfStock ? 'Out of stock' : 'In stock'}`}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      >
      {/* Top Left Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {sizesCount > 1 && (
          <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0.5">
            {sizesCount} Sizes
          </Badge>
        )}
        {hasCustomization && (
          <Badge className="bg-purple-500 text-white text-[10px] px-2 py-0.5 flex items-center gap-1">
            <Palette className="w-3 h-3" />
            Customizable
          </Badge>
        )}
      </div>

      {/* Product Image */}
      <div className="aspect-[4/3] bg-gray-50 p-4 relative">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-100 animate-pulse" />
        )}
        <img
          src={getImageUrl()}
          alt={product.name}
          className={`w-full h-full object-contain transition-all duration-300 hover:scale-105 ${imageLoaded ? '' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg"
            setImageLoaded(true)
          }}
        />

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Badge variant="secondary" className="text-sm font-medium bg-gray-100 text-gray-600">
              Out of Stock
            </Badge>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3 space-y-2">
        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 hover:text-emerald-600 transition-colors min-h-[40px]">
          {product.name}
        </h3>

        {/* Starting Price - Large & Bold */}
        <div className="pt-1">
          <span className="text-xs text-gray-500">Starting at</span>
          <div>
            <span className="text-xl font-bold text-gray-900">
              ${product.displayPrice.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500 ml-1">/ case</span>
          </div>
        </div>

        {/* Units per Case + Unit Price */}
        {unitsPerCase > 0 && (
          <div className="flex items-center text-xs text-gray-500">
            <Package className="w-3.5 h-3.5 mr-1 text-gray-400" />
            <span>{unitsPerCase} units per case</span>
            <span className="mx-1.5">·</span>
            <span>${unitPrice.toFixed(2)} per unit</span>
          </div>
        )}

        {/* Stock Status */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-emerald-500'}`} />
          <span className={`text-xs font-medium ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
            {isOutOfStock ? 'Out of Stock' : 'In Stock'}
          </span>
        </div>

        {/* View Sizes Button */}
        {!isOutOfStock && (
          <Button
            className="w-full h-11 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl mt-2 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-95 transition-transform"
            onClick={(e) => {
              e.stopPropagation()
              handleCardClick()
            }}
            aria-label={sizesCount > 1 ? `View ${sizesCount} sizes for ${product.name}` : `View details for ${product.name}`}
          >
            <Eye className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {sizesCount > 1 ? `View ${sizesCount} Sizes` : 'View Details'}
          </Button>
        )}
      </div>
    </Card>
    </ScaleOnTap>
  )
}

export default PharmacyProductCard
