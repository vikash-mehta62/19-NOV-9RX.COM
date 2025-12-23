"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/supabaseClient"
import { useSelector } from "react-redux"
import { selectUserProfile } from "@/store/selectors/userSelectors"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  Heart,
  ShoppingCart,
  Package,
  Truck,
  Plus,
  Minus,
  Check,
  Loader2,
  Shield,
  Clock,
  Star,
  Info,
  X,
  Bell
} from "lucide-react"

export default function SizeDetail() {
  const { productId, sizeId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const userProfile = useSelector(selectUserProfile)
  const { addToCart, cartItems } = useCart()

  const [data, setData] = useState<{ product: any; size: any; otherSizes: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedType, setSelectedType] = useState<"case" | "unit">("case")
  const [isAdding, setIsAdding] = useState(false)
  const [showZoom, setShowZoom] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)

  const totalCartItems = useMemo(() => 
    cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0), 
    [cartItems]
  )

  // Single optimized fetch
  useEffect(() => {
    if (!productId || !sizeId) return
    
    let isMounted = true
    setLoading(true)

    supabase
      .from("products")
      .select("id, name, category, description, image_url, images, key_features, product_sizes(id, size_value, size_unit, price, price_per_case, stock, sku, quantity_per_case, image, case, unit, shipping_cost)")
      .eq("id", productId)
      .single()
      .then(({ data: productData, error }) => {
        if (!isMounted) return
        if (error || !productData) {
          setLoading(false)
          return
        }

        const selectedSize = productData.product_sizes?.find((s: any) => s.id === sizeId)
        const otherSizes = productData.product_sizes?.filter((s: any) => s.id !== sizeId) || []

        setData({
          product: productData,
          size: selectedSize,
          otherSizes
        })

        if (selectedSize?.case) setSelectedType("case")
        else if (selectedSize?.unit) setSelectedType("unit")

        setLoading(false)
      })

    return () => { isMounted = false }
  }, [productId, sizeId])

  const getImageUrl = (image?: string) => {
    if (!image) return "/placeholder.svg"
    if (image.startsWith("http")) return image
    return `https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/${image}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!data?.product || !data?.size) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Product Not Found</h2>
        <Button onClick={() => navigate("/pharmacy/products")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    )
  }

  const { product, size, otherSizes } = data
  const displayImage = size.image || product.image_url || product.images?.[0]
  const currentPrice = selectedType === "case" ? (size.price || 0) : (size.price_per_case || 0)
  const totalPrice = currentPrice * quantity
  const isOutOfStock = size.stock <= 0
  const isInCart = cartItems.some(item => item.productId === productId && item.sizes?.some((s: any) => s.id === sizeId))

  const featuresList = (size.key_features || product.key_features || "")
    .split(/[\n,]/)
    .map((f: string) => f.trim())
    .filter((f: string) => f.length > 0)

  const handleAddToCart = async () => {
    if (isOutOfStock) return
    setIsAdding(true)
    try {
      await addToCart({
        productId: product.id,
        name: `${product.name} - ${size.size_value}${size.size_unit}`,
        price: totalPrice,
        image: getImageUrl(displayImage),
        shipping_cost: size.shipping_cost || 0,
        sizes: [{
          id: size.id,
          size_value: size.size_value,
          size_unit: size.size_unit,
          price: currentPrice,
          quantity,
          sku: size.sku,
          total_price: totalPrice,
          shipping_cost: size.shipping_cost,
          type: selectedType,
        }],
        quantity,
        customizations: {},
        notes: "",
      })
      toast({ title: "✅ Added to Cart" })
      setQuantity(1)
    } catch {
      toast({ title: "Error", variant: "destructive" })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <img src="/logo.png" alt="Logo" className="h-8 w-auto hidden sm:block cursor-pointer" onClick={() => navigate("/pharmacy/products")} />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsWishlisted(!isWishlisted)}>
              <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/pharmacy/order/create")} className="relative">
              <ShoppingCart className="w-5 h-5" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center">
                  {totalCartItems}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-2 text-sm text-gray-500">
          <span className="hover:text-emerald-600 cursor-pointer" onClick={() => navigate("/pharmacy/products")}>Products</span>
          {" / "}
          <span className="text-gray-900">{size.size_value}{size.size_unit}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left */}
          <div className="space-y-4">
            <div className="relative bg-white rounded-2xl border aspect-square cursor-zoom-in" onClick={() => setShowZoom(true)}>
              <Badge className="absolute top-4 right-4 bg-emerald-500 text-white">{product.category}</Badge>
              <img src={getImageUrl(displayImage)} alt={product.name} className="w-full h-full object-contain p-8" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 text-center border">
                <Truck className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                <p className="text-xs font-medium">Free Shipping</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border">
                <Shield className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                <p className="text-xs font-medium">Quality Assured</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border">
                <Clock className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                <p className="text-xs font-medium">Fast Delivery</p>
              </div>
            </div>

            {otherSizes.length > 0 && (
              <div className="bg-white rounded-xl border p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" /> Other Sizes ({otherSizes.length})
                </h3>
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {otherSizes.map((s) => (
                    <button key={s.id} onClick={() => navigate(`/pharmacy/product/${productId}/${s.id}`)} className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left">
                      <img src={getImageUrl(s.image || product.image_url)} alt="" className="w-12 h-12 object-contain rounded bg-gray-50" />
                      <div className="flex-1">
                        <p className="font-semibold">{s.size_value}{s.size_unit}</p>
                        <p className="text-xs text-gray-500">SKU: {s.sku || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">${s.price?.toFixed(2)}</p>
                        <p className={`text-xs ${s.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>{s.stock > 0 ? 'In Stock' : 'Out'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold uppercase">{product.name}</h1>
              <p className="text-xl font-semibold text-emerald-600">{size.size_value}{size.size_unit}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">SKU: {size.sku || 'N/A'}</Badge>
              <Badge className={isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                {isOutOfStock ? 'Out of Stock' : `In Stock (${size.stock})`}
              </Badge>
              {size.quantity_per_case > 0 && <Badge variant="outline"><Package className="w-3 h-3 mr-1" />{size.quantity_per_case}/case</Badge>}
            </div>

            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-4">
                <span className="text-3xl font-bold text-emerald-600">${currentPrice.toFixed(2)}</span>
              </CardContent>
            </Card>

            {(size.case || size.unit) && (
              <div className="flex gap-2">
                {size.case && (
                  <Button variant={selectedType === "case" ? "default" : "outline"} className={`flex-1 h-11 ${selectedType === "case" ? "bg-emerald-600" : ""}`} onClick={() => setSelectedType("case")}>
                    Case - ${size.price?.toFixed(2)}
                  </Button>
                )}
                {size.unit && size.price_per_case && (
                  <Button variant={selectedType === "unit" ? "default" : "outline"} className={`flex-1 h-11 ${selectedType === "unit" ? "bg-emerald-600" : ""}`} onClick={() => setSelectedType("unit")}>
                    Unit - ${size.price_per_case?.toFixed(2)}
                  </Button>
                )}
              </div>
            )}

            {!isOutOfStock && (
              <div className="bg-white rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <div className="flex items-center bg-gray-100 rounded-lg">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}><Minus className="w-4 h-4" /></Button>
                    <span className="w-10 text-center font-bold">{quantity}</span>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQuantity(q => q + 1)}><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <span>Total:</span>
                  <span className="text-2xl font-bold text-emerald-600">${totalPrice.toFixed(2)}</span>
                </div>
                <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl" onClick={handleAddToCart} disabled={isAdding || isInCart}>
                  {isAdding ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Adding...</> : isInCart ? <><Check className="w-5 h-5 mr-2" />Added</> : <><ShoppingCart className="w-5 h-5 mr-2" />Add to Cart</>}
                </Button>
              </div>
            )}

            {product.description && (
              <Card><CardContent className="p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2"><Info className="w-4 h-4 text-blue-500" />Description</h3>
                <p className="text-gray-600 text-sm">{product.description}</p>
              </CardContent></Card>
            )}

            {featuresList.length > 0 && (
              <Card><CardContent className="p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-yellow-500" />Key Features</h3>
                <ul className="space-y-1">
                  {featuresList.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </CardContent></Card>
            )}
          </div>
        </div>
      </main>

      {showZoom && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setShowZoom(false)}>
          <button className="absolute top-4 right-4 text-white p-2"><X className="w-8 h-8" /></button>
          <img src={getImageUrl(displayImage)} alt="" className="max-w-[90vw] max-h-[90vh] object-contain" />
        </div>
      )}
    </div>
  )
}
