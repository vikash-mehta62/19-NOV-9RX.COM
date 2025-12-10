"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, ShoppingCart, ChevronRight, Package } from "lucide-react"
import { supabase } from "@/supabaseClient"
import { useSelector } from "react-redux"
import { RootState } from "@/store/store"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"

interface ReorderItem {
  id: string
  name: string
  image: string
  lastOrdered: string
  price: number
  size: string
}

export const QuickReorder = () => {
  const [reorderItems, setReorderItems] = useState<ReorderItem[]>([])
  const [loading, setLoading] = useState(true)
  const userProfile = useSelector((state: RootState) => state.user.profile)
  const { addToCart } = useCart()
  const { toast } = useToast()

  useEffect(() => {
    const fetchReorderItems = async () => {
      if (!userProfile?.id) return
      
      try {
        // Fetch recent orders for this user
        const { data: orders } = await supabase
          .from("orders")
          .select("items, created_at")
          .eq("user_id", userProfile.id)
          .order("created_at", { ascending: false })
          .limit(5)

        if (orders && orders.length > 0) {
          const itemsMap = new Map<string, ReorderItem>()
          
          orders.forEach((order: any) => {
            const items = order.items || []
            items.forEach((item: any) => {
              if (!itemsMap.has(item.productId)) {
                itemsMap.set(item.productId, {
                  id: item.productId,
                  name: item.name,
                  image: item.image || "/placeholder.svg",
                  lastOrdered: order.created_at,
                  price: item.price,
                  size: item.sizes?.[0]?.size_value || ""
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

  const handleQuickAdd = async (item: ReorderItem) => {
    toast({
      title: "Opening Product",
      description: "Redirecting to product page for size selection..."
    })
    window.location.href = `/pharmacy/product/${item.id}`
  }

  if (loading || reorderItems.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-700">Buy Again</h3>
        </div>
        <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {reorderItems.map((item) => (
          <Card key={item.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium text-gray-900 line-clamp-2 group-hover:text-emerald-600">
                  {item.name}
                </h4>
                <p className="text-sm font-bold text-emerald-600 mt-1">
                  ${item.price?.toFixed(2)}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full mt-2 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleQuickAdd(item)}
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              Reorder
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default QuickReorder
