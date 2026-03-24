  "use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Edit3, Package, DollarSign, Warehouse, BarChart3, Printer, Save } from "lucide-react";
import { SizeImageUploader } from "../SizeImageUploader";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { generateSingleProductLabelPDF } from "@/utils/size-lable-download";
import { supabase } from "@/integrations/supabase/client";
import Select from "react-select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type CategorySizingConfig = {
  sizeUnits: string[];
  defaultUnit: string;
  hasRolls: boolean;
  requiresCase: boolean;
};

interface Size {
  id?: string; // Add ID field to track if size is saved in DB
  product_id?: string; // Add product_id field
  size_name?: string;
  size_value: string;
  size_unit: string;
  price: number;
  sku?: string;
  pricePerCase?: number | string | null;
  price_per_case?: number;
  stock: number;
  quantity_per_case: number;
  rolls_per_case?: number;
  sizeSquanence?: number;
  shipping_cost?: number;
  groupIds?: string[];
  disAllogroupIds?: string[];
  unit?: boolean;
  case?: boolean;
  ndcCode?: string;
  upcCode?: string;
  lotNumber?: string;
  exipry?: string;
  image?: string;
}

interface ProductFormAdapter {
  getValues: (field?: string) => unknown;
  watch: (field: string) => unknown;
  setValue: (field: string, value: unknown) => void;
}

interface SizeListProps {
  sizes: Size[];
  onRemoveSize: (index: number) => void;
  setNewSize: (boolean: boolean) => void;
  onUpdateSize: (index: number, field: string, value: string | number | boolean | string[]) => void;
  category: string;
  productName?: string;
  categoryConfig: CategorySizingConfig;
  form?: ProductFormAdapter;
  productId?: string; // Add productId prop
}

const calculateUnitPrice = (size: {
  price?: number | string;
  quantity_per_case?: number | string;
  rolls_per_case?: number | string;
}, hasRolls: boolean) => {
  const price = Number(size.price) || 0;
  const quantity = Number(size.quantity_per_case) || 0;
  const rolls = Number(size.rolls_per_case) || 1;

  if (quantity <= 0) return 0;

  if (hasRolls) {
    return rolls > 0 ? Number((price / (rolls * quantity)).toFixed(2)) : 0;
  }

  return Number((price / quantity).toFixed(2));
};


