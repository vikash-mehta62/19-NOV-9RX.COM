import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  RefreshCw, ShoppingCart, ArrowLeft, Package, 
  Calendar, Loader2, CheckCircle 
} from "lucide-react"
import { supabase } from "@/supabaseClient"
import { useSelector } from "react-redux"
import { RootState } from "@/store/store"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"

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

interface OrderItem {
  productId: string
  name: string
  image: string
  price: number
  sizes: OrderSize[]
}

interface RecentOrder {
  id: string
  order_number: string
  created_at: string
  items: OrderItem[]
  total_amount: number
}

export default function BuyAgain() {
  const [orders, setOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const userProfile = useSelector((state: RootState) => state.user.profile)
  const { addToCart } = useCart()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchRecentOrders = async () => {
      if (!userProfile?.id) return
      
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, order_number, created_at, items, total_amount")
          .eq("profile_id", userProfile.id)
          .order("created_at", { ascending: false })
          .limit(5)

        if (error) throw error

        setOrders(data || [])
      } catch (error) {
        console.error("Error fetching orders:", error)
        toast({
          title: "Error",
          description: "Failed to load recent orders",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchRecentOrders()
  }, [userProfile])

  const handleReorderItem = async (item: OrderItem) => {
    if (!item.sizes || item.sizes.length === 0) {
      toast({
        title: "No sizes available",
        description: "This product has no sizes to add to cart",
        variant: "destructive"
      })
      return
    }

    setAddingToCart(item.productId)
    
    try {
      const cartItem = {
        productId: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.sizes.reduce((sum, s) => sum + (s.quantity || 1), 0),
        sizes: item.sizes.map(size => ({
          id: size.id,
          size_value: size.size_value,
          size_unit: size.size_unit,
          price: size.price,
          quantity: size.quantity || 1,
          sku: size.sku,
          stock: size.stock,
          shipping_cost: size.shipping_cost
        })),
        shipping_cost: Math.max(...item.sizes.map(s => s.shipping_cost || 0), 0),
        customizations: {},
        notes: "",
        sku: item.sku || item.sizes?.[0]?.sku || ""
      }

      await addToCart(cartItem)
      
      toast({
        title: "Added to Cart",
        description: `${item.name} added to cart`,
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

  const handleReorderAll = async (order: RecentOrder) => {
    setAddingToCart(order.id)
    
    try {
      for (const item of order.items) {
        if (item.sizes && item.sizes.length > 0) {
          const cartItem = {
            productId: item.productId,
            name: item.name,
            image: item.image,
            price: item.price,
            quantity: item.sizes.reduce((sum, s) => sum + (s.quantity || 1), 0),
            sizes: item.sizes.map(size => ({
              id: size.id,
              size_value: size.size_value,
              size_unit: size.size_unit,
              price: size.price,
              quantity: size.quantity || 1,
              sku: size.sku,
              stock: size.stock,
              shipping_cost: size.shipping_cost
            })),
            shipping_cost: Math.max(...item.sizes.map(s => s.shipping_cost || 0), 0),
            customizations: {},
            notes: "",
            sku: item.sku || item.sizes?.[0]?.sku || ""
          }
          await addToCart(cartItem)
        }
      }
      
      toast({
        title: "Order Added to Cart",
        description: `All items from order ${order.order_number} added to cart`,
      })
    } catch (error) {
      console.error("Error reordering:", error)
      toast({
        title: "Error",
        description: "Failed to add items to cart",
        variant: "destructive"
      })
    } finally {
      setAddingToCart(null)
    }
  }

  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/pharmacy/products")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Products
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buy Again</h1>
            <p className="text-gray-500">Quickly reorder items from your last 5 orders</p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Orders</h3>
            <p className="text-gray-500 mb-4">You haven't placed any orders yet</p>
            <Button onClick={() => navigate("/pharmacy/products")}>
              Browse Products
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-base font-semibold">
                        Order #{order.order_number}
                      </CardTitle>
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(order.created_at), "MMM dd, yyyy")}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleReorderAll(order)}
                      disabled={addingToCart === order.id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {addingToCart === order.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 mr-2" />
                      )}
                      Reorder All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {(order.items || []).map((item, idx) => (
                      <div 
                        key={`${item.productId}-${idx}`}
                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 border">
                          <img
                            src={`https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/${item.image}`}
                            alt={item.name}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                          />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 mb-2">{item.name}</h4>
                          
                          {/* Sizes */}
                          <div className="space-y-2">
                            {(item.sizes || []).map((size, sizeIdx) => (
                              <div 
                                key={`${size.id}-${sizeIdx}`}
                                className="flex items-center justify-between bg-white p-2 rounded border text-sm"
                              >
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className="font-mono">
                                      {size.size_value} {size.size_unit}
                                    </Badge>
                                    <span className="text-gray-500">
                                      Qty: {size.quantity || 1}
                                    </span>
                                  </div>
                                  {size.sku && (
                                    <span className="text-xs text-gray-400 ml-1">SKU: {size.sku}</span>
                                  )}
                                </div>
                                <span className="font-semibold text-blue-600">
                                  ${(size.price * (size.quantity || 1)).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Reorder Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReorderItem(item)}
                          disabled={addingToCart === item.productId}
                          className="flex-shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          {addingToCart === item.productId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Order Total */}
                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <div className="text-right">
                      <span className="text-sm text-gray-500">Order Total: </span>
                      <span className="text-lg font-bold text-gray-900">
                        ${order.total_amount?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
