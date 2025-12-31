"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  ArrowLeft, Package, Info, Loader2, ShoppingCart, 
  Plus, Minus, Check, Star, Palette, Gift, HelpCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCart } from "@/hooks/use-cart"
import { useSelector } from "react-redux"
import { RootState } from "@/store/store"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  const [addingToCart, setAddingToCart] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg")
  const [customization, setCustomization] = useState<{ enabled: boolean; text: string }>({ enabled: false, text: '' })

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
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("*, product_sizes(*), customization")
          .eq("id", productId)
          .single()

        if (productError || !productData) {
          toast({ title: "Error", description: "Product not found", variant: "destructive" })
          navigate("/pharmacy")
          return
        }

        setProduct(productData)

        const sizeData = productData.product_sizes?.find((s: any) => s.id === sizeId)
        
        if (!sizeData) {
          toast({ title: "Error", description: "Size not found", variant: "destructive" })
          navigate("/pharmacy")
          return
        }

        // Apply group pricing if logged in
        let finalPrice = sizeData.price
        let originalPrice = 0

        if (isLoggedIn && userProfile?.id) {
          const { data: groupData } = await supabase.from("group_pricing").select("*")

          if (groupData) {
            const applicableGroup = groupData.find(
              (group: any) =>
                group.group_ids.includes(userProfile.id) &&
                group.product_arrayjson.some((p: any) => p.product_id === sizeId)
            )

            if (applicableGroup) {
              const groupProduct = applicableGroup.product_arrayjson.find((p: any) => p.product_id === sizeId)
              if (groupProduct?.new_price) {
                originalPrice = sizeData.price
                finalPrice = parseFloat(groupProduct.new_price)
              }
            }
          }
        }

        setSize({ ...sizeData, price: finalPrice, originalPrice })

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
        toast({ title: "Error", description: "Failed to load product details", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    fetchProductAndSize()
  }, [productId, sizeId, navigate, toast, isLoggedIn, userProfile])

  // Pricing calculations
  const casePrice = size?.price || 0
  const unitsPerCase = size?.quantity_per_case || 0
  const unitPrice = unitsPerCase > 0 ? casePrice / unitsPerCase : 0
  const customizationPrice = customization.enabled && product?.customization?.allowed 
    ? (product.customization.price || 0) * quantity
    : 0
  const totalPrice = (casePrice * quantity) + customizationPrice
  const hasDiscount = size?.originalPrice > 0
  const discountPercent = hasDiscount ? Math.round((1 - size.price / size.originalPrice) * 100) : 0
  
  // Reward points calculation (1 point = $1)
  const rewardPoints = Math.round(totalPrice)

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      toast({ title: "Login Required", description: "Please login to add items to cart", variant: "destructive" })
      navigate('/login')
      return
    }

    if (size?.stock <= 0) {
      toast({ title: "Out of Stock", description: "This item is currently out of stock", variant: "destructive" })
      return
    }

    setAddingToCart(true)

    try {
      const cartItem = {
        productId: productId!,
        name: `${product.name} - ${size.size_value}${size.size_unit || ''}${customization.enabled ? ' (Customized)' : ''}`,
        sku: product.sku || size.sku || "",
        price: totalPrice,
        image: imageUrl,
        shipping_cost: Number(size.shipping_cost) || 0,
        sizes: [{
          id: size.id,
          size_value: size.size_value,
          size_unit: size.size_unit,
          price: casePrice,
          quantity: quantity,
          sku: size.sku,
          total_price: totalPrice,
          shipping_cost: size.shipping_cost || 0,
          type: "case"
        }],
        quantity: quantity,
        customizations: customization.enabled ? {
          customization_enabled: 'true',
          customization_text: customization.text,
          customization_price: (product.customization?.price || 0).toString()
        } : {},
        notes: customization.enabled ? `Customization: ${customization.text}` : ''
      }

      const success = await addToCart(cartItem)

      if (success) {
        toast({
          title: "✓ Added to Cart",
          description: `${quantity} case${quantity > 1 ? 's' : ''} added successfully`,
        })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add to cart", variant: "destructive" })
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
            <Skeleton className="aspect-square rounded-xl" />
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
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
          </Button>
        </div>
      </div>
    )
  }

  const isOutOfStock = size.stock <= 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left: Product Image */}
          <div>
            <Card className="overflow-hidden">
              <div className="aspect-square bg-white p-8 relative">
                {hasDiscount && (
                  <Badge className="absolute top-4 left-4 bg-red-500 text-white">{discountPercent}% OFF</Badge>
                )}
                <Badge className="absolute top-4 right-4 bg-emerald-100 text-emerald-700">{product.category}</Badge>

                <img
                  src={imageUrl}
                  alt={`${product.name} ${size.size_value}`}
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                />

                {isOutOfStock && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Badge variant="secondary" className="text-lg px-4 py-2 bg-gray-100 text-gray-600">Out of Stock</Badge>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right: Product Details */}
          <div className="space-y-4">
            {/* Product Title */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{product.name}</h1>
              <p className="text-xl font-semibold text-emerald-600 mt-1">{size.size_value}{size.size_unit || ''}</p>
            </div>

            {/* SKU & Stock */}
            <div className="flex flex-wrap items-center gap-2">
              {size.sku && <Badge variant="outline" className="text-xs">SKU: {size.sku}</Badge>}
              <Badge className={isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
                {isOutOfStock ? 'Out of Stock' : `In Stock (${size.stock})`}
              </Badge>
              {unitsPerCase > 0 && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Package className="w-3 h-3" />{unitsPerCase}/case
                </Badge>
              )}
            </div>

            {/* Price Card */}
            <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardContent className="p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">${casePrice.toFixed(2)}</span>
                  <span className="text-gray-500">/ case</span>
                  {hasDiscount && (
                    <span className="text-lg text-gray-400 line-through ml-2">${size.originalPrice.toFixed(2)}</span>
                  )}
                </div>
                {unitsPerCase > 0 && (
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <Package className="w-4 h-4 text-gray-400" />
                    {unitsPerCase} units per case · <span className="font-medium">${unitPrice.toFixed(2)} per unit</span>
                  </p>
                )}
                {/* Reward Points - Primary Placement */}
                <TooltipProvider>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Gift className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700 font-medium">
                      Earn {Math.round(casePrice)} Reward Points
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px]">
                        <p className="text-xs">Reward points can be redeemed on future orders. 1 point = $1 discount.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                {!isLoggedIn && (
                  <p className="text-sm text-gray-500 mt-2">🔒 Login to see your special pricing</p>
                )}
              </CardContent>
            </Card>

            {/* Purchase Section */}
            {!isOutOfStock && isLoggedIn && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  {/* Quantity */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Quantity</span>
                    <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-l-lg rounded-r-none hover:bg-gray-100"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center font-semibold">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-r-lg rounded-l-none hover:bg-gray-100"
                        onClick={() => setQuantity(Math.min(size.stock, quantity + 1))}
                        disabled={quantity >= size.stock}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Customization Option */}
                  {product.customization?.allowed && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="customize-product"
                          checked={customization.enabled}
                          onCheckedChange={(checked) => setCustomization(prev => ({ ...prev, enabled: checked as boolean }))}
                        />
                        <Label htmlFor="customize-product" className="text-sm font-medium text-purple-700 cursor-pointer flex items-center gap-1">
                          <Palette className="w-4 h-4" />
                          Add Customization
                          {product.customization.price > 0 && (
                            <span className="text-purple-500 ml-1">(+${product.customization.price.toFixed(2)}/unit)</span>
                          )}
                        </Label>
                      </div>
                      {customization.enabled && (
                        <Input
                          placeholder="Enter customization details..."
                          value={customization.text}
                          onChange={(e) => setCustomization(prev => ({ ...prev, text: e.target.value }))}
                          className="mt-2 text-sm border-purple-200"
                        />
                      )}
                    </div>
                  )}

                  {/* Total */}
                  <div className="py-3 border-t space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Total</span>
                      <span className="text-2xl font-bold text-emerald-600">${totalPrice.toFixed(2)}</span>
                    </div>
                    {/* Quantity-Aware Reward Points */}
                    <div className="flex items-center justify-end gap-1 text-emerald-600">
                      <Gift className="w-3.5 h-3.5" />
                      <span className="text-sm font-medium">Earn: {rewardPoints} reward points</span>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <Button
                    className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 font-semibold"
                    onClick={handleAddToCart}
                    disabled={addingToCart || isInCart}
                  >
                    {addingToCart ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Adding...</>
                    ) : isInCart ? (
                      <><Check className="w-5 h-5 mr-2" />Added to Cart</>
                    ) : (
                      <><ShoppingCart className="w-5 h-5 mr-2" />Add to Cart</>
                    )}
                  </Button>
                  
                  {/* Reward Reinforcement Under Add to Cart */}
                  {!isInCart && (
                    <p className="text-center text-xs text-emerald-600 flex items-center justify-center gap-1">
                      <Gift className="w-3 h-3" />
                      You'll earn {rewardPoints} reward points with this purchase
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Login Required */}
            {!isLoggedIn && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4 text-center">
                  <p className="text-amber-800 font-medium mb-3">Login to view prices and add to cart</p>
                  <Button onClick={() => navigate("/login")} className="bg-amber-600 hover:bg-amber-700">
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
                    <Info className="w-4 h-4 text-blue-600" /> Description
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Key Features */}
            {(size.key_features || product.key_features) && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-amber-500" /> Key Features
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
