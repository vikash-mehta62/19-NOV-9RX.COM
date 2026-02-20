"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Plus, Minus, ShoppingCart, Check, Loader2, Heart } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"
import { ProductDetails } from "../../types/product.types"
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
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const { addToCart, cartItems } = useCart()
  const { toast } = useToast()

  const isOutOfStock = item.stock <= 0
  const casePrice = item.price
  const effectiveCasePrice = item.hasOffer && item.effectivePrice ? item.effectivePrice : casePrice
  const unitsPerCase = item.quantityPerCase || 0
  const unitPrice = unitsPerCase > 0 ? effectiveCasePrice / unitsPerCase : 0

  // Check if this size is already in cart
  const isInCart = cartItems.some(
    cartItem => cartItem.productId === item.productId && 
    cartItem.sizes?.some((s: any) => s.id === item.sizeId)
  )

  const getImageUrl = () => {
    const basePath = "https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/"
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

  const totalPrice = effectiveCasePrice * quantity

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
        name: item.productName,
        sku: item.productSku || item.sizeSku || "",
        price: totalPrice,
        image: getImageUrl(),
        shipping_cost: item.shippingCost,
        sizes: [{
          id: item.sizeId,
          size_value: item.sizeValue,
          size_unit: item.sizeUnit,
          price: effectiveCasePrice,
          quantity: quantity,
          sku: item.sizeSku,
          total_price: totalPrice,
          shipping_cost: item.shippingCost,
          type: "case"
        }],
        quantity: quantity,
        customizations: {},
        notes: ''
      }

      const success = await addToCart(cartItem)
      
      if (success) {
        toast({
          title: "✓ Added to Cart",
          description: `${quantity} case${quantity > 1 ? 's' : ''} of ${item.productName} added`,
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
    const userType = sessionStorage.getItem('userType')?.toLowerCase() || 'pharmacy'
    navigate(`/${userType}/product/${item.productId}/${item.sizeId}`)
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
      sizes: [],
      offer: "",
      image: "",
      shipping_cost: 0,
      key_features: "",
      endsIn: "",
      productId: "",
      customizations: undefined
    }

    if (isInWishlist(item.productId, item.sizeId)) {
      await onRemoveFromWishlist(item.productId, item.sizeId)
    } else {
      await onAddToWishlist(product, item.sizeId)
    }
  }

  return (
    <Card className={`relative bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
      isInCart 
        ? "border-blue-400 ring-1 ring-blue-100" 
        : isOutOfStock 
        ? "border-gray-200 opacity-60" 
        : "border-gray-200 hover:border-blue-300 hover:shadow-md"
    }`}>
      
      {/* Offer Badge - Top Left */}
      {item.offerBadge && item.hasOffer && (
        <div className="absolute top-1.5 lg:top-2 left-1.5 lg:left-2 z-20">
          <Badge className="bg-red-500 text-white text-[9px] lg:text-[10px] px-1.5 lg:px-2 py-0.5 font-bold shadow-md">
            {item.offerBadge}
          </Badge>
        </div>
      )}
      
      {/* Wishlist Button - Subtle */}
      {onAddToWishlist && onRemoveFromWishlist && isInWishlist && (
        <button
          className={`absolute top-1.5 lg:top-2 right-1.5 lg:right-2 z-10 w-7 lg:w-8 h-7 lg:h-8 rounded-full flex items-center justify-center transition-all ${
            isInWishlist(item.productId, item.sizeId) 
              ? 'bg-red-50 text-red-500' 
              : 'bg-white/80 text-gray-400 hover:text-red-500'
          }`}
          onClick={handleWishlistToggle}
        >
          <Heart className={`w-3.5 lg:w-4 h-3.5 lg:h-4 ${isInWishlist(item.productId, item.sizeId) ? 'fill-current' : ''}`} />
        </button>
      )}

      {/* In Cart Badge */}
      {isInCart && (
        <div className="absolute top-1.5 lg:top-2 left-1.5 lg:left-2 z-10">
          <Badge className="bg-blue-500 text-white text-[9px] lg:text-[10px] px-1.5 lg:px-2 py-0.5">
            <Check className="w-2.5 lg:w-3 h-2.5 lg:h-3 mr-0.5 lg:mr-1" /> In Cart
          </Badge>
        </div>
      )}

      {/* Product Image - Clickable */}
      <div 
        className="aspect-square sm:aspect-[4/3] bg-gray-50 p-3 sm:p-4 lg:p-5 cursor-pointer relative"
        onClick={handleCardClick}
      >
        <img
          src={getImageUrl()}
          alt={`${item.productName} ${item.sizeValue}`}
          className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg"
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
      <div className="p-2 lg:p-3 space-y-1 lg:space-y-1.5">
        
        {/* Product Name + Size - Clickable */}
        <div 
          className="cursor-pointer hover:text-blue-600 transition-colors"
          onClick={handleCardClick}
          title={`${item.productName} – ${item.sizeValue} ${item.sizeUnit}`}
        >
          <h3 className="font-semibold text-gray-900 text-xs lg:text-sm leading-tight line-clamp-1">
            {item.productName}
          </h3>
          {item.sizeValue && (
            <p className="text-blue-600 text-xs lg:text-sm font-medium line-clamp-1 mt-0.5">
              – {item.sizeValue} {item.sizeUnit}
            </p>
          )}
        </div>

        {/* Case Price - Large & Bold with Offer Support */}
        <div className="flex items-center gap-1.5">
          {item.hasOffer && item.effectivePrice ? (
            <>
              <span className="text-base lg:text-lg font-bold text-red-600">
                ${item.effectivePrice.toFixed(2)}
              </span>
              <span className="text-xs lg:text-sm text-gray-400 line-through">
                ${casePrice.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-base lg:text-lg font-bold text-gray-900">
              ${casePrice.toFixed(2)}
            </span>
          )}
          <span className="text-[10px] lg:text-xs text-gray-500">/ case</span>
        </div>

        {/* Units per Case + Unit Price */}
        {unitsPerCase > 0 && (
          <div className="flex items-center text-[10px] lg:text-xs text-gray-500 flex-wrap gap-x-1">
            <Package className="w-3 lg:w-3.5 h-3 lg:h-3.5 mr-0.5 text-gray-400 flex-shrink-0" />
            <span>{unitsPerCase} units/case</span>
            <span>·</span>
            <span>${unitPrice.toFixed(2)}/unit</span>
          </div>
        )}

        {/* Stock Status */}
        <div className="flex items-center gap-1 lg:gap-1.5">
          <span className={`w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-emerald-500'}`} />
          <span className={`text-[10px] lg:text-xs font-medium ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
            {isOutOfStock ? 'Out of Stock' : 'In Stock'}
          </span>
          {!isOutOfStock && item.stock < 10 && (
            <span className="text-[10px] lg:text-xs text-amber-600 ml-1">({item.stock} left)</span>
          )}
        </div>

        {/* Quantity Selector + Add to Cart */}
        {!isOutOfStock && (
          <div className="flex items-center gap-1.5 lg:gap-2 pt-1 lg:pt-2">
            {/* Quantity Selector */}
            <div className="flex items-center border border-gray-300 rounded-md bg-white shadow-sm h-7 lg:h-8">
              <button
                className="h-full w-6 lg:w-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-l-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={(e) => {
                  e.stopPropagation()
                  setQuantity(Math.max(1, quantity - 1))
                }}
                disabled={quantity <= 1}
              >
                <Minus className="w-3 lg:w-3.5 h-3 lg:h-3.5" />
              </button>
              <span className="w-6 lg:w-8 text-center font-semibold text-xs lg:text-sm text-gray-800">{quantity}</span>
              <button
                className="h-full w-6 lg:w-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-r-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={(e) => {
                  e.stopPropagation()
                  setQuantity(Math.min(item.stock, quantity + 1))
                }}
                disabled={quantity >= item.stock}
              >
                <Plus className="w-3 lg:w-3.5 h-3 lg:h-3.5" />
              </button>
            </div>

            {/* Add to Cart Button - Same height as quantity selector */}
            <button
              className="flex-1 h-7 lg:h-8 lg:p-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-[10px] lg:text-xs shadow-sm flex items-center justify-center gap-0.5 lg:gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={handleAddToCart}
              disabled={isAdding || isInCart}
            >
              {isAdding ? (
                <Loader2 className="w-3 lg:w-3.5 h-3 lg:h-3.5 animate-spin" />
              ) : isInCart ? (
                <>
                  <Check className="w-3 lg:w-3.5 h-3 lg:h-3.5" />
                  <span className="hidden lg:inline">Added</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3 lg:w-3.5 h-3 lg:h-3.5" />
                  <span className="hidden lg:inline">Add</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Total Price - Show when quantity > 1 */}
        {!isOutOfStock && quantity > 1 && (
          <div className="text-right text-[10px] lg:text-xs text-gray-500 pt-0.5 lg:pt-1">
            Total: <span className="font-semibold text-gray-700">${totalPrice.toFixed(2)}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export default PharmacySizeCard
