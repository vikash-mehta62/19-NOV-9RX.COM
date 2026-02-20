import { useState, useEffect } from 'react'
import { supabase } from '@/supabaseClient'
import { selectUserProfile } from '@/store/selectors/userSelectors'
import { useSelector } from 'react-redux'
import { X, Heart, ShoppingCart, Package, Truck, Plus, Minus, Check, Loader2, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCart } from '@/hooks/use-cart'
import { useToast } from '@/hooks/use-toast'
import { ProductDetails } from '../types/product.types'
import { WishlistItem } from '@/hooks/use-wishlist'

interface ProductSizesPanelProps {
  product: ProductDetails | null
  isOpen: boolean
  onClose: () => void
  wishlistItems: WishlistItem[]
  onAddToWishlist: (product: ProductDetails, sizeId?: string) => Promise<boolean>
  onRemoveFromWishlist: (productId: string, sizeId?: string) => Promise<boolean>
  isInWishlist: (productId: string, sizeId?: string) => boolean
}

export const ProductSizesPanel = ({
  product,
  isOpen,
  onClose,
  wishlistItems,
  onAddToWishlist,
  onRemoveFromWishlist,
  isInWishlist
}: ProductSizesPanelProps) => {
  const [selectedSizes, setSelectedSizes] = useState<Record<string, { quantity: number; type: 'case' | 'unit' }>>({})
  const [isAdding, setIsAdding] = useState<Record<string, boolean>>({})
  const [fullProduct, setFullProduct] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [imageZoom, setImageZoom] = useState(1)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const { addToCart, cartItems } = useCart()
  const { toast } = useToast()
  const userProfile = useSelector(selectUserProfile)

  // Keyboard controls for fullscreen image viewer
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!fullscreenImage) return

      switch (e.key) {
        case 'Escape':
          handleCloseFullscreen()
          break
      }
    }

    if (fullscreenImage) {
      document.addEventListener('keydown', handleKeyPress)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      document.body.style.overflow = 'unset'
    }
  }, [fullscreenImage])

  // Fetch complete product data with sizes when panel opens
  useEffect(() => {
    const fetchProductWithSizes = async () => {
      if (!product || !isOpen) return

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
          .select("*, product_sizes!inner(*)")
          .eq("id", product.id)
          .eq("product_sizes.is_active", true) // Only fetch active sizes
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
  }, [product?.id, isOpen, userProfile?.id])

  if (!product || !isOpen) return null

  const displayProduct = fullProduct || product

  const getImageUrl = (image?: string) => {
    const basePath = "https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/"
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
    const basePath = "https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/"
    
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

  const handleImageClick = (imageUrl: string) => {
    setFullscreenImage(imageUrl)
    setImageZoom(1)
    setImagePosition({ x: 0, y: 0 })
  }

  const handleCloseFullscreen = () => {
    setFullscreenImage(null)
    setImageZoom(1)
    setImagePosition({ x: 0, y: 0 })
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.2, 3))
  }

  const handleZoomOut = () => {
    setImageZoom(prev => {
      const newZoom = Math.max(prev - 0.2, 0.5)
      // Reset position when zooming out to 1x or less
      if (newZoom <= 1) {
        setImagePosition({ x: 0, y: 0 })
      }
      return newZoom
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      e.preventDefault()
      setIsDragging(true)
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      e.preventDefault()
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (imageZoom > 1 && e.touches.length === 1) {
      e.preventDefault()
      setIsDragging(true)
      const touch = e.touches[0]
      setDragStart({
        x: touch.clientX - imagePosition.x,
        y: touch.clientY - imagePosition.y
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && imageZoom > 1 && e.touches.length === 1) {
      e.preventDefault()
      const touch = e.touches[0]
      setImagePosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      })
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
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

  const handleTypeChange = (sizeId: string, type: 'case' | 'unit') => {
    setSelectedSizes(prev => ({
      ...prev,
      [sizeId]: { ...prev[sizeId], type }
    }))
  }

  const handleAddToCart = async (size: any) => {
    const sizeId = size.id
    const selection = selectedSizes[sizeId] || { quantity: 1, type: 'case' }
    
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
      const currentPrice = selection.type === 'case' ? size.price : size.price_per_case
      const totalPrice = currentPrice * selection.quantity

      const cartItem = {
        productId: displayProduct.id,
        name: displayProduct.name,
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
          type: selection.type
        }],
        quantity: selection.quantity,
        customizations: {},
        notes: ''
      }

      const success = await addToCart(cartItem)
      
      if (success) {
        toast({
          title: "✅ Added to Cart",
          description: `${displayProduct.name} ${size.size_value} ${size.size_unit} added!`,
        })
        // Reset quantity after adding
        setSelectedSizes(prev => ({
          ...prev,
          [sizeId]: { ...prev[sizeId], quantity: 1 }
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
    if (isInWishlist(displayProduct.id, sizeId)) {
      await onRemoveFromWishlist(displayProduct.id, sizeId)
    } else {
      await onAddToWishlist(displayProduct, sizeId)
    }
  }

  const isInCart = (sizeId: string) => {
    return cartItems.some(
      cartItem => cartItem.productId === displayProduct.id && 
      cartItem.sizes?.some((s: any) => s.id === sizeId)
    )
  }

  return (
    <>
      {/* Only show panel when no fullscreen image is open */}
      {!fullscreenImage && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={onClose}
          />
          
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-teal-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Product Sizes</h2>
                <p className="text-blue-100 text-sm">Choose your preferred size</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Product Info */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex gap-3">
              <div 
                className="relative w-16 h-16 bg-white rounded-lg overflow-hidden border cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => handleImageClick(getImageUrl(displayProduct.image_url))}
              >
                <img
                  src={getImageUrl(displayProduct.image_url)}
                  alt={displayProduct.name}
                  className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 line-clamp-2">{displayProduct.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {displayProduct.category}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleWishlistToggle()}
                    className="p-1 h-auto"
                  >
                    <Heart 
                      className={`w-4 h-4 ${
                        isInWishlist(displayProduct.id) 
                          ? 'text-red-500 fill-red-500' 
                          : 'text-gray-400 hover:text-red-500'
                      }`} 
                    />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sizes List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-gray-200">
                      <CardContent className="p-4">
                        <div className="animate-pulse space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-8 bg-gray-200 rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : displayProduct.sizes && displayProduct.sizes.length > 0 ? (
                displayProduct.sizes.map((size) => {
                  const sizeId = size.id
                  const selection = selectedSizes[sizeId] || { quantity: 1, type: 'case' }
                  const currentPrice = selection.type === 'case' ? size.price : size.price_per_case
                  const totalPrice = currentPrice * selection.quantity
                  const stockStatus = size.stock <= 0 ? "Out of Stock" : size.stock < 10 ? "Low Stock" : "In Stock"
                  const isOutOfStock = size.stock <= 0
                  const sizeInCart = isInCart(sizeId)
                  const hasDiscount = size.originalPrice > 0 && size.originalPrice > size.price
                  const discountPercent = hasDiscount ? Math.round((1 - size.price / size.originalPrice) * 100) : 0

                  return (
                    <Card key={sizeId} className={`${sizeInCart ? 'border-blue-400 bg-blue-50' : 'border-gray-200'} ${isOutOfStock ? 'opacity-60' : ''}`}>
                      <CardContent className="p-4">
                        {/* Size Header with Image */}
                        <div className="flex items-start gap-3 mb-3">
                          {/* Size Image */}
                          <div 
                            className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border cursor-pointer hover:shadow-md transition-shadow group"
                            onClick={() => handleImageClick(getSizeImageUrl(size))}
                          >
                            <img
                              src={getSizeImageUrl(size)}
                              alt={`${size.size_value} ${size.size_unit}`}
                              className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>

                          {/* Size Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">
                                {size.size_value} {size.size_unit}
                              </h4>
                              {hasDiscount && discountPercent > 5 && (
                                <Badge className="bg-red-500 text-white text-xs">
                                  {discountPercent}% OFF
                                </Badge>
                              )}
                              {sizeInCart && (
                                <Badge className="bg-blue-500 text-white text-xs">
                                  <Check className="w-3 h-3 mr-1" />
                                  In Cart
                                </Badge>
                              )}
                            </div>
                            
                            {size.sku && (
                              <p className="text-xs text-gray-500 mt-1">SKU: {size.sku}</p>
                            )}
                            
                            {size.quantity_per_case > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Package className="w-3 h-3 text-purple-500" />
                                <span className="text-xs text-gray-600">
                                  {size.quantity_per_case}/case
                                </span>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleWishlistToggle(sizeId)}
                            className="p-1 h-auto"
                          >
                            <Heart 
                              className={`w-4 h-4 ${
                                isInWishlist(displayProduct.id, sizeId) 
                                  ? 'text-red-500 fill-red-500' 
                                  : 'text-gray-400 hover:text-red-500'
                              }`} 
                            />
                          </Button>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-lg font-bold text-emerald-600">
                            ${currentPrice.toFixed(2)}
                          </span>
                          {hasDiscount && (
                            <span className="text-sm text-gray-400 line-through">
                              ${size.originalPrice.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Stock Status */}
                        <div className={`flex items-center gap-1 mb-3 text-sm ${
                          stockStatus === "In Stock" ? "text-green-600" : 
                          stockStatus === "Low Stock" ? "text-amber-600" : "text-red-600"
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            stockStatus === "In Stock" ? "bg-green-500" : 
                            stockStatus === "Low Stock" ? "bg-amber-500" : "bg-red-500"
                          }`}></div>
                          {stockStatus}
                        </div>

                        {!isOutOfStock && (
                          <>
                            {/* Case/Unit Toggle */}
                            {(size.case || size.unit) && (
                              <div className="flex gap-2 mb-3">
                                {size.case && (
                                  <Button
                                    variant={selection.type === "case" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleTypeChange(sizeId, "case")}
                                    className={`flex-1 h-8 text-xs ${
                                      selection.type === "case" 
                                        ? "bg-blue-600 hover:bg-blue-700" 
                                        : "hover:bg-blue-50"
                                    }`}
                                  >
                                    Case
                                  </Button>
                                )}
                                {size.unit && (
                                  <Button
                                    variant={selection.type === "unit" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleTypeChange(sizeId, "unit")}
                                    className={`flex-1 h-8 text-xs ${
                                      selection.type === "unit" 
                                        ? "bg-blue-600 hover:bg-blue-700" 
                                        : "hover:bg-blue-50"
                                    }`}
                                  >
                                    Unit
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Quantity Controls */}
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded hover:bg-white"
                                  onClick={() => handleQuantityChange(sizeId, -1)}
                                  disabled={selection.quantity <= 1}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-8 text-center text-sm font-semibold">
                                  {selection.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded hover:bg-white"
                                  onClick={() => handleQuantityChange(sizeId, 1)}
                                  disabled={selection.quantity >= size.stock}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Total</p>
                                <p className="text-sm font-bold text-emerald-700">
                                  ${totalPrice.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {/* Add to Cart Button */}
                            <Button
                              className="w-full h-9 text-sm bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleAddToCart(size)}
                              disabled={isAdding[sizeId] || sizeInCart}
                            >
                              {isAdding[sizeId] ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Adding...
                                </>
                              ) : sizeInCart ? (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Added to Cart
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Add to Cart
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        {/* Free Delivery */}
                        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-blue-600">
                          <Truck className="w-3 h-3" />
                          <span>Free Delivery Available</span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No sizes available for this product</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
        </>
      )}

      {/* Simple Gallery Image Viewer */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black z-[100] flex items-center justify-center"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseFullscreen}
            className="absolute top-4 right-4 z-10 bg-white/10 text-white hover:bg-white/20 w-12 h-12"
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Image Container */}
          <div 
            className="relative w-full h-full flex items-center justify-center p-4 overflow-hidden"
            onWheel={(e) => {
              e.preventDefault()
              if (e.deltaY < 0) {
                handleZoomIn()
              } else {
                handleZoomOut()
              }
            }}
          >
            <img
              src={fullscreenImage}
              alt="Product Image"
              className={`max-w-full max-h-full object-contain gallery-image no-select ${isDragging ? 'dragging' : ''}`}
              style={{
                transform: `scale(${imageZoom}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  )
}