export const SizeList = ({
  sizes = [],
  onRemoveSize,
  onUpdateSize,
  category,
  productName,
  categoryConfig,
  setNewSize,
  form,
  productId, // Add productId parameter
}: SizeListProps) => {

  // State hooks - ALWAYS keep at top
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [originalSizes, setOriginalSizes] = useState<Size[]>([]); // Track original size values
  
  // Form values - ye bhi top pe
  const productUPCcode = String(form?.getValues("upcCode") || "");
  const productNdcCode = String(form?.getValues("ndcCode") || "");
  const productExpiry = String(form?.getValues("unitToggle") || "");
  const productLotNumber = String(form?.getValues("lotNumber") || "");
  const isUnitToggle = Boolean(form?.watch("unitToggle"));

  // Store original sizes when component mounts or sizes change
  useEffect(() => {
    if (sizes.length > 0 && originalSizes.length === 0) {
      setOriginalSizes(JSON.parse(JSON.stringify(sizes)));
    }
  }, [sizes]);

  // Function to check if a size has been modified
  const isSizeModified = (index: number, size: Size): boolean => {
    if (!size.id) return false; // New sizes don't show Update button
    
    const original = originalSizes[index];
    if (!original) return false;

    // Compare relevant fields
    return (
      original.size_name !== size.size_name ||
      original.size_value !== size.size_value ||
      original.size_unit !== size.size_unit ||
      original.price !== size.price ||
      original.sku !== size.sku ||
      original.stock !== size.stock ||
      original.quantity_per_case !== size.quantity_per_case ||
      original.rolls_per_case !== size.rolls_per_case ||
      original.shipping_cost !== size.shipping_cost ||
      original.ndcCode !== size.ndcCode ||
      original.upcCode !== size.upcCode ||
      original.lotNumber !== size.lotNumber ||
      original.exipry !== size.exipry ||
      original.image !== size.image ||
      JSON.stringify(original.groupIds || []) !== JSON.stringify(size.groupIds || []) ||
      JSON.stringify(original.disAllogroupIds || []) !== JSON.stringify(size.disAllogroupIds || [])
    );
  };

  console.log(productId)
  const handleSaveOrUpdateSize = async (index: number, size: Size) => {
    // Use passed productId prop first, then fallback to other sources
    const sizeProductId = size.product_id;
    const finalProductId = productId || sizeProductId;

    console.log("[SIZELIST]: Prop Product ID:", productId);
    console.log("[SIZELIST]: Size Product ID:", sizeProductId);
    console.log("[SIZELIST]: Final Product ID:", finalProductId);
    console.log("[SIZELIST]: Size data:", size);
    console.log("[SIZELIST]: Size has ID?", !!size.id, "ID:", size.id);

    if (!finalProductId) {
      console.error("[SIZELIST]: Product ID not found!");
      toast({
        title: "Error",
        description: "Product ID not found. Please save the product first.",
        variant: "destructive",
      });
      return;
    }

    console.log("[SIZELIST]: Starting save/update for size index:", index);
    setSavingIndex(index);

    try {
      const sizeData = {
        product_id: finalProductId,
        size_name: size.size_name || "",
        size_value: size.size_value,
        size_unit: size.size_unit,
        price: size.price,
        sku: size.sku || "",
        stock: size.stock,
        quantity_per_case: size.quantity_per_case,
        rolls_per_case: size.rolls_per_case || null,
        price_per_case: calculateUnitPrice(size, categoryConfig?.hasRolls),
        shipping_cost: size.shipping_cost || 0,
        image: size.image || "",
        unit: size.unit || false,
        case: size.case || false,
        ndcCode: size.ndcCode || "",
        upcCode: size.upcCode || "",
        lotNumber: size.lotNumber || "",
        exipry: size.exipry || null,
        groupIds: size.groupIds || [],
        disAllogroupIds: size.disAllogroupIds || [],
        sizeSquanence: size.sizeSquanence?.toString() || "0",
        is_active: true,
      };

      console.log("[SIZELIST]: Size data to save:", sizeData);

      if (size.id) {
        console.log("[SIZELIST]: Updating existing size with ID:", size.id);
        // Update existing size
        const { error } = await supabase
          .from("product_sizes")
          .update(sizeData)
          .eq("id", size.id);

        if (error) {
          console.error("[SIZELIST]: Update error:", error);
          throw error;
        }

        console.log("[SIZELIST]: Size updated successfully");
        toast({
          title: "Success",
          description: "Size updated successfully",
        });

        // Update original sizes after successful update
        const updatedOriginals = [...originalSizes];
        updatedOriginals[index] = JSON.parse(JSON.stringify(size));
        setOriginalSizes(updatedOriginals);
      } else {
        console.log("[SIZELIST]: Inserting new size");
        // Insert new size
        const { data, error } = await supabase
          .from("product_sizes")
          .insert([sizeData])
          .select()
          .single();

        if (error) {
          console.error("[SIZELIST]: Insert error:", error);
          throw error;
        }

        console.log("[SIZELIST]: Size inserted successfully, new ID:", data.id);
        // Update the size with the new ID
        onUpdateSize(index, "id", data.id);

        // Add to original sizes after successful insert
        const updatedOriginals = [...originalSizes];
        updatedOriginals[index] = JSON.parse(JSON.stringify({ ...size, id: data.id }));
        setOriginalSizes(updatedOriginals);

        toast({
          title: "Success",
          description: "Size saved successfully",
        });
      }
    } catch (error: any) {
      console.error("[SIZELIST]: Save/Update failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save size",
        variant: "destructive",
      });
    } finally {
      setSavingIndex(null);
      console.log("[SIZELIST]: Save/Update process completed");
    }
  };

  // ⚠️ useEffect MUST be before any return statement
  useEffect(() => {
    // Define function inside useEffect to avoid re-creation
    const fetchPharmacies = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, company_name, first_name, last_name, display_name, email")
          .eq("type", "pharmacy")
          .eq("status", "active");

        console.log(data, "DATA PHARMACY")
        
        if (error) throw error;
        
        // Map and sort pharmacies by name
        const pharmacies = (data || [])
          .map(p => {
            // Priority: company_name > display_name > first_name + last_name > email
            let name = "";
            if (!name) name = p.display_name?.trim();
            if (!name && (p.first_name || p.last_name)) {
              name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
            }
            if (!name) name = p.email?.split('@')[0] || 'Unnamed Pharmacy';
            
            return { id: p.id, name };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setGroups(pharmacies);
      } catch (error) {
        console.error("Error fetching pharmacies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacies();
  }, []); // Empty dependency array - sirf component mount pe chalega

  // ✅ Ab aap conditional return kar sakte ho
  if (sizes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No size variations added yet</p>
        <p className="text-xs text-gray-400">Add your first size variation above</p>
      </div>
    );
  }

  // Main component render
  return (
    <div className="space-y-3">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Size Variations ({sizes.length})
        </h4>


      <div className="flex items-center gap-1">
  <span className="text-xs text-gray-500">Unit</span>
  <Switch
    checked={isUnitToggle}
    onCheckedChange={(val) => form?.setValue("unitToggle", val)}
  />
</div>

      </div>

      {/* Size Cards Mapping */}
      {sizes.map((size, index) => {
        const resolvedProductName = String(size.size_name || productName || form?.getValues("name") || "Product");
        return (
          <Card
            key={index}
            className="border border-gray-200 hover:border-purple-300 transition-all duration-200 bg-white/80 backdrop-blur-sm"
          >
            <CardContent className="p-4">
              <div className="mb-2">
                <p className="text-sm font-semibold text-gray-900">
                  {resolvedProductName}
                </p>
              </div>

              {/* Single Line Display - Collapsed View */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4 flex-1">
                  {/* Size Badge */}
                  <Badge className="bg-gradient-to-r text-white px-3 py-1 text-sm font-medium text-black">
                    {size.size_value} {isUnitToggle ? size.size_unit : ""}
                  </Badge>

                  {/* SKU Badge */}
                  {size.sku && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {size.sku}
                    </Badge>
                  )}

                  {/* Price Information */}
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <DollarSign className="h-3 w-3" />${size.price}/CS
                    </span>
                    <span className="flex items-center gap-1 text-blue-600 font-medium">
                      <Package className="h-3 w-3" />${calculateUnitPrice(size, categoryConfig?.hasRolls)}/Unit
                    </span>
                    <span className="flex items-center gap-1 text-orange-600 font-medium">
                      <Warehouse className="h-3 w-3" />
                      {size.stock} Stock
                    </span>
                  </div>

                  {/* Conditional Rolls Display */}
                  {categoryConfig?.hasRolls && size.rolls_per_case && (
                    <Badge variant="secondary" className="text-xs">
                      {size.rolls_per_case} Rolls/CS
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Save/Update Button - Only show Update if size is modified */}
                  {(!size.id || isSizeModified(index, size)) && (
                    <Button
                      type="button"
                      variant={size.id ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleSaveOrUpdateSize(index, size)}
                      disabled={savingIndex === index}
                      className={`h-8 px-3 text-xs font-medium ${
                        size.id 
                          ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {savingIndex === index ? "Saving..." : size.id ? "Update" : "Save"}
                    </Button>
                  )}

                  {/* Download Label Button */}
                  <div className="flex items-center gap-2">
                    {/* Toggle for unit */}


                    {/* Download Label */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await generateSingleProductLabelPDF(
                            resolvedProductName,
                            { ...size, isUnit: isUnitToggle },
                            isUnitToggle
                          );
                          console.log(`Label for ${size} downloaded!`);
                        } catch (error) {
                          console.error("Failed to download label:", error);
                        }
                      }}
                      className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                      title="Download Label"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Edit Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>

                  {/* Delete Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveSize(index)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Expanded Edit Form - Shows when editing */}
              {editingIndex === index && (
                <div className="border-t pt-4 mt-4 bg-gray-50/50 -mx-4 px-4 pb-4 rounded-b-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Product Name
                      </label>
                      <Input
                        type="text"
                        value={size.size_name || ""}
                        onChange={(e) => onUpdateSize(index, "size_name", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Size Value Input */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Size Value
                      </label>
                      <Input
                        type="text"
                        value={size.size_value}
                        onChange={(e) => onUpdateSize(index, "size_value", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* SKU Input */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        SKU
                      </label>
                      <Input
                        type="text"
                        value={size.sku || ""}
                        onChange={(e) => onUpdateSize(index, "sku", e.target.value)}
                        className="h-8 text-sm font-mono"
                      />
                    </div>

                    {/* Price per Case */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        $/CS
                      </label>
                      <Input
                        type="number"
                        value={size.price}
                        onChange={(e) => onUpdateSize(index, "price", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    {/* Price per Unit */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        $/Unit
                      </label>
                      <Input
                        type="number"
                        value={calculateUnitPrice(size, categoryConfig?.hasRolls)}
                        readOnly
                        disabled
                        className="h-8 text-sm bg-gray-100 text-blue-600 cursor-not-allowed"
                      />
                    </div>

                    {/* Stock Input */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Stock
                      </label>
                      <Input
                        type="number"
                        value={size.stock}
                        onChange={(e) => onUpdateSize(index, "stock", parseInt(e.target.value) || 0)}
                        className="h-8 text-sm"
                        min="0"
                      />
                    </div>

                    {/* Quantity per Case */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        {category === "RX LABELS" ? "Q.Per Roll" : "Q.Per Case"}
                      </label>
                      <Input
                        type="number"
                        value={size.quantity_per_case || 15}
                        onChange={(e) => onUpdateSize(index, "quantity_per_case", parseInt(e.target.value) || 0)}
                        className="h-8 text-sm"
                        min="0"
                        step="1"
                      />
                    </div>

                    {/* Shipping Cost */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Shipping/CS
                      </label>
                      <Input
                        type="number"
                        value={size.shipping_cost || 0}
                        onChange={(e) => onUpdateSize(index, "shipping_cost", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    {/* Size Sequence */}
                    {/* <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Sequence
                    </label>
                    <Input
                      type="number"
                      value={size.sizeSquanence || 0}
                      onChange={(e) => onUpdateSize(index, "sizeSquanence", parseInt(e.target.value) || 0)}
                      className="h-8 text-sm"
                      min="0"
                    />
                  </div> */}

                    {/* Conditional Rolls per Case */}
                    {categoryConfig?.hasRolls && (
                      <div>
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Rolls/CS
                        </label>
                        <Input
                          type="number"
                          value={size.rolls_per_case || 0}
                          onChange={(e) => onUpdateSize(index, "rolls_per_case", parseInt(e.target.value) || 0)}
                          className="h-8 text-sm"
                          min="0"
                        />
                      </div>
                    )}





                    {/* NDC Code Input */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        NDC Code
                      </label>
                      <Input
                        type="text"
                        value={size.ndcCode || ""}
                        onChange={(e) => onUpdateSize(index, "ndcCode", e.target.value)}
                        className="h-8 text-sm font-mono"
                        placeholder="12345-678-90"
                      />
                    </div>

                    {/* UPC Code Input */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        UPC Code
                      </label>
                      <Input
                        type="text"
                        value={size.upcCode || ""}
                        onChange={(e) => onUpdateSize(index, "upcCode", e.target.value)}
                        className="h-8 text-sm font-mono"
                        placeholder="012345678901"
                      />
                    </div>

                    {/* Lot Number Input */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Lot Number
                      </label>
                      <Input
                        type="text"
                        value={size.lotNumber || ""}
                        onChange={(e) => onUpdateSize(index, "lotNumber", e.target.value)}
                        className="h-8 text-sm"
                        placeholder="LOT-2024-001"
                      />
                    </div>

                    {/* Expiry Date Input */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Expiry Date
                      </label>
                      <Input
                        type="date"
                        value={size.exipry || ""}
                        onChange={(e) => onUpdateSize(index, "exipry", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    {/* Allowed Pharmacies Multi-Select */}
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1 block">
                        Allowed Pharmacies
                      </label>
                      <Select
                        isMulti
                        isLoading={loading}
                        options={groups.map((group) => ({
                          label: group.name,
                          value: group.id,
                        }))}
                        value={(size.groupIds || []).map((id) => {
                          const group = groups.find((g) => g.id === id);
                          return group ? { label: group.name, value: group.id } : null;
                        }).filter(Boolean)}
                        onChange={(selected) => {
                          const selectedIds = selected ? selected.map((option) => option.value) : [];
                          onUpdateSize(index, "groupIds", selectedIds);
                        }}
                        className="react-select-container text-sm"
                        classNamePrefix="react-select"
                        placeholder="Select pharmacies..."
                      />
                    </div>

                    {/* Disallowed Pharmacies Multi-Select */}
                    {/* <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1 block">
                        Disallowed Pharmacies
                      </label>
                      <Select
                        isMulti
                        isLoading={loading}
                        options={groups.map((group) => ({
                          label: group.name,
                          value: group.id,
                        }))}
                        value={(size.disAllogroupIds || []).map((id) => {
                          const group = groups.find((g) => g.id === id);
                          return group ? { label: group.name, value: group.id } : null;
                        }).filter(Boolean)}
                        onChange={(selected) => {
                          const selectedIds = selected ? selected.map((option) => option.value) : [];
                          onUpdateSize(index, "disAllogroupIds", selectedIds);
                        }}
                        className="react-select-container text-sm"
                        classNamePrefix="react-select"
                        placeholder="Select pharmacies..."
                      />
                    </div> */}
                  </div>

                  {/* Image Uploader Section */}
                  <div className="mt-4">
                    <SizeImageUploader
                      form={size}
                      indexValue={index}
                      onUpdateSize={onUpdateSize}
                      validateImage={(file) => {
                        const maxSize = 5 * 1024 * 1024; // 5MB
                        if (file.size > maxSize) {
                          return "Image size should be less than 5MB";
                        }
                        const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
                        if (!allowedTypes.includes(file.type)) {
                          return "Only JPG, PNG and GIF images are allowed";
                        }
                        return null;
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  );
};

