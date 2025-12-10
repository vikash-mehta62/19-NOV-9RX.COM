"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowLeft, Package, Info, Layers, Loader2, ShoppingCart, 
  Plus, Minus, Check, Truck, Shield, Clock, Star
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCart } from "@/hooks/use-cart"
import { useSelector } from "react-redux"
import { RootState } from "@/store/store"

const ProductSizeDetails = () => {
  const { productId, sizeId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { addToCart, cartItems } = useCart()
  const userProfile = useSelector((state: RootState) => state.user.profile)
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true'
  
  const [product, setProduct] = useState<any>(null)
  const [size, setSize] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedType, setSelectedType] = useState<"case" | "unit">("case")
  const [addingToCart, setAddingToCart] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg")

  // Check if already in cart
  const isInCart = cartItems.some(
    item => item.productId === productId && 
    item.sizes?.some((s: any) => s.id === sizeId)
  )

  useEffect(() => {
    const fetchProductAndSize = async () => {
      if (!productId || !sizeId) {
        navigate("/pharmacy")
        return
      }

      try {
        // Fetch product with sizes
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("*, product_sizes(*)")
          .eq("id", productId)
          .single()

        if (productError || !productData) {
          toast({
            title: "Error",
            description: "Product not found",
            variant: "destructive",
          })
          navigate("/pharmacy")
          return
        }

        setProduct(productData)

        // Find the specific size
        const sizeData = productData.product_sizes?.find((s: any) => s.id === sizeId)
        
        if (!sizeData) {
          toast({
            title: "Error", 
            description: "Size not found",
            variant: "destructive",
          })
          navigate("/pharmacy")
          return
        }

        // Apply group pricing if logged in
        let finalPrice = sizeData.price
        let originalPrice = 0

        if (isLoggedIn && userProfile?.id) {
          const { data: groupData } = await supabase
            .from("group_pricing")
            .select("*")

          if (groupData) {
            const applicableGroup = groupData.find(
              (group: any) =>
                group.group_ids.includes(userProfile.id) &&
                group.product_arrayjson.some((p: any) => p.product_id === sizeId)
            )

            if (applicableGroup) {
              const groupProduct = applicableGroup.product_arrayjson.find(
                (p: any) => p.product_id === sizeId
              )
              if (groupProduct?.new_price) {
                originalPrice = sizeData.price
                finalPrice = parseFloat(groupProduct.new_price)
              }
            }
          }
        }

        setSize({
          ...sizeData,
          price: finalPrice,
          originalPrice: originalPrice
        })

        // Get image URL
        const imgPath = sizeData.image || (productData.images && productData.images[0])
        if (imgPath) {
          if (imgPath.startsWith("http")) {
            setImageUrl(imgPath)
          } else {
            const { data } = supabase.storage.from("product-images").getPublicUrl(imgPath)
            if (data?.publicUrl) setImageUrl(data.publicUrl)
          }
        }

      } catch (error) {
        console.error("Error fetching product:", error)
        toast({
          title: "Error",
          description: "Failed to load product details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProductAndSize()
  }, [productId, sizeId, navigate, toast, isLoggedIn, userProfile])

  const currentPrice = selectedType === "case" ? size?.price : (size?.price_per_case || size?.price)
  const totalPrice = currentPrice * quantity
  const hasDiscount = size?.originalPrice > 0
  const discountPercent = hasDiscount ? Math.round((1 - size.price / size.originalPrice) * 100) : 0

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      toast({
        title: "Login Required",
        description: "Please login to add items to cart",
        variant: "destructive"
      })
      navigate('/login')
      return
    }

    if (size?.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: "This item is currently out of stock",
        variant: "destructive"
      })
      return
    }

    setAddingToCart(true)

    try {
      const cartItem = {
        productId: productId!,
        name: `${product.name} - ${size.size_value}${size.size_unit || ''}`,
        price: totalPrice,
        image: imageUrl,
        shipping_cost: Number(size.shipping_cost) || 0,
        sizes: [{
          id: size.id,
          size_value: size.size_value,
          size_unit: size.size_unit,
          price: currentPrice,
          quantity: quantity,
          sku: size.sku,
          total_price: totalPrice,
          shipping_cost: size.shipping_cost || 0,
          type: selectedType
        }],
        quantity: quantity,
        customizations: {},
        notes: ''
      }

      const success = await addToCart(cartItem)

      if (success) {
        toast({
          title: "✅ Added to Cart",
          description: `${product.name} ${size.size_value}${size.size_unit || ''} added!`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive"
      })
    } finally {
      setAddingToCart(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-10 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product || !size) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
          <Button onClick={() => navigate("/pharmacy")} className="bg-emerald-600 hover:bg-emerald-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </div>
    )
  }

  const stockStatus = size.stock <= 0 ? "Out of Stock" : size.stock < 10 ? "Low Stock" : "In Stock"
  const isOutOfStock = size.stock <= 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-blue-50/30">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="hover:bg-gray-100 rounded-lg group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left: Product Image */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="aspect-square bg-white p-8 relative">
                {/* Discount Badge */}
                {hasDiscount && (
                  <Badge className="absolute top-4 left-4 bg-red-500 text-white text-sm px-3 py-1">
                    {discountPercent}% OFF
                  </Badge>
                )}
                
                {/* Category Badge */}
                <Badge className="absolute top-4 right-4 bg-emerald-100 text-emerald-700">
                  {product.category}
                </Badge>

                <img
                  src={imageUrl}
                  alt={`${product.name} ${size.size_value}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg"
                  }}
                />

                {isOutOfStock && (
                  <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
                    <Badge variant="destructive" className="text-lg px-4 py-2">
                      Out of Stock
                    </Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 text-center border">
                <Truck className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                <p className="text-xs font-medium text-gray-700">Free Shipping</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border">
                <Shield className="w-6 h-6 mx-auto text-green-600 mb-1" />
                <p className="text-xs font-medium text-gray-700">Quality Assured</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border">
                <Clock className="w-6 h-6 mx-auto text-orange-600 mb-1" />
                <p className="text-xs font-medium text-gray-700">Fast Delivery</p>
              </div>
            </div>
          </div>

          {/* Right: Product Details */}
          <div className="space-y-4">
            {/* Product Title */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                {product.name}
              </h1>
              <p className="text-xl font-semibold text-emerald-600 mt-1">
                {size.size_value}{size.size_unit || ''}
              </p>
            </div>

            {/* SKU & Stock */}
            <div className="flex flex-wrap items-center gap-3">
              {size.sku && (
                <Badge variant="outline" className="text-xs">
                  SKU: {size.sku}
                </Badge>
              )}
              <Badge className={`${
                stockStatus === "In Stock" ? "bg-green-100 text-green-700" :
                stockStatus === "Low Stock" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              }`}>
                {stockStatus} {stockStatus !== "Out of Stock" && `(${size.stock})`}
              </Badge>
              {size.quantity_per_case > 0 && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {size.quantity_per_case}/case
                </Badge>
              )}
            </div>

            {/* Price Section */}
            <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
              <CardContent className="p-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-emerald-600">
                    ${currentPrice?.toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-lg text-gray-400 line-through">
                        ${size.originalPrice.toFixed(2)}
                      </span>
                      <Badge className="bg-red-500 text-white">
                        Save ${(size.originalPrice - size.price).toFixed(2)}
                      </Badge>
                    </>
                  )}
                </div>
                {!isLoggedIn && (
                  <p className="text-sm text-gray-500 mt-2">
                    🔒 Login to see your special pricing
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Case/Unit Toggle */}
            {(size.case || size.unit) && !isOutOfStock && (
              <div className="flex gap-2">
                {size.case && (
                  <Button
                    variant={selectedType === "case" ? "default" : "outline"}
                    onClick={() => setSelectedType("case")}
                    className={`flex-1 h-12 ${
                      selectedType === "case" 
                        ? "bg-emerald-600 hover:bg-emerald-700" 
                        : "hover:bg-emerald-50 hover:border-emerald-300"
                    }`}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Case - ${size.price?.toFixed(2)}
                  </Button>
                )}
                {size.unit && (
                  <Button
                    variant={selectedType === "unit" ? "default" : "outline"}
                    onClick={() => setSelectedType("unit")}
                    className={`flex-1 h-12 ${
                      selectedType === "unit" 
                        ? "bg-emerald-600 hover:bg-emerald-700" 
                        : "hover:bg-emerald-50 hover:border-emerald-300"
                    }`}
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Unit - ${size.price_per_case?.toFixed(2)}
                  </Button>
                )}
              </div>
            )}

            {/* Quantity & Add to Cart */}
            {!isOutOfStock && isLoggedIn && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  {/* Quantity */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Quantity:</span>
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded hover:bg-white"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center font-bold">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded hover:bg-white"
                        onClick={() => setQuantity(Math.min(size.stock, quantity + 1))}
                        disabled={quantity >= size.stock}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between py-3 border-t border-dashed">
                    <span className="font-medium text-gray-700">Total:</span>
                    <span className="text-2xl font-black text-emerald-600">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Add to Cart Button */}
                  <Button
                    className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleAddToCart}
                    disabled={addingToCart || isInCart}
                  >
                    {addingToCart ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : isInCart ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Already in Cart
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Add to Cart
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Login Required */}
            {!isLoggedIn && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4 text-center">
                  <p className="text-amber-800 font-medium mb-3">
                    Login to view prices and add to cart
                  </p>
                  <Button 
                    onClick={() => navigate("/login")}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Login / Sign Up
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {product.description && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    Description
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {product.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Key Features */}
            {(size.key_features || product.key_features) && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-purple-600" />
                    Key Features
                  </h3>
                  <div className="space-y-2">
                    {(size.key_features || product.key_features).split(",").map((feature: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600 text-sm">{feature.trim()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductSizeDetails
