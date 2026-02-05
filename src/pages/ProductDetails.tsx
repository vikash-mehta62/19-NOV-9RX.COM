
"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import type { Product } from "@/types/product"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Package, Info, Layers, UserPlus, Loader2, ShoppingCart, Plus, Minus, Check, Gift, HelpCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import logo from "../assests/home/9rx_logo.png"
import { useCart } from "@/hooks/use-cart"
import { useSelector } from "react-redux"
import { RootState } from "@/store/store"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getProductEffectivePrice } from "@/services/productOfferService"

// Apply group pricing to sizes - SAME LOGIC AS PRODUCT SHOWCASE
const applyGroupPricingToSizes = (sizes: any[], groupData: any[], userId: string) => {
  return sizes.map((size) => {
    let newPrice = size.price;

    // Find applicable group
    const applicableGroup = groupData.find(
      (group: any) =>
        group.group_ids.includes(userId) &&
        group.product_arrayjson.some((p: any) => p.product_id === size.id)
    );

    if (applicableGroup) {
      const groupProduct = applicableGroup.product_arrayjson.find(
        (p: any) => p.product_id === size.id
      );

      if (groupProduct?.new_price) {
        newPrice = parseFloat(groupProduct.new_price);
      }
    }

    return {
      ...size,
      price: newPrice,
      originalPrice: size.price !== newPrice ? size.price : 0,
    };
  });
};

