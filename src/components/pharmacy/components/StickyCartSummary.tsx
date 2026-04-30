"use client"

import { ShoppingCart, ChevronUp, X, ArrowRight, Trash2, Eye, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/hooks/use-cart"
import { useState, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"

export const StickyCartSummary = () => {
  const { cartItems, cartTotal, removeFromCart, updateQuantity } = useCart()
  const [isExpanded, setIsExpanded] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  // Calculate total items from sizes
  const totalItems = useMemo(() => 
    cartItems.reduce((sum, item) => {
      const itemTotal = (item.sizes || []).reduce((sizeSum, size) => sizeSum + (size.quantity || 0), 0);
      return sum + itemTotal;
    }, 0),
    [cartItems]
  );

  // Hide on order create page (cart is shown in OrderSummaryCard)
  const isOnOrderCreatePage = location.pathname.includes("/order/create")

  // Don't show if no items or on order create page
  if (totalItems === 0 || isOnOrderCreatePage) return null

  const handleRemoveItem = async (productId: string) => {
    const success = await removeFromCart(productId)
    if (!success) {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      })
    }
  }

  const handleQuantityChange = async (productId: string, newQuantity: number, sizeId: string) => {
    const success = await updateQuantity(productId, newQuantity, sizeId)
    if (!success) {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      })
    }
  }

  const handleViewDetails = (productId: string) => {
    const userType = sessionStorage.getItem('userType')?.toLowerCase() || 'pharmacy'
    setIsExpanded(false)
    navigate(`/${userType}/product/${productId}`)
  }

  return (
    // Only show on desktop (lg and above) - FloatingCartButton handles mobile
    <div className="fixed bottom-4 right-4 z-40 hidden lg:block">
      {/* Expanded View */}
      {isExpanded && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 mb-2 w-80 overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="font-semibold text-sm">Your Cart ({totalItems})</span>
            </div>
            <button onClick={() => setIsExpanded(false)} className="hover:bg-white/20 rounded p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-3 max-h-96 overflow-y-auto">
            {cartItems.map((item, index) => (
              <div key={item.productId || index} className="py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-start gap-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    
                    {/* Sizes with quantity controls */}
                    <div className="mt-2 space-y-2">
                      {(item.sizes || [])
                        .filter((s) => s.quantity > 0)
                        .map((size) => (
                          <div key={size.id} className="bg-gray-50 rounded p-2 space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-medium text-gray-700">
                                {size.size_value} {item.unitToggle ? size.size_unit : ""}
                              </span>
                              <span className="text-blue-600 font-semibold">
                                ${(size.price || 0).toFixed(2)}
                              </span>
                            </div>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      size.quantity - 1,
                                      size.id
                                    )
                                  }
                                  disabled={size.quantity <= 1}
                                  className="h-6 w-6 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-8 text-center text-sm font-medium">
                                  {size.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      size.quantity + 1,
                                      size.id
                                    )
                                  }
                                  className="h-6 w-6 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <span className="text-xs font-semibold text-gray-900">
                                ${((size.quantity || 0) * (size.price || 0)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleViewDetails(item.productId)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-gray-50 border-t">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-lg font-bold text-blue-600">${cartTotal?.toFixed(2)}</span>
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 gap-2 min-h-[44px] rounded-xl"
              onClick={() => {
                const userType = sessionStorage.getItem('userType')?.toLowerCase() || 'pharmacy';
                // Different user types have different order creation paths
                const orderPath = userType === 'pharmacy' ? `/${userType}/order/create` : `/${userType}/order`;
                navigate(orderPath);
              }}
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
        className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:shadow-xl"
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5" />
          <span className="absolute -top-2 -right-2 bg-white text-blue-600 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
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
