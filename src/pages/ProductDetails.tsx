
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

    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 hover:bg-emerald-50 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              {product.category && (
                <Badge className="bg-emerald-600 text-white px-3 py-1">
                  {product.category}
                </Badge>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {product.name}
              </h1>
            </div>

            {product.sku && (
              <div className="text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded-lg">
                SKU: {product.sku}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ---------------- LEFT IMAGE SECTION ---------------- */}
          <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-24">

            {/* Main Image */}
            <div className="aspect-square bg-white rounded-3xl p-6 shadow-xl border">
              <ImageWithLoader
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {allImages.map((image, index) => (
                  <ThumbnailImage
                    key={index}
                    image={image}
                    isSelected={selectedImage === image.url}
                    onClick={() => handleImageClick(image.url)}
                  />
                ))}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <Card className="shadow-md border">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg flex items-center mb-3">
                    <Info className="w-5 h-5 mr-2 text-emerald-600" />
                    Product Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {product.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Key Features */}
            {product.key_features && (
              <Card className="shadow-md border">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg flex items-center mb-3">
                    <Layers className="w-5 h-5 mr-2 text-emerald-600" />
                    Key Features
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {product.key_features.split(",").map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                        <span className="text-gray-700">{feature.trim()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ---------------- RIGHT SIDEBAR SECTION ---------------- */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24 space-y-6">

              {/* ------------- SIZE SELECT BOX ------------- */}
              {product.sizes && product.sizes.length > 0 && (
                <Card className="shadow-xl border">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg flex items-center">
                      <Package className="w-5 h-5 mr-2 text-emerald-600" />
                      Select Size
                      <Badge variant="secondary" className="ml-auto">
                        {product.sizes.length} options
                      </Badge>
                    </h3>

                    <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto pr-2">
                      {product.sizes.map((size) => {
                        const isSelected = selectedSizes.has(size.id)
                        const quantity = selectedSizes.get(size.id) || 1
                        const price = getSizePrice(size)
                        const inCart = isSizeInCart(size.id)

                        return (
                          <div
                            key={size.id}
                            className={`border-2 rounded-xl p-4 transition-all relative ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50 shadow-md"
                                : inCart
                                ? "border-blue-300 bg-blue-50"
                                : "border-gray-200 hover:border-emerald-300 bg-white"
                            }`}
                          >
                            {/* Already in Cart Badge */}
                            {inCart && (
                              <div className="absolute top-2 right-2">
                                <Badge className="bg-blue-500 text-white text-xs">
                                  In Cart
                                </Badge>
                              </div>
                            )}

                            <div className="flex justify-between items-start gap-3">
                              {/* Left Side - Checkbox + Image + Name */}
                              <div className="flex items-center gap-3 flex-1">
                                <div
                                  onClick={() => handleSizeClick(size)}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                                    isSelected
                                      ? "bg-emerald-600 border-emerald-600"
                                      : "border-gray-300 hover:border-emerald-400"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>

                                {size.image && (
                                  <img
                                    src={imageUrls[size.image] || size.image}
                                    className="w-12 h-12 object-contain border rounded p-1"
                                    alt={`${size.size_value}${size.size_unit}`}
                                  />
                                )}
                                <div className="flex flex-col">
                                  <p className="text-lg font-bold text-gray-900">
                                    {size.size_value}{size.size_unit}
                                  </p>
                                  {inCart && (
                                    <p className="text-xs text-blue-600 font-medium">
                                      Already in your cart
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Right Price */}
                              <div className="text-right">
                                {isLoggedIn ? (
                                  <>
                                    <p className="text-xl font-bold text-emerald-600">
                                      ₹{price?.toFixed(2)}
                                    </p>
                                    {size.originalPrice > 0 && (
                                      <p className="text-xs line-through text-gray-400">
                                        ₹{size.originalPrice.toFixed(2)}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-emerald-600 text-xs font-bold">
                                    Login to View
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quantity Controls - Show only when selected */}
                            {isSelected && isLoggedIn && (
                              <div className="mt-3 pt-3 border-t flex items-center gap-2">
                                <Label className="text-sm font-medium">Qty:</Label>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      updateSizeQuantity(size.id, quantity - 1)
                                    }}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>

                                  <Input
                                    type="number"
                                    min={1}
                                    value={quantity}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      updateSizeQuantity(size.id, Math.max(1, Number(e.target.value)))
                                    }}
                                    className="w-16 h-8 text-center font-bold text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                  />

                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      updateSizeQuantity(size.id, quantity + 1)
                                    }}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                                <span className="ml-auto text-sm font-bold text-emerald-600">
                                  ₹{(price * quantity).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ------------- ADD TO CART BOX ------------- */}
              {isLoggedIn && selectedSizes.size > 0 && (
                <Card className="shadow-xl border bg-emerald-50">
                  <CardContent className="p-6 space-y-4">

                    <h3 className="text-lg font-bold flex items-center justify-between">
                      <span className="flex items-center">
                        <ShoppingCart className="w-5 h-5 mr-2 text-emerald-600" />
                        Add to Cart
                      </span>
                      <Badge className="bg-emerald-600">
                        {selectedSizes.size} size(s)
                      </Badge>
                    </h3>

                    {/* Selected sizes summary */}
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {Array.from(selectedSizes.entries()).map(([sizeId, quantity]) => {
                        const size = product.sizes.find(s => s.id === sizeId)
                        if (!size) return null
                        const price = getSizePrice(size) || 0

                        return (
                          <div key={sizeId} className="flex justify-between items-center p-3 bg-white rounded-lg border text-sm">
                            <div>
                              <p className="font-medium">
                                {size.size_value}{size.size_unit}
                              </p>
                              <p className="text-xs text-gray-500">
                                Qty: {quantity} × ₹{price.toFixed(2)}
                              </p>
                            </div>
                            <p className="font-bold text-emerald-600">
                              ₹{(price * quantity).toFixed(2)}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between p-4 bg-emerald-100 rounded-lg">
                      <span className="font-bold">Total</span>
                      <span className="text-2xl font-bold text-emerald-600">
                        ₹{Array.from(selectedSizes.entries()).reduce((total, [sizeId, quantity]) => {
                          const size = product.sizes.find(s => s.id === sizeId)
                          if (!size) return total
                          const price = getSizePrice(size) || 0
                          return total + (price * quantity)
                        }, 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Button */}
                    <Button
                      className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                    >
                      {addingToCart ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        `Add ${selectedSizes.size} Size(s) to Cart`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* ------------- LOGIN REQUIRED ------------- */}
              {!isLoggedIn && (
                <Card className="shadow-xl border text-center p-6 bg-gradient-to-br from-emerald-50 to-blue-50">
                  <UserPlus className="mx-auto w-10 h-10 text-emerald-600" />

                  <p className="font-bold text-xl mt-2">Login Required</p>

                  <p className="text-sm text-gray-600 mt-1">
                    Sign in to view wholesale prices.
                  </p>

                  <Button
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white h-12"
                    onClick={() => navigate("/login")}
                  >
                    Login / Signup
                  </Button>
                </Card>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  </>
)

}

export default ProductDetails
