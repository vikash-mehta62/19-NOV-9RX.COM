// Assuming this is in SizeOptionsField.tsx
"use client";

import { FormField, FormItem, FormMessage } from "@/components/ui/form";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { AddSizeForm } from "./components/AddSizeForm";
import { SizeList } from "./components/SizeList";
import type { SizeOptionsFieldProps, NewSizeState } from "../types/size.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler } from "lucide-react";
import { ConfirmDialog } from "./components/ConfirmDeleteSize";
import { fetchOrderedCategories } from "@/services/productTreeService";

type CategorySizingConfig = {
  sizeUnits: string[];
  defaultUnit: string;
  hasRolls: boolean;
  requiresCase: boolean;
};

const FALLBACK_CATEGORY_CONFIG: CategorySizingConfig = {
  sizeUnits: ["unit", "OZ", "mm", "mL", "cc", "inch", "gram", "dram", "ROLL"],
  defaultUnit: "unit",
  hasRolls: false,
  requiresCase: false,
};

const calculateUnitPrice = (
  size: {
    price?: number | string;
    quantity_per_case?: number | string;
    rolls_per_case?: number | string;
  },
  hasRolls: boolean
) => {
  const price = Number(size.price) || 0;
  const quantity = Number(size.quantity_per_case) || 1;
  const rolls = Number(size.rolls_per_case) || 1;

  if (hasRolls) {
    return rolls > 0 && quantity > 0 ? Number((price / (rolls * quantity)).toFixed(2)) : 0;
  }

  return quantity > 0 ? Number((price / quantity).toFixed(2)) : 0;
};

