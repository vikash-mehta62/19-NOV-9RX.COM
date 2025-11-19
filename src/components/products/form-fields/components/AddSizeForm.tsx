"use client"

import { FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Package, DollarSign, Truck, CheckSquare, Warehouse, Hash } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORY_CONFIGS } from "@/App";
import type { NewSizeState } from "../../types/size.types"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect } from "react"

interface AddSizeFormProps {
  newSize: NewSizeState
  onSizeChange: (newSize: NewSizeState) => void
  onAddSize: () => void
  setNewSize: (boolean) => void
  category: string
}

export const AddSizeForm = ({
  newSize,
  onSizeChange,
  onAddSize,
  category,
}: AddSizeFormProps) => {
  const categoryConfig =
    CATEGORY_CONFIGS[category as keyof typeof CATEGORY_CONFIGS] ||
    CATEGORY_CONFIGS.OTHER

  // 🔥 Auto-calculate price per unit when related fields change
  const handleFieldChange = (field: string, value: string | boolean) => {
    let updatedSize = { ...newSize, [field]: value };

    // Calculate price per unit if price, quantity_per_case, or rolls_per_case changes
    if (field === "price" || field === "quantity_per_case" || field === "rolls_per_case") {
      const price = field === "price" ? parseFloat(value as string) : parseFloat(newSize.price);
      const quantity = field === "quantity_per_case" ? parseFloat(value as string) : parseFloat(newSize.quantity_per_case || "1");
      const rolls = field === "rolls_per_case" ? parseFloat(value as string) : parseFloat(newSize.rolls_per_case || "1");

      let pricePerUnit = 0;

      // Different calculation based on category
      if (categoryConfig?.hasRolls && rolls > 0) {
        // For categories with rolls (like RX LABELS)
        pricePerUnit = price / (rolls * quantity);
      } else if (quantity > 0) {
        // For regular categories
        pricePerUnit = price / quantity;
      }

      updatedSize = {
        ...updatedSize,
        price_per_case: pricePerUnit.toFixed(2)
      };
    }

    onSizeChange(updatedSize);
  };

  return (
    <Card className="border border-dashed border-purple-300 bg-white/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">

          {/* ➤ Size and Unit in one row */}
          <div className="flex gap-2 items-end">
            <div className="w-3/4">
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Size <span className="text-red-500">*</span>
              </FormLabel>
              <Input
                type="text"
                value={newSize.size_value}
                onChange={(e) => handleFieldChange("size_value", e.target.value)}
                placeholder="500"
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="w-1/4">
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Unit
              </FormLabel>
              <Select
                value={newSize.size_unit}
                onValueChange={(value) => handleFieldChange("size_unit", value)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryConfig?.sizeUnits.map((unit) => (
                    <SelectItem key={unit} value={unit} className="uppercase">
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ➤ All other fields in grid layout */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* SKU */}
            <div>
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                SKU
              </FormLabel>
              <Input
                type="text"
                value={newSize.sku}
                onChange={(e) => handleFieldChange("sku", e.target.value)}
                placeholder="SKU-001"
                className="h-9 text-sm font-mono"
              />
            </div>

            {/* Stock */}
            <div>
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                <Warehouse className="h-3 w-3" />
                Stock
              </FormLabel>
              <Input
                type="number"
                value={newSize.stock}
                onChange={(e) => handleFieldChange("stock", e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                min="0"
              />
            </div>

            {/* Quantity per Case */}
            <div>
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {category === "RX LABELS" ? "Q.Per Roll" : "Q.Per Case"}
              </FormLabel>
              <Input
                type="number"
                value={newSize.quantity_per_case}
                onChange={(e) => handleFieldChange("quantity_per_case", e.target.value)}
                placeholder="100"
                className="h-9 text-sm bg-yellow-50 border-yellow-300"
                min="1"
              />
            </div>

            {/* Rolls per Case - Conditional */}
            {categoryConfig?.hasRolls && (
              <div>
                <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Rolls/CS
                </FormLabel>
                <Input
                  type="number"
                  value={newSize.rolls_per_case}
                  onChange={(e) => handleFieldChange("rolls_per_case", e.target.value)}
                  placeholder="18"
                  className="h-9 text-sm bg-yellow-50 border-yellow-300"
                  min="0"
                />
              </div>
            )}

            {/* Price Per Case */}
            <div>
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                $/CS <span className="text-red-500">*</span>
              </FormLabel>
              <Input
                type="number"
                value={newSize.price}
                onChange={(e) => handleFieldChange("price", e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="h-9 text-sm bg-green-50 border-green-300"
                min="0"
                required
              />
            </div>

            {/* Price Per Unit - AUTO CALCULATED */}
            <div>
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                <Package className="h-3 w-3" />
                $/Unit <span className="text-xs text-gray-500">(Auto)</span>
              </FormLabel>
              <Input
                type="number"
                value={newSize.price_per_case}
                readOnly
                className="h-9 text-sm bg-gray-100 cursor-not-allowed font-semibold text-blue-600"
                placeholder="Auto-calculated"
              />
            </div>

            {/* Shipping Cost */}
            <div>
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                <Truck className="h-3 w-3" />
                Ship/CS
              </FormLabel>
              <Input
                type="number"
                value={newSize.shipping_cost}
                onChange={(e) => handleFieldChange("shipping_cost", e.target.value)}
                placeholder="15.00"
                step="0.01"
                className="h-9 text-sm"
                min="0"
              />
            </div>

            {/* Size Sequence */}
            <div>
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                <Hash className="h-3 w-3" />
                Sequence
              </FormLabel>
              <Input
                type="number"
                value={newSize.sizeSquanence}
                onChange={(e) => handleFieldChange("sizeSquanence", e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                min="0"
              />
            </div>

            {/* Sell Type Checkboxes */}
            <div>
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex gap-1">
                <CheckSquare className="h-3 w-3" />
                Sell Type
              </FormLabel>
              <div className="flex flex-col gap-1 text-xs text-gray-700 mt-1">
                <label className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                  <input
                    type="checkbox"
                    checked={newSize.unit}
                    onChange={(e) => handleFieldChange("unit", e.target.checked)}
                    className="cursor-pointer"
                  />
                  Sell by Unit
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                  <input
                    type="checkbox"
                    checked={newSize.case}
                    onChange={(e) => handleFieldChange("case", e.target.checked)}
                    className="cursor-pointer"
                  />
                  Sell by Case
                </label>
              </div>
            </div>





            {/* NDC Code */}
            <div>
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                NDC Code
              </FormLabel>
              <Input
                type="text"
                value={newSize.ndcCode}
                onChange={(e) => handleFieldChange("ndcCode", e.target.value)}
                placeholder="12345-678-90"
                className="h-9 text-sm font-mono"
              />
            </div>

            {/* UPC Code */}
            <div>
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                UPC Code
              </FormLabel>
              <Input
                type="text"
                value={newSize.upcCode}
                onChange={(e) => handleFieldChange("upcCode", e.target.value)}
                placeholder="012345678901"
                className="h-9 text-sm font-mono"
              />
            </div>

            {/* Lot Number */}
            <div>
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Lot Number
              </FormLabel>
              <Input
                type="text"
                value={newSize.lotNumber}
                onChange={(e) => handleFieldChange("lotNumber", e.target.value)}
                placeholder="LOT-2024-001"
                className="h-9 text-sm"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Expiry Date
              </FormLabel>
              <Input
                type="date"
                value={newSize.exipry}
                onChange={(e) => handleFieldChange("exipry", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            {/* Add Button */}
            <div className="flex items-end col-span-2 md:col-span-1">
              <Button
                type="button"
                onClick={onAddSize}
                disabled={!newSize.size_value || !newSize.price}
                className="h-9 w-full md:w-auto px-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Size
              </Button>
            </div>
          </div>

          {/* Price Calculation Info */}
          {newSize.price && newSize.quantity_per_case && (
            <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                💡 <strong>Price Calculation:</strong>
                {categoryConfig?.hasRolls && newSize.rolls_per_case
                  ? ` $${newSize.price} ÷ (${newSize.rolls_per_case} rolls × ${newSize.quantity_per_case} qty) = $${newSize.price_per_case}/unit`
                  : ` $${newSize.price} ÷ ${newSize.quantity_per_case} qty = $${newSize.price_per_case}/unit`
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}