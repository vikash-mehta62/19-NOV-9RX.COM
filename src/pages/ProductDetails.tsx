"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/supabaseClient"
import type { Product } from "@/types/product"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Package, Info, Layers, Lock, LogIn, UserPlus, ImageIcon, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Navbar } from "@/components/landing/HeroSection"

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
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string>("")
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({})

  const getSupabaseImageUrl = async (path: string): Promise<string> => {
    if (!path || path === "/placeholder.svg") return "/placeholder.svg"
    if (path.startsWith("http")) return path

    // Check if we already have this URL cached
    if (imageUrls[path]) return imageUrls[path]

    try {
      setLoadingImages((prev) => ({ ...prev, [path]: true }))

      const { data, error } = supabase.storage.from("product-images").getPublicUrl(path)

      if (error || !data?.publicUrl) {
        console.error("Error getting image URL:", error)
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

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        console.error("No product ID provided")
        setLoading(false)
        return
      }

      try {
        console.log("Fetching product with ID:", id)

        const { data: productData, error } = await supabase
          .from("products")
          .select("*, product_sizes(*)")
          .eq("id", id)
          .single()

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
  }, [id, navigate, toast])

  const handleSizeClick = async (sizeId: string, sizeImage?: string) => {
    console.log("Size clicked:", sizeId, "Image:", sizeImage)
    setSelectedSize(sizeId)

    if (sizeImage && sizeImage.trim() !== "") {
      const imageUrl = imageUrls[sizeImage] || (await getSupabaseImageUrl(sizeImage))
      setSelectedImage(imageUrl)
    } else {
      // If no size image, keep the main product image
      const mainImageUrl = imageUrls[product?.image_url || ""] || product?.image_url || ""
      setSelectedImage(mainImageUrl)
    }
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
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>

          <div className="flex items-center gap-4">
            {product.category && (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">{product.category}</Badge>
            )}
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-6">
            {/* Main Image Display */}
            <div className="aspect-square bg-white rounded-2xl p-8 shadow-lg relative">
              <ImageWithLoader
                src={selectedImage || imageUrls[product.image_url] || product.image_url}
                alt={product.name}
                className="w-full h-full object-contain"
              />

              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium text-gray-700">
                {allImages.find((img) => img.url === selectedImage)?.label || "Main Product"}
              </div>
            </div>

            {/* Image Thumbnails */}
            {allImages.length > 1 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Product Images
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {allImages.map((image, index) => (
                    <ThumbnailImage
                      key={`${image.type}-${index}`}
                      image={image}
                      isSelected={selectedImage === image.url}
                      onClick={() => handleImageClick(image.url)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-8">
            {/* Basic Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
                    {product.sku && <p className="text-gray-600">SKU: {product.sku}</p>}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                      <Lock className="w-4 h-4 mr-2" />
                      <span className="font-semibold">Login for Pricing</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {product.description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Info className="w-4 h-4 mr-2" />
                      Description
                    </h3>
                    <p className="text-gray-600 leading-relaxed">{product.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Sizes - Enhanced */}
            {product.sizes && product.sizes.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-6 flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    Available Sizes ({product.sizes.length} options)
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {product.sizes.map((size) => (
                      <div
                        key={size.id}
                        className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-md ${
                          selectedSize === size.id
                            ? "border-emerald-500 bg-emerald-50 shadow-lg ring-2 ring-emerald-200"
                            : "border-gray-200 hover:border-emerald-300 bg-white"
                        }`}
                        onClick={() => handleSizeClick(size.id, size.image)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            {/* Size Image Thumbnail */}
                            {size.image && size.image.trim() !== "" && (
                              <div className="w-12 h-12 bg-gray-100 rounded-lg p-1 flex-shrink-0 relative">
                                <ImageWithLoader
                                  src={imageUrls[size.image] || size.image}
                                  alt={`${size.size_value}${size.size_unit}`}
                                  className="w-full h-full object-contain rounded"
                                />
                              </div>
                            )}

                            <div>
                              <p className="text-lg font-bold text-gray-900">
                                {size.size_value}
                                {size.size_unit}
                              </p>
                              {size.sku && <p className="text-sm text-gray-500">SKU: {size.sku}</p>}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center text-emerald-600">
                              <Lock className="w-3 h-3 mr-1" />
                              <span className="text-xs font-medium">Login Required</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                         
                          {size.quantity_per_case > 0 && (
                            <div>
                              <span className="text-gray-500">Per Case:</span>
                              <span className="ml-1 font-medium text-gray-700">{size.quantity_per_case}</span>
                            </div>
                          )}
                        </div>

                        {size.image && size.image.trim() !== "" && (
                          <div className="mt-3 flex items-center text-emerald-600 text-sm">
                            <ImageIcon className="w-4 h-4 mr-1" />
                            <span>Click to view size image</span>
                          </div>
                        )}

                        {selectedSize === size.id && (
                          <div className="mt-3 text-sm text-emerald-700 font-medium">✓ Size selected</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Features */}
            {product.key_features && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Layers className="w-4 h-4 mr-2" />
                    Key Features
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {product.key_features.split(",").map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                        <span className="text-gray-700">{feature.trim()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          

            {/* Login CTA */}
            <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-emerald-100 rounded-full">
                    <Lock className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Access Exclusive Pricing</h3>
                <p className="text-gray-600 mb-6">
                  Create your free account to view competitive wholesale pricing and place orders.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate("/login", { state: { defaultTab: "signup" } })}
                    className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up Free
                  </Button>
                  <Button
                    onClick={() => navigate("/login")}
                    variant="outline"
                    className="border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold px-6 py-3 rounded-xl"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div></>
  )
}

export default ProductDetails
