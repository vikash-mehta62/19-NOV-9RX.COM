import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductDetails } from "../../types/product.types";
import { formatPrice } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";

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
    if (stock <= 0) return; // Prevent selection of out-of-stock items

    if (selectedSizes.includes(sizeId)) {
      onSizeSelect?.(selectedSizes.filter((s) => s !== sizeId));
    } else {
      onSizeSelect?.([...selectedSizes, sizeId]);
    }
  };

  const handleSizeToggleSKU = (sizeSKU: string, stock: number) => {
    if (stock <= 0) return; // Prevent selection of out-of-stock items

    if (selectedSizesSKU.includes(sizeSKU)) {
      onSizeSelectSKU?.(selectedSizesSKU.filter((s) => s !== sizeSKU));
    } else {
      onSizeSelectSKU?.([...selectedSizesSKU, sizeSKU]);
    }
  };
  const handleToggleType = (sizeId: string, type: "case" | "unit") => {
    setSelectedTypeBySize((prev) => ({ ...prev, [sizeId]: type }));
  };
  console.log(product);
  return (
    <div className="space-y-4">
      {product.sizes.map((size, index) => {
        const sizeId = `${size.size_value}-${size.size_unit}`;
        const sizeSKU = `${size.sku} - ${size.id}` || "";
        const isOutOfStock = size.stock <= 0;
        const isMaxReached = quantity[size.id] >= size.stock;
        const selectedType = selectedTypeBySize[sizeId] || "case";
        const unitPrice =
          selectedType === "case" ? size.price : size.price_per_case;
        const totalPrice = unitPrice * (quantity[size.id] || 1);

        return (
          <Card
            key={index}
            className={`relative p-5 transition-transform transform hover:scale-105 hover:shadow-xl rounded-2xl ${
              isOutOfStock ? "opacity-50 cursor-not-allowed" : "bg-white"
            }`}
          >
            {/* In Stock Badge */}
            {!isOutOfStock && (
              <span className="absolute top-3 right-3 bg-green-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {size.stock < 5 ? `Only ${size.stock} left` : "In Stock"}
              </span>
            )}

            <div className="flex items-start space-x-4">
              <Checkbox
                id={`size-${index}`}
                checked={selectedSizes.includes(sizeId)}
                onCheckedChange={() => {
                  handleSizeToggle(sizeId, size.stock);
                  handleSizeToggleSKU(sizeSKU, size.stock);
                }}
                disabled={isOutOfStock}
                className="mt-1"
              />

              <Label
                htmlFor={`size-${index}`}
                className="flex-1 cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-100">
                    <div>
                      <p className="text-base font-semibold text-gray-900 uppercase">
                        {size.size_value}{" "}
                        {size.unitToggle ? size.size_unit : ""}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        SKU: {size.sku}{" "}
                        <span className="text-xl font-bold text-green-700 ml-2">
                          ${formatPrice(totalPrice)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-1">
                    {size.quantity_per_case}{" "}
                    {product.name === "LIQUID OVALS"
                      ? "bottles and caps per case"
                      : product.name.includes("RX PAPER BAGS")
                      ? "bags per case"
                      : product.name === "THERMAL PAPER RECEIPT ROLLS"
                      ? "Rolls per case"
                      : product.name === "LIQUID OVAL ADAPTERS"
                      ? "Bottles per case"
                      : product.name === "OINTMENT JARS"
                      ? "Jars and caps per case"
                      : product.name === "RX VIALS"
                      ? "Vials and caps per case"
                      : product.name === "RX LABELS"
                      ? `labels per roll, ${size.rolls_per_case} rolls per case`
                      : "units per case"}
                  </p>
                </div>
              </Label>
            </div>

            {/* Type & Quantity in 3-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {size.case && (
                <Button
                  variant={selectedType === "case" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggleType(sizeId, "case")}
                  className="transition-colors hover:bg-green-600 hover:text-white"
                >
                  Case
                </Button>
              )}
              {size.unit && (
                <Button
                  variant={selectedType === "unit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggleType(sizeId, "unit")}
                  className="transition-colors hover:bg-green-600 hover:text-white"
                >
                  Unit
                </Button>
              )}

              {selectedSizes.includes(sizeId) && (
                <div className="flex justify-between items-center sm:justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDecreaseQuantity(size.id)}
                    disabled={quantity[size.id] <= 1}
                    className="transition-colors hover:bg-gray-200"
                  >
                    -
                  </Button>
                  <span className="text-sm font-medium">
                    {quantity[size.id] || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onIncreaseQuantity(size.id)}
                    disabled={isMaxReached}
                    className="transition-colors hover:bg-gray-200"
                  >
                    +
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
