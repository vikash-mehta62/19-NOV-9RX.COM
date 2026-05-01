"use client"

import { ShoppingCart, ChevronUp, X, ArrowRight, Trash2, Eye, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCart } from "@/hooks/use-cart"
import { useState, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"

export const StickyCartSummary = () => {
  const { cartItems, cartTotal, removeFromCart, updateQuantity } = useCart()
  const [isExpanded, setIsExpanded] = useState(false)
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({})
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
    if (newQuantity < 1) return

    // Find the item and size to check stock
    const item = cartItems.find(i => i.productId === productId);
    const size = item?.sizes?.find(s => s.id === sizeId);
    
    if (size && size.stock !== undefined && newQuantity > size.stock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${size.stock} units available in stock`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      await updateQuantity(productId, newQuantity, sizeId);
      resetQuantityDraft(productId, sizeId)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update quantity",
        variant: "destructive",
      });
    }
  }

  const getQuantityKey = (productId: string, sizeId: string) => `${productId}:${sizeId}`

  const handleQuantityDraftChange = (productId: string, sizeId: string, value: string) => {
    if (!/^\d*$/.test(value)) return
    setQuantityDrafts((prev) => ({
      ...prev,
      [getQuantityKey(productId, sizeId)]: value,
    }))
  }

  const resetQuantityDraft = (productId: string, sizeId: string) => {
    const key = getQuantityKey(productId, sizeId)
    setQuantityDrafts((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const commitQuantityDraft = async (productId: string, sizeId: string, fallbackQuantity: number) => {
    const rawValue = quantityDrafts[getQuantityKey(productId, sizeId)]
    const parsed = Number.parseInt(rawValue ?? "", 10)
    const nextQuantity = Number.isFinite(parsed) && parsed > 0
      ? parsed
      : Math.max(1, fallbackQuantity)

    await handleQuantityChange(productId, nextQuantity, sizeId)
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
        <div className="mb-2 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-2">
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="font-semibold text-sm">Your Cart ({totalItems})</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="rounded-md p-1 text-white/85 transition hover:bg-white/15 hover:text-white"
              aria-label="Close cart"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="max-h-[420px] overflow-y-auto px-4 py-2">
            {cartItems.map((item, index) => (
              <div key={item.productId || index} className="border-b border-slate-100 py-4 last:border-0">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{item.name}</p>
                    
                    {/* Sizes with quantity controls */}
                    <div className="mt-3 space-y-2">
                      {(item.sizes || [])
                        .filter((s) => s.quantity > 0)
                        .map((size) => (
                          <div key={size.id} className="rounded-lg bg-slate-50 px-3 py-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                {size.size_name && (
                                  <p className="truncate text-xs font-semibold text-slate-950">
                                    {size.size_name}
                                  </p>
                                )}
                                <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-600">
                                  {size.size_value} {item.unitToggle ? size.size_unit : ""}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="block text-xs font-semibold text-blue-600">
                                  ${(size.price || 0).toFixed(2)}
                                </span>
                                {size.stock !== undefined && (
                                  <span className={`block text-[10px] leading-4 ${size.stock <= 5 ? 'text-red-500' : 'text-slate-400'}`}>
                                    {size.stock} in stock
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Quantity Controls */}
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <div className="inline-flex h-8 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                                <button
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      size.quantity - 1,
                                      size.id
                                    )
                                  }
                                  disabled={size.quantity <= 1}
                                  className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
                                  aria-label={`Decrease quantity for ${item.name} ${size.size_value}`}
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  aria-label={`Quantity for ${item.name} ${size.size_value}`}
                                  value={quantityDrafts[getQuantityKey(item.productId, size.id)] ?? String(size.quantity || 1)}
                                  onChange={(event) =>
                                    handleQuantityDraftChange(item.productId, size.id, event.target.value)
                                  }
                                  onBlur={() =>
                                    commitQuantityDraft(item.productId, size.id, size.quantity || 1)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.currentTarget.blur()
                                    }
                                    if (event.key === "Escape") {
                                      resetQuantityDraft(item.productId, size.id)
                                      event.currentTarget.blur()
                                    }
                                  }}
                                  className="h-8 min-h-0 w-12 rounded-none border-y-0 border-x border-slate-200 px-1 text-center text-sm font-semibold shadow-none focus-visible:z-10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <button
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      size.quantity + 1,
                                      size.id
                                    )
                                  }
                                  disabled={size.stock !== undefined && size.quantity >= size.stock}
                                  className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
                                  aria-label={`Increase quantity for ${item.name} ${size.size_value}`}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <span className="shrink-0 text-sm font-semibold text-slate-950">
                                ${((size.quantity || 0) * (size.price || 0)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <button
                        onClick={() => handleViewDetails(item.productId)}
                        className="flex items-center gap-1 rounded px-1.5 py-1 font-medium text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <span className="h-4 w-px bg-slate-200" />
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="flex items-center gap-1 rounded px-1.5 py-1 font-medium text-red-500 transition hover:bg-red-50 hover:text-red-600"
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

          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Subtotal</span>
              <span className="text-xl font-bold text-blue-600">${cartTotal?.toFixed(2)}</span>
            </div>
            <Button 
              className="w-full gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 min-h-[44px]"
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
