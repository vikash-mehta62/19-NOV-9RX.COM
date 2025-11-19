
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../schemas/productSchema";
import { Card } from "@/components/ui/card";
import { SizeVariationField } from "./SizeVariationField";

interface InventorySectionProps {
  form: UseFormReturn<ProductFormValues>;
}

export const InventorySection = ({ form }: InventorySectionProps) => {
  const trackInventory = form.watch("trackInventory");

  return (
    <Card className="p-6 space-y-6 hidden">
      <div>
        <h3 className="text-lg font-semibold mb-2">Inventory Management</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure how you want to track and manage this product's inventory
        </p>
      </div>

      <FormField
        control={form.control}
        name="trackInventory"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-secondary/10">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel className="text-base">Enable Inventory Tracking</FormLabel>
              <FormDescription>
                Track stock levels and receive notifications when inventory is low
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      {trackInventory && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="current_stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Stock</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    placeholder="Enter current stock"
                    min="0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="min_stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Stock Level</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    placeholder="Enter minimum stock"
                    min="0"
                  />
                </FormControl>
                <FormDescription>
                  Get alerts when stock falls below this level
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reorder_point"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reorder Point</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    placeholder="Enter reorder point"
                    min="0"
                  />
                </FormControl>
                <FormDescription>
                  Stock level at which to reorder inventory
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* <div className="space-y-4">
        <div>
          <h4 className="text-base font-medium mb-4">Size Variations</h4>
          <SizeVariationField form={form} />
        </div>
      </div> */}
    </Card>
  );
};
