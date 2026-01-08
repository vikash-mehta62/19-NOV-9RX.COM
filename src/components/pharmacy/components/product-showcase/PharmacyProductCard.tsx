"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Eye, Palette, ChevronDown, ChevronUp } from "lucide-react"
import { ProductDetails } from "../../types/product.types"
import { ScaleOnTap } from "@/components/ui/MicroInteractions"
import { SearchMatchIndicator } from "@/components/search/SearchMatchIndicator"
import { getSearchMatches } from "@/utils/searchHighlight"

interface PharmacyProductCardProps {
  product: ProductDetails & {
    displayPrice: number
    displayImage: string
    totalStock: number
    matchingSizes?: any[]
  }
  onProductClick?: (product: ProductDetails) => void
  searchQuery?: string
}

export const PharmacyProductCard = ({ 
  product, 
  onProductClick,
  searchQuery = ""
}: PharmacyProductCardProps) => {
  const navigate = useNavigate()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showSizes, setShowSizes] = useState(false)

  const isOutOfStock = product.totalStock <= 0
  const sizesCount = product.sizes?.length || 0
  
  // Check if customization is available
  const hasCustomization = product.customization?.allowed === true

  // Calculate units per case from first size
  const unitsPerCase = product.sizes?.[0]?.quantity_per_case || 0
  const unitPrice = unitsPerCase > 0 ? product.displayPrice / unitsPerCase : 0

  // Get search matches for highlighting
  const searchMatches = getSearchMatches(product, searchQuery)

  // Check if this product was found via size search
  const hasMatchingSizes = product.matchingSizes && product.matchingSizes.length > 0
  
  // Auto-expand sizes if found via size search
  useState(() => {
    if (hasMatchingSizes && searchQuery) {
      setShowSizes(true)
    }
  })

  // Function to check if a size matches the search query
  const isSizeMatching = (size: any) => {
    if (!searchQuery || !hasMatchingSizes) return false
    const query = searchQuery.toLowerCase().trim()
    return (
      size.size_value?.toLowerCase().includes(query) ||
      size.size_unit?.toLowerCase().includes(query) ||
      size.sku?.toLowerCase().includes(query) ||
      `${size.size_value}${size.size_unit}`.toLowerCase().includes(query)
    )
  }

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
      return
    }
    const userType = sessionStorage.getItem('userType')
    if (userType === 'admin') {
      navigate(`/admin/product/${product.id}`)
    } else {
      navigate(`/pharmacy/product/${product.id}`)
    }
  }

  return (
    <ScaleOnTap>
      <Card 
        className={`relative bg-white border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          isOutOfStock 
            ? "border-gray-200 opacity-60" 
            : "border-gray-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-1"
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
          <Badge className="bg-blue-500 text-white text-[10px] px-2 py-0.5">
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
      <div className="p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight line-clamp-2 hover:text-blue-600 transition-colors min-h-[32px] sm:min-h-[40px]" title={product.name}>
          {product.name}
        </h3>

        {/* Search Match Indicator */}
        {searchQuery && searchMatches.length > 0 && (
          <SearchMatchIndicator 
            matches={searchMatches} 
            searchQuery={searchQuery}
            className="mb-1"
          />
        )}

        {/* Starting Price - Large & Bold */}
        <div className="pt-0.5 sm:pt-1">
          <span className="text-[10px] sm:text-xs text-gray-500">Starting at</span>
          <div>
            <span className="text-base sm:text-xl font-bold text-gray-900">
              ${product.displayPrice.toFixed(2)}
            </span>
            <span className="text-xs sm:text-sm text-gray-500 ml-0.5 sm:ml-1">/ case</span>
          </div>
        </div>

        {/* Units per Case + Unit Price */}
        {unitsPerCase > 0 && (
          <div className="flex items-center text-[10px] sm:text-xs text-gray-500 flex-wrap">
            <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1 text-gray-400" />
            <span>{unitsPerCase} units/case</span>
            <span className="mx-1">·</span>
            <span>${unitPrice.toFixed(2)}/unit</span>
          </div>
        )}

        {/* Stock Status */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-emerald-500'}`} />
          <span className={`text-[10px] sm:text-xs font-medium ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
            {isOutOfStock ? 'Out of Stock' : 'In Stock'}
          </span>
        </div>

        {/* Size Toggle Button - Show if has sizes and search query */}
        {sizesCount > 0 && (hasMatchingSizes || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1 mt-1"
            onClick={(e) => {
              e.stopPropagation()
              setShowSizes(!showSizes)
            }}
          >
            {showSizes ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Hide Sizes
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show {sizesCount} Sizes
              </>
            )}
          </Button>
        )}

        {/* Expanded Sizes Section */}
        {showSizes && product.sizes && product.sizes.length > 0 && (
          <div className="mt-2 p-2 bg-gray-50 rounded-lg border">
            <div className="text-xs font-medium text-gray-700 mb-2">Available Sizes:</div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {product.sizes.map((size, index) => {
                const isMatching = isSizeMatching(size)
                return (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-2 rounded text-xs ${
                      isMatching 
                        ? 'bg-blue-100 border border-blue-200' 
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isMatching ? 'text-blue-800' : 'text-gray-900'}`}>
                        {size.size_value} {size.size_unit}
                      </span>
                      {isMatching && (
                        <Badge variant="secondary" className="bg-blue-200 text-blue-800 text-xs px-1 py-0">
                          Match
                        </Badge>
                      )}
                      {size.sku && (
                        <span className="text-gray-500 text-xs">SKU: {size.sku}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${isMatching ? 'text-blue-800' : 'text-gray-900'}`}>
                        ${(size.price || 0).toFixed(2)}
                      </div>
                      {size.stock !== undefined && (
                        <div className="text-xs text-gray-500">
                          Stock: {size.stock}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* View Sizes Button */}
        {!isOutOfStock && (
          <Button
            className="w-full h-9 sm:h-11 min-h-[36px] sm:min-h-[44px] text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg sm:rounded-xl mt-1.5 sm:mt-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95 transition-transform"
            onClick={(e) => {
              e.stopPropagation()
              handleCardClick()
            }}
            aria-label={sizesCount > 1 ? `View ${sizesCount} sizes for ${product.name}` : `View details for ${product.name}`}
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" aria-hidden="true" />
            {sizesCount > 1 ? `View ${sizesCount} Sizes` : 'View Details'}
          </Button>
        )}
      </div>
    </Card>
    </ScaleOnTap>
  )
}

export default PharmacyProductCard
