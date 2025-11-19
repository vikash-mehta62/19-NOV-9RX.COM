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
  setSelectedTypeBySize: React.Dispatch<React.SetStateAction<{ [sizeId: string]: "case" | "unit" }>>;
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
  setSelectedTypeBySize
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
    setSelectedTypeBySize(prev => ({ ...prev, [sizeId]: type }))
  }
  console.log(product)
  return (
    <div className="space-y-3">
      {product.sizes.map((size, index) => {
        const sizeId = `${size.size_value}-${size.size_unit}`;
        const sizeSKU = `${size.sku} - ${size.id}` || "";
        const isOutOfStock = size.stock <= 0;
        const isMaxReached = quantity[size.id] >= size.stock;

        // 🆕 Default to "case" if not set
        const selectedType = selectedTypeBySize[sizeId] || "case";

        // 🆕 Use size.price or size.price_per_unit
        const unitPrice = selectedType === "case" ? size.price : size.price_per_case;
        const totalPrice = unitPrice * (quantity[size.id] || 1);

        return (
          <Card
            key={index}
            className={`p-4 hover:shadow-md transition-shadow ${isOutOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-center space-x-3">
              <Checkbox
                id={`size-${index}`}
                checked={selectedSizes.includes(sizeId)}
                onCheckedChange={() => {
                  handleSizeToggle(sizeId, size.stock);
                  handleSizeToggleSKU(sizeSKU, size.stock);
                }}
                disabled={isOutOfStock} // Disable if out of stock
              />
              <Label htmlFor={`size-${index}`} className="flex-1 cursor-pointer">
                <div className="space-y-1">
                  <div className="flex justify-between items-center border-b py-3 px-4 bg-gray-100 rounded-lg shadow-sm">
                    {/* Size and Stock Status */}
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold uppercase text-gray-800">
                        {size.size_value}  {size.unitToggle ? size.size_unit :""}
                        
                      </span>
                      <span className="my-1">SKU:{" "}{size.sku} </span>
                      <span className={`text-sm font-medium ${isOutOfStock ? "text-red-500" : "text-green-600"}`}>
                        {isOutOfStock
                          ? "Out of Stock"
                          : size.stock < 5
                            ? `In Stock (${size.stock} available)`
                            : "In Stock"
                        }

                      </span>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-center space-x-3">
                      {/* {size.originalPrice > 0 && (
                        <p className="text-lg font-medium text-red-500 line-through">
                          ${formatPrice(size.originalPrice)}
                        </p>
                      )} */}
                      <p className="text-xl font-bold text-green-700">${formatPrice(totalPrice)}</p>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {size.quantity_per_case} {" "}
                    {
                      product.name === "LIQUID OVALS" ? "bottles and caps in one case"
                        : product.name.includes("RX PAPER BAGS") ? "bags per case"
                          : product.name === "THERMAL PAPER RECEIPT ROLLS" ? "Rolls per case"
                            : product.name === "LIQUID OVAL ADAPTERS" ? "Bottles Per Case"
                              : product.name === "OINTMENT JARS" ? "jars and caps in one case"
                                : product.name === "RX VIALS" ? "vials and caps in one case"
                                  : product.name === "RX LABELS" ? `labels per roll, ${size.rolls_per_case} rolls per case`
                                    : "units per case"
                    }
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex gap-2 items-center text-sm">
              <span className="font-medium">Type:</span>
            {size.case &&  <Button
                variant={selectedType === "case" ? "default" : "outline"}
                size="sm"
                onClick={() => handleToggleType(sizeId, "case")}
              >
                Case
              </Button>}
             {size.unit && <Button
                variant={selectedType === "unit" ? "default" : "outline"}
                size="sm"
                onClick={() => handleToggleType(sizeId, "unit")}
              >
                Unit
              </Button>}
            </div>

            {/* Quantity Controls */}
            {selectedSizes.includes(sizeId) && (
              <div className="flex items-center mt-2 space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDecreaseQuantity(size.id)}
                  disabled={quantity[size.id] <= 1}
                >
                  -
                </Button>
                <span className="text-lg font-medium">{quantity[size.id] || 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onIncreaseQuantity(size.id)}
                  disabled={isMaxReached} // Disable if max stock reached
                >
                  +
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
