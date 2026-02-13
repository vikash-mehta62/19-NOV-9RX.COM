import { Button } from "@/components/ui/button";
import { ProductDetails } from "../../types/product.types";
import { formatPrice } from "@/lib/utils";
import { Check, Plus, Minus, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductSizeOptionsProps {
  product: ProductDetails;
  selectedSizes?: string[];
  selectedSizesSKU?: string[];
  onSizeSelect?: (sizeId: string[]) => void;
  onSizeSelectSKU?: (sizeId: string[]) => void;
  quantity: { [key: string]: number };
  onIncreaseQuantity: (id: string) => void;
  onDecreaseQuantity: (id: string) => void;
  selectedTypeBySize: { [sizeId: string]: "case" | "unit" };
  setSelectedTypeBySize: React.Dispatch<
    React.SetStateAction<{ [sizeId: string]: "case" | "unit" }>
  >;
}

export const ProductSizeOptions = ({
  quantity,
  onIncreaseQuantity,
  onDecreaseQuantity,
  product,
  selectedSizes = [],
  onSizeSelect,
  selectedSizesSKU = [],
  onSizeSelectSKU,
  selectedTypeBySize,
  setSelectedTypeBySize,
}: ProductSizeOptionsProps) => {
  const handleSizeToggle = (sizeId: string, stock: number) => {
    if (stock <= 0) return;

    if (selectedSizes.includes(sizeId)) {
      onSizeSelect?.(selectedSizes.filter((s) => s !== sizeId));
    } else {
      onSizeSelect?.([...selectedSizes, sizeId]);
    }
  };

  const handleSizeToggleSKU = (sizeSKU: string, stock: number) => {
    if (stock <= 0) return;

    if (selectedSizesSKU.includes(sizeSKU)) {
      onSizeSelectSKU?.(selectedSizesSKU.filter((s) => s !== sizeSKU));
    } else {
      onSizeSelectSKU?.([...selectedSizesSKU, sizeSKU]);
    }
  };

  const handleToggleType = (sizeId: string, type: "case" | "unit") => {
    setSelectedTypeBySize((prev) => ({ ...prev, [sizeId]: type }));
  };

  // Get image URL for size
  const getSizeImageUrl = (size: any) => {
    if (size.image) {
      if (size.image.startsWith("http")) return size.image;
      return `https://asnhfgfhidhzswqkhpzz.supabase.co/storage/v1/object/public/product-images/${size.image}`;
    }
    // Fallback to product image
    if (product.images && product.images.length > 0) {
      const img = product.images[0];
      if (img.startsWith("http")) return img;
      return `https://asnhfgfhidhzswqkhpzz.supabase.co/storage/v1/object/public/product-images/${img}`;
    }
    return "/placeholder.svg";
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {product.sizes.map((size, index) => {
        const sizeId = `${size.size_value}-${size.size_unit}`;
        const sizeSKU = `${size.sku} - ${size.id}` || "";
        const isOutOfStock = size.stock <= 0;
        const isMaxReached = quantity[size.id] >= size.stock;
        const isSelected = selectedSizes.includes(sizeId);
        // Always use case price - unit price is just for reference
        const unitPrice = size.price;
        const totalPrice = unitPrice * (quantity[size.id] || 1);
        const imageUrl = getSizeImageUrl(size);

        return (
          <div
            key={index}
            className={`relative bg-white rounded-xl overflow-hidden transition-all duration-300 cursor-pointer border-2 ${
              isSelected
                ? "border-blue-500 ring-2 ring-blue-200 shadow-lg"
                : isOutOfStock
                ? "border-gray-200 opacity-50 cursor-not-allowed"
                : "border-gray-200 hover:border-blue-300 hover:shadow-md"
            }`}
            onClick={() => {
              if (!isOutOfStock) {
                handleSizeToggle(sizeId, size.stock);
                handleSizeToggleSKU(sizeSKU, size.stock);
              }
            }}
          >
            {/* Selection Check */}
            {isSelected && (
              <div className="absolute top-2 left-2 z-10">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}

            {/* Stock Badge */}
            <div className="absolute top-2 right-2 z-10">
              {isOutOfStock ? (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                  Out of Stock
                </Badge>
              ) : size.stock < 5 ? (
                <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5">
                  Only {size.stock} left
                </Badge>
              ) : (
                <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">
                  In Stock
                </Badge>
              )}
            </div>

            {/* Discount Badge */}
            {size.originalPrice > 0 && (
              <div className="absolute top-8 right-2 z-10">
                <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0.5">
                  {Math.round(((size.originalPrice - size.price) / size.originalPrice) * 100)}% OFF
                </Badge>
              </div>
            )}

            {/* Product Image */}
            <div className="aspect-square bg-gray-50 p-3 relative">
              <img
                src={imageUrl}
                alt={`${size.size_value} ${size.size_unit}`}
                className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>

            {/* Card Content */}
            <div className="p-3 space-y-2 bg-white">
              {/* Size Name */}
              <div className="text-center">
                <h4 className="font-bold text-sm text-gray-900 truncate uppercase">
                  {size.size_value}
                </h4>
                {size.unitToggle && (
                  <span className="text-xs text-gray-500">{size.size_unit}</span>
                )}
              </div>

              {/* SKU */}
              {size.sku && (
                <p className="text-[10px] text-gray-400 text-center truncate">
                  SKU: {size.sku}
                </p>
              )}

              {/* Qty per Case */}
              {size.quantity_per_case > 0 && (
                <div className="flex justify-center">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {size.quantity_per_case}/case
                  </Badge>
                </div>
              )}

              {/* Price */}
              <div className="text-center pt-2 border-t border-gray-100">
                <div className="text-lg font-black text-emerald-600">
                  ${formatPrice(totalPrice)}
                </div>
                {size.originalPrice > 0 && (
                  <span className="text-xs line-through text-gray-400">
                    ${formatPrice(size.originalPrice)}
                  </span>
                )}
              </div>

              {/* Case/Unit - Case is purchasable, Unit is reference only */}
              {isSelected && (size.case || size.unit) && (
                <div className="flex gap-1 pt-2" onClick={(e) => e.stopPropagation()}>
                  {size.case && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      Case
                    </Button>
                  )}
                  {size.unit && size.price_per_case && (
                    <div className="flex-1 h-7 flex items-center justify-center bg-gray-100 rounded-md border border-gray-200 text-gray-500 text-[10px]">
                      Unit ${size.price_per_case?.toFixed(2)}
                      <span className="ml-0.5 text-[8px]">(ref)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity Controls - Show when selected */}
              {isSelected && (
                <div className="pt-2 border-t border-dashed border-blue-200" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full border-blue-300 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDecreaseQuantity(size.id);
                      }}
                      disabled={quantity[size.id] <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center font-bold text-sm">
                      {quantity[size.id] || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full border-blue-300 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onIncreaseQuantity(size.id);
                      }}
                      disabled={isMaxReached}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {/* Subtotal */}
                  <div className="mt-2 bg-blue-50 rounded-lg px-2 py-1.5 text-center">
                    <span className="text-[10px] text-blue-600">Subtotal: </span>
                    <span className="text-sm font-bold text-emerald-700">
                      ${formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>
              )}

              {/* Add Button - Show when not selected */}
              {!isSelected && !isOutOfStock && (
                <Button
                  className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSizeToggle(sizeId, size.stock);
                    handleSizeToggleSKU(sizeSKU, size.stock);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
