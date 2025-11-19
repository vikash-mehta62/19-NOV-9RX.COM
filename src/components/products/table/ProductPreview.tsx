"use client";

import { useEffect, useState } from "react";
import { Product, ProductSize } from "@/types/product";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Palette } from "lucide-react";

interface ProductPreviewProps {
  product: Product;
}

export const ProductPreview = ({ product }: ProductPreviewProps) => {
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadImage = async () => {
      if (product.images?.[0] && product.images[0] !== "/placeholder.svg") {
        try {
          if (product.images[0].startsWith("http")) {
            setImageUrl(product.images[0]);
            return;
          }

          const { data } = await supabase.storage
            .from("product-images")
            .getPublicUrl(product.images[0]);

          if (data?.publicUrl) {
            setImageUrl(data.publicUrl);
          }
        } catch (error) {
          console.error("Error loading image:", error);
        }
      }

    };

    loadImage();
  }, [product.images]);

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold">{product.name}</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Image Section */}
        <div className="overflow-hidden">
          <div className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center p-8 relative">
            {loading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-xl">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              onLoad={() => setLoading(false)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder.svg";
                setLoading(false);
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {["USP 671 Tested", "Child-Resistant"].map((badge) => (
              <Badge
                key={badge}
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                {badge}
              </Badge>
            ))}
          </div>

          <div className="my-3">
            <h2 className="text-2xl font-bold leading-tight mb-3">
              {product.name}
            </h2>
            <p className="text-gray-600 leading-relaxed tracking-wide max-w-prose">
              {product.description}
            </p>
          </div>
        </div>

        {/* Sizes & Details Scrollable Section */}
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
          <Separator className="mb-4" />

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="font-semibold block mb-1">SKU:</span>
              <p className="text-gray-600">{product.sku}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="font-semibold block mb-1">Category:</span>
              <p className="text-gray-600">{product.category}</p>
            </div>
          </div>

          {product.customization?.allowed && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg hover:scale-[1.02] hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-purple-700">
                  Customization Available
                </h3>
              </div>
            </div>
          )}

          {product.sizes && product.sizes.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="font-semibold mb-2">Available Sizes:</h3>
              <div className="space-y-2">
                {product.sizes.map((size: ProductSize, index: number) => {
                  const isOutOfStock = size.stock <= 0;

                  return (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm"
                    >
                      <div className="flex flex-col">
                        <span className="text-lg font-semibold uppercase text-gray-800">
                          {size.size_value} {size.size_unit}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            isOutOfStock ? "text-red-500" : "text-green-600"
                          }`}
                        >
                          {isOutOfStock
                            ? "Out of Stock"
                            : size.stock < 5
                            ? `Only ${size.stock} left`
                            : `In Stock (${size.stock})`}
                        </span>
                        <span className="text-sm text-gray-500">
                          {size.quantity_per_case}{" "}
                          {product.name === "LIQUID OVALS"
                            ? "bottles and caps per case"
                            : product.name.includes("RX PAPER BAGS")
                            ? "bags per case"
                            : product.name === "THERMAL PAPER RECEIPT ROLLS"
                            ? "rolls per case"
                            : product.name === "LIQUID OVAL ADAPTERS"
                            ? "bottles per case"
                            : product.name === "OINTMENT JARS"
                            ? "jars and caps per case"
                            : product.name === "RX VIALS"
                            ? "vials and caps per case"
                            : product.name === "RX LABELS"
                            ? `labels per roll, ${size?.rolls_per_case} rolls per case`
                            : "units per case"}
                        </span>
                      </div>
                      <span className="font-medium text-emerald-600">
                        ${formatPrice(size.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  );
};
