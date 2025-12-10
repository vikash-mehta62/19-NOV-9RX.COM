"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { DashboardLayout } from "@/components/DashboardLayout"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowLeft, Package, Loader2, ShoppingCart, Plus, Minus, Check, Truck, 
  Star, ChevronRight, Heart, Shield, Zap, Award, Box, Clock, Users,
  BadgeCheck, Sparkles, Calculator, Info
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCart } from "@/hooks/use-cart"
import { useSelector } from "react-redux"
import { RootState } from "@/store/store"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const applyGroupPricingToSizes = (sizes: any[], groupData: any[], userId: string) => {
  return sizes.map((size) => {
    let newPrice = size.price
    const applicableGroup = groupData.find(
      (group: any) =>
        group.group_ids.includes(userId) &&
        group.product_arrayjson.some((p: any) => p.product_id === size.id)
    )
    if (applicableGroup) {
      const groupProduct = applicableGroup.product_arrayjson.find((p: any) => p.product_id === size.id)
      if (groupProduct?.new_price) newPrice = parseFloat(groupProduct.new_price)
    }
    return { ...size, price: newPrice, originalPrice: size.price !== newPrice ? size.price : 0 }
  })
}

const PharmacyProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { addToCart, cartItems } = useCart()
  const userProfile = useSelector((state: RootState) => state.user.profile)

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string>("")
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map())
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [isWishlisted, setIsWishlisted] = useState(false)

  const getSupabaseImageUrl = (path: string): string => {
    if (!path || path === "/placeholder.svg") return "/placeholder.svg"
    if (path.startsWith("http")) return path
    const { data } = supabase.storage.from("product-images").getPublicUrl(path)
    return data?.publicUrl || "/placeholder.svg"
  }

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return
      try {
        const { data: productData, error } = await supabase
          .from("products")
          .select("*, product_sizes(*)")
          .eq("id", id)
          .single()

        if (error || !productData) {
          toast({ title: "Error", description: "Product not found", variant: "destructive" })
          navigate("/pharmacy/products")
          return
        }

        const mappedProduct = {
          ...productData,
          image_url: productData.images?.[0] || "/placeholder.svg",
          sizes: productData.product_sizes || []
        }

        if (userProfile?.id && mappedProduct.sizes.length > 0) {
          const { data: groupData } = await supabase.from("group_pricing").select("*")
          if (groupData) {
            mappedProduct.sizes = applyGroupPricingToSizes(mappedProduct.sizes, groupData, userProfile.id)
          }
        }

        setProduct(mappedProduct)
        setSelectedImage(getSupabaseImageUrl(mappedProduct.image_url))

        // Initialize quantities to 0 (pharmacy standard - no accidental orders)
        const initQty = new Map<string, number>()
        mappedProduct.sizes.forEach((s: any) => initQty.set(s.id, 0))
        setQuantities(initQty)

        const { data: related } = await supabase
          .from("products")
          .select("*, product_sizes(*)")
          .eq("category", productData.category)
          .neq("id", id)
          .limit(4)
        setRelatedProducts(related || [])
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id, userProfile])

  const updateQuantity = (sizeId: string, delta: number) => {
    const current = quantities.get(sizeId) || 0
    const newQty = Math.max(0, current + delta)
    setQuantities(new Map(quantities.set(sizeId, newQty)))
  }

  const handleQuickAdd = async (size: any, quickQty?: number) => {
    // If qty is 0, set to 1 first (or use quickQty for bulk add)
    let qty = quantities.get(size.id) || 0
    if (qty === 0) {
      qty = quickQty || 1
      setQuantities(new Map(quantities.set(size.id, qty)))
    }
    if (quickQty) {
      qty = quickQty
      setQuantities(new Map(quantities.set(size.id, qty)))
    }
    
    setAddingToCart(size.id)
    try {
      const cartItem = {
        productId: product.id.toString(),
        name: product.name,
        price: size.price * qty,
        image: selectedImage,
        shipping_cost: product.shipping_cost || 0,
        sizes: [{
          id: size.id, size_value: size.size_value, size_unit: size.size_unit,
          price: size.price, quantity: qty, sku: size.sku,
          total_price: size.price * qty, shipping_cost: product.shipping_cost || 0
        }],
        quantity: qty,
        customizations: {},
        notes: ''
      }
      const success = await addToCart(cartItem)
      if (success) {
        toast({ title: "✓ Added to Cart", description: `${size.size_value}${size.size_unit || ''} added!` })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add", variant: "destructive" })
    } finally {
      setAddingToCart(null)
    }
  }

  const getSizeInCartQty = (sizeId: string) => {
    let qty = 0
    cartItems.forEach(item => {
      if (item.productId === product?.id.toString()) {
        item.sizes.forEach((s: any) => { if (s.id === sizeId) qty += s.quantity })
      }
    })
    return qty
  }

  const getTotalInCart = () => {
    let total = 0
    cartItems.forEach(item => {
      if (item.productId === product?.id.toString()) {
        item.sizes.forEach((s: any) => { total += s.quantity })
      }
    })
    return total
  }

  // Count images for display
  const imageCount = product ? 1 + product.sizes.filter((s: any) => s.image).length : 0

  if (loading) {
    return (
      <DashboardLayout role="pharmacy">
        <div className="space-y-6 animate-pulse">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4"><Skeleton className="aspect-square rounded-2xl" /></div>
            <div className="lg:col-span-8 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!product) {
    return (
      <DashboardLayout role="pharmacy">
        <div className="flex flex-col items-center justify-center h-96">
          <Box className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <Button onClick={() => navigate("/pharmacy/products")} className="bg-emerald-600 hover:bg-emerald-700">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="pharmacy">
      <TooltipProvider>
        <div className="space-y-6 pb-24">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/pharmacy/products")} className="text-gray-500 hover:text-emerald-600 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Products
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-emerald-600 font-medium truncate">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Image Section - 4 columns */}
            <div className="lg:col-span-4">
              <div className="sticky top-4 space-y-4">
                {/* Main Image with Thumbnails */}
                <div className="flex gap-3">
                  {/* Vertical Thumbnails - Show main + product images array */}
                  <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto scrollbar-thin">
                    {/* Main image thumbnail */}
                    <button
                      onClick={() => setSelectedImage(getSupabaseImageUrl(product.image_url))}
                      className={`w-[70px] h-[70px] rounded-lg border-2 overflow-hidden transition-all flex-shrink-0 bg-white ${
                        selectedImage === getSupabaseImageUrl(product.image_url) ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-200' : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="w-full h-full p-1.5 flex items-center justify-center">
                        <img 
                          src={getSupabaseImageUrl(product.image_url)} 
                          alt="Main" 
                          className="w-full h-full object-contain" 
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                        />
                      </div>
                    </button>
                    
                    {/* Additional product images from images array */}
                    {product.images?.slice(1).map((imgPath: string, idx: number) => (
                      <button
                        key={`img-${idx}`}
                        onClick={() => setSelectedImage(getSupabaseImageUrl(imgPath))}
                        className={`w-[70px] h-[70px] rounded-lg border-2 overflow-hidden transition-all flex-shrink-0 bg-white ${
                          selectedImage === getSupabaseImageUrl(imgPath) ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-200' : 'border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="w-full h-full p-1.5 flex items-center justify-center">
                          <img 
                            src={getSupabaseImageUrl(imgPath)} 
                            alt={`View ${idx + 2}`} 
                            className="w-full h-full object-contain" 
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                          />
                        </div>
                      </button>
                    ))}

                    {/* Size variant thumbnails - only if they have actual images */}
                    {product.sizes.filter((s: any) => s.image && s.image !== "" && s.image !== "/placeholder.svg").map((size: any) => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedImage(getSupabaseImageUrl(size.image))}
                        className={`w-[70px] h-[70px] rounded-lg border-2 overflow-hidden transition-all flex-shrink-0 bg-white ${
                          selectedImage === getSupabaseImageUrl(size.image) ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-200' : 'border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="w-full h-full p-1.5 flex items-center justify-center">
                          <img 
                            src={getSupabaseImageUrl(size.image)} 
                            alt={`${size.size_value}${size.size_unit || ''}`} 
                            className="w-full h-full object-contain" 
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Main Image Display */}
                  <div className="flex-1 relative bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setIsWishlisted(!isWishlisted)} 
                      className="absolute top-4 right-4 z-10 p-2.5 bg-white/90 backdrop-blur rounded-full shadow-lg hover:scale-110 transition-transform"
                    >
                      <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`} />
                    </button>
                    <div className="aspect-square p-6 sm:p-10 flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-white">
                      <img 
                        src={selectedImage} 
                        alt={product.name} 
                        className="w-full h-full object-contain drop-shadow-sm" 
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg text-xs">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-emerald-700">Free Shipping</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg text-xs">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-700">Ships in 24hrs</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-purple-50 rounded-lg text-xs">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-purple-700">Quality Assured</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg text-xs">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span className="font-medium text-amber-700">10K+ Pharmacies</span>
                  </div>
                </div>

                {/* Buyer Confidence */}
                <Card className="bg-gradient-to-br from-gray-50 to-white">
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700">Why Choose Us</h4>
                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-emerald-500" /> Trusted Supplier</div>
                      <div className="flex items-center gap-2"><Award className="w-4 h-4 text-emerald-500" /> 100% Quality Guarantee</div>
                      <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-500" /> Same Day Processing</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right: Product Info - 8 columns */}
            <div className="lg:col-span-8 space-y-5">
              {/* Product Header */}
              <div>
                {/* Pharmacy Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">{product.category}</Badge>
                  {product.subcategory && <Badge className="bg-purple-100 text-purple-700 border-0">{product.subcategory}</Badge>}
                  <Badge className="bg-blue-100 text-blue-700 border-0"><Shield className="w-3 h-3 mr-1" />Child-Resistant</Badge>
                  <Badge className="bg-green-100 text-green-700 border-0"><Check className="w-3 h-3 mr-1" />In Stock</Badge>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
                
                <div className="flex items-center gap-4 text-sm">
                  {product.sku && <span className="text-gray-500">SKU: <span className="font-mono text-gray-700">{product.sku}</span></span>}
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                    <span className="text-gray-500 ml-1">(4.8)</span>
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <p className="mt-3 text-gray-600 text-sm leading-relaxed">{product.description}</p>
                )}

                {/* Key Features as Pills */}
                {product.key_features && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {product.key_features.split(",").map((f: string, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        <Check className="w-3 h-3 text-emerald-500" />{f.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Status Banner */}
              {getTotalInCart() > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-700">{getTotalInCart()} item(s) from this product in cart</span>
                  </div>
                  <Button size="sm" variant="outline" className="border-blue-300 text-blue-700" onClick={() => navigate("/pharmacy/order/create")}>
                    View Cart
                  </Button>
                </div>
              )}

              {/* Size Selection Table */}
              <Card className="border-2 border-emerald-100 shadow-sm">
                <CardContent className="p-0">
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Package className="w-5 h-5 text-emerald-600" />
                        Select Size & Add to Cart
                      </h3>
                      <Badge className="bg-emerald-600 text-white">{product.sizes.length} Options</Badge>
                    </div>
                  </div>

                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase">
                    <div className="col-span-4">Size / SKU</div>
                    <div className="col-span-2 text-center">Qty/Case</div>
                    <div className="col-span-2 text-right">Price</div>
                    <div className="col-span-2 text-center">Quantity</div>
                    <div className="col-span-2 text-center">Action</div>
                  </div>

                  {/* Size Rows */}
                  <div className="space-y-2 p-3 max-h-[450px] overflow-y-auto">
                    {product.sizes.map((size: any) => {
                      const qty = quantities.get(size.id) || 0
                      const inCartQty = getSizeInCartQty(size.id)
                      const pricePerUnit = size.quantity_per_case ? (size.price / size.quantity_per_case) : null
                      const discount = size.originalPrice > 0 ? Math.round((1 - size.price / size.originalPrice) * 100) : 0

                      return (
                        <div key={size.id} className={`grid grid-cols-12 gap-3 p-4 items-center rounded-xl border transition-all ${
                          inCartQty > 0 
                            ? 'bg-blue-50 border-blue-200 shadow-sm' 
                            : 'bg-white border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-sm'
                        }`}>
                          {/* Size Info */}
                          <div className="col-span-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-base">{size.size_value}{size.size_unit || ''}</span>
                              {discount > 0 && <Badge className="bg-red-500 text-white text-[10px] px-1.5">{discount}% OFF</Badge>}
                            </div>
                            {size.sku && <span className="text-xs text-gray-400 font-mono">{size.sku}</span>}
                            {inCartQty > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Check className="w-3 h-3 text-blue-500" />
                                <span className="text-xs text-blue-600 font-medium">{inCartQty} in cart</span>
                              </div>
                            )}
                          </div>

                          {/* Qty per Case */}
                          <div className="col-span-2 text-center">
                            <span className="text-sm text-gray-600 font-medium">{size.quantity_per_case || '-'}</span>
                          </div>

                          {/* Price */}
                          <div className="col-span-2 text-right">
                            <div className="font-bold text-emerald-600 text-base">${Number(size.price || 0).toFixed(2)}</div>
                            {size.originalPrice > 0 && (
                              <div className="text-xs text-gray-400 line-through">${Number(size.originalPrice).toFixed(2)}</div>
                            )}
                            {pricePerUnit && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="text-[10px] text-gray-500 flex items-center justify-end gap-0.5">
                                    <Calculator className="w-3 h-3" />${pricePerUnit.toFixed(3)}/ea
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Price per unit</TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          {/* Quantity Controls - Show different UI based on qty */}
                          <div className="col-span-2 flex items-center justify-center">
                            {qty === 0 ? (
                              <span className="text-sm text-gray-400">-</span>
                            ) : (
                              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 w-7 p-0 hover:bg-white rounded-md" 
                                  onClick={() => updateQuantity(size.id, -1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-8 text-center font-bold text-gray-900">{qty}</span>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 w-7 p-0 hover:bg-white rounded-md" 
                                  onClick={() => updateQuantity(size.id, 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="col-span-2 flex flex-col gap-1.5">
                            {qty === 0 ? (
                              /* Show "Add" button when qty is 0 */
                              <Button
                                size="sm"
                                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white w-full font-medium"
                                onClick={() => handleQuickAdd(size, 1)}
                                disabled={addingToCart === size.id}
                              >
                                {addingToCart === size.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add
                                  </>
                                )}
                              </Button>
                            ) : (
                              /* Show "Add to Cart" and "+5" buttons when qty > 0 */
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white w-full text-xs"
                                  onClick={() => handleQuickAdd(size)}
                                  disabled={addingToCart === size.id}
                                >
                                  {addingToCart === size.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <ShoppingCart className="w-3 h-3 mr-1" />
                                      Add {qty}
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 w-full text-[10px] border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => handleQuickAdd(size, qty + 5)}
                                >
                                  +5 Cases
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Bulk Pricing Tiers */}
              <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                <CardContent className="p-4">
                  <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5" />
                    Bulk Pricing - Save More!
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-white rounded-lg border border-amber-200">
                      <div className="text-xs text-gray-500">1+ cases</div>
                      <div className="font-bold text-gray-900">Standard</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-amber-300 ring-2 ring-amber-200">
                      <div className="text-xs text-amber-600 font-medium">10+ cases</div>
                      <div className="font-bold text-amber-700">Save 10%</div>
                    </div>
                    <div className="text-center p-3 bg-amber-100 rounded-lg border border-amber-300">
                      <div className="text-xs text-amber-700 font-medium">30+ cases</div>
                      <div className="font-bold text-amber-800">Save 15%</div>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700 mt-3 text-center">
                    Contact us for custom bulk pricing on large orders
                  </p>
                </CardContent>
              </Card>

              {/* Frequently Bought Together */}
              {relatedProducts.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                      <Package className="w-5 h-5 text-purple-600" />
                      Frequently Bought Together
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {relatedProducts.slice(0, 4).map((related) => (
                        <div
                          key={related.id}
                          className="group cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors"
                          onClick={() => navigate(`/pharmacy/product/${related.id}`)}
                        >
                          <div className="aspect-square mb-2 bg-white rounded-lg p-2">
                            <img
                              src={getSupabaseImageUrl(related.images?.[0] || related.image_url)}
                              alt={related.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <h5 className="text-xs font-medium text-gray-900 line-clamp-2 group-hover:text-emerald-600">
                            {related.name}
                          </h5>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-bold text-emerald-600">
                              ${Number(related.product_sizes?.[0]?.price || related.base_price || 0).toFixed(2)}
                            </span>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full hover:bg-emerald-100">
                              <Plus className="w-3 h-3 text-emerald-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img src={selectedImage} alt="" className="w-12 h-12 rounded-lg object-contain bg-gray-50 border" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{product.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{product.sizes.length} sizes available</span>
                      {getTotalInCart() > 0 && (
                        <Badge className="bg-blue-100 text-blue-700 text-[10px]">{getTotalInCart()} in cart</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="hidden sm:flex" onClick={() => navigate("/pharmacy/products")}>
                    Continue Shopping
                  </Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate("/pharmacy/order/create")}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    View Cart {getTotalInCart() > 0 && `(${getTotalInCart()})`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  )
}

export default PharmacyProductDetail
