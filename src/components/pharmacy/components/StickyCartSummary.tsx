"use client"

import { ShoppingCart, ChevronUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/hooks/use-cart"
import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"

export const StickyCartSummary = () => {
  const { cartItems, cartTotal, totalItems } = useCart()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const navigate = useNavigate()

  // Memoize displayed items for performance
  const displayedItems = useMemo(() => cartItems.slice(0, 3), [cartItems])

  if (!isVisible || totalItems === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Expanded View */}
      {isExpanded && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 mb-2 w-72 overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="bg-emerald-600 text-white p-3 flex items-center justify-between">
            <span className="font-semibold text-sm">Your Cart</span>
            <button onClick={() => setIsExpanded(false)} className="hover:bg-white/20 rounded p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-3 max-h-48 overflow-y-auto">
            {displayedItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600">
                  ${item.price?.toFixed(2)}
                </span>
              </div>
            ))}
            {cartItems.length > 3 && (
              <p className="text-xs text-gray-500 text-center py-2">
                +{cartItems.length - 3} more items
              </p>
            )}
          </div>

          <div className="p-3 bg-gray-50 border-t">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-lg font-bold text-emerald-600">${cartTotal?.toFixed(2)}</span>
            </div>
            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => navigate("/pharmacy/order/create")}
            >
              Checkout
            </Button>
          </div>
        </div>
      )}

      {/* Collapsed Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:shadow-xl"
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
