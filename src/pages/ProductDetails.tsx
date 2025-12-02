
"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import type { Product } from "@/types/product"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Package, Info, Layers, UserPlus, Loader2, ShoppingCart, Plus, Minus, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Navbar } from "@/components/landing/HeroSection"
import { useCart } from "@/hooks/use-cart"
import { useSelector } from "react-redux"
import { RootState } from "@/store/store"

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
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
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
        isSelected ? "border-emerald-500 ring-2 ring-emerald-200" : "border-gray-200 hover:border-emerald-300"
      }`}
      onClick={onClick}
    >
      {isLoading && (
        <div className="absolute inset-2 flex items-center justify-center bg-gray-100 rounded">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
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
  const { id } = useParams()
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

  // Get price for a size - Simple getter since pricing already applied
  const getSizePrice = (size: any) => {
    if (!isLoggedIn) return null
    return size.price || 0
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
      if (!id) {
        console.error("No product ID provided")
        setLoading(false)
        return
      }

      try {
        console.log("Fetching product with ID or SKU:", id)

        // Try to fetch by ID first, then by SKU
        let productData, error;
        
        // Check if id is a UUID (contains hyphens)
        if (id.includes('-')) {
          const result = await supabase
            .from("products")
            .select("*, product_sizes(*)")
            .eq("id", id)
            .single()
          productData = result.data
          error = result.error
        } else {
          // Try by SKU
          const result = await supabase
            .from("products")
            .select("*, product_sizes(*)")
            .eq("sku", id)
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
  }, [id, navigate, toast, isLoggedIn, userProfile])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-10 w-32 mb-4" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-64" />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Image Loading Skeleton */}
            <div className="space-y-6">
              <Skeleton className="aspect-square rounded-2xl" />
              <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            </div>

            {/* Details Loading Skeleton */}
            <div className="space-y-8">
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-1/3 mb-4" />
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                  </div>
                </CardContent>
              </Card>
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
          <Button onClick={() => navigate("/")} className="bg-emerald-600 hover:bg-emerald-700">
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
        label: `${size.size_value}${size.size_unit}`,
        type: "size",
        sizeId: size.id,
      })) || []),
  ]

return (
  <>
    <Navbar />

    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 pt-16">
      {/* Enhanced Header with Modern Design */}
      <div className="bg-white/95 backdrop-blur-2xl border-b-2 border-gray-100 shadow-xl sticky top-0 z-40 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
        
        <div className="relative container mx-auto px-4 py-3">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-2 hover:bg-gray-100 transition-all duration-200 rounded-lg group text-sm h-8"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="font-medium">Back to Products</span>
          </Button>

          {/* Product Info Section */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            {/* Left: Category + Product Name */}
            <div className="flex-1 space-y-2">
              {product.category && (
                <Badge className="bg-emerald-600 text-white px-2.5 py-0.5 text-xs font-semibold rounded">
                  {product.category}
                </Badge>
              )}
              
              <h1 className="text-xl sm:text-2xl font-bold leading-tight text-gray-900">
                {product.name}
              </h1>

              {/* Additional Info Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                {product.sku && (
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3 h-3" />
                    <span>SKU: <span className="font-medium text-gray-800">{product.sku}</span></span>
                  </div>
                )}
                
                {product.sizes && product.sizes.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">•</span>
                    <Layers className="w-3 h-3 text-purple-600" />
                    <span className="font-medium text-purple-700">{product.sizes.length} Sizes Available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Stock Status / Availability */}
            <div className="lg:text-right">
              <div className="inline-flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-green-700">In Stock</span>
              </div>
              {!isLoggedIn && (
                <div className="text-xs text-gray-500 mt-1">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* LEFT: MAIN PRODUCT IMAGE */}
          <div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 sticky top-24">
              <ImageWithLoader
                src={selectedImage}
                alt={product.name}
                className="w-full h-auto object-contain max-h-[500px]"
              />
            </div>
          </div>

          {/* RIGHT: DESCRIPTION & KEY FEATURES */}
          <div className="space-y-6">

            {/* Description */}
            {product.description && (
              <Card className="shadow-sm border border-gray-200 bg-white">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg flex items-center mb-3 text-gray-900">
                    <Info className="w-5 h-5 mr-2 text-indigo-600" />
                    Product Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {product.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Key Features */}
            {product.key_features && (
              <Card className="shadow-sm border border-gray-200 bg-white">
                <CardContent className="p-6">
                  <h3 className="shadow-ld text-lg flex items-center mb-3 text-gray-900">
                    <Layers className="w-5 h-5 mr-2 text-purple-600" />
                    Key Features
                  </h3>
                  <div className="space-y-2">
                    {product.key_features.split(",").map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700 text-sm">{feature.trim()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ---------------- BOTTOM: SIZES LEFT | SELECTED SIZE IMAGES RIGHT ---------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT: SIZE SELECTION */}
          <div>
            {/* ---------------- SIZE SELECT BOX ---------------- */}
            {product.sizes && product.sizes.length > 0 && (
                <Card className="shadow-sm border border-gray-200 bg-white">
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm flex items-center mb-2">
                      <Package className="w-4 h-4 mr-1.5 text-purple-600" />
                      <span className="text-gray-800">Select Size</span>
                      <Badge className="ml-auto bg-purple-100 text-purple-700 text-xs px-1.5 py-0">
                        {product.sizes.length} options
                      </Badge>
                    </h3>

                    <div className="space-y-2 mt-2 max-h-[400px] overflow-y-auto pr-1 sidebar-scroll">
                      {product.sizes.map((size) => {
                        const isSelected = selectedSizes.has(size.id)
                        const quantity = selectedSizes.get(size.id) || 1
                        const price = getSizePrice(size)
                        const inCart = isSizeInCart(size.id)

                        return (
                          <div
                            key={size.id}
                            onClick={() => !inCart && handleSizeClick(size)}
                            className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 cursor-pointer ${
                              isSelected
                                ? "bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-400 shadow-xl shadow-indigo-200/50 scale-[1.02]"
                                : inCart
                                ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 shadow-lg opacity-75"
                                : "bg-white border-2 border-gray-200 hover:border-indigo-300 hover:shadow-xl hover:scale-[1.01]"
                            }`}
                          >
                            {/* Animated Background Effect */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/10 via-purple-400/10 to-pink-400/10 animate-pulse"></div>
                            )}

                            {/* Already in Cart Badge */}
                            {inCart && (
                              <div className="absolute top-3 right-3 z-10">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-blue-400 rounded-full blur-md animate-pulse"></div>
                                  <Badge className="relative bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold shadow-lg px-3 py-1">
                                    ✓ Added
                                  </Badge>
                                </div>
                              </div>
                            )}

                            <div className="relative flex items-center gap-4">
                              {/* Custom Radio/Checkbox */}
                              <div className="flex-shrink-0">
                                <div className={`relative w-6 h-6 rounded-full border-3 transition-all duration-300 ${
                                  isSelected 
                                    ? "border-indigo-500 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/50" 
                                    : "border-gray-300 bg-white group-hover:border-indigo-400"
                                }`}>
                                  {isSelected && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Check className="w-4 h-4 text-white font-bold animate-in zoom-in duration-200" />
                                    </div>
                                  )}
                                  {!isSelected && (
                                    <div className="absolute inset-1 rounded-full bg-gray-100 group-hover:bg-indigo-50 transition-colors"></div>
                                  )}
                                </div>
                              </div>

                              {/* Size Image */}
                              {size.image && (
                                <div className="relative flex-shrink-0">
                                  <div className={`absolute inset-0 rounded-xl blur-lg transition-opacity duration-300 ${
                                    isSelected ? "bg-gradient-to-br from-indigo-400 to-purple-400 opacity-30" : "opacity-0"
                                  }`}></div>
                                  <div className="relative w-16 h-16 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200 p-2 group-hover:border-indigo-300 transition-all duration-300">
                                    <img
                                      src={imageUrls[size.image] || size.image}
                                      className="w-full h-full object-contain"
                                      alt={`${size.size_value}${size.size_unit}`}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Size Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                  <h4 className="text-xl font-bold text-gray-900 truncate">
                                    {size.size_value}
                                  </h4>
                                  <span className="text-sm font-semibold text-gray-500">
                                    {size.size_unit}
                                  </span>
                                </div>
                                {inCart && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <p className="text-xs text-blue-600 font-semibold">
                                      Already in cart
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Price Section */}
                              <div className="flex-shrink-0 text-right">
                                {isLoggedIn ? (
                                  <div className="space-y-1">
                                    <div className="text-2xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                      ₹{price?.toFixed(2)}
                                    </div>
                                    {size.originalPrice > 0 && (
                                      <div className="flex items-center gap-1.5 justify-end">
                                        <span className="text-xs line-through text-gray-400 font-medium">
                                          ₹{size.originalPrice.toFixed(2)}
                                        </span>
                                        <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] px-1.5 py-0.5 font-bold">
                                          {Math.round(((size.originalPrice - price) / size.originalPrice) * 100)}% OFF
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="bg-gradient-to-r from-indigo-100 to-purple-100 px-3 py-2 rounded-lg">
                                    <span className="text-xs font-bold text-indigo-700">🔒 Login</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Quantity Controls - Expanded View */}
                            {isSelected && isLoggedIn && (
                              <div className="relative mt-4 pt-4 border-t-2 border-dashed border-indigo-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-700">Quantity:</span>
                                    <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-indigo-200 shadow-inner p-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          updateSizeQuantity(size.id, quantity - 1)
                                        }}
                                      >
                                        <Minus className="w-4 h-4" />
                                      </Button>

                                      <div className="w-16 h-8 flex items-center justify-center">
                                        <Input
                                          type="number"
                                          min={1}
                                          value={quantity}
                                          onChange={(e) => {
                                            e.stopPropagation()
                                            updateSizeQuantity(size.id, Math.max(1, Number(e.target.value)))
                                          }}
                                          className="w-full h-full text-center font-bold text-base border-0 focus-visible:ring-0 bg-transparent"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>

                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          updateSizeQuantity(size.id, quantity + 1)
                                        }}
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl shadow-lg">
                                    <div className="text-xs font-medium opacity-90">Subtotal</div>
                                    <div className="text-lg font-black">₹{(price * quantity).toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

          {/* RIGHT: SELECTED SIZE IMAGES */}
          <div>
            {selectedSizes.size > 0 && (
              <Card className="shadow-sm border border-gray-200 bg-white sticky top-24">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg flex items-center mb-4 text-gray-900">
                    <Package className="w-5 h-5 mr-2 text-indigo-600" />
                    Selected Sizes
                    <Badge className="ml-auto bg-indigo-100 text-indigo-700 text-sm px-2 py-1">
                      {selectedSizes.size} selected
                    </Badge>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from(selectedSizes.entries()).map(([sizeId, quantity]) => {
                      const size = product.sizes.find(s => s.id === sizeId)
                      if (!size) return null

                      return (
                        <div key={sizeId} className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3 border-2 border-indigo-200">
                          {size.image && (
                            <div className="aspect-square bg-white rounded-lg p-2 mb-2">
                              <img
                                src={imageUrls[size.image] || size.image}
                                alt={`${size.size_value}${size.size_unit}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <div className="text-center">
                            <p className="font-bold text-sm text-gray-900">
                              {size.size_value}{size.size_unit}
                            </p>
                            <p className="text-xs text-gray-600">Qty: {quantity}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ------------- ADD TO CART BOX (Bottom Fixed/Sticky) ------------- */}
        {isLoggedIn && selectedSizes.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50 p-4">
            <div className="container mx-auto">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">{selectedSizes.size} size(s) selected</p>
                  <p className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    ₹{Array.from(selectedSizes.entries()).reduce((total, [sizeId, quantity]) => {
                      const size = product.sizes.find(s => s.id === sizeId)
                      if (!size) return total
                      const price = getSizePrice(size) || 0
                      return total + (price * quantity)
                    }, 0).toFixed(2)}
                  </p>
                </div>
                
                <Button
                  className="h-14 px-8 text-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                >
                  {addingToCart ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Add to Cart
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ------------- LOGIN REQUIRED ------------- */}
        {!isLoggedIn && (
          <div className="mt-8">
            <Card className="shadow-lg border-2 border-indigo-200 text-center p-8 bg-gradient-to-br from-indigo-50 to-purple-50">
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-indigo-600" />
              <p className="font-bold text-xl text-gray-900 mb-2">Login Required</p>
              <p className="text-sm text-gray-600 mb-4">
                Sign in to view prices and add items to cart
              </p>
              <Button
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-12 px-8 font-bold rounded-xl"
                onClick={() => navigate("/login")}
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Login / Signup
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  </>
)

}

export default ProductDetails
