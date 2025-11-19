
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../schemas/productSchema";
import { Plus, X } from "lucide-react";
import { useState } from "react";

interface SizeVariationFieldProps {
  form: UseFormReturn<ProductFormValues>;
}

export const SizeVariationField = ({ form }: SizeVariationFieldProps) => {
  const [newSize, setNewSize] = useState({
    name: "",
    sku: "",
    size_value: "",
    size_unit: "",
    price: "",
    pricePerCase: "",
    stock: ""
  });

  const handleAddSize = () => {
    if (!newSize.size_value || !newSize.size_unit || !newSize.price) {
      form.setError("sizes", {
        message: "Please fill in all required fields"
      });
      return;
    }

    const currentSizes = form.getValues("sizes") || [];
    form.setValue("sizes", [...currentSizes, {
      size_value: newSize.size_value,
      sku: newSize.sku || "",
      size_unit: newSize.size_unit,
      price: parseFloat(newSize.price),
      pricePerCase: parseFloat(newSize.pricePerCase) || 0,
      stock: parseInt(newSize.stock) || 0
    }]);

    // Reset form
    setNewSize({
      name: "",
      size_value: "",
      size_unit: "",
      price: "",
      sku:"",
      pricePerCase: "",
      stock: "0"
    });
  };

  const handleRemoveSize = (index: number) => {
    const currentSizes = form.getValues("sizes") || [];
    const newSizes = [...currentSizes];
    newSizes.splice(index, 1);
    form.setValue("sizes", newSizes);
  };

  const handleStockChange = (index: number, newStock: string) => {
    const currentSizes = form.getValues("sizes") || [];
    const updatedSizes = [...currentSizes];
    updatedSizes[index] = {
      ...updatedSizes[index],
      stock: parseInt(newStock) || 0
    };
    form.setValue("sizes", updatedSizes);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4 items-end">
        <div>
          <FormLabel>Size Value</FormLabel>
          <Input
            type="text"
            value={newSize.size_value}
            onChange={(e) => setNewSize({ ...newSize, size_value: e.target.value })}
            placeholder="e.g., Small"
          />
        </div>
        <div>
          <FormLabel>Unit</FormLabel>
          <Input
            value={newSize.size_unit}
            onChange={(e) => setNewSize({ ...newSize, size_unit: e.target.value })}
            placeholder="e.g., ml"
          />
        </div>
        <div>
          <FormLabel>Unit Price</FormLabel>
          <Input
            type="number"
            value={newSize.price}
            onChange={(e) => setNewSize({ ...newSize, price: e.target.value })}
            placeholder="0.00"
          />
        </div>
        <div>
          <FormLabel>Stock</FormLabel>
          <Input
            type="number"
            value={newSize.stock}
            onChange={(e) => setNewSize({ ...newSize, stock: e.target.value })}
            placeholder="0"
            min="0"
          />
        </div>
        <Button
          type="button"
          onClick={handleAddSize}
          className="flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Size
        </Button>
      </div>

      <FormField
        control={form.control}
        name="sizes"
        render={({ field }) => (
          <FormItem>
            <div className="space-y-2">
              {field.value?.map((size, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-secondary/10"
                >
                  <div className="grid grid-cols-4 gap-6 flex-1">
                    <div>
                      <span className="text-sm font-medium">Size</span>
                      <p className="text-sm">{size.size_value} {size.size_unit}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Unit Price</span>
                      <p className="text-sm">${size.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Stock</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={size.stock}
                          onChange={(e) => handleStockChange(index, e.target.value)}
                          className="h-8 w-24"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSize(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
