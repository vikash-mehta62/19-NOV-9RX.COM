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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  Heart,
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Check,
  Loader2,
  Star,
  Info,
  X,
  Bell,
  Palette,
  Gift,
  HelpCircle,
  MessageSquare,
  ChevronUp,
  ChevronDown
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ProductReviews } from "@/components/reviews/ProductReviews"
import { ProductReviewForm } from "@/components/reviews/ProductReviewForm"
import { PharmacyProductCard } from "@/components/pharmacy/components/product-showcase/PharmacyProductCard"
import { canUserReview } from "@/services/reviewService"
import logo from "../../assests/home/9rx_logo.png"

export default function SizeDetail() {
  const { productId, sizeId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const userProfile = useSelector(selectUserProfile)
  const { addToCart, cartItems } = useCart()

  const [data, setData] = useState<{ product: any; size: any; otherSizes: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [reviewKey, setReviewKey] = useState(0)
  const [showZoom, setShowZoom] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [customization, setCustomization] = useState<{ enabled: boolean; text: string }>({ enabled: false, text: '' })
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<any[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)

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
      .select("id, name, category, description, image_url, images, key_features, customization, similar_products, product_sizes(id, size_value, size_unit, price, price_per_case, stock, sku, quantity_per_case, image, case, unit, shipping_cost)")
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

        // Fetch similar products if configured
        if (productData?.similar_products && Array.isArray(productData.similar_products) && productData.similar_products.length > 0) {
          fetchSimilarProducts(productData.similar_products.map((s: any) => s.subcategory_name))
        } else {
          setSimilarProducts([])
        }

        // Check if user can review this product
        if (userProfile?.id && productId) {
          canUserReview(userProfile.id, productId).then(result => {
            setCanReview(result.canReview)
          })
        }

        setLoading(false)
      })

    return () => { isMounted = false }
  }, [productId, sizeId])

  const normalizeName = (s: string) =>
    s
      .replace(/[\u2013\u2014\u2212]/g, "-") // normalize dashes
      .replace(/\s+/g, " ")
      .trim()

  const fetchSimilarProducts = async (subcategories: string[]) => {
    if (!subcategories || subcategories.length === 0) return
    setSimilarLoading(true)
    try {
      const candidates = Array.from(new Set(
        subcategories.flatMap((s) => {
          const n = normalizeName(s)
          return [s, n]
        })
      ))

      // Fetch products that belong to any of the selected similar subcategories
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, category, description, image_url, images, customization, sizes:product_sizes(id, size_value, size_unit, price, stock, quantity_per_case)")
        .in("subcategory", candidates)
        .neq("id", productId)
        .limit(8)

      if (!error && products) {
        // Map to card-friendly shape
        const enhanced = products.map((p: any) => {
          const displayPrice = p.sizes && p.sizes.length > 0
            ? Math.min(...p.sizes.map((s: any) => Number(s.price) || 0))
            : Number(p.base_price || 0)
          const totalStock = (p.sizes || []).reduce((sum: number, s: any) => sum + (Number(s.stock) || 0), 0)
          const displayImage = (p.images && p.images[0]) || p.image_url || "/placeholder.svg"
          return { ...p, displayPrice, totalStock, displayImage }
        })
        setSimilarProducts(enhanced)
      } else {
        setSimilarProducts([])
      }
    } finally {
      setSimilarLoading(false)
    }
  }

  const getImageUrl = (image?: string) => {
    if (!image) return "/placeholder.svg"
    if (image.startsWith("http")) return image
    return `https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/${image}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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

  // Pricing calculations
  const casePrice = size.price || 0
  const unitsPerCase = size.quantity_per_case || 0
  const unitPrice = unitsPerCase > 0 ? casePrice / unitsPerCase : 0
  const customizationPrice = customization.enabled && product.customization?.allowed
    ? (product.customization.price || 0) * quantity
    : 0
  const totalPrice = (casePrice * quantity) + customizationPrice

  // Reward points calculation (1 point = $1)
  const rewardPoints = Math.round(totalPrice)

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
        name: `${product.name}${customization.enabled ? ' (Customized)' : ''}`,
        sku: product.sku || size.sku || "",
        price: totalPrice,
        image: getImageUrl(displayImage),
        shipping_cost: size.shipping_cost || 0,
        sizes: [{
          id: size.id,
          size_value: size.size_value,
          size_unit: size.size_unit,
          price: casePrice,
          quantity,
          sku: size.sku,
          total_price: totalPrice,
          shipping_cost: size.shipping_cost,
          type: "case",
        }],
        quantity,
        customizations: customization.enabled ? {
          customization_enabled: 'true',
          customization_text: customization.text,
          customization_price: (product.customization?.price || 0).toString()
        } : {},
        notes: customization.enabled ? `Customization: ${customization.text}` : "",
      })
      toast({
        title: "✓ Added to Cart",
        description: `${quantity} case${quantity > 1 ? 's' : ''} added successfully`
      })
      setQuantity(1)
      setCustomization({ enabled: false, text: '' })
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
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => {
              // For RX PAPER BAGS, just go to category (sizes shown directly)
              // For other categories, expand the product to show its sizes
              const isRxPaperBags = product?.category?.toUpperCase() === "RX PAPER BAGS";
              if (isRxPaperBags) {
                navigate("/pharmacy/products", { state: { selectedCategory: product?.category } });
              } else {
                navigate("/pharmacy/products", { state: { selectedCategory: product?.category, selectedProductId: productId } });
              }
            }} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <img src={logo} alt="Logo" className="h-16 w-auto hidden sm:block cursor-pointer" onClick={() => navigate("/pharmacy/products")} />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsWishlisted(!isWishlisted)}>
              <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/pharmacy/order/create")} className="relative">
              <ShoppingCart className="w-5 h-5" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">
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
        <div className="max-w-6xl mx-auto px-4 py-2 text-sm text-gray-500">
          <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate("/pharmacy/products", { state: { selectedCategory: product?.category } })}>{product?.category || "Products"}</span>
          {" / "}
          {product?.category?.toUpperCase() !== "RX PAPER BAGS" && (
            <>
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate("/pharmacy/products", { state: { selectedCategory: product?.category, selectedProductId: productId } })}>{product?.name}</span>
              {" / "}
            </>
          )}
          <span className="text-gray-900">{size.size_value} {size.size_unit}</span>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left - Image */}
          <div className="space-y-4">
            <div className="relative bg-white rounded-xl border aspect-square cursor-zoom-in" onClick={() => setShowZoom(true)}>
              <Badge className="absolute top-4 left-4 bg-blue-600 text-white z-10">{product.category}</Badge>
              <img
                src={getImageUrl(displayImage)}
                alt={product.name}
                className="w-full h-full object-contain p-8"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
              />
              {isOutOfStock && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <Badge variant="secondary" className="text-lg px-4 py-2 bg-gray-100 text-gray-600">Out of Stock</Badge>
                </div>
              )}
            </div>

            {/* Items List (Collapsible) */}
            <div className="px-4">
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto hover:bg-transparent min-h-[44px]"
                onClick={() => setIsItemsExpanded(!isItemsExpanded)}
                aria-expanded={isItemsExpanded}
                aria-controls="order-items-list"
                aria-label={isItemsExpanded ? "Collapse items list" : "Expand items list"}
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
                  <Package className="w-4 h-4 text-blue-600" />
                  Other Sizes ({otherSizes.length})
                </h3>
                {isItemsExpanded ? (
                  <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" aria-hidden="true" />
                )}
              </Button>
            </div>

            {/* Other Sizes */}
            {isItemsExpanded && (
              <>
                {otherSizes.length > 0 && (
                  <Card>
                    <CardContent className="p-4">

                      <div className="space-y-2 max-h-[240px] overflow-y-auto">
                        {otherSizes.map((s) => {
                          const sUnitsPerCase = s.quantity_per_case || 0
                          const sUnitPrice = sUnitsPerCase > 0 ? s.price / sUnitsPerCase : 0
                          const sRewardPoints = Math.round(s.price)
                          return (
                            <button
                              key={s.id}
                              onClick={() => navigate(`/pharmacy/product/${productId}/${s.id}`)}
                              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                            >
                              <img src={getImageUrl(s.image || product.image_url)} alt="" className="w-12 h-12 object-contain rounded bg-gray-50" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{s.size_value} {s.size_unit}</p>
                                {sUnitsPerCase > 0 && (
                                  <p className="text-xs text-gray-500">{sUnitsPerCase} units/case · ${sUnitPrice.toFixed(2)}/unit</p>
                                )}
                                <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                                  <Gift className="w-3 h-3" />
                                  Earn {sRewardPoints} points
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gray-900">${s.price?.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">/ case</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          {/* Similar Products */}
          <div className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
              <Package className="w-4 h-4 text-blue-600" />
              Similar Products
              {similarProducts.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                  {similarProducts.length}
                </Badge>
              )}
            </h3>

            {similarLoading && (
              <div className="text-sm text-gray-500">Loading suggestions...</div>
            )}

            {!similarLoading && similarProducts.length === 0 && (
              <div className="text-sm text-gray-500">No similar products available.</div>
            )}

            {!similarLoading && similarProducts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-4">
                {similarProducts.map((sp: any) => (
                  <PharmacyProductCard key={sp.id} product={sp} />
                ))}
              </div>
            )}
          </div>
          </div>



          {/* Right - Details */}
          <div className="space-y-4">
            {/* Product Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 uppercase">{product.name}</h1>
              <p className="text-xl font-semibold text-blue-600 mt-1">{size.size_value} {size.size_unit}</p>
            </div>

            {/* SKU & Stock */}
            <div className="flex flex-wrap items-center gap-2">
              {size.sku && <Badge variant="outline" className="text-xs">SKU: {size.sku}</Badge>}
              <Badge className={isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                {isOutOfStock ? 'Out of Stock' : `In Stock (${size.stock})`}
              </Badge>
              {unitsPerCase > 0 && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Package className="w-3 h-3" />{unitsPerCase}/case
                </Badge>
              )}
            </div>

            {/* Price Card */}
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50">
              <CardContent className="p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">${casePrice.toFixed(2)}</span>
                  <span className="text-gray-500">/ case</span>
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
                    <Gift className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">
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
              </CardContent>
            </Card>

            {/* Purchase Section */}
            {!isOutOfStock && (
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
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center font-semibold">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-r-lg rounded-l-none hover:bg-gray-100"
                        onClick={() => setQuantity(q => q + 1)}
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
                          id="customize-size"
                          checked={customization.enabled}
                          onCheckedChange={(checked) => setCustomization(prev => ({ ...prev, enabled: checked as boolean }))}
                        />
                        <Label htmlFor="customize-size" className="text-sm font-medium text-purple-700 cursor-pointer flex items-center gap-1">
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
                      <span className="text-2xl font-bold text-blue-600">${totalPrice.toFixed(2)}</span>
                    </div>
                    {/* Quantity-Aware Reward Points */}
                    <div className="flex items-center justify-end gap-1 text-blue-600">
                      <Gift className="w-3.5 h-3.5" />
                      <span className="text-sm font-medium">Earn: {rewardPoints} reward points</span>
                    </div>
                  </div>

                  {/* Add to Cart */}
                  <Button
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-base"
                    onClick={handleAddToCart}
                    disabled={isAdding || isInCart}
                  >
                    {isAdding ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Adding...</>
                    ) : isInCart ? (
                      <><Check className="w-5 h-5 mr-2" />Added to Cart</>
                    ) : (
                      <><ShoppingCart className="w-5 h-5 mr-2" />Add to Cart</>
                    )}
                  </Button>

                  {/* Reward Reinforcement Under Add to Cart */}
                  {!isInCart && (
                    <p className="text-center text-xs text-blue-600 flex items-center justify-center gap-1">
                      <Gift className="w-3 h-3" />
                      You'll earn {rewardPoints} reward points with this purchase
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {product.description && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-2 text-gray-900">
                    <Info className="w-4 h-4 text-blue-500" />Description
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Key Features */}
            {featuresList.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3 text-gray-900">
                    <Star className="w-4 h-4 text-amber-500" />Key Features
                  </h3>
                  <ul className="space-y-2">
                    {featuresList.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Reviews Section */}
            {productId && (
              <div className="space-y-4">
                {/* Write Review Button */}
                {userProfile?.id && canReview && !showReviewForm && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-gray-900">Share your experience</span>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">+50 points</Badge>
                        </div>
                        <Button
                          onClick={() => setShowReviewForm(true)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Write a Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Review Form */}
                {showReviewForm && userProfile?.id && (
                  <ProductReviewForm
                    userId={userProfile.id}
                    productId={productId}
                    productName={product.name}
                    sizeId={sizeId}
                    reviewBonus={50}
                    onSuccess={() => {
                      setShowReviewForm(false)
                      setCanReview(false)
                      setReviewKey(prev => prev + 1)
                    }}
                    onCancel={() => setShowReviewForm(false)}
                  />
                )}

                {/* Reviews List */}
                <ProductReviews
                  key={reviewKey}
                  productId={productId}
                  userId={userProfile?.id}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Image Zoom Modal */}
      {showZoom && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setShowZoom(false)}>
          <button className="absolute top-4 right-4 text-white p-2"><X className="w-8 h-8" /></button>
          <img src={getImageUrl(displayImage)} alt="" className="max-w-[90vw] max-h-[90vh] object-contain" />
        </div>
      )}
    </div>
  )
}
