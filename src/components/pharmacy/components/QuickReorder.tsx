"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, ShoppingCart, ChevronRight, Loader2 } from "lucide-react"
import { supabase } from "@/supabaseClient"
import { useSelector } from "react-redux"
import { RootState } from "@/store/store"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"

interface OrderSize {
  id: string
  size_value: string
  size_unit: string
  price: number
  quantity: number
  sku?: string
  stock?: number
  shipping_cost?: number
}

interface ReorderItem {
  id: string
  productId: string
  name: string
  image: string
  lastOrdered: string
  price: number
  sizes: OrderSize[]
  sku?: string
}

export const QuickReorder = () => {
  const [reorderItems, setReorderItems] = useState<ReorderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const userProfile = useSelector((state: RootState) => state.user.profile)
  const { addToCart } = useCart()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchReorderItems = async () => {
      if (!userProfile?.id) return
      
      try {
        // Fetch recent orders for this user
        const { data: orders } = await supabase
          .from("orders")
          .select("items, created_at")
          .eq("profile_id", userProfile.id)
          .order("created_at", { ascending: false })
          .limit(5)

        if (orders && orders.length > 0) {
          const itemsMap = new Map<string, ReorderItem>()
          
          orders.forEach((order: any) => {
            const items = order.items || []
            items.forEach((item: any) => {
              if (!itemsMap.has(item.productId)) {
                // Get all sizes from the order item
                const sizes = (item.sizes || []).map((size: any) => ({
                  id: size.id,
                  size_value: size.size_value,
                  size_unit: size.size_unit,
                  price: size.price,
                  quantity: size.quantity || 1,
                  sku: size.sku,
                  stock: size.stock,
                  shipping_cost: size.shipping_cost
                }))

                itemsMap.set(item.productId, {
                  id: item.productId,
                  productId: item.productId,
                  name: item.name,
                  image: item.image || "/placeholder.svg",
                  lastOrdered: order.created_at,
                  price: item.price,
                  sizes: sizes
                })
              }
            })
          })
          
          setReorderItems(Array.from(itemsMap.values()).slice(0, 4))
        }
      } catch (error) {
        console.error("Error fetching reorder items:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReorderItems()
  }, [userProfile])

  const handleReorder = async (item: ReorderItem) => {
    if (item.sizes.length === 0) {
      toast({
        title: "No sizes available",
        description: "This product has no sizes to add to cart",
        variant: "destructive"
      })
      return
    }

    setAddingToCart(item.id)
    
    try {
      // Add product with all its sizes to cart
      const cartItem = {
        productId: item.productId,
        name: item.name,
        sku: item.sku || item.sizes?.[0]?.sku || "",
        image: item.image,
        price: item.price,
        quantity: item.sizes.reduce((sum, s) => sum + s.quantity, 0),
        sizes: item.sizes.map(size => ({
          id: size.id,
          size_value: size.size_value,
          size_unit: size.size_unit,
          price: size.price,
          quantity: size.quantity,
          sku: size.sku,
          stock: size.stock,
          shipping_cost: size.shipping_cost
        })),
        shipping_cost: Math.max(...item.sizes.map(s => s.shipping_cost || 0), 0),
        customizations: {},
        notes: ""
      }

      await addToCart(cartItem)
      
      toast({
        title: "Added to Cart",
        description: `${item.name} with ${item.sizes.length} size(s) added to cart`,
      })
    } catch (error) {
      console.error("Error adding to cart:", error)
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      })
    } finally {
      setAddingToCart(null)
    }
  }

  const handleViewAll = () => {
    navigate("/pharmacy/buy-again")
  }

  if (loading || reorderItems.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">Buy Again</h3>
        </div>
        <button 
          onClick={handleViewAll}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {reorderItems.map((item) => (
          <Card key={item.id} className="p-3 hover:shadow-md transition-shadow group">
            <div className="flex gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={
                    item.image?.startsWith('http') 
                      ? item.image.replace('asnhfgfhidhzswqkhpzz.supabase.co', 'qiaetxkxweghuoxyhvml.supabase.co')
                      : `https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/${item.image}`
                  }
                  alt={item.name}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600">
                  {item.name}
                </h4>
                <p className="text-sm font-bold text-blue-600 mt-1">
                  ${item.price?.toFixed(2)}
                </p>
                {item.sizes.length > 0 && (
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {item.sizes.length} size{item.sizes.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              className="w-full mt-2 h-7 text-xs bg-blue-600"
              onClick={() => handleReorder(item)}
              disabled={addingToCart === item.id}
            >
              {addingToCart === item.id ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <ShoppingCart className="w-3 h-3 mr-1" />
              )}
              Reorder
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default QuickReorder
