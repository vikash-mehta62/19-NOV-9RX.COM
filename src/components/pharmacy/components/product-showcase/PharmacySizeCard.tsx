"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Truck, Plus, Minus, ShoppingCart, Check, Loader2, Eye, Heart } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"
import { ProductDetails } from "../types/product.types"
import type { FlattenedSizeItem } from "./PharmacyProductGrid"

interface PharmacySizeCardProps {
  item: FlattenedSizeItem
  onProductClick?: (product: ProductDetails) => void
  onAddToWishlist?: (product: ProductDetails, sizeId?: string) => Promise<boolean>
  onRemoveFromWishlist?: (productId: string, sizeId?: string) => Promise<boolean>
  isInWishlist?: (productId: string, sizeId?: string) => boolean
}

export const PharmacySizeCard = ({ 
  item, 
  onProductClick,
  onAddToWishlist,
  onRemoveFromWishlist,
  isInWishlist
}: PharmacySizeCardProps) => {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [selectedType, setSelectedType] = useState<"case" | "unit">("case")
  const [isAdding, setIsAdding] = useState(false)
  const { addToCart, cartItems } = useCart()
  const { toast } = useToast()

  const hasDiscount = item.originalPrice > 0 && item.originalPrice > item.price
  const discountPercent = hasDiscount ? Math.round((1 - item.price / item.originalPrice) * 100) : 0
  const stockStatus = item.stock <= 0 ? "Out of Stock" : item.stock < 10 ? "Low Stock" : "In Stock"
  const isOutOfStock = item.stock <= 0

  // Check if this size is already in cart
  const isInCart = cartItems.some(
    cartItem => cartItem.productId === item.productId && 
    cartItem.sizes?.some((s: any) => s.id === item.sizeId)
  )

  const getImageUrl = () => {
    const basePath = "https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/"
    if (item.image) {
      if (item.image.startsWith("http")) return item.image
      return basePath + item.image
    }
    if (item.productImages && item.productImages.length > 0) {
      const img = item.productImages[0]
      if (img.startsWith("http")) return img
      return basePath + img
    }
    return "/placeholder.svg"
  }

  const currentPrice = selectedType === "case" ? item.price : item.pricePerCase
  const totalPrice = currentPrice * quantity

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (isOutOfStock) {
      toast({
        title: "Out of Stock",
        description: "This item is currently out of stock",
        variant: "destructive"
      })
      return
    }

    setIsAdding(true)
    try {
      const cartItem = {
        productId: item.productId,
        name: item.sizeValue 
          ? `${item.productName} - ${item.sizeValue}${item.sizeUnit}`
          : item.productName,
        price: totalPrice,
        image: getImageUrl(),
        shipping_cost: item.shippingCost,
        sizes: [{
          id: item.sizeId,
          size_value: item.sizeValue,
          size_unit: item.sizeUnit,
          price: currentPrice,
          quantity: quantity,
          sku: item.sizeSku,
          total_price: totalPrice,
          shipping_cost: item.shippingCost,
          type: selectedType
        }],
        quantity: quantity,
        customizations: {},
        notes: ''
      }

      const success = await addToCart(cartItem)
      
      if (success) {
        toast({
          title: "✅ Added to Cart",
          description: `${item.productName} ${item.sizeValue}${item.sizeUnit} added!`,
        })
        setQuantity(1)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive"
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleCardClick = () => {
    if (onProductClick) {
      // Create a ProductDetails object from the flattened item
      const product: ProductDetails = {
        id: item.productId,
        name: item.productName,
        description: item.productDescription || "",
        category: item.productCategory,
        subcategory: item.productSubcategory,
        sku: item.productSku,
        image_url: item.image,
        images: item.productImages,
        base_price: item.price,
        price: item.price,
        stock: item.stock,
        sizes: [] // Will be populated by the parent component
      }
      onProductClick(product)
    } else {
      navigate(`/pharmacy/product/${item.productId}/${item.sizeId}`)
    }
  }

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!onAddToWishlist || !onRemoveFromWishlist || !isInWishlist) return

    const product: ProductDetails = {
      id: item.productId,
      name: item.productName,
      description: item.productDescription || "",
      category: item.productCategory,
      subcategory: item.productSubcategory,
      sku: item.productSku,
      image_url: item.image,
      images: item.productImages,
      base_price: item.price,
      price: item.price,
      stock: item.stock,
      sizes: []
    }

    if (isInWishlist(item.productId, item.sizeId)) {
      await onRemoveFromWishlist(item.productId, item.sizeId)
    } else {
      await onAddToWishlist(product, item.sizeId)
    }
  }

  return (
    <Card 
      className={`group relative bg-white border rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${
        isInCart 
          ? "border-blue-400 ring-2 ring-blue-100" 
          : isOutOfStock 
          ? "border-gray-200 opacity-60" 
          : "border-gray-200 hover:shadow-lg hover:border-emerald-300"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Discount Badge */}
      {hasDiscount && discountPercent > 5 && (
        <div className="absolute top-2 left-2 z-20">
          <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold px-1.5 py-0.5 text-[10px]">
            {discountPercent}% OFF
          </Badge>
        </div>
      )}

      {/* In Cart Badge */}
      {isInCart && (
        <div className="absolute top-2 left-2 z-20">
          <Badge className="bg-blue-500 text-white font-bold px-1.5 py-0.5 text-[10px] flex items-center gap-1">
            <Check className="w-3 h-3" /> In Cart
          </Badge>
        </div>
      )}

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
                isInWishlist(item.productId, item.sizeId) 
                  ? 'text-red-500 fill-red-500' 
                  : 'text-gray-400 hover:text-red-500'
              }`} 
            />
          </Button>
        )}
        
        {/* Category Badge */}
        <Badge className="bg-emerald-100 text-emerald-700 font-medium px-1.5 py-0.5 text-[10px]">
          {item.productCategory}
        </Badge>
      </div>

      {/* Product Image */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <img
          src={getImageUrl()}
          alt={`${item.productName} ${item.sizeValue}`}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg"
          }}
        />
        
        {/* Hover Overlay - View Details */}
        <div className={`absolute inset-0 bg-gradient-to-t from-emerald-900/80 via-emerald-900/40 to-transparent flex items-end justify-center pb-4 transition-opacity duration-300 ${isHovered && !isOutOfStock ? 'opacity-100' : 'opacity-0'}`}>
          <Button
            size="sm"
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-lg text-xs"
            onClick={(e) => {
              e.stopPropagation()
              handleCardClick()
            }}
          >
            <Eye className="w-3 h-3 mr-1" />
            View Details
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
        {/* Product Name + Size */}
        <h3 className="font-semibold text-gray-900 text-xs leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors">
          {item.productName}
          {item.sizeValue && (
            <span className="text-emerald-600 font-bold ml-1">
              {item.sizeValue}{item.sizeUnit}
            </span>
          )}
        </h3>

        {/* SKU */}
        {item.sizeSku && (
          <p className="text-[9px] text-gray-400 truncate">
            SKU: {item.sizeSku}
          </p>
        )}

        {/* Qty per Case */}
        {item.quantityPerCase > 0 && (
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3 text-purple-500" />
            <span className="text-[10px] text-gray-500">
              {item.quantityPerCase}/case
            </span>
          </div>
        )}

        {/* Price Section */}
        <div className="pt-1 border-t border-gray-100">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-emerald-600">
              ${currentPrice.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] text-gray-400 line-through">
                ${item.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Case/Unit Toggle */}
        {(item.caseEnabled || item.unitEnabled) && !isOutOfStock && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {item.caseEnabled && (
              <Button
                variant={selectedType === "case" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("case")}
                className={`flex-1 h-6 text-[10px] ${
                  selectedType === "case" 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : "hover:bg-emerald-50"
                }`}
              >
                Case
              </Button>
            )}
            {item.unitEnabled && (
              <Button
                variant={selectedType === "unit" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("unit")}
                className={`flex-1 h-6 text-[10px] ${
                  selectedType === "unit" 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : "hover:bg-emerald-50"
                }`}
              >
                Unit
              </Button>
            )}
          </div>
        )}

        {/* Quantity Controls */}
        {!isOutOfStock && (
          <div className="flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded hover:bg-white"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-6 text-center text-xs font-semibold">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded hover:bg-white"
                onClick={() => setQuantity(Math.min(item.stock, quantity + 1))}
                disabled={quantity >= item.stock}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            
            {/* Subtotal */}
            <div className="text-right">
              <p className="text-[9px] text-gray-400">Total</p>
              <p className="text-xs font-bold text-emerald-700">${totalPrice.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        {!isOutOfStock && (
          <Button
            className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            onClick={handleAddToCart}
            disabled={isAdding || isInCart}
          >
            {isAdding ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Adding...
              </>
            ) : isInCart ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Added
              </>
            ) : (
              <>
                <ShoppingCart className="w-3 h-3 mr-1" />
                Add to Cart
              </>
            )}
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

export default PharmacySizeCard
