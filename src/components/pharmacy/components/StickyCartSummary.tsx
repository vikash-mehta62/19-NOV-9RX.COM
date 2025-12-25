"use client"

import { ShoppingCart, ChevronUp, X, ArrowRight, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/hooks/use-cart"
import { useState, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"

export const StickyCartSummary = () => {
  const { cartItems, cartTotal, totalItems, removeFromCart } = useCart()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  // Memoize displayed items for performance
  const displayedItems = useMemo(() => cartItems.slice(0, 5), [cartItems])

  // Hide on order create page (cart is shown in OrderSummaryCard)
  const isOnOrderCreatePage = location.pathname.includes("/order/create")

  // Don't show if no items, not visible, or on order create page
  if (!isVisible || totalItems === 0 || isOnOrderCreatePage) return null

  const handleRemoveItem = async (productId: string, productName: string) => {
    const success = await removeFromCart(productId)
    if (success) {
      toast({
        title: "Item Removed",
        description: `${productName} has been removed from your cart`,
      })
    }
  }

  const handleViewDetails = (productId: string) => {
    setIsExpanded(false)
    navigate(`/pharmacy/product/${productId}`)
  }

  return (
    // Only show on desktop (lg and above) - FloatingCartButton handles mobile
    <div className="fixed bottom-4 right-4 z-50 hidden lg:block">
      {/* Expanded View */}
      {isExpanded && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 mb-2 w-80 overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="font-semibold text-sm">Your Cart ({totalItems})</span>
            </div>
            <button onClick={() => setIsExpanded(false)} className="hover:bg-white/20 rounded p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-3 max-h-64 overflow-y-auto">
            {displayedItems.map((item, index) => (
              <div key={index} className="flex items-start gap-2 py-3 border-b border-gray-100 last:border-0">
                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => handleViewDetails(item.productId)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => handleRemoveItem(item.productId, item.name)}
                      className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-600">
                  ${item.price?.toFixed(2)}
                </span>
              </div>
            ))}
            {cartItems.length > 5 && (
              <p className="text-xs text-gray-500 text-center py-2">
                +{cartItems.length - 5} more items
              </p>
            )}
          </div>

          <div className="p-3 bg-gray-50 border-t">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-lg font-bold text-emerald-600">${cartTotal?.toFixed(2)}</span>
            </div>
            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 min-h-[44px] rounded-xl"
              onClick={() => navigate("/pharmacy/order/create")}
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Collapsed Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:shadow-xl"
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5" />
          <span className="absolute -top-2 -right-2 bg-white text-emerald-600 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {totalItems}
          </span>
        </div>
        <span className="font-semibold">${cartTotal?.toFixed(2)}</span>
        <ChevronUp className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>
    </div>
  )
}

export default StickyCartSummary