// Image Loading Component
const ImageWithLoader = ({
  src,
  alt,
  className = "",
  onLoad,
  onError,
  showLabel = false,
  label = "",
}: {
  src: string
  alt: string
  className?: string
  onLoad?: () => void
  onError?: () => void
  showLabel?: boolean
  label?: string
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs text-gray-500">Loading...</span>
          </div>
        </div>
      )}

      <img
        src={hasError ? "/placeholder.svg" : src}
        alt={alt}
        className={`${className} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        style={{ display: isLoading ? "none" : "block" }}
      />

      {showLabel && label && !isLoading && (
        <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded text-center truncate">
          {label}
        </div>
      )}
    </div>
  )
}

// Thumbnail Image Component
const ThumbnailImage = ({
  image,
  isSelected,
  onClick,
}: {
  image: { url: string; label: string; type: string }
  isSelected: boolean
  onClick: () => void
}) => {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div
      className={`aspect-square bg-white rounded-lg p-2 cursor-pointer border-2 transition-all duration-200 hover:shadow-md relative ${
        isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-blue-300"
      }`}
      onClick={onClick}
    >
      {isLoading && (
        <div className="absolute inset-2 flex items-center justify-center bg-gray-100 rounded">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        </div>
      )}

      <img
        src={image.url || "/placeholder.svg"}
        alt={image.label}
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = "/placeholder.svg"
          setIsLoading(false)
        }}
      />

      {!isLoading && <div className="mt-1 text-xs text-center text-gray-600 truncate">{image.label}</div>}
    </div>
  )
}

const ProductDetails = () => {
  const { id, productId } = useParams()
  const actualId = productId || id // Support both /product/:id and /pharmacy/product/:productId
  const navigate = useNavigate()
  const { toast } = useToast()
  const { addToCart, cartItems } = useCart()
  const userProfile = useSelector((state: RootState) => state.user.profile)
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true'
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string>("")
  const [selectedSizes, setSelectedSizes] = useState<Map<string, number>>(new Map()) // Map of size.id -> quantity
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({})
  const [addingToCart, setAddingToCart] = useState(false)
  const [productOffer, setProductOffer] = useState<{
    effectivePrice: number
    discountPercent: number
    offerBadge: string | null
    hasOffer: boolean
  } | null>(null)

  const getSupabaseImageUrl = async (path: string): Promise<string> => {
    if (!path || path === "/placeholder.svg") return "/placeholder.svg"
    if (path.startsWith("http")) return path

    // Check if we already have this URL cached
    if (imageUrls[path]) return imageUrls[path]

    try {
      setLoadingImages((prev) => ({ ...prev, [path]: true }))

      const { data } = supabase.storage.from("product-images").getPublicUrl(path)

      if (!data?.publicUrl) {
        console.error("Error getting image URL")
        return "/placeholder.svg"
      }

      // Cache the URL
      setImageUrls((prev) => ({ ...prev, [path]: data.publicUrl }))
      return data.publicUrl
    } catch (error) {
      console.error("Error processing image:", error)
      return "/placeholder.svg"
    } finally {
      setLoadingImages((prev) => ({ ...prev, [path]: false }))
    }
  }

  // Get price for a size - Apply offer discount if available
  const getSizePrice = (size: any) => {
    if (!isLoggedIn) return null
    
    let basePrice = size.price || 0;
    
    // Apply offer discount if product has an active offer
    if (productOffer?.hasOffer && productOffer.discountPercent > 0) {
      basePrice = basePrice * (1 - productOffer.discountPercent / 100);
    }
    
    return basePrice;
  }

  // Handle add to cart - Multiple sizes (Same logic as ProductCard)
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

    if (selectedSizes.size === 0) {
      toast({
        title: "Select Size",
        description: "Please select at least one size before adding to cart",
        variant: "destructive"
      })
      return
    }

    setAddingToCart(true)

    try {
      const imageUrl = imageUrls[product!.image_url] || product!.image_url

      // Get all selected sizes with their quantities
      const updatedSizes = Array.from(selectedSizes.entries())
        .map(([sizeId, quantity]) => {
          const size = product!.sizes.find(s => s.id === sizeId)
          if (!size || quantity < 1) return null

          const price = getSizePrice(size) || 0

          return {
            id: size.id,
            size_value: size.size_value,
            size_unit: size.size_unit,
            price: price,
            quantity: quantity,
            sku: size.sku,
            total_price: price * quantity,
            shipping_cost: product!.shipping_cost || 0
          }
        })
        .filter(Boolean) as any[]

      // Calculate total price for all sizes
      const totalPrice = updatedSizes.reduce(
        (sum, size) => sum + size.price * size.quantity,
        0
      )

      // Get highest shipping cost
      const highestShippingCost = updatedSizes.reduce(
        (max, size) => (size.shipping_cost > max ? size.shipping_cost : max),
        0
      )

      // Create single cart item with multiple sizes (Same as ProductCard)
      const cartItem = {
        productId: product!.id.toString(),
        name: product!.name,
        sku: product!.sku || "",
        price: totalPrice,
        image: imageUrl,
        shipping_cost: Number(highestShippingCost) || 0,
        sizes: updatedSizes,
        quantity: updatedSizes.reduce((total, size) => total + size.quantity, 0),
        customizations: {},
        notes: ''
      }

      console.log('Adding to cart:', cartItem)
      const success = await addToCart(cartItem)

      if (success) {
        toast({
          title: "✅ Added to Cart",
          description: `${product!.name} with ${selectedSizes.size} size(s) added successfully!`,
        })
        setSelectedSizes(new Map()) // Clear selections
      } else {
        throw new Error('Failed to add to cart')
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast({
        title: "Error",
        description: "Failed to add items to cart",
        variant: "destructive"
      })
    } finally {
      setAddingToCart(false)
    }
  }

  // Check if a size is already in cart
  const isSizeInCart = (sizeId: string) => {
    return cartItems.some(item => 
      item.productId === product?.id.toString() && 
      item.sizes.some((s: any) => s.id === sizeId)
    )
  }

  useEffect(() => {
    const fetchProduct = async () => {
      // Guard against undefined, null, empty string, or the literal string "undefined"
      if (!actualId || actualId === "undefined" || actualId === "null") {
        console.error("No valid product ID provided:", actualId)
        setLoading(false)
        return
      }

      try {
        console.log("Fetching product with ID or SKU:", actualId)

        // Try to fetch by ID first, then by SKU
        let productData, error;
        
        // Check if id is a UUID (contains hyphens)
        if (actualId.includes('-')) {
          const result = await supabase
            .from("products")
            .select("*, product_sizes(*)")
            .eq("id", actualId)
            .single()
          productData = result.data
          error = result.error
        } else {
          // Try by SKU
          const result = await supabase
            .from("products")
            .select("*, product_sizes(*)")
            .eq("sku", actualId)
            .single()
          productData = result.data
          error = result.error
        }

        if (error) {
          console.error("Error fetching product:", error)
          toast({
            title: "Error",
            description: "Product not found",
            variant: "destructive",
          })
          navigate("/")
          return
        }

        if (!productData) {
          console.error("No product data returned")
          toast({
            title: "Error",
            description: "Product not found",
            variant: "destructive",
          })
          navigate("/")
          return
        }

        // Map the product data properly according to the Product type
        const mappedProduct: Product = {
          id: productData.id,
          name: productData.name || "Unnamed Product",
          description: productData.description || "",
          base_price: productData.base_price || 0,
          category: productData.category || "",
          shipping_cost: productData.shipping_cost || 0,
          images: Array.isArray(productData.images) ? productData.images : [],
          image_url:  productData.images[0] || "/placeholder.svg",
          sku: productData.sku || "",
          key_features: productData.key_features || "",
          squanence: productData.squanence || "",
          created_at: productData.created_at,
          updated_at: productData.updated_at,
          current_stock: productData.current_stock || 0,
          min_stock: productData.min_stock || 0,
          reorder_point: productData.reorder_point || 0,
          quantity_per_case: productData.quantity_per_case || 0,
          customization: {
            allowed: productData.customization?.allowed || false,
            options: Array.isArray(productData.customization?.options) ? productData.customization.options : [],
            price: productData.customization?.price || 0,
          },
          sizes: Array.isArray(productData.product_sizes)
            ? productData.product_sizes.map((size) => ({
                id: size.id,
                product_id: size.product_id,
                size_value: size.size_value || "",
                size_unit: size.size_unit || "",
                sku: size.sku || "",
                price: size.price || 0,
                price_per_case: size.price_per_case || 0,
                stock: size.stock || 0,
                quantity_per_case: size.quantity_per_case || 0,
                image: size.image || "",
                created_at: size.created_at,
                updated_at: size.updated_at,
              }))
            : [],
        }

        console.log("Mapped product:", mappedProduct)
        setProduct(mappedProduct)

        // Process all image URLs
        const imagesToProcess = [
          mappedProduct.image_url,
          ...mappedProduct.sizes.filter((size) => size.image && size.image.trim() !== "").map((size) => size.image),
        ]

        // Load all images and cache their URLs
        const imagePromises = imagesToProcess.map(async (imagePath) => {
          if (imagePath && imagePath !== "/placeholder.svg") {
            const url = await getSupabaseImageUrl(imagePath)
            return { path: imagePath, url }
          }
          return { path: imagePath, url: imagePath }
        })

        const resolvedImages = await Promise.all(imagePromises)
        const urlMap: Record<string, string> = {}
        resolvedImages.forEach(({ path, url }) => {
          if (path) urlMap[path] = url
        })

        setImageUrls(urlMap)
        setSelectedImage(urlMap[mappedProduct.image_url] || mappedProduct.image_url)

        // Apply group pricing if logged in - SAME LOGIC AS PRODUCT SHOWCASE
        if (isLoggedIn && userProfile?.id && mappedProduct.sizes.length > 0) {
          const { data: groupData, error: groupErr } = await supabase
            .from("group_pricing")
            .select("*");

          if (!groupErr && groupData) {
            console.log("Applying group pricing to sizes:", groupData);
            mappedProduct.sizes = applyGroupPricingToSizes(
              mappedProduct.sizes,
              groupData,
              userProfile.id
            );
          }
        }

        setProduct(mappedProduct)

        // Fetch product offers
        try {
          const offerData = await getProductEffectivePrice(mappedProduct.id);
          if (offerData && offerData.hasOffer) {
            console.log("Product has active offer:", offerData);
            setProductOffer({
              effectivePrice: offerData.effectivePrice,
              discountPercent: offerData.discountPercent,
              offerBadge: offerData.offerBadge,
              hasOffer: offerData.hasOffer
            });
          }
        } catch (offerError) {
          console.error("Error fetching product offers:", offerError);
          // Continue without offers if there's an error
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

    fetchProduct()
  }, [actualId, navigate, toast, isLoggedIn, userProfile])

  const handleSizeClick = async (size: any) => {
    console.log("Size clicked:", size)
    
    // Toggle selection
    const newSelectedSizes = new Map(selectedSizes)
    if (newSelectedSizes.has(size.id)) {
      newSelectedSizes.delete(size.id)
    } else {
      newSelectedSizes.set(size.id, 1) // Default quantity 1
    }
    setSelectedSizes(newSelectedSizes)

    // Update image if size has one
    if (size.image && size.image.trim() !== "") {
      const imageUrl = imageUrls[size.image] || (await getSupabaseImageUrl(size.image))
      setSelectedImage(imageUrl)
    }
  }

  const updateSizeQuantity = (sizeId: string, quantity: number) => {
    if (quantity < 1) return
    const newSelectedSizes = new Map(selectedSizes)
    newSelectedSizes.set(sizeId, quantity)
    setSelectedSizes(newSelectedSizes)
  }

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl)
  }

  // Hide public navbar on dashboard routes (admin/pharmacy/group/hospital)
  const location = useLocation()
  const isDashboardRoute = /^(\/admin|\/pharmacy|\/group|\/hospital)\//.test(location.pathname)
  const topOffsetClass = isDashboardRoute ? "pt-0" : "pt-16"

  // Simple navbar for light backgrounds
  const LightNavbar = () => (
    <nav 
      className="fixed w-full top-0 z-50 bg-white/95 backdrop-blur-xl shadow-sm"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          <a href="/" aria-label="9RX Home" className="flex-shrink-0">
            <img
              src={logo}
              alt="9RX Logo"
              className="h-12 sm:h-12 w-auto"
            />
          </a>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 sm:px-6 rounded-xl shadow-lg shadow-blue-500/25 min-h-[40px] sm:min-h-[44px] text-sm sm:text-base"
            onClick={() => navigate('/login')}
          >
            Login
          </Button>
        </div>
      </div>
    </nav>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        {!isDashboardRoute && <LightNavbar />}
        
        {/* Enhanced Loading Header */}
        <div className={`bg-white/95 backdrop-blur-2xl border-b-2 border-gray-100 shadow-xl sticky top-0 z-40 ${topOffsetClass}`}>
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-8 w-80" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6">
            {/* Enhanced Image Loading Skeleton */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                <Skeleton className="aspect-square rounded-xl" />
              </div>
            </div>

            {/* Enhanced Details Loading Skeleton */}
            <div className="space-y-4">
              <Card className="shadow-sm border border-gray-200 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-20 w-full rounded" />
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-gray-200 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Skeleton className="h-2 w-2 rounded-full mt-1" />
                        <Skeleton className="h-4 w-full rounded" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Enhanced Size Cards Loading */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-6 w-40" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-white rounded-xl overflow-hidden border border-gray-200">
                  <div className="aspect-[4/3] bg-gray-50 p-4">
                    <Skeleton className="w-full h-full rounded" />
                  </div>
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-24" />
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Skeleton className="h-10 w-24 rounded-lg" />
                      <Skeleton className="h-10 flex-1 rounded-lg" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
          <Button onClick={() => {
            const userType = sessionStorage.getItem('userType')?.toLowerCase();
            if (userType === 'group') {
              navigate("/group/products");
            } else if (userType === 'admin') {
              navigate("/admin/products");
            } else if (userType === 'pharmacy') {
              navigate("/pharmacy/products");
            } else {
              navigate("/");
            }
          }} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  // Collect all available images with their resolved URLs
  const allImages = [
    {
      url: imageUrls[product.image_url] || product.image_url,
      originalPath: product.image_url,
      label: "Main Product",
      type: "main",
    },
    ...(product.sizes
      ?.filter((size) => size.image && size.image.trim() !== "")
      .map((size) => ({
        url: imageUrls[size.image] || size.image,
        originalPath: size.image,
        label: `${size.size_value} ${size.size_unit}`,
        type: "size",
        sizeId: size.id,
      })) || []),
  ]

return (
  <>
    {!isDashboardRoute && <LightNavbar />}

    <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 ${topOffsetClass}`}>
      {/* Enhanced Header with Modern Design & Micro-interactions */}
      <div className="bg-white/95 backdrop-blur-2xl border-b-2 border-gray-100 shadow-xl sticky top-0 z-40 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
        
        <div className="relative container mx-auto px-4 py-3">
          {/* Back Button with enhanced hover effect */}
          <Button
            variant="ghost"
            onClick={() => {
              const userType = sessionStorage.getItem('userType')?.toLowerCase();
              const category = product?.category;
              
              if (userType === 'group') {
                navigate("/group/products", { state: { selectedCategory: category } });
              } else if (userType === 'admin') {
                navigate("/admin/products", { state: { selectedCategory: category } });
              } else if (userType === 'pharmacy') {
                navigate("/pharmacy/products", { state: { selectedCategory: category } });
              } else {
                navigate("/products", { state: { selectedCategory: category } });
              }
            }}
            className="mb-2 hover:bg-gray-100/80 transition-all duration-300 rounded-xl group text-sm h-9 px-3 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 group-hover:scale-110 transition-all duration-300" />
            <span className="font-medium group-hover:text-blue-600 transition-colors duration-300">Back to {product?.category || "Products"}</span>
          </Button>

          {/* Product Info Section with enhanced layout */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left: Category + Product Name */}
            <div className="flex-1 space-y-3">
              {/* Category & Subcategory Badges with animations */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Offer Badge - Highest Priority */}
                {productOffer?.hasOffer && productOffer.offerBadge && (
                  <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 text-xs font-bold rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 animate-pulse">
                    🎁 {productOffer.offerBadge}
                  </Badge>
                )}
                {product.category && (
                  <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1 text-xs font-bold rounded-full shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                    {product.category}
                  </Badge>
                )}
                {/* Enhanced Subcategory badge */}
                {product.category && (
                  <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1 text-xs font-bold rounded-full shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                    {product.category.split(' ')[0]} Series
                  </Badge>
                )}
              </div>
              
              {/* Product name with better typography */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight text-gray-900 tracking-tight">
                {product.name}
              </h1>

              {/* Offer Savings Message */}
              {productOffer?.hasOffer && productOffer.discountPercent > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 px-4 py-2 rounded-lg">
                  <p className="text-sm font-semibold text-red-700">
                    🔥 Limited Time Offer: Save {productOffer.discountPercent}% on all sizes!
                  </p>
                </div>
              )}

              {/* Enhanced Additional Info Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                {product.sku && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors duration-200 cursor-help">
                          <Package className="w-3.5 h-3.5 text-gray-600" />
                          <span className="text-xs font-mono font-semibold text-gray-800">{product.sku}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Product SKU</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {product.quantity_per_case && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors duration-200 cursor-help">
                          <Layers className="w-3.5 h-3.5 text-purple-600" />
                          <span className="text-xs font-bold text-purple-700">{product.quantity_per_case}/case</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Units per case</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {product.sizes && product.sizes.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors duration-200 cursor-help">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-xs font-bold text-indigo-700">{product.sizes.length} Size{product.sizes.length > 1 ? 's' : ''}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Available size options</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>

            {/* Right: Enhanced Stock Status / Availability */}
            <div className="lg:text-right">
              <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="relative">
                  <div className="h-2.5 w-2.5 bg-green-500 rounded-full"></div>
                  <div className="absolute inset-0 h-2.5 w-2.5 bg-green-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-sm font-bold text-green-700">In Stock</span>
              </div>
              {!isLoggedIn && (
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  Login to view prices
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <div className="container mx-auto px-4 py-6">
        
        {/* ---------------- TOP: IMAGE LEFT | DESCRIPTION RIGHT ---------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 mb-4 lg:mb-8">
          
          {/* LEFT: ENHANCED MAIN PRODUCT IMAGE */}
          <div>
            <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl border border-gray-200 lg:sticky lg:top-24 relative overflow-hidden group">
              {/* Subtle background pattern */}
              <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.15)_1px,_transparent_0)] bg-[length:30px_30px]"></div>
              
              {/* Decorative gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <ImageWithLoader
                  src={selectedImage}
                  alt={product.name}
                  className="w-full h-auto object-contain max-h-[300px] lg:max-h-[420px] transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              
              {/* Image label with enhanced styling */}
              <div className="absolute bottom-4 left-4 right-4 bg-gradient-to-r from-black/80 to-black/60 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-xl text-center font-medium">
                Main Product Image
              </div>
            </div>
          </div>

          {/* RIGHT: DESCRIPTION & KEY FEATURES */}
          <div className="space-y-3 lg:space-y-6">

            {/* Enhanced Description */}
            {product.description && (
              <Card className="shadow-lg border border-gray-200 bg-white hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-5">
                  <h3 className="font-bold text-base flex items-center mb-3 text-gray-900 group-hover:text-emerald-600 transition-colors duration-300">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                      <Info className="w-4 h-4 text-white" />
                    </div>
                    Product Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {product.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Key Features */}
            {product.key_features && (
              <Card className="shadow-lg border border-gray-200 bg-white hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-5">
                  <h3 className="font-bold text-base flex items-center mb-4 text-gray-900 group-hover:text-purple-600 transition-colors duration-300">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                      <Layers className="w-4 h-4 text-white" />
                    </div>
                    Key Features
                  </h3>
                  <div className="space-y-3">
                    {product.key_features.split(",").map((feature, index) => (
                      <div key={index} className="flex items-start gap-3 group/item hover:bg-purple-50 p-2 rounded-lg transition-colors duration-200">
                        <div className="w-2 h-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mt-2 flex-shrink-0 group-hover/item:scale-125 transition-transform duration-200"></div>
                        <span className="text-gray-700 text-sm leading-relaxed">{feature.trim()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ---------------- VARIANT CARDS GRID - Each variant with its own image & price ---------------- */}
        <div className="pb-20 lg:pb-8">
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg flex items-center text-gray-900 group">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <span className="group-hover:text-purple-600 transition-colors duration-300">
                    Select Size & Add to Cart
                  </span>
                </h3>
                <Badge className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 text-sm px-3 py-1.5 rounded-full font-bold shadow-sm">
                  {product.sizes.length} Options
                </Badge>
              </div>

              {/* Grid of Variant Cards - B2B Medical Supply Design */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {product.sizes.map((size) => {
                  const quantity = selectedSizes.get(size.id) || 1
                  const price = getSizePrice(size) || 0
                  const originalPrice = size.price || 0 // Original price before offer
                  const inCart = isSizeInCart(size.id)
                  const sizeImage = size.image ? (imageUrls[size.image] || size.image) : (imageUrls[product.image_url] || product.image_url)
                  const isOutOfStock = size.stock <= 0
                  const unitsPerCase = size.quantity_per_case || 0
                  const unitPrice = unitsPerCase > 0 ? price / unitsPerCase : 0
                  
                  // Check for group pricing discount
                  const hasGroupDiscount = size.originalPrice > 0 && size.originalPrice > originalPrice
                  const groupDiscountPercent = hasGroupDiscount ? Math.round((1 - originalPrice / size.originalPrice) * 100) : 0
                  
                  // Check for offer discount
                  const hasOfferDiscount = productOffer?.hasOffer && productOffer.discountPercent > 0
                  const offerDiscountPercent = hasOfferDiscount ? productOffer.discountPercent : 0
                  
                  // Combined discount
                  const totalDiscountPercent = groupDiscountPercent + offerDiscountPercent
                  const hasAnyDiscount = hasGroupDiscount || hasOfferDiscount

                  return (
                    <Card
                      key={size.id}
                      className={`relative bg-white rounded-xl overflow-hidden transition-all duration-200 ${
                        inCart
                          ? "border-blue-400 ring-1 ring-blue-100"
                          : isOutOfStock
                          ? "border-gray-200 opacity-60"
                          : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                      }`}
                    >
                      {/* In Cart Badge */}
                      {inCart && (
                        <div className="absolute top-2 left-2 z-10">
                          <Badge className="bg-blue-500 text-white text-[10px] px-2 py-0.5">
                            <Check className="w-3 h-3 mr-1" /> In Cart
                          </Badge>
                        </div>
                      )}

                      {/* Discount Badge - Show offer or group discount */}
                      {!inCart && (
                        <>
                          {hasOfferDiscount && (
                            <div className="absolute top-2 left-2 z-10">
                              <Badge className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 shadow-md">
                                🎁 {offerDiscountPercent}% OFF
                              </Badge>
                            </div>
                          )}
                          {hasGroupDiscount && !hasOfferDiscount && groupDiscountPercent > 5 && (
                            <div className="absolute top-2 left-2 z-10">
                              <Badge className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5">
                                {groupDiscountPercent}% OFF
                              </Badge>
                            </div>
                          )}
                        </>
                      )}

                      {/* Product Image - Clickable */}
                      <div 
                        className="aspect-[4/3] bg-gray-50 p-4 cursor-pointer relative"
                        onClick={() => {
                          const userType = sessionStorage.getItem('userType')?.toLowerCase();
                          if (userType === 'admin') {
                            // For admin, just update the selected image instead of navigating
                            setSelectedImage(sizeImage);
                          } else if(userType === 'pharmacy') {
                            navigate(`/pharmacy/product/${product.id}/${size.id}`);
                          }
                        }}
                      >
                        <img
                          src={sizeImage}
                          alt={`${size.size_value} ${size.size_unit}`}
                          className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg"
                          }}
                        />
                        
                        {/* Out of Stock Overlay */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <Badge variant="secondary" className="text-sm font-medium bg-gray-100 text-gray-600">
                              Out of Stock
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-3 space-y-2 min-w-0 overflow-hidden">
                        {/* Product Name + Size - Clickable */}
                        <div 
                          className="cursor-pointer hover:text-blue-600 transition-colors min-w-0"
                          onClick={() => {
                            const userType = sessionStorage.getItem('userType')?.toLowerCase();
                            if (userType === 'admin') {
                              // For admin, just update the selected image instead of navigating
                              setSelectedImage(sizeImage);
                            } else if (userType === 'pharmacy') {
                              navigate(`/pharmacy/product/${product.id}/${size.id}`);
                            }
                          }}
                          title={`${product.name} – ${size.size_value} ${size.size_unit}`}
                        >
                          <p className="font-semibold text-blue-600 text-sm sm:text-base truncate">
                            {size.size_value} {size.size_unit}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-1 uppercase">
                            {product.name}
                          </p>
                        </div>

                        {/* SKU */}
                        {size.sku && (
                          <p className="text-[10px] text-gray-400">SKU: {size.sku}</p>
                        )}

                        {/* Case Price - Large & Bold */}
                        {isLoggedIn ? (
                          <div className="pt-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-bold text-gray-900">
                                ${price.toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-500">/ case</span>
                              {/* Show original price if there's any discount */}
                              {hasAnyDiscount && (
                                <span className="text-sm text-gray-400 line-through">
                                  ${(size.originalPrice || originalPrice).toFixed(2)}
                                </span>
                              )}
                            </div>
                            {/* Show savings breakdown */}
                            {hasAnyDiscount && (
                              <div className="text-xs text-red-600 font-semibold mt-0.5">
                                {hasOfferDiscount && `🎁 Offer: ${offerDiscountPercent}% off`}
                                {hasGroupDiscount && hasOfferDiscount && ' + '}
                                {hasGroupDiscount && `Group: ${groupDiscountPercent}% off`}
                              </div>
                            )}
                            {/* Reward Points */}
                            <div className="flex items-center gap-1 mt-1">
                              <Gift className="w-3 h-3 text-blue-600" />
                              <span className="text-xs text-blue-600">Earn {Math.round(price)} pts</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-100 px-2 py-1.5 rounded text-center">
                            <span className="text-xs font-medium text-gray-600">🔒 Login for Price</span>
                          </div>
                        )}

                        {/* Units per Case + Unit Price */}
                        {unitsPerCase > 0 && isLoggedIn && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Package className="w-3.5 h-3.5 mr-1 text-gray-400" />
                            <span>{unitsPerCase} units per case</span>
                            <span className="mx-1.5">·</span>
                            <span>${unitPrice.toFixed(2)} per unit</span>
                          </div>
                        )}

                        {/* Stock Status */}
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          <span className={`text-xs font-medium ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
                            {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                          </span>
                          {!isOutOfStock && size.stock < 10 && (
                            <span className="text-xs text-amber-600 ml-1">({size.stock} left)</span>
                          )}
                        </div>

                        {/* Quantity Selector + Add to Cart */}
                        {!isOutOfStock && isLoggedIn && (
                          <div className="flex items-center gap-2 pt-2">
                            {/* Quantity Selector - Large buttons */}
                            <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-l-lg rounded-r-none hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateSizeQuantity(size.id, Math.max(1, quantity - 1))
                                }}
                                disabled={quantity <= 1 || !selectedSizes.has(size.id)}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-10 text-center font-semibold text-sm">
                                {selectedSizes.has(size.id) ? quantity : 1}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-r-lg rounded-l-none hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!selectedSizes.has(size.id)) {
                                    handleSizeClick(size)
                                  } else {
                                    updateSizeQuantity(size.id, Math.min(size.stock, quantity + 1))
                                  }
                                }}
                                disabled={selectedSizes.has(size.id) && quantity >= size.stock}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Add to Cart Button */}
                            <Button
                              className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!selectedSizes.has(size.id)) {
                                  handleSizeClick(size)
                                }
                              }}
                              disabled={inCart}
                            >
                              {inCart ? (
                                <>
                                  <Check className="w-4 h-4 mr-1.5" />
                                  Added
                                </>
                              ) : selectedSizes.has(size.id) ? (
                                <>
                                  <Check className="w-4 h-4 mr-1.5" />
                                  Selected
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                                  Add to Cart
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Total Price - Show when selected and quantity > 1 */}
                        {selectedSizes.has(size.id) && quantity > 1 && isLoggedIn && (
                          <div className="text-right text-xs text-gray-500 pt-1">
                            Total: <span className="font-semibold text-gray-700">${(price * quantity).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ------------- ADD TO CART BOX (Bottom Fixed/Sticky) - Enhanced ------------- */}
        {isLoggedIn && selectedSizes.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t-2 border-blue-200 shadow-2xl z-50 safe-area-inset-bottom">
            {/* Decorative gradient line */}
            <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700"></div>
            
            <div className="p-3 sm:p-4 lg:p-5">
              <div className="container mx-auto max-w-7xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  {/* Left: Selection Summary */}
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <p className="text-xs font-medium text-gray-700">
                          {selectedSizes.size} size{selectedSizes.size > 1 ? 's' : ''} selected
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5">
                        {Array.from(selectedSizes.values()).reduce((sum, qty) => sum + qty, 0)} items
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-gray-500">Total:</span>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                          ${Array.from(selectedSizes.entries()).reduce((total, [sizeId, quantity]) => {
                            const size = product.sizes.find(s => s.id === sizeId)
                            if (!size) return total
                            const price = getSizePrice(size) || 0
                            return total + (price * quantity)
                          }, 0).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        <Gift className="w-3 h-3" />
                        <span className="text-xs font-medium">
                          +{Math.round(Array.from(selectedSizes.entries()).reduce((total, [sizeId, quantity]) => {
                            const size = product.sizes.find(s => s.id === sizeId)
                            if (!size) return total
                            const price = getSizePrice(size) || 0
                            return total + (price * quantity)
                          }, 0))} pts
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right: Add to Cart Button */}
                  <Button
                    className="h-12 sm:h-14 px-6 sm:px-8 lg:px-10 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl w-full sm:w-auto min-w-[140px] sm:min-w-[160px] group"
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                  >
                    {addingToCart ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        <span className="hidden sm:inline">Adding to Cart...</span>
                        <span className="sm:hidden">Adding...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                        <span className="hidden sm:inline">Add to Cart</span>
                        <span className="sm:hidden">Add</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------- ENHANCED LOGIN REQUIRED SECTION ------------- */}
        {!isLoggedIn && (
          <div className="mt-8">
            <Card className="shadow-2xl border-2 border-indigo-200 text-center p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-2xl"></div>
              
              <div className="relative z-10">
                {/* Enhanced icon with gradient */}
                <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="font-black text-2xl lg:text-3xl text-gray-900 mb-3 tracking-tight">
                  Login Required
                </h2>
                <p className="text-base text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                  Sign in to view exclusive pricing, add items to cart, and access your personalized dashboard
                </p>
                
                {/* Enhanced features list */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-sm">
                  <div className="flex items-center justify-center gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>View Pricing</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Add to Cart</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Earn Rewards</span>
                  </div>
                </div>
                
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white h-14 px-10 font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg"
                  onClick={() => navigate("/login")}
                >
                  <UserPlus className="w-6 h-6 mr-3" />
                  Login / Sign Up
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  </>
)

}

export default ProductDetails
