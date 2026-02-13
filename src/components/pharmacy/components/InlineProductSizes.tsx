import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabaseClient'
import { selectUserProfile } from '@/store/selectors/userSelectors'
import { useSelector } from 'react-redux'
import { Heart, ShoppingCart, Package, Plus, Minus, Check, Loader2, Palette, ExternalLink, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useCart } from '@/hooks/use-cart'
import { useToast } from '@/hooks/use-toast'
import { ProductDetails } from '../types/product.types'
import { WishlistItem } from '@/hooks/use-wishlist'
import { getProductEffectivePrice } from '@/services/productOfferService'

interface InlineProductSizesProps {
  product: ProductDetails | null
  wishlistItems: WishlistItem[]
  onAddToWishlist: (product: ProductDetails, sizeId?: string) => Promise<boolean>
  onRemoveFromWishlist: (productId: string, sizeId?: string) => Promise<boolean>
  isInWishlist: (productId: string, sizeId?: string) => boolean
  onClose: () => void
  onImageClick: (imageUrl: string) => void
}

export const InlineProductSizes = ({
  product,
  onAddToWishlist,
  onRemoveFromWishlist,
  isInWishlist,
  onClose,
  onImageClick
}: InlineProductSizesProps) => {
  const navigate = useNavigate()
  const [selectedSizes, setSelectedSizes] = useState<Record<string, { quantity: number; type: 'case' | 'unit' }>>({})
  const [isAdding, setIsAdding] = useState<Record<string, boolean>>({})
  const [fullProduct, setFullProduct] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [customizations, setCustomizations] = useState<Record<string, { enabled: boolean; text: string }>>({})
  const [productOffer, setProductOffer] = useState<{
    effectivePrice: number;
    discountPercent: number;
    offerBadge: string | null;
    hasOffer: boolean;
  } | null>(null)
  const { addToCart, cartItems } = useCart()
  const { toast } = useToast()
  const userProfile = useSelector(selectUserProfile)
  const userType = sessionStorage.getItem('userType')?.toLowerCase() || 'pharmacy'

  // Fetch complete product data with sizes when product changes
  useEffect(() => {
    const fetchProductWithSizes = async () => {
      if (!product) return

      setLoading(true)
      try {
        // Fetch Group Pricing Data
        const { data: groupData, error: fetchError } = await supabase
          .from("group_pricing")
          .select("*")

        if (fetchError) {
          console.error("Error fetching group pricing:", fetchError.message)
        }

        const { data: productData, error } = await supabase
          .from("products")
          .select("*, product_sizes(*)")
          .eq("id", product.id)
          .single()

        if (error) throw error

        let ID = userProfile?.id

        // Map the product with pricing
        const mappedProduct: ProductDetails = {
          id: productData.id,
          name: productData.name,
          description: productData.description || "",
          price: productData.base_price || 0,
          base_price: productData.base_price || 0,
          category: productData.category || "",
          subcategory: productData.subcategory || "",
          shipping_cost: productData.shipping_cost || "",
          stock: productData.current_stock || 0,
          minOrder: productData.min_stock || 0,
          images: productData.images,
          image: productData.image_url || productData.image || "/placeholder.svg",
          image_url: productData.image_url || productData.image || "/placeholder.svg",
          offer: "",
          endsIn: "",
          sku: productData.sku,
          customizations: null,
          customization: {
            allowed: productData.customization?.allowed || false,
            options: productData.customization?.options || [],
            basePrice: productData.customization?.price || 0,
          },
          key_features: productData.key_features,
          squanence: productData.squanence,
          productId: productData.id.toString(),
          specifications: {
            safetyInfo: productData.description || "",
          },
          quantityPerCase: productData.quantity_per_case || 0,
          sizes: productData.product_sizes
            ?.filter((size: any) => {
              const groupIds = size.groupIds || []
              const disAllowGroupIds = size.disAllogroupIds || []
              const isDisallowed = groupData?.some(
                (group: any) => disAllowGroupIds.includes(group.id) && group.group_ids.includes(ID)
              )
              if (isDisallowed) return false
              if (groupIds.length === 0) return true
              return groupData?.some(
                (group: any) => group.group_ids.includes(ID) && groupIds.includes(group.id)
              )
            })
            .map((size: any) => {
              let newPrice = size.price
              const applicableGroup = groupData?.find(
                (group: any) =>
                  group.group_ids.includes(ID) &&
                  group.product_arrayjson.some((product: any) => product.product_id === size.id)
              )
              if (applicableGroup) {
                const groupProduct = applicableGroup.product_arrayjson.find(
                  (product: any) => product.product_id === size.id
                )
                if (groupProduct) {
                  const parsed = parseFloat(groupProduct.new_price)
                  newPrice = (parsed > 0) ? parsed : size.price
                }
              }
              return {
                id: size.id,
                size_value: size.size_value,
                size_unit: size.size_unit,
                rolls_per_case: size.rolls_per_case,
                sizeSquanence: size.sizeSquanence,
                price: newPrice,
                originalPrice: size.price === newPrice ? 0 : size.price,
                sku: size.sku || "",
                unitToggle: productData?.unitToggle,
                key_features: size.key_features || "",
                squanence: size.squanence || "",
                quantity_per_case: size.quantity_per_case,
                pricePerCase: size.price_per_case,
                price_per_case: size.price_per_case,
                stock: size.stock,
                image: size.image || "",
                shipping_cost: Number(size.shipping_cost),
                case: size.case,
                unit: size.unit,
                groupIds: size.groupIds || [],
              }
            })
            .sort((a: any, b: any) => a.sizeSquanence - b.sizeSquanence) || [],
        }

        setFullProduct(mappedProduct)

        // Load product offers
        if (product.id) {
          getProductEffectivePrice(product.id).then(offerData => {
            if (offerData && offerData.hasOffer) {
              console.log("InlineProductSizes - Product has offer:", offerData);
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
      } catch (error) {
        console.error("Error fetching product:", error)
        toast({
          title: "Error",
          description: "Failed to fetch product details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProductWithSizes()
  }, [product?.id, userProfile?.id])

  if (!product) return null

  const displayProduct = fullProduct || product

  const getImageUrl = (image?: string) => {
    const basePath = "https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/"
    if (image) {
      if (image.startsWith("http")) return image
      return basePath + image
    }
    if (displayProduct.images && displayProduct.images.length > 0) {
      const img = displayProduct.images[0]
      if (img.startsWith("http")) return img
      return basePath + img
    }
    return "/placeholder.svg"
  }

  const getSizeImageUrl = (size: any) => {
    const basePath = "https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/"
    
    // First try size-specific image
    if (size.image) {
      if (size.image.startsWith("http")) return size.image
      return basePath + size.image
    }
    
    // Fallback to product images
    if (displayProduct.images && displayProduct.images.length > 0) {
      const img = displayProduct.images[0]
      if (img.startsWith("http")) return img
      return basePath + img
    }
    
    // Fallback to product main image
    if (displayProduct.image_url) {
      if (displayProduct.image_url.startsWith("http")) return displayProduct.image_url
      return basePath + displayProduct.image_url
    }
    
    return "/placeholder.svg"
  }

  const handleQuantityChange = (sizeId: string, change: number) => {
    setSelectedSizes(prev => {
      const current = prev[sizeId] || { quantity: 1, type: 'case' }
      const newQuantity = Math.max(1, current.quantity + change)
      return {
        ...prev,
        [sizeId]: { ...current, quantity: newQuantity }
      }
    })
  }

  const handleCustomizationToggle = (sizeId: string, enabled: boolean) => {
    setCustomizations(prev => ({
      ...prev,
      [sizeId]: { ...prev[sizeId], enabled, text: prev[sizeId]?.text || '' }
    }))
  }

  const handleCustomizationTextChange = (sizeId: string, text: string) => {
    setCustomizations(prev => ({
      ...prev,
      [sizeId]: { ...prev[sizeId], enabled: prev[sizeId]?.enabled || false, text }
    }))
  }

  const handleAddToCart = async (size: any) => {
    const sizeId = size.id
    const selection = selectedSizes[sizeId] || { quantity: 1, type: 'case' }
    const customization = customizations[sizeId] || { enabled: false, text: '' }
    
    if (size.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: "This size is currently out of stock",
        variant: "destructive"
      })
      return
    }

    setIsAdding(prev => ({ ...prev, [sizeId]: true }))
    
    try {
      // Always use case price - unit price is just for reference
      const currentPrice = size.price
      
      // Calculate customization price if enabled
      const customizationPrice = customization.enabled && displayProduct.customization?.allowed 
        ? (displayProduct.customization.basePrice || 0) * selection.quantity
        : 0
      
      const totalPrice = (currentPrice * selection.quantity) + customizationPrice

      const cartItem = {
        productId: displayProduct.id.toString(),
        name: `${displayProduct.name}${customization.enabled ? ' (Customized)' : ''}`,
        sku: displayProduct.sku || size.sku || "",
        price: totalPrice,
        image: getImageUrl(size.image),
        shipping_cost: size.shipping_cost || 0,
        sizes: [{
          id: sizeId,
          size_value: size.size_value,
          size_unit: size.size_unit,
          price: currentPrice,
          quantity: selection.quantity,
          sku: size.sku || "",
          total_price: totalPrice,
          shipping_cost: size.shipping_cost || 0,
          type: "case" // Always case - unit is just for reference
        }],
        quantity: selection.quantity,
        customizations: customization.enabled ? {
          customization_enabled: 'true',
          customization_text: customization.text,
          customization_price: (displayProduct.customization?.basePrice || 0).toString()
        } : {},
        notes: customization.enabled ? `Customization: ${customization.text}` : ''
      }

      const success = await addToCart(cartItem)
      
      if (success) {
        toast({
          title: "✅ Added to Cart",
          description: `${displayProduct.name} ${size.size_value} ${size.size_unit}${customization.enabled ? ' with customization' : ''} added!`,
        })
        // Reset quantity and customization after adding
        setSelectedSizes(prev => ({
          ...prev,
          [sizeId]: { ...prev[sizeId], quantity: 1 }
        }))
        setCustomizations(prev => ({
          ...prev,
          [sizeId]: { enabled: false, text: '' }
        }))
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive"
      })
    } finally {
      setIsAdding(prev => ({ ...prev, [sizeId]: false }))
    }
  }

  const handleWishlistToggle = async (sizeId?: string) => {
    const productIdStr = displayProduct.id.toString()
    if (isInWishlist(productIdStr, sizeId)) {
      await onRemoveFromWishlist(productIdStr, sizeId)
    } else {
      await onAddToWishlist(displayProduct, sizeId)
    }
  }

  const isInCart = (sizeId: string) => {
    const productIdStr = displayProduct.id.toString()
    return cartItems.some(
      cartItem => cartItem.productId === productIdStr && 
      cartItem.sizes?.some((s: any) => s.id === sizeId)
    )
  }

  return (
    <div className="w-full bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl sm:rounded-2xl p-3 sm:p-6 mb-4 sm:mb-6 shadow-lg">
      {/* Back to Category Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="text-blue-700 hover:text-blue-800 hover:bg-blue-100 -ml-1 sm:-ml-2 mb-3 sm:mb-4 gap-1 sm:gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
      >
        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        Back to {displayProduct.category || "Products"}
      </Button>

      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Product Info */}
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div 
            className="relative w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-lg sm:rounded-xl overflow-hidden border-2 border-blue-200 cursor-pointer hover:shadow-md hover:border-blue-400 transition-all group flex-shrink-0"
            onClick={() => navigate(`/${userType}/product/${displayProduct.id}`)}
            title="Click to view full product page"
          >
            <img
              src={getImageUrl(displayProduct.images[0])}
              alt={displayProduct.name}
              className="w-full h-full object-contain p-1.5 sm:p-2 group-hover:scale-110 transition-transform"
              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
            />
            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center">
              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 
              className="text-base sm:text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors line-clamp-2 sm:line-clamp-none"
              onClick={() => navigate(`/${userType}/product/${displayProduct.id}`)}
              title="Click to view full product page"
            >
              {displayProduct.name}
            </h2>
            <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] sm:text-sm border-blue-300 text-blue-700 px-1.5 sm:px-2.5 py-0 sm:py-0.5">
                {displayProduct.category}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleWishlistToggle()}
                className="p-0.5 sm:p-1 h-auto"
              >
                <Heart 
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    isInWishlist(displayProduct.id.toString()) 
                      ? 'text-red-500 fill-red-500' 
                      : 'text-gray-400 hover:text-red-500'
                  }`} 
                />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Action Buttons - Mobile: Row below, Desktop: Right side */}
        <div className="flex items-center gap-2 justify-end sm:justify-start">
          {/* View Full Page Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/${userType}/product/${displayProduct.id}`)}
            className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
          >
            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
            View Full Page
          </Button>
        </div>
      </div>

      {/* Sizes Grid */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-sm sm:text-lg font-semibold text-gray-800 flex items-center gap-1.5 sm:gap-2">
          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          Available Sizes
        </h3>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-gray-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="animate-pulse space-y-2 sm:space-y-3">
                    <div className="aspect-square bg-gray-200 rounded-lg"></div>
                    <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-7 sm:h-8 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayProduct.sizes && displayProduct.sizes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {displayProduct.sizes.map((size) => {
              const sizeId = size.id
              const selection = selectedSizes[sizeId] || { quantity: 1, type: 'case' }
              const customization = customizations[sizeId] || { enabled: false, text: '' }
              
              // Check for group pricing discount OR product offer discount
              const hasGroupDiscount = size.originalPrice > 0 && size.originalPrice > size.price
              const hasOfferDiscount = productOffer?.hasOffer && productOffer.discountPercent > 0
              const hasDiscount = hasGroupDiscount || hasOfferDiscount
              const discountPercent = hasOfferDiscount 
                ? productOffer.discountPercent 
                : (hasGroupDiscount ? Math.round((1 - size.price / size.originalPrice) * 100) : 0)
              
              // Calculate case price with offer discount applied
              const originalCasePrice = size.price
              const casePrice = hasOfferDiscount 
                ? originalCasePrice * (1 - productOffer.discountPercent / 100)
                : originalCasePrice
              
              const unitsPerCase = size.quantity_per_case || 0
              const unitPrice = unitsPerCase > 0 ? casePrice / unitsPerCase : 0
              const customizationPrice = customization.enabled && displayProduct.customization?.allowed 
                ? (displayProduct.customization.basePrice || 0) * selection.quantity
                : 0
              const totalPrice = (casePrice * selection.quantity) + customizationPrice
              const isOutOfStock = size.stock <= 0
              const sizeInCart = isInCart(sizeId)

              return (
                <Card key={sizeId} className={`${sizeInCart ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'} ${isOutOfStock ? 'opacity-60' : ''} bg-white rounded-lg sm:rounded-xl transition-all hover:shadow-md overflow-hidden`}>
                  <CardContent className="p-3 sm:p-4 min-w-0">
                    {/* Vertical Layout for all screens */}
                    <div className="flex flex-col gap-3">
                      {/* Product Image - Full width, square aspect ratio */}
                      <div 
                        className="relative w-full aspect-square bg-gray-50 rounded-lg overflow-hidden cursor-pointer group"
                        onClick={() => navigate(`/${userType}/product/${displayProduct.id}/${sizeId}`)}
                        title="Click to view full product details"
                      >
                        <img
                          src={getSizeImageUrl(size)}
                          alt={`${size.size_value} ${size.size_unit}`}
                          className="w-full h-full object-contain p-3 sm:p-4 group-hover:scale-105 transition-transform"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                        />
                        
                        {/* Hover overlay with icon */}
                        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors flex items-center justify-center">
                          <ExternalLink className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 opacity-0 group-hover:opacity-70 transition-opacity" />
                        </div>
                        
                        {/* Discount Badge */}
                        {hasDiscount && discountPercent > 5 && (
                          <Badge className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-red-500 text-white text-[8px] sm:text-[10px] px-1 sm:px-1.5">
                            {discountPercent}% OFF
                          </Badge>
                        )}
                        
                        {/* In Cart Badge */}
                        {sizeInCart && (
                          <Badge className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-blue-500 text-white text-[8px] sm:text-[10px] px-1 sm:px-1.5">
                            <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" /> In Cart
                          </Badge>
                        )}
                        
                        {/* Wishlist - Hidden on mobile in image, shown elsewhere */}
                        <button
                          className={`absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${
                            isInWishlist(displayProduct.id.toString(), sizeId) 
                              ? 'bg-red-50 text-red-500' 
                              : 'bg-white/80 text-gray-400 hover:text-red-500'
                          }`}
                          onClick={(e) => { e.stopPropagation(); handleWishlistToggle(sizeId) }}
                        >
                          <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isInWishlist(displayProduct.id.toString(), sizeId) ? 'fill-current' : ''}`} />
                        </button>
                        
                        {/* Out of Stock Overlay */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] sm:text-xs">Out of Stock</Badge>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        {/* Product Name + Size */}
                        <div 
                          className="mb-1.5 sm:mb-2 cursor-pointer hover:text-blue-600"
                          onClick={() => navigate(`/${userType}/product/${displayProduct.id}/${sizeId}`)}
                          title={`${displayProduct.name} – ${size.size_value} ${size.size_unit}`}
                        >
                          <p className="font-semibold text-blue-600 text-sm sm:text-base line-clamp-2">
                            {size.size_value} {size.size_unit}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2 break-words uppercase">
                            {displayProduct.name}
                          </p>
                        </div>

                        {/* SKU */}
                        {size.sku && (
                          <p className="text-[9px] sm:text-[10px] text-gray-400 mb-1 sm:mb-2">SKU: {size.sku}</p>
                        )}

                        {/* Offer Badge */}
                        {hasOfferDiscount && productOffer?.offerBadge && (
                          <div className="mb-1.5 sm:mb-2">
                            <Badge className="bg-red-500 text-white text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5">
                              🎁 {productOffer.offerBadge}
                            </Badge>
                          </div>
                        )}

                        {/* Case Price - Large & Bold */}
                        <div className="mb-0.5 sm:mb-1 flex flex-wrap items-baseline gap-0.5 sm:gap-1">
                          {/* Show original price crossed out if there's a discount */}
                          {hasDiscount && (
                            <span className="text-sm sm:text-base text-gray-400 line-through">${originalCasePrice.toFixed(2)}</span>
                          )}
                          {/* Show discounted or regular price */}
                          <span className={`text-base sm:text-xl font-bold ${hasDiscount ? 'text-green-600' : 'text-gray-900'}`}>
                            ${casePrice.toFixed(2)}
                          </span>
                          <span className="text-[10px] sm:text-sm text-gray-500">/ case</span>
                        </div>
                        
                        {/* Show savings text */}
                        {hasDiscount && discountPercent > 0 && (
                          <p className="text-[9px] sm:text-xs text-red-600 font-semibold mb-1">
                            Save {discountPercent}% • ${(originalCasePrice * discountPercent / 100).toFixed(2)} off
                          </p>
                        )}

                        {/* Units per Case + Unit Price */}
                        {unitsPerCase > 0 && (
                          <div className="flex flex-wrap items-center text-[10px] sm:text-xs text-gray-500 mb-1.5 sm:mb-2 gap-x-0.5 sm:gap-x-1">
                            <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 text-gray-400 shrink-0" />
                            <span className="whitespace-nowrap">{unitsPerCase} units/case</span>
                            <span>·</span>
                            <span className="whitespace-nowrap">${unitPrice.toFixed(2)}/unit</span>
                          </div>
                        )}

                        {/* Stock Status */}
                        <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-3">
                          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          <span className={`text-[10px] sm:text-xs font-medium ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
                            {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                          </span>
                          {!isOutOfStock && size.stock < 10 && (
                            <span className="text-[10px] sm:text-xs text-amber-600">({size.stock} left)</span>
                          )}
                        </div>

                        {!isOutOfStock && (
                          <>
                            {/* Quantity + Add to Cart */}
                            <div className="flex flex-col gap-2 mt-auto">
                              {/* Quantity Selector - Full width */}
                              <div className="flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-10 sm:h-9 sm:w-12 rounded-l-lg rounded-r-none hover:bg-gray-100 p-0"
                                  onClick={() => handleQuantityChange(sizeId, -1)}
                                  disabled={selection.quantity <= 1}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-12 sm:w-14 text-center font-semibold text-sm">{selection.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-10 sm:h-9 sm:w-12 rounded-r-lg rounded-l-none hover:bg-gray-100 p-0"
                                  onClick={() => handleQuantityChange(sizeId, 1)}
                                  disabled={selection.quantity >= size.stock}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>

                              {/* Add to Cart - Full width */}
                              <Button
                                className="w-full h-9 sm:h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs sm:text-sm"
                                onClick={() => handleAddToCart(size)}
                                disabled={isAdding[sizeId] || sizeInCart}
                              >
                                {isAdding[sizeId] ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : sizeInCart ? (
                                  <><Check className="w-4 h-4 mr-1.5" />Added</>
                                ) : (
                                  <><ShoppingCart className="w-4 h-4 mr-1.5" />Add to Cart</>
                                )}
                              </Button>
                            </div>

                            {/* Total - Show when quantity > 1 */}
                            {selection.quantity > 1 && (
                              <div className="text-right text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
                                Total: <span className="font-semibold text-gray-700">${totalPrice.toFixed(2)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Customization Option - Full width below on mobile */}
                    {!isOutOfStock && displayProduct.customization?.allowed && (
                      <div className="mt-2 sm:mt-3 p-2 sm:p-2.5 bg-purple-50 rounded-md sm:rounded-lg border border-purple-100">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Checkbox
                            id={`customize-${sizeId}`}
                            checked={customization.enabled}
                            onCheckedChange={(checked) => handleCustomizationToggle(sizeId, checked as boolean)}
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                          />
                          <Label htmlFor={`customize-${sizeId}`} className="text-[10px] sm:text-xs font-medium text-purple-700 cursor-pointer flex items-center gap-0.5 sm:gap-1">
                            <Palette className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            Add Customization
                            {displayProduct.customization.basePrice > 0 && (
                              <span className="text-purple-500">(+${displayProduct.customization.basePrice.toFixed(2)}/unit)</span>
                            )}
                          </Label>
                        </div>
                        {customization.enabled && (
                          <Input
                            placeholder="Enter customization details..."
                            value={customization.text}
                            onChange={(e) => handleCustomizationTextChange(sizeId, e.target.value)}
                            className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs h-7 sm:h-8 border-purple-200"
                          />
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
            <p className="text-gray-500 text-sm sm:text-base">No sizes available for this product</p>
          </div>
        )}
      </div>
    </div>
  )
}