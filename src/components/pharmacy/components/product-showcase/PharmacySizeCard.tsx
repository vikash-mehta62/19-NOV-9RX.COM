"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Plus, Minus, ShoppingCart, Check, Loader2, Heart } from "lucide-react"
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
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const { addToCart, cartItems } = useCart()
  const { toast } = useToast()

  const isOutOfStock = item.stock <= 0
  const casePrice = item.price
  const unitsPerCase = item.quantityPerCase || 0
  const unitPrice = unitsPerCase > 0 ? casePrice / unitsPerCase : 0

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

  const totalPrice = casePrice * quantity

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
          price: casePrice,
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
    navigate(`/pharmacy/product/${item.productId}/${item.sizeId}`)
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
    <Card className={`relative bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
      isInCart 
        ? "border-emerald-400 ring-1 ring-emerald-100" 
        : isOutOfStock 
        ? "border-gray-200 opacity-60" 
        : "border-gray-200 hover:border-emerald-300 hover:shadow-md"
    }`}>
      
      {/* Wishlist Button - Subtle */}
      {onAddToWishlist && onRemoveFromWishlist && isInWishlist && (
        <button
          className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isInWishlist(item.productId, item.sizeId) 
              ? 'bg-red-50 text-red-500' 
              : 'bg-white/80 text-gray-400 hover:text-red-500'
          }`}
          onClick={handleWishlistToggle}
        >
          <Heart className={`w-4 h-4 ${isInWishlist(item.productId, item.sizeId) ? 'fill-current' : ''}`} />
        </button>
      )}

      {/* In Cart Badge */}
      {isInCart && (
        <div className="absolute top-2 left-2 z-10">
          <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0.5">
            <Check className="w-3 h-3 mr-1" /> In Cart
          </Badge>
        </div>
      )}

      {/* Product Image - Clickable */}
      <div 
        className="aspect-[4/3] bg-gray-50 p-4 cursor-pointer relative"
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
      <div className="p-3 space-y-2">
        
        {/* Product Name + Size - Clickable */}
        <h3 
          className="font-semibold text-gray-900 text-sm leading-tight cursor-pointer hover:text-emerald-600 transition-colors line-clamp-2"
          onClick={handleCardClick}
        >
          {item.productName}
          {item.sizeValue && (
            <span className="text-emerald-600"> – {item.sizeValue}{item.sizeUnit}</span>
          )}
        </h3>

        {/* Case Price - Large & Bold */}
        <div className="pt-1">
          <span className="text-xl font-bold text-gray-900">
            ${casePrice.toFixed(2)}
          </span>
          <span className="text-sm text-gray-500 ml-1">/ case</span>
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
          {!isOutOfStock && item.stock < 10 && (
            <span className="text-xs text-amber-600 ml-1">({item.stock} left)</span>
          )}
        </div>

        {/* Quantity Selector + Add to Cart */}
        {!isOutOfStock && (
          <div className="flex items-center gap-2 pt-2">
            {/* Quantity Selector - Large buttons */}
            <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-l-lg rounded-r-none hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation()
                  setQuantity(Math.max(1, quantity - 1))
                }}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-10 text-center font-semibold text-sm">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-r-lg rounded-l-none hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation()
                  setQuantity(Math.min(item.stock, quantity + 1))
                }}
                disabled={quantity >= item.stock}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Add to Cart Button */}
            <Button
              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg"
              onClick={handleAddToCart}
              disabled={isAdding || isInCart}
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isInCart ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Added
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  Add to Cart
                </>
              )}
            </Button>
          </div>
        )}

        {/* Total Price - Show when quantity > 1 */}
        {!isOutOfStock && quantity > 1 && (
          <div className="text-right text-xs text-gray-500 pt-1">
            Total: <span className="font-semibold text-gray-700">${totalPrice.toFixed(2)}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export default PharmacySizeCard