export const SizeOptionsField = ({ form }: SizeOptionsFieldProps) => {
  const category = form.watch("category");
  const productName = form.watch("name");
  const productId = form.watch("id") as string | undefined; // Get product ID from form
  const [categoryConfigMap, setCategoryConfigMap] = useState<Record<string, CategorySizingConfig>>({});

  const loadCategoryConfigs = async () => {
    try {
      const categories = await fetchOrderedCategories();
      const configMap = categories.reduce<Record<string, CategorySizingConfig>>((acc, item) => {
        acc[item.category_name] = {
          sizeUnits: (item.size_units && item.size_units.length > 0)
            ? item.size_units
            : FALLBACK_CATEGORY_CONFIG.sizeUnits,
          defaultUnit: item.default_unit || FALLBACK_CATEGORY_CONFIG.defaultUnit,
          hasRolls: Boolean(item.has_rolls),
          requiresCase: Boolean(item.requires_case),
        };
        return acc;
      }, {});

      if (!configMap.OTHER) {
        configMap.OTHER = FALLBACK_CATEGORY_CONFIG;
      }

      setCategoryConfigMap(configMap);
    } catch (error) {
      console.error("Failed to fetch category configs for size form:", error);
      setCategoryConfigMap({ OTHER: FALLBACK_CATEGORY_CONFIG });
    }
  };

  useEffect(() => {
    loadCategoryConfigs();
  }, []);

  const categoryConfig = useMemo(
    () => categoryConfigMap[category] || categoryConfigMap.OTHER || FALLBACK_CATEGORY_CONFIG,
    [category, categoryConfigMap]
  );

  const [newSize, setNewSize] = useState<NewSizeState>({
    size_name: "",
    size_value: "",
    size_unit: categoryConfig?.defaultUnit || "",
    price: "",
    sku: "",
    pricePerCase: "",
    stock: "",
    price_per_case: "",
    quantity_per_case: "100",
    rolls_per_case: "",
    shipping_cost: "0",
    image: "",
    groupIds: [], // Initialize as an empty array
    disAllogroupIds: [],
    sizeSquanence: "",
    unit: false, // default selected
    case: true,
    ndcCode: "",
    upcCode: "",
    lotNumber: "",
    exipry: "",
  });

  useEffect(() => {
    setNewSize((prev) => ({
      ...prev,
      size_unit: prev.size_unit || categoryConfig.defaultUnit,
      rolls_per_case: categoryConfig.hasRolls ? (prev.rolls_per_case || "1") : "",
    }));
  }, [categoryConfig.defaultUnit, categoryConfig.hasRolls]);

  useEffect(() => {
    const currentSizes = form.getValues("sizes") || [];
    if (currentSizes.length === 0) return;

    let hasChanges = false;
    const normalizedSizes = currentSizes.map((size) => {
      const computedUnitPrice = calculateUnitPrice(size, categoryConfig.hasRolls);

      if (Number(size.price_per_case) === computedUnitPrice) {
        return size;
      }

      hasChanges = true;
      return {
        ...size,
        price_per_case: computedUnitPrice,
      };
    });

    if (hasChanges) {
      form.setValue("sizes", normalizedSizes, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [categoryConfig.hasRolls, form]);

  const handleAddSize = () => {
    if (!newSize.size_value || !newSize.price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required size fields",
        variant: "destructive",
      });
      return;
    }

    const currentSizes = form.getValues("sizes") || [];

    // 🔥 FIX: Proper calculation based on category
    let calculatedPricePerUnit = calculateUnitPrice(
      {
        price: parseFloat(newSize.price) || 0,
        quantity_per_case: parseFloat(newSize.quantity_per_case) || 1,
        rolls_per_case: parseFloat(newSize.rolls_per_case) || 1,
      },
      categoryConfig.hasRolls
    );
    const price = parseFloat(newSize.price) || 0;
    const quantity = parseFloat(newSize.quantity_per_case) || 1;
    const rolls = parseFloat(newSize.rolls_per_case) || 1;

    // Check if category has rolls (like RX LABELS)
    if (categoryConfig?.hasRolls && rolls > 0) {
      // For categories with rolls: price ÷ (rolls × quantity)
      calculatedPricePerUnit = price / (rolls * quantity);
    } else {
      // For regular categories: price ÷ quantity
      calculatedPricePerUnit = price / quantity;
    }

    const sizeToAdd = {
      size_name: newSize.size_name || "",
      size_value: newSize.size_value,
      sku: newSize.sku || "",
      sizeSquanence: parseInt(newSize.sizeSquanence) || 0,
      image: newSize.image || "",
      size_unit: newSize.size_unit || categoryConfig.defaultUnit,
      price: price,
      stock: parseInt(newSize.stock) || 0,
      quantity_per_case: quantity,
      price_per_case: parseFloat(calculatedPricePerUnit.toFixed(2)), // 🔥 FIXED
      rolls_per_case: rolls,
      shipping_cost: parseFloat(newSize.shipping_cost) || 15,
      unit: newSize.unit || false,
      case: newSize.case || false,
      groupIds: newSize.groupIds || [],
      disAllogroupIds: newSize.disAllogroupIds || [],
      ndcCode: newSize.ndcCode || "",
      upcCode: newSize.upcCode || "",
      lotNumber: newSize.lotNumber || "",
      exipry: newSize.exipry || "",
    };

    // Validation
    if (!sizeToAdd.size_value || !sizeToAdd.size_unit) {
      toast({
        title: "Validation Error",
        description: "Size value and unit are required",
        variant: "destructive",
      });
      return;
    }

    form.setValue("sizes", [...currentSizes, sizeToAdd], {
      shouldValidate: true,
      shouldDirty: true,
    });

    // Reset form with default values
    setNewSize({
      size_name: "",
      size_value: "",
      size_unit: categoryConfig.defaultUnit,
      price: "",
      sku: "",
      pricePerCase: "",
      price_per_case: "",
      stock: "",
      quantity_per_case: "100", // Default value
      rolls_per_case: categoryConfig?.hasRolls ? "1" : "", // Default 1 for categories with rolls
      sizeSquanence: "",
      shipping_cost: "15", // Default shipping
      image: "",
      groupIds: [],
      disAllogroupIds: [],
      unit: false,
      case: true,
      ndcCode: "",
      upcCode: "",
      lotNumber: "",
      exipry: "",
    });

    toast({
      title: "Size Added",
      description: `Size ${newSize.size_value} ${newSize.size_unit} added ($/Unit: $${calculatedPricePerUnit.toFixed(2)})`,
    });
  };

  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

  const handleRemoveSize = async (index: number) => {
    setConfirmIndex(index);
  };

  const confirmDelete = async () => {
    if (confirmIndex === null) return;

    const currentSizes = form.getValues("sizes") || [];
    const newSizes = [...currentSizes];

    newSizes.splice(confirmIndex, 1);
    form.setValue("sizes", newSizes, {
      shouldValidate: true,
      shouldDirty: true,
    });

    toast({
      title: "Size Removed",
      description: "Size variation removed from form. Changes apply after product update.",
    });
    setConfirmIndex(null);
  };



  const handleUpdateSize = (
    index: number,
    field: string,
    value: string | number | boolean | string[]
  ) => {
    const currentSizes = form.getValues("sizes") || [];
    if (!currentSizes[index]) return; // safety

    const updatedSizes = [...currentSizes];
    const sizeItem = { ...updatedSizes[index] };

    // helper: safe number parsing
    const toNumber = (v: unknown) => {
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const t = v.trim();
        if (t === "") return 0;
        const n = Number.parseFloat(t);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    // Handle arrays
    if (field === "groupIds" || field === "disAllogroupIds") {
      sizeItem[field] = Array.isArray(value) ? (value as string[]) : [];
    }
    // Handle booleans
    else if (field === "unit" || field === "case") {
      sizeItem[field] = Boolean(value);
    }
    // Numeric fields
    else if (
      field === "price" ||
      field === "quantity_per_case" ||
      field === "rolls_per_case" ||
      field === "price_per_case" ||
      field === "shipping_cost"
    ) {
      sizeItem[field] = toNumber(value);
    }
    // Integer-ish fields
    else if (field === "stock" || field === "sizeSquanence") {
      sizeItem[field] = Math.round(toNumber(value));
    }
    // Everything else - treat as string (size_value, size_unit, sku, image, ndcCode, upcCode, lotNumber, exipry, etc.)
    else {
      sizeItem[field] = String(value ?? "");
    }

    // Recalculate price_per_case (price per unit) based on categoryConfig.hasRolls
    const price = toNumber(sizeItem.price);
    const quantity = toNumber(sizeItem.quantity_per_case);
    const rolls = toNumber(sizeItem.rolls_per_case);

    let pricePerUnit = 0;
    if (categoryConfig?.hasRolls) {
      if (rolls > 0 && quantity > 0) {
        pricePerUnit = price / (rolls * quantity);
      }
    } else {
      if (quantity > 0) {
        pricePerUnit = price / quantity;
      }
    }

    sizeItem.price_per_case = calculateUnitPrice(
      {
        price,
        quantity_per_case: quantity,
        rolls_per_case: rolls,
      },
      categoryConfig.hasRolls
    );

    updatedSizes[index] = sizeItem;

    form.setValue("sizes", updatedSizes, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.trigger("sizes");
  };

  return (
    <Card className="border-0 shadow-none bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
            <Ruler className="h-4 w-4 text-white" />
          </div>
          Size Variations & Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pass groups and setGroups to AddSizeForm so it can display the dropdown */}
        <AddSizeForm
          newSize={newSize}
          onSizeChange={setNewSize}
          onAddSize={handleAddSize}
          category={category}
          productName={productName}
          categoryConfig={categoryConfig}
          setNewSize={setNewSize}
          onUnitsRefresh={loadCategoryConfigs}
        // You might need to pass `groups` and `loadingGroups` to `AddSizeForm` if it also needs to display the group dropdown
        />

        <FormField
          control={form.control}
          name="sizes"
          render={({ field }) => (
            <FormItem>
              <SizeList
                sizes={(field.value || []).map((size) => ({
                  ...size,
                  size_name: size.size_name || "",
                  size_value: size.size_value || "",
                  sizeSquanence: size.sizeSquanence || 0,
                  size_unit: size.size_unit || categoryConfig.defaultUnit,
                  price: size.price || 0,
                  price_per_case: calculateUnitPrice(size, categoryConfig.hasRolls),
                  quantity_per_case: size?.quantity_per_case || 0,
                  stock: size.stock || 0,
                  groupIds: size.groupIds || [], // Ensure groupIds are initialized
                  disAllogroupIds: size.disAllogroupIds || [], // Ensure groupIds are initialized
                }))}
                onRemoveSize={handleRemoveSize}
                onUpdateSize={handleUpdateSize}
                category={category}
                productName={productName}
                categoryConfig={categoryConfig}
                setNewSize={setNewSize}
                form={form}
                productId={productId}
              />
            </FormItem>
          )}
        />
      </CardContent>
      <ConfirmDialog
        open={confirmIndex !== null}
        message="This size will be permanently deleted. Are you sure?"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmIndex(null)}
      />

    </Card>
  );
};
