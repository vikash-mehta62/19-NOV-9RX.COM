"use client";

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ProductCustomization } from "./ProductCustomization";
import { ProductActions } from "./ProductActions";
import { ProductSizeOptions } from "./ProductSizeOptions";
import type { ProductDetails } from "../../types/product.types";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Package, Tag, CheckCircle2, FileText } from "lucide-react";

interface ProductDialogProps {
  product: ProductDetails;
  isInCart: boolean;
  quantity: { [key: string]: number };
  onIncreaseQuantity: (id: string) => void;
  onDecreaseQuantity: (id: string) => void;
  isAddingToCart: boolean;
  customizations: Record<string, string>;
  onCustomizationChange: (customizations: Record<string, string>) => void;
  onAddToCart: () => void;
  setSelectedSizes: (sizeIds: string[]) => void;
  setSelectedSizesSKU: (sizeIds: string[]) => void;
  selectedSizes: string[];
  selectedSizesSKU: string[];
  selectedTypeBySize: { [sizeId: string]: "case" | "unit" };
  setSelectedTypeBySize: React.Dispatch<
    React.SetStateAction<{ [sizeId: string]: "case" | "unit" }>
  >;
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
  setSelectedTypeBySize,
}: ProductDialogProps) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedSizeImages, setSelectedSizeImages] = useState<string[]>([]);
  const [currentSizeImage, setCurrentSizeImage] = useState<string | null>(null);

  // Load product images
  useEffect(() => {
    const loadImages = async () => {
      const loadedUrls: string[] = [];

      for (const image of product.images) {
        try {
          if (image.startsWith("http")) {
            loadedUrls.push(image);
          } else {
            const { data } = supabase.storage
              .from("product-images")
              .getPublicUrl(image);
            if (data?.publicUrl) {
              loadedUrls.push(data.publicUrl);
            }
          }
        } catch (error) {
          console.error("Error loading image:", error);
          loadedUrls.push("/placeholder.svg");
        }
      }

      setImageUrls(loadedUrls);
    };

    loadImages();
  }, [product.images]);

  // Update selected size images
  useEffect(() => {
    if (selectedSizes.length > 0) {
      const sizeObjects = product.sizes.filter((size: any) =>
        selectedSizes.includes(`${size.size_value}-${size.size_unit}`)
      );

      const sizeImages = sizeObjects
        .filter((size: any) => size.image)
        .map(
          (size: any) =>
            `https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/${size.image}`
        );

      setSelectedSizeImages(sizeImages);

      if (sizeImages.length > 0) {
        setCurrentSizeImage(sizeImages[sizeImages.length - 1]);
      } else {
        setCurrentSizeImage(null);
      }
    } else {
      setSelectedSizeImages([]);
      setCurrentSizeImage(null);
    }
  }, [selectedSizes, product.sizes]);

  return (
    <DialogContent className="max-w-7xl max-h-[95vh] p-0 gap-0">
      {/* Header - Fixed */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 border-b border-emerald-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white drop-shadow-sm">
            {product.name}
          </DialogTitle>
          {product.subcategory && (
            <p className="text-emerald-100 text-sm mt-1 font-medium">
              {product.category} • {product.subcategory}
            </p>
          )}
        </DialogHeader>
      </div>

      {/* Main Content - Scrollable */}
      <div className="grid md:grid-cols-5 gap-0" style={{ height: 'calc(95vh - 140px)' }}>
        {/* Left Side - Images & Key Features - Scrollable */}
        <div className="md:col-span-2 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 140px)' }}>
            <div className="p-6 space-y-5">
              {/* Main Image */}
              <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 hover:shadow-xl transition-shadow">
                {currentSizeImage ? (
                  <div className="aspect-square flex items-center justify-center bg-gray-50 rounded-xl">
                    <img
                      src={currentSizeImage}
                      alt={product.name}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                ) : (
                  <Swiper spaceBetween={10} slidesPerView={1} loop className="aspect-square rounded-xl overflow-hidden">
                    {imageUrls.map((url, index) => (
                      <SwiperSlide key={index}>
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                          <img
                            src={url || "/placeholder.svg"}
                            alt={product.name}
                            className="w-full h-full object-contain p-2"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {selectedSizeImages.length > 0 && (
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                  <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Selected Size Images</p>
                  <div className="grid grid-cols-4 gap-3">
                    {selectedSizeImages.map((imageUrl, index) => (
                      <button
                        key={index}
                        className={`aspect-square rounded-xl border-2 overflow-hidden transition-all hover:scale-105 ${
                          imageUrl === currentSizeImage
                            ? "border-emerald-500 ring-2 ring-emerald-300 shadow-lg"
                            : "border-gray-300 hover:border-emerald-400"
                        }`}
                        onClick={() => setCurrentSizeImage(imageUrl)}
                      >
                        <img
                          src={imageUrl}
                          alt={`Size ${index + 1}`}
                          className="w-full h-full object-contain p-1.5 bg-gray-50"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Features */}
              {product.key_features && (
                <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Key Features</span>
                  </div>
                  <div className="space-y-3">
                    {product.key_features.split(",").map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3 group">
                        <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0 group-hover:scale-125 transition-transform" />
                        <span className="text-sm text-gray-700 leading-relaxed">{feature.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Product Info & Details - Scrollable */}
          <div className="md:col-span-3 bg-white relative" style={{ maxHeight: 'calc(95vh - 140px)' }}>
            {/* Scrollable Content Area */}
            <div className="overflow-y-auto" style={{ height: 'calc(95vh - 220px)' }}>
              <div className="px-6 py-6 space-y-6">
                {/* Product Information Cards */}
                <div className="grid grid-cols-3 gap-4">
                  {/* SKU */}
                  <div className="bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-100 rounded-xl p-4 border-2 border-emerald-300 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-white rounded-lg">
                        <Tag className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">SKU</span>
                    </div>
                    {selectedSizesSKU.length > 0 ? (
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {selectedSizesSKU.map((sku, index) => (
                          <p key={index} className="text-sm font-bold text-emerald-900 bg-white/50 px-2 py-1 rounded">
                            {sku.split(" ")[0]}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-emerald-900">{product.sku}</p>
                    )}
                  </div>

                  {/* Category */}
                  <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 rounded-xl p-4 border-2 border-blue-300 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-white rounded-lg">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Category</span>
                    </div>
                    <p className="text-sm font-bold text-blue-900">{product.category}</p>
                  </div>

                  {/* Subcategory */}
                  {product.subcategory && (
                    <div className="bg-gradient-to-br from-purple-50 via-purple-100 to-pink-100 rounded-xl p-4 border-2 border-purple-300 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-white rounded-lg">
                          <Tag className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">Subcategory</span>
                      </div>
                      <p className="text-sm font-bold text-purple-900">{product.subcategory}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-300 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <FileText className="h-4 w-4 text-gray-700" />
                      </div>
                      <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Description</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
                  </div>
                )}

                <Separator className="my-6" />

                {/* Size Selection */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-emerald-500"></span>
                    Select Size(s)
                  </h3>
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

                {/* Customization */}
                {product.customization?.allowed && (
                  <>
                    <Separator className="my-6" />
                    <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-amber-500"></span>
                        Customization Options
                      </h3>
                      <ProductCustomization
                        onCustomizationChange={onCustomizationChange}
                        sizes={product.sizes}
                      />
                    </div>
                  </>
                )}

                {/* Extra padding at bottom for scroll */}
                <div className="h-4"></div>
              </div>
            </div>

            {/* Sticky Footer - Add to Cart */}
            <div className="absolute bottom-0 left-0 right-0 border-t-2 border-gray-200 bg-white px-6 py-4 shadow-2xl">
              <ProductActions
                isInCart={isInCart}
                isAddingToCart={isAddingToCart}
                onAddToCart={onAddToCart}
                selectedSizesSKU={selectedSizesSKU}
                disabled={selectedSizes.length === 0}
              />
            </div>
          </div>
        </div>
    </DialogContent>
  );
};
