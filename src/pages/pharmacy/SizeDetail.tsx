"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/supabaseClient"
import axios from "../../../axiosconfig"
import { useSelector } from "react-redux"
import { selectUserProfile } from "@/store/selectors/userSelectors"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
import { CustomizationEnquiryDialog, type CustomizationEnquiryItem } from "@/components/pharmacy/components/CustomizationEnquiryDialog"
import { canUserReview } from "@/services/reviewService"
import { getProductEffectivePrice } from "@/services/productOfferService"
import { formatPointsRedemptionRule, normalizePointRedemptionValue, normalizePointsPerDollar } from "@/lib/rewards"
import logo from "../../assests/home/9rx_logo.png"

export default function SizeDetail() {
  const { productId, sizeId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const userProfile = useSelector(selectUserProfile)
  const { addToCart, cartItems } = useCart()
  const userType = sessionStorage.getItem('userType')?.toLowerCase() || 'pharmacy'

  const [data, setData] = useState<{ product: any; size: any; otherSizes: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [reviewKey, setReviewKey] = useState(0)
  const [showZoom, setShowZoom] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [customizationItems, setCustomizationItems] = useState<CustomizationEnquiryItem[]>([])
  const [customizationInstruction, setCustomizationInstruction] = useState("")
  const [isCustomizationDialogOpen, setIsCustomizationDialogOpen] = useState(false)
  const [isSendingCustomizationEnquiry, setIsSendingCustomizationEnquiry] = useState(false)
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<any[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)
  const [productOffer, setProductOffer] = useState<{
    effectivePrice: number;
    discountPercent: number;
    offerBadge: string | null;
    hasOffer: boolean;
  } | null>(null)
  const [rewardsConfig, setRewardsConfig] = useState({
    pointsPerDollar: 1,
    pointValue: 0.01,
  })

  const totalCartItems = useMemo(() =>
    cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
    [cartItems]
  )

  // Single optimized fetch
  useEffect(() => {
    if (!productId || !sizeId) return

    let isMounted = true
    setLoading(true)

    const fetchProductAndGroupPricing = async () => {
      // Fetch product data
      const { data: productData, error } = await supabase
        .from("products")
        .select("id, name, category, description, image_url, images, key_features, customization, similar_products, unitToggle, product_sizes!inner(id, size_name, size_value, size_unit, price, price_per_case, stock, sku, quantity_per_case, image, case, unit, shipping_cost, is_active)")
        .eq("id", productId)
        .eq("is_active", true) // Only fetch active products
        .eq("product_sizes.is_active", true) // Only fetch active sizes
        .single()

      if (!isMounted) return
      if (error || !productData) {
        setLoading(false)
        return
      }

      // Fetch group pricing data
      let groupData: any[] = []
      if (userProfile?.id) {
        const { data: groupPricingData } = await supabase
          .from("group_pricing")
          .select("*")
          .eq("status", "active")
        
        if (groupPricingData) {
          groupData = groupPricingData
        }
      }

      // Apply group pricing to sizes
      const applyGroupPricing = (size: any) => {
        let newPrice = size.price
        let originalPrice = 0

        if (userProfile?.id && groupData.length > 0) {
          const applicableGroup = groupData.find(
            (group: any) =>
              group.group_ids.includes(userProfile.id) &&
              group.product_arrayjson.some((product: any) => product.product_id === size.id)
          )
          
          if (applicableGroup) {
            const groupProduct = applicableGroup.product_arrayjson.find(
              (product: any) => product.product_id === size.id
            )
            if (groupProduct) {
              const parsed = parseFloat(groupProduct.new_price)
              if (parsed > 0) {
                originalPrice = size.price
                newPrice = parsed
              }
            }
          }
        }

        return { ...size, price: newPrice, originalPrice }
      }

      const selectedSize = productData.product_sizes?.find((s: any) => s.id === sizeId)
      const otherSizes = productData.product_sizes?.filter((s: any) => s.id !== sizeId) || []

      setData({
        product: productData,
        size: selectedSize ? applyGroupPricing(selectedSize) : selectedSize,
        otherSizes: otherSizes.map(applyGroupPricing)
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

      // Load product offers - BUT skip if size has group pricing
      if (productId && selectedSize) {
        const sizeWithGroupPricing = applyGroupPricing(selectedSize);
        const hasGroupPricing = sizeWithGroupPricing.originalPrice > 0;
        
        console.log("=== SIZE DETAIL GROUP PRICING CHECK ===");
        console.log("Size ID:", sizeId);
        console.log("Original Price:", sizeWithGroupPricing.originalPrice);
        console.log("Current Price:", sizeWithGroupPricing.price);
        console.log("Has Group Pricing:", hasGroupPricing);
        
        if (hasGroupPricing) {
          console.log("⚠️ Skipping offers - size has group pricing applied");
          setProductOffer(null);
        } else {
          getProductEffectivePrice(productId).then(offerData => {
            if (offerData && offerData.hasOffer) {
              console.log("SizeDetail - Product has offer:", offerData);
              setProductOffer({
                effectivePrice: offerData.effectivePrice,
                discountPercent: offerData.discountPercent,
                offerBadge: offerData.offerBadge,
                hasOffer: offerData.hasOffer
              });
            }
          }).catch(err => {
            console.error("Error loading product offer:", err);
          });
        }
      }

      setLoading(false)
    }

    fetchProductAndGroupPricing()

    return () => { isMounted = false }
  }, [productId, sizeId, userProfile?.id])

  useEffect(() => {
    const fetchRewardsConfig = async () => {
      try {
        const { data } = await supabase
          .from("rewards_config")
          .select("points_per_dollar, point_redemption_value")
          .limit(1)
          .maybeSingle()

        setRewardsConfig({
          pointsPerDollar: normalizePointsPerDollar(Number(data?.points_per_dollar)),
          pointValue: normalizePointRedemptionValue(Number(data?.point_redemption_value)),
        })
      } catch (error) {
        console.error("Failed to fetch rewards config:", error)
      }
    }

    fetchRewardsConfig()
  }, [])

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
        .select("id, name, category, description, image_url, images, customization, unitToggle, sizes:product_sizes!inner(id, size_value, size_unit, price, stock, quantity_per_case, is_active, sizeSquanence)")
        .in("subcategory", candidates)
        .neq("id", productId)
        .eq("is_active", true) // Only fetch active products
        .eq("product_sizes.is_active", true) // Only fetch active sizes
        .limit(8)

      if (!error && products) {
        // Map to card-friendly shape
        const enhanced = products.map((p: any) => {
          const displayPrice = p.sizes && p.sizes.length > 0
            ? Math.min(...p.sizes.map((s: any) => Number(s.price) || 0))
            : Number(p.base_price || 0)
          const totalStock = (p.sizes || []).reduce((sum: number, s: any) => sum + (Number(s.stock) || 0), 0)
          // Prioritize image_url (full URL) over images array (filename only)
          const displayImage = p.image_url || (p.images && p.images[0]) || "/placeholder.svg"
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
    return `https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/${image}`
  }

  const product = data?.product
  const size = data?.size

  useEffect(() => {
    if (!product || !size) return

    const itemKey = `${product.id}:${size.id}`

    setCustomizationItems((prev) => {
      const existingItem = prev.find((item) => item.key === itemKey)
      if (!existingItem || existingItem.requestedQuantity === quantity) {
        return prev
      }

      return prev.map((item) =>
        item.key === itemKey
          ? { ...item, requestedQuantity: quantity }
          : item
      )
    })
  }, [product, size, quantity])

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
        <Button onClick={() => navigate(`/${userType}/products`)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    )
  }

  const otherSizes = data.otherSizes
  const displayImage = size.image || product.image_url || product.images?.[0]

  // Pricing calculations
  const casePrice = size.price || 0
  const originalCasePrice = size.originalPrice || 0
  const hasGroupDiscount = originalCasePrice > 0 && originalCasePrice > casePrice
  const groupDiscountPercent = hasGroupDiscount ? Math.round((1 - casePrice / originalCasePrice) * 100) : 0
  const hasOfferDiscount = Boolean(productOffer?.hasOffer && productOffer.discountPercent > 0)
  
  // Calculate prices based on discount type
  let effectiveCasePrice = casePrice
  let displayOriginalPrice = 0
  let displayDiscountPercent = 0
  
  if (hasGroupDiscount) {
    // Group pricing: discounted price is already stored in size.price
    effectiveCasePrice = casePrice
    displayOriginalPrice = originalCasePrice
    displayDiscountPercent = groupDiscountPercent
  } else if (hasOfferDiscount) {
    // Offer discount: calculate from current price
    displayOriginalPrice = casePrice
    displayDiscountPercent = productOffer.discountPercent
    effectiveCasePrice = casePrice * (1 - productOffer.discountPercent / 100)
  } else {
    // No discount
    effectiveCasePrice = casePrice
    displayOriginalPrice = 0
    displayDiscountPercent = 0
  }
  
  const hasDiscount = hasGroupDiscount || hasOfferDiscount
  
  const unitsPerCase = size.quantity_per_case || 0
  const unitPrice = unitsPerCase > 0 ? effectiveCasePrice / unitsPerCase : 0
  const originalTotalPrice = (displayOriginalPrice || casePrice) * quantity
  const discountedTotalPrice = effectiveCasePrice * quantity
  const totalPrice = discountedTotalPrice

  const rewardPoints = Math.floor(totalPrice * rewardsConfig.pointsPerDollar)

  const isOutOfStock = size.stock <= 0
  const isInCart = cartItems.some(item => item.productId === productId && item.sizes?.some((s: any) => s.id === sizeId))
  const isCustomizationSelected = customizationItems.some(
    (item) => item.productId === product.id.toString() && item.sizeId === size.id
  )

  const featuresList = (size.key_features || product.key_features || "")
    .split(/[\n,]/)
    .map((f: string) => f.trim())
    .filter((f: string) => f.length > 0)

  const createCustomizationItem = (): CustomizationEnquiryItem => ({
    key: `${product.id}:${size.id}`,
    productId: product.id.toString(),
    productName: product.name,
    sizeId: size.id,
    sizeLabel: `${size.size_value} ${product?.unitToggle ? size.size_unit : ""}`.trim(),
    sku: size.sku || product.sku || "",
    requestedQuantity: quantity,
  })

  const handleCustomizationToggle = (enabled: boolean) => {
    const itemKey = `${product.id}:${size.id}`

    if (enabled) {
      setCustomizationItems((prev) => {
        if (prev.some((item) => item.key === itemKey)) {
          return prev
        }
        return [...prev, createCustomizationItem()]
      })
      setIsCustomizationDialogOpen(true)
      return
    }

    setCustomizationItems((prev) => prev.filter((item) => item.key !== itemKey))
  }

  const handleSendCustomizationEnquiry = async () => {
    if (customizationItems.length === 0) {
      toast({
        title: "No Size Selected",
        description: "Select at least one size for customization enquiry.",
        variant: "destructive",
      })
      return
    }

    setIsSendingCustomizationEnquiry(true)

    try {
      const name = userProfile?.display_name || userProfile?.name || "Unknown User"
      const email = userProfile?.email || "NA"
      const phone = userProfile?.mobile_phone || userProfile?.work_phone || "NA"

      const selectedProducts = customizationItems.map((item) => {
        const skuLabel = item.sku ? ` | SKU: ${item.sku}` : ""
        return {
          value: `${item.productName} - ${item.sizeLabel}${skuLabel} | Requested Qty: ${item.requestedQuantity}`
        }
      })

      if (customizationInstruction.trim()) {
        selectedProducts.push({ value: `Customization Instruction: ${customizationInstruction.trim()}` })
      }

      await axios.post("/customization", {
        name,
        email,
        phone,
        selectedProducts,
      })

      toast({
        title: "Enquiry Sent",
        description: "Customization enquiry sent to admin successfully.",
      })

      setCustomizationItems([])
      setCustomizationInstruction("")
      setIsCustomizationDialogOpen(false)
    } catch (error) {
      console.error("Failed to send customization enquiry:", error)
      toast({
        title: "Send Enquiry Failed",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSendingCustomizationEnquiry(false)
    }
  }

  const handleAddToCart = async () => {
    if (isOutOfStock) return
    if (isCustomizationSelected) {
      toast({
        title: "Customization Selected",
        description: "This size is selected for customization enquiry and cannot be added to cart.",
        variant: "destructive",
      })
      return
    }
    setIsAdding(true)
    try {
      await addToCart({
        productId: product.id,
        name: product.name,
        sku: product.sku || size.sku || "",
        unitToggle: product.unitToggle,
        price: totalPrice,
        image: getImageUrl(displayImage),
        shipping_cost: size.shipping_cost || 0,
        sizes: [{
          id: size.id,
          size_name: size.size_name || "",
          size_value: size.size_value,
          size_unit: size.size_unit,
          price: effectiveCasePrice,
          quantity,
          sku: size.sku,
          total_price: totalPrice,
          shipping_cost: size.shipping_cost,
          type: "case",
        }],
        quantity,
        customizations: {},
        notes: "",
      })
      setQuantity(1)
    } catch {
      toast({ title: "Error", variant: "destructive" })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomizationEnquiryDialog
        open={isCustomizationDialogOpen}
        onOpenChange={setIsCustomizationDialogOpen}
        items={customizationItems}
        instruction={customizationInstruction}
        onInstructionChange={setCustomizationInstruction}
        onItemsChange={setCustomizationItems}
        onSubmit={handleSendCustomizationEnquiry}
        isSubmitting={isSendingCustomizationEnquiry}
      />

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => {
              // For RX PAPER BAGS, just go to category (sizes shown directly)
              // For other categories, expand the product to show its sizes
              const isRxPaperBags = product?.category?.toUpperCase() === "RX PAPER BAGS";
              if (isRxPaperBags) {
                navigate(`/${userType}/products`, { state: { selectedCategory: product?.category } });
              } else {
                navigate(`/${userType}/products`, { state: { selectedCategory: product?.category, selectedProductId: productId } });
              }
            }} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <img src={logo} alt="Logo" className="h-16 w-auto hidden sm:block cursor-pointer" onClick={() => navigate(`/${userType}/products`)} />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsWishlisted(!isWishlisted)}>
              <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/${userType}/order/create`)} className="relative">
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
          <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate(`/${userType}/products`, { state: { selectedCategory: product?.category } })}>{product?.category || "Products"}</span>
          {" / "}
          {product?.category?.toUpperCase() !== "RX PAPER BAGS" && (
            <>
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate(`/${userType}/products`, { state: { selectedCategory: product?.category, selectedProductId: productId } })}>{product?.name}</span>
              {" / "}
            </>
          )}
          <span className="text-gray-900">{size.size_name || size.size_value}</span>
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

            {/* Items List (Collapsible) - Only show if there are other sizes */}
            {otherSizes.length > 0 && (
              <>
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
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-2 max-h-[240px] overflow-y-auto">
                        {otherSizes.map((s) => {
                          const sUnitsPerCase = s.quantity_per_case || 0
                          const sUnitPrice = sUnitsPerCase > 0 ? s.price / sUnitsPerCase : 0
                          const sRewardPoints = Math.floor((Number(s.price) || 0) * rewardsConfig.pointsPerDollar)
                          const sHasGroupDiscount = s.originalPrice > 0 && s.originalPrice > s.price
                          
                          // Calculate effective price display for this size
                          const sHasOfferDiscount = !sHasGroupDiscount && hasOfferDiscount
                          const sOriginalPrice = sHasGroupDiscount
                            ? s.originalPrice
                            : sHasOfferDiscount
                              ? s.price
                              : 0
                          const sEffectivePrice = sHasGroupDiscount
                            ? s.price
                            : sHasOfferDiscount
                              ? s.price * (1 - productOffer.discountPercent / 100)
                              : s.price
                          const sDiscountPercent = sHasGroupDiscount
                            ? Math.round((1 - s.price / s.originalPrice) * 100)
                            : sHasOfferDiscount
                              ? productOffer.discountPercent
                              : 0
                          
                          return (
                            <button
                              key={s.id}
                              onClick={() => navigate(`/${userType}/product/${productId}/${s.id}`)}
                              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                            >
                              <img src={getImageUrl(s.image || product.image_url)} alt="" className="w-12 h-12 object-contain rounded bg-gray-50" />
                              <div className="flex-1 min-w-0">
                                <p className="text-md font-bold text-gray-900">{s.size_name || ''}</p>
                                <p className="font-semibold text-sm text-gray-600 truncate">{s.size_value} {product?.unitToggle ? s.size_unit : ""}</p>
                                {sUnitsPerCase > 0 && (
                                  <p className="text-xs text-gray-500">{sUnitsPerCase} units/case / ${sUnitPrice.toFixed(2)}/unit</p>
                                )}
                                <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                                  <Gift className="w-3 h-3" />
                                  Earn {sRewardPoints} points
                                </p>
                                {/* Show offer badge if applicable */}
                                {sHasOfferDiscount && productOffer?.offerBadge && (
                                  <Badge className="mt-1 bg-red-500 text-white text-xs">
                                    🎁 {sDiscountPercent}% OFF
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right">
                                {sOriginalPrice > 0 && (
                                  <p className="text-xs text-gray-400 line-through">${sOriginalPrice.toFixed(2)}</p>
                                )}
                                <p className={`font-bold ${sOriginalPrice > 0 ? 'text-green-600' : 'text-gray-900'}`}>${sEffectivePrice.toFixed(2)}</p>
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
            <Card>
              <CardContent className="p-4">
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
                      <PharmacyProductCard
                        key={sp.id}
                        product={sp}
                        onProductClick={() =>
                          navigate(`/${userType}/products`, {
                            state: {
                              selectedCategory: sp.category,
                              selectedProductId: String(sp.id),
                            },
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>



          {/* Right - Details */}
          <div className="space-y-4">
            {/* Product Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 uppercase">{size.size_name || product.name}</h1>
              <p className="text-xl font-semibold text-blue-600 mt-1">{size.size_value} {product?.unitToggle ? size.size_unit : ""}</p>
            </div>

            {/* SKU & Stock */}
            <div className="flex flex-wrap items-center gap-2">
              {size.sku && <Badge variant="outline" className="text-xs">SKU: {size.sku}</Badge>}
              <Badge className={isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                {isOutOfStock ? 'Out of Stock' : `In Stock`}
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
                {/* Show offer badge if available and no group discount */}
                {!hasGroupDiscount && productOffer?.hasOffer && productOffer.offerBadge && (
                  <div className="mb-2">
                    <Badge className="bg-red-500 text-white text-sm font-bold">
                      🎁 {productOffer.offerBadge}
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-baseline gap-2">
                  {displayOriginalPrice > 0 && (
                    <span className="text-xl text-gray-400 line-through">${displayOriginalPrice.toFixed(2)}</span>
                  )}
                  <span className={`text-3xl font-bold ${hasDiscount ? 'text-green-600' : 'text-gray-900'}`}>
                    ${effectiveCasePrice.toFixed(2)}
                  </span>
                  <span className="text-gray-500">/ case</span>
                </div>
                
                {hasDiscount && displayOriginalPrice > 0 && (
                  <p className="text-sm text-green-600 font-semibold mt-1">
                    Save {displayDiscountPercent}% - ${(displayOriginalPrice - effectiveCasePrice).toFixed(2)} off
                  </p>
                )}

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
                      Earn {Math.floor(effectiveCasePrice * rewardsConfig.pointsPerDollar)} Reward Points
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px]">
                        <p className="text-xs">
                          Reward points can be redeemed on future orders. {formatPointsRedemptionRule(rewardsConfig.pointValue)} at checkout.
                        </p>
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
                  {product.customization?.allowed && customizationItems.length > 0 && (
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-purple-200 text-purple-700 hover:bg-purple-50"
                        onClick={() => setIsCustomizationDialogOpen(true)}
                      >
                        <Palette className="w-4 h-4 mr-1.5" />
                        Customization Enquiry
                        <Badge className="ml-2 bg-purple-100 text-purple-700 border border-purple-200">
                          {customizationItems.length}
                        </Badge>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-purple-700 hover:bg-purple-100 h-10 w-10 p-0"
                        onClick={() => {
                          setCustomizationItems([])
                          setCustomizationInstruction('')
                        }}
                        title="Clear customization selections"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Quantity</span>
                    <div className={`flex items-center border border-gray-200 rounded-lg bg-gray-50 ${isCustomizationSelected ? "opacity-60" : ""}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-l-lg rounded-r-none hover:bg-gray-100"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={isCustomizationSelected || quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center font-semibold">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-r-lg rounded-l-none hover:bg-gray-100"
                        onClick={() => setQuantity(q => q + 1)}
                        disabled={isCustomizationSelected}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Customization Option */}
                  {product.customization?.allowed && !isCustomizationSelected && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 bg-purple-50 text-sm h-10"
                      onClick={() => handleCustomizationToggle(true)}
                    >
                      <Palette className="w-4 h-4 mr-1.5" />
                      Inquire for customization
                      {product.customization.price > 0 && (
                        <span className="ml-1 text-purple-500">(+${product.customization.price.toFixed(2)}/unit)</span>
                      )}
                    </Button>
                  )}

                  {/* Total */}
                  <div className="py-3 border-t space-y-1">
                    {hasDiscount && displayOriginalPrice > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Original total</span>
                        <span className="text-gray-400 line-through">${originalTotalPrice.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Total</span>
                      <span className="text-2xl font-bold text-blue-600">${totalPrice.toFixed(2)}</span>
                    </div>
                    {hasDiscount && displayOriginalPrice > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600 font-medium">
                          {hasGroupDiscount ? 'Discount' : 'Offer Discount'}
                        </span>
                        <span className="text-green-600 font-semibold">
                          -${(originalTotalPrice - totalPrice).toFixed(2)}
                        </span>
                      </div>
                    )}
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
                    disabled={isAdding || isInCart || isCustomizationSelected}
                  >
                    {isAdding ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Adding...</>
                    ) : isInCart ? (
                      <><Check className="w-5 h-5 mr-2" />Added to Cart</>
                    ) : isCustomizationSelected ? (
                      <><Palette className="w-5 h-5 mr-2" />Selected For Enquiry</>
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

