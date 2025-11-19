"use client"

import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ProductCustomization } from "./ProductCustomization"
import { ProductActions } from "./ProductActions"
import { ProductSizeOptions } from "./ProductSizeOptions"
import type { ProductDetails } from "../../types/product.types"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Swiper, SwiperSlide } from "swiper/react" // Import Swiper components

interface ProductDialogProps {
  product: ProductDetails
  isInCart: boolean
  quantity: { [key: string]: number }
  onIncreaseQuantity: (id: string) => void
  onDecreaseQuantity: (id: string) => void
  isAddingToCart: boolean
  customizations: Record<string, string>
  onCustomizationChange: (customizations: Record<string, string>) => void
  onAddToCart: () => void
  setSelectedSizes: (sizeIds: string[]) => void
  setSelectedSizesSKU: (sizeIds: string[]) => void
  selectedSizes: string[]
  selectedSizesSKU: string[]
    selectedTypeBySize: { [sizeId: string]: "case" | "unit" };
  setSelectedTypeBySize: React.Dispatch<React.SetStateAction<{ [sizeId: string]: "case" | "unit" }>>;
}

export const ProductDialog = ({
  product,
  isInCart,
  isAddingToCart,
  quantity,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onCustomizationChange,
  onAddToCart,
  setSelectedSizes,
  selectedSizes,
  selectedSizesSKU,
  setSelectedSizesSKU,
    selectedTypeBySize,
  setSelectedTypeBySize
}: ProductDialogProps) => {
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [selectedSizeImages, setSelectedSizeImages] = useState<string[]>([])
  const [currentSizeImage, setCurrentSizeImage] = useState<string | null>(null)



  // Load product images
  useEffect(() => {
    const loadImages = async () => {
      const loadedUrls: string[] = []

      for (const image of product.images) {
        try {
          if (image.startsWith("http")) {
            loadedUrls.push(image) // If image is already a full URL, add directly
          } else {
            // Get public URL from Supabase storage
            const { data } = supabase.storage.from("product-images").getPublicUrl(image)
            if (data?.publicUrl) {
              loadedUrls.push(data.publicUrl)
            }
          }
        } catch (error) {
          console.error("Error loading image:", error)
          loadedUrls.push("/placeholder.svg") // Fallback to placeholder
        }
      }

      setImageUrls(loadedUrls)
    }

    loadImages()
  }, [product.images])

  // Find size objects based on selected sizes
  const findSizeObjects = (sizeList, targetIds) => {
    return sizeList.filter((size) => targetIds.includes(`${size.size_value}-${size.size_unit}`))
  }

  // Update selected size images when sizes change
  useEffect(() => {
    if (selectedSizes.length > 0) {
      // Get all size objects for selected sizes
      const sizeObjects = findSizeObjects(product.sizes, selectedSizes)

      // Extract images from size objects
      const sizeImages = sizeObjects
        .filter((size) => size.image) // Only include sizes with images
        .map((size) => `https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/${size.image}`)

      setSelectedSizeImages(sizeImages)

      // Set the current size image to the most recently selected size's image
      if (sizeImages.length > 0) {
        setCurrentSizeImage(sizeImages[sizeImages.length - 1])
      } else {
        setCurrentSizeImage(null)
      }
    } else {
      setSelectedSizeImages([])
      setCurrentSizeImage(null)
    }
  }, [selectedSizes, product.sizes])

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold">{product.name}</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 h-[calc(90vh-10rem)] overflow-hidden">
        {/* Left Column - Product Image Carousel (Fixed) */}
        <div className="h-full overflow-hidden">
          {/* Show selected size image if available, otherwise show product images */}
          {currentSizeImage ? (
            <div className="aspect-square rounded-xl bg-gray-100/30 flex items-center justify-center p-8 transition-all duration-300 group hover:bg-white h-[60%]">
              <img
                src={currentSizeImage || "/placeholder.svg"}
                alt={`${product.name} - Selected Size`}
                className="w-full h-full object-contain transform transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = "/placeholder.svg"
                }}
              />
            </div>
          ) : (
            <Swiper
              spaceBetween={10}
              slidesPerView={1}
              loop={true}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
              }}
              className="h-[60%]"
            >
              {imageUrls.map((url, index) => (
                <SwiperSlide key={index}>
                  <div className="aspect-square rounded-xl bg-gray-100/30 flex items-center justify-center p-8 transition-all duration-300 group hover:bg-white">
                    <img
                      src={url || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-contain transform transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}

          {/* Size Image Thumbnails - Show when sizes are selected */}
          {selectedSizeImages.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Selected Size Images</h4>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {selectedSizeImages.map((imageUrl, index) => (
                  <button
                    key={index}
                    className={`w-16 h-16 rounded-md border-2 flex-shrink-0 overflow-hidden ${imageUrl === currentSizeImage ? "border-primary" : "border-gray-200"
                      }`}
                    onClick={() => setCurrentSizeImage(imageUrl)}
                  >
                    <img
                      src={imageUrl || "/placeholder.svg"}
                      alt={`Size ${index + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg"
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {product.key_features?.split(",").map((feature) => (
              <Badge
                key={feature.trim()}
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                {feature.trim()}
              </Badge>
            ))}
          </div>
          <br />

        </div>

        {/* Right Column - Product Details (Scrollable) */}
        <ScrollArea className="h-full pr-4 overflow-hidden">
          <div className="space-y-6">
            {/* Size Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold block mb-1">SKU:</span>
                {selectedSizesSKU.map((size, index) => (
                  <span key={index}>
                    {size.split(" ")[0]} <br />
                  </span>
                ))}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold block mb-1">Category:</span>
                <p className="text-gray-600">{product.category}</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Size(s)</h3>
              <ProductSizeOptions
                quantity={quantity}
                onIncreaseQuantity={onIncreaseQuantity}
                onDecreaseQuantity={onDecreaseQuantity}
                product={product}
                selectedSizes={selectedSizes}
                onSizeSelect={setSelectedSizes}
                selectedSizesSKU={selectedSizesSKU}
                onSizeSelectSKU={setSelectedSizesSKU}
                selectedTypeBySize={selectedTypeBySize}
                setSelectedTypeBySize={setSelectedTypeBySize}
              />
            </div>

            {product.customization?.allowed && (
              <>
                <Separator />
                <ProductCustomization onCustomizationChange={onCustomizationChange} sizes={product.sizes} />
              </>
            )}

            <Separator />

            <ProductActions
              isInCart={isInCart}
              isAddingToCart={isAddingToCart}
              onAddToCart={onAddToCart}
              selectedSizesSKU={selectedSizesSKU}
              disabled={selectedSizes.length === 0}
            />
          </div>
        </ScrollArea>
      </div>
    </DialogContent>
  )
}
