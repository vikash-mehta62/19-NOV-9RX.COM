import { DashboardLayout } from "@/components/DashboardLayout";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { CategorySubcategoryManager } from "@/components/products/form-sections/CategorySubcategoryManager";
import { ProductFormValues } from "@/components/products/schemas/productSchema";
import { Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { GripVertical, Save, RotateCcw, Image as ImageIcon, ChevronDown, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { fetchCategoryConfigs, bulkUpdateCategoryOrders, CategoryConfig } from "@/utils/categoryUtils";
import {
  canDeleteSubcategory,
  deleteSubcategoryById,
  fetchOrderedSubcategories,
} from "@/services/productTreeService";
import { supabase } from "@/supabaseClient";
import { EditSizeDialog, type EditableSize } from "@/components/products/EditSizeDialog";
import { EditSubcategoryDialog } from "@/components/products/EditSubcategoryDialog";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { addProductService, updateProductService } from "@/services/productService";
import { transformProductData } from "@/utils/productTransformers";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableCategoryItemProps {
  category: CategoryConfig;
  index: number;
  products: CategoryProductSummary[];
  isExpanded: boolean;
  onToggleExpanded: (categoryId: string) => void;
  onEditProduct: (productId: string) => void;
  onDeleteProduct: (product: CategoryProductSummary) => void;
  onToggleProductStatus: (product: CategoryProductSummary) => void;
  onEditSize: (sizeId: string) => void;
  onAddSize: (productId: string) => void;
  onDeleteSize: (size: ProductSizeSummary) => void;
  onToggleSizeStatus: (size: ProductSizeSummary) => void;
  onAddSubcategory: () => void;
}

interface CategoryProductSummary {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  subcategoryConfigId?: number | null;
  unitToggle?: boolean | null;
  is_active?: boolean | null;
  base_price?: number | null;
  image_url?: string | null;
  sizes?: ProductSizeSummary[];
  isPlaceholder?: boolean;
}

interface ProductSizeSummary {
  id?: string | null;
  size_name?: string | null;
  size_value?: string | number | null;
  size_unit?: string | null;
  unitToggle?: boolean | null;
  stock?: number | null;
  sku?: string | null;
  price?: number | null;
  image?: string | null;
  is_active?: boolean | null;
  sizeSquanence?: number | null;
}

const calculateSizeUnitPrice = (size: {
  price?: number | string | null;
  quantity_per_case?: number | string | null;
  rolls_per_case?: number | string | null;
}) => {
  const price = Number(size.price) || 0;
  const quantity = Number(size.quantity_per_case) || 0;
  const rolls = Number(size.rolls_per_case) || 1;

  if (quantity <= 0) return 0;

  return Number((price / (rolls > 0 ? rolls * quantity : quantity)).toFixed(2));
};

const FALLBACK_SIZE_UNITS = ["unit", "OZ", "mm", "mL", "cc", "inch", "gram", "dram", "ROLL"];
const FALLBACK_DEFAULT_UNIT = "unit";

const buildProductsByCategory = (
  products: CategoryProductSummary[],
  subcategories: Array<{ id: number; category_name: string; subcategory_name: string }>
) => {
  const groupedProducts = products.reduce<Record<string, CategoryProductSummary[]>>(
    (acc, product) => {
      const categoryName = product.category || "Uncategorized";
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      // Sort sizes by sizeSquanence
      const sortedProduct = {
        ...product,
        sizes: (product.sizes || []).sort((a, b) => (a.sizeSquanence || 0) - (b.sizeSquanence || 0))
      };
      acc[categoryName].push(sortedProduct);
      return acc;
    },
    {}
  );

  subcategories.forEach((subcategory) => {
    const categoryName = subcategory.category_name || "Uncategorized";
    const subcategoryName = subcategory.subcategory_name?.trim();
    if (!subcategoryName) return;

    if (!groupedProducts[categoryName]) {
      groupedProducts[categoryName] = [];
    }

    const alreadyExists = groupedProducts[categoryName].some(
      (product) => (product.subcategory?.trim() || "").toLowerCase() === subcategoryName.toLowerCase()
    );

    if (!alreadyExists) {
      groupedProducts[categoryName].push({
        id: `placeholder-${categoryName}-${subcategoryName}`,
        name: subcategoryName,
        category: categoryName,
        subcategory: subcategoryName,
        subcategoryConfigId: subcategory.id,
        unitToggle: false,
        is_active: false,
        base_price: 0,
        image_url: null,
        sizes: [],
        isPlaceholder: true,
      });
    }
  });

  Object.keys(groupedProducts).forEach((categoryName) => {
    groupedProducts[categoryName] = groupedProducts[categoryName].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  });

  return groupedProducts;
};

const SortableCategoryItem = ({
  category,
  index,
  products,
  isExpanded,
  onToggleExpanded,
  onEditProduct,
  onDeleteProduct,
  onToggleProductStatus,
  onEditSize,
  onAddSize,
  onDeleteSize,
  onToggleSizeStatus,
  onAddSubcategory,
}: SortableCategoryItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const [imageUrl, setImageUrl] = useState<string>("");
  const [productImageUrls, setProductImageUrls] = useState<Record<string, string>>({});
  const [sizeImageUrls, setSizeImageUrls] = useState<Record<string, string>>({});
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Load image URL
  useEffect(() => {
    const loadImage = async () => {
      if (!category.image_url) {
        setImageUrl("");
        return;
      }

      try {
        if (category.image_url.startsWith("http")) {
          setImageUrl(category.image_url);
        } else {
          const { data } = supabase.storage
            .from("product-images")
            .getPublicUrl(category.image_url);
          if (data?.publicUrl) {
            setImageUrl(data.publicUrl);
          }
        }
      } catch (error) {
        console.error("Error loading image:", error);
        setImageUrl("");
      }
    };
    loadImage();
  }, [category.image_url]);

  useEffect(() => {
    const loadProductImages = async () => {
      const resolvedEntries = await Promise.all(
        products.map(async (product) => {
          const rawImage = product.image_url;

          if (!rawImage) {
            return [product.id, ""] as const;
          }

          if (rawImage.startsWith("http")) {
            return [product.id, rawImage] as const;
          }

          try {
            const { data } = supabase.storage.from("product-images").getPublicUrl(rawImage);
            return [product.id, data?.publicUrl || ""] as const;
          } catch (error) {
            console.error("Error loading product image:", error);
            return [product.id, ""] as const;
          }
        })
      );

      setProductImageUrls(Object.fromEntries(resolvedEntries));
    };

    loadProductImages();
  }, [products]);

  useEffect(() => {
    const loadSizeImages = async () => {
      const sizeEntries = products.flatMap((product) => product.sizes || []);
      const resolvedEntries = await Promise.all(
        sizeEntries.map(async (size) => {
          if (!size.id) {
            return ["", ""] as const;
          }

          const rawImage = size.image;
          if (!rawImage) {
            return [size.id, ""] as const;
          }

          if (rawImage.startsWith("http")) {
            return [size.id, rawImage] as const;
          }

          try {
            const { data } = supabase.storage.from("product-images").getPublicUrl(rawImage);
            return [size.id, data?.publicUrl || ""] as const;
          } catch (error) {
            console.error("Error loading size image:", error);
            return [size.id, ""] as const;
          }
        })
      );

      setSizeImageUrls(
        Object.fromEntries(resolvedEntries.filter(([sizeId]) => Boolean(sizeId)))
      );
    };

    loadSizeImages();
  }, [products]);

  const getSizeSummary = (product: CategoryProductSummary) => {
    const sizes = product.sizes || [];
    if (sizes.length === 0) {
      return "No sizes added";
    }

    const showUnit = product.unitToggle === true;

    const labels = sizes
      .map((size) => {
        const value = size.size_value?.toString().trim();
        const unit = showUnit ? size.size_unit?.trim() : "";
        return [value, unit].filter(Boolean).join(" ");
      })
      .filter(Boolean);

    const preview = labels.slice(0, 3).join(", ");
    return labels.length > 3 ? `${preview} +${labels.length - 3} more` : preview;
  };

  const getStockSummary = (product: CategoryProductSummary) => {
    const totalStock = (product.sizes || []).reduce((sum, size) => sum + Number(size.stock || 0), 0);
    if ((product.sizes || []).length === 0) {
      return "No size inventory";
    }

    return `${totalStock} units total stock`;
  };

  const getDisplayPrice = (product: CategoryProductSummary) => {
    const basePrice = Number(product.base_price || 0);
    const sizePrices = (product.sizes || [])
      .map((size) => Number(size.price || 0))
      .filter((price) => price > 0);

    if (sizePrices.length > 0) {
      return Math.min(...sizePrices);
    }

    return basePrice;
  };

  const getSizeLabel = (size: ProductSizeSummary, showUnit = true) => {
    const parts = [size.size_value?.toString().trim(), showUnit ? size.size_unit?.trim() : ""];
    return parts.filter(Boolean).join(" ") || "Size";
  };

  const toggleProductSizes = (productId: string) => {
    setExpandedProductIds((current) => ({
      ...current,
      [productId]: !current[productId],
    }));
  };

  // Render the sortable category item
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border-2 rounded-2xl hover:shadow-xl transition-all duration-200 ${
        isDragging ? 'border-blue-400 shadow-2xl scale-105' : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex flex-col gap-4 p-4 md:p-6 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3 md:gap-4">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-2 md:p-3 hover:bg-blue-50 rounded-xl transition-colors group"
            title="Drag to reorder"
          >
            <GripVertical className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </button>

          {/* Category Image */}
          <div className="flex h-20 w-20 md:h-24 md:w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-3 shadow-md">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={category.category_name}
                className="h-full w-full object-contain hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <h3 className="mb-2 text-xl md:text-2xl font-bold leading-tight break-words text-gray-900">{category.category_name}</h3>
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <span className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                <span className="text-lg font-bold">#{index + 1}</span>
              </span>
              <span className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                <Package className="w-4 h-4" />
                <span className="font-bold">{products.length}</span> Subcategor{products.length === 1 ? 'y' : 'ies'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubcategory();
                }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                title="Add new subcategory to this category"
              >
                <Plus className="w-3 h-3" />
                Add Subcategory
              </button>
            </div>
          </div>
        </div>

        {/* Expand Button */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => onToggleExpanded(category.id)}
          className="h-12 w-full xl:w-auto xl:shrink-0 px-4 md:px-6 rounded-xl border-2 hover:border-blue-400 hover:bg-blue-50 transition-all"
        >
          <ChevronDown
            className={`w-5 h-5 mr-2 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          />
          {isExpanded ? "Hide Subcategories" : `View Subcategories (${products.length})`}
        </Button>
      </div>

      {isExpanded && (
        <div className="border-t-2 bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-4 md:px-6 md:py-6">
          <div className="mb-4 md:mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base md:text-xl font-bold leading-tight break-words text-gray-900">Subcategories in {category.category_name}</h4>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                {products.length} subcategor{products.length === 1 ? 'y' : 'ies'} • Click "Show Sizes" to see products
              </p>
            </div>
          </div>
          
          {products.length > 0 ? (
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border-2 border-slate-200 bg-white shadow-md hover:shadow-xl transition-all"
                >
                  <div className="flex flex-col items-stretch gap-4 px-4 py-4 md:px-6 md:py-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-3 md:gap-4">
                      <div className="flex h-16 w-16 md:h-24 md:w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-3 shadow-sm">
                        {productImageUrls[product.id] ? (
                          <img
                            src={productImageUrls[product.id]}
                            alt={product.name}
                            className="h-full w-full object-contain hover:scale-110 transition-transform"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {/* Show Subcategory as main name if available, otherwise product name */}
                          {product.subcategory ? (
                            <>
                              <p className="text-lg md:text-xl font-bold leading-tight break-words text-slate-900">{product.subcategory}</p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  product.is_active === false || product.isPlaceholder
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {product.is_active === false || product.isPlaceholder ? "Inactive" : "Active"}
                              </span>
                            </>
                          ) : (
                            <>
                              <p className="text-base md:text-lg font-semibold leading-tight break-words text-slate-900">{product.name}</p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  product.is_active === false || product.isPlaceholder
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {product.is_active === false || product.isPlaceholder ? "Inactive" : "Active"}
                              </span>
                            </>
                          )}
                        </div>

                        {/* No need to show product name separately - subcategory IS the product */}

                        <div className="flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm mt-2 md:mt-3">
                          <span className="flex items-center gap-1 md:gap-1.5 bg-purple-100 text-purple-700 px-2 md:px-3 py-1 rounded-full font-medium">
                            <span className="font-bold">{(product.sizes || []).length}</span> Product{(product.sizes || []).length === 1 ? '' : 's'}
                          </span>
                          <span className="flex items-center gap-1 md:gap-1.5 bg-blue-100 text-blue-700 px-2 md:px-3 py-1 rounded-full font-medium">
                            <span className="font-bold">{(product.sizes || []).reduce((sum, size) => sum + Number(size.stock || 0), 0)}</span> Units
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price and Actions */}
                    <div className="w-full text-left xl:w-auto xl:text-right xl:shrink-0">
                      <div className="mb-4">
                        <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                          ${getDisplayPrice(product).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{product.isPlaceholder ? "Placeholder" : "Starting from"}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {/* Show button - always enabled, expands to show products section */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleProductSizes(product.id)}
                          className="w-full justify-center rounded-xl border-2 hover:border-purple-400 hover:bg-purple-50"
                          title="Show products section"
                        >
                          <ChevronDown
                            className={`mr-2 h-4 w-4 transition-transform ${
                              expandedProductIds[product.id] ? "rotate-180" : ""
                            }`}
                          />
                          {expandedProductIds[product.id] ? 'Hide' : 'Show'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onToggleProductStatus(product)}
                          className={
                            product.is_active === false || product.isPlaceholder
                              ? "w-full justify-center rounded-xl border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              : "w-full justify-center rounded-xl border-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                          }
                          disabled={product.isPlaceholder}
                          title={product.isPlaceholder ? "Add a product first to update status" : "Update subcategory status"}
                        >
                          {product.is_active === false ? "Set Active" : "Set Inactive"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onEditProduct(product.id)}
                          className="w-full justify-center rounded-xl border-2 hover:border-blue-400 hover:bg-blue-50"
                          title="Edit subcategory details"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Subcategory
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteProduct(product)}
                          className="w-full justify-center rounded-xl border-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                          title="Delete subcategory"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Subcategory
                        </Button>
                      </div>
                    </div>
                  </div>

                  {expandedProductIds[product.id] && (
                    <div className="border-t-2 border-slate-200 bg-gradient-to-br from-slate-50 to-purple-50 px-4 py-4 md:px-6 md:py-5">
                      <div className="mb-4 md:mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-base md:text-lg font-bold text-slate-900">Products</p>
                          <p className="text-xs md:text-sm text-slate-600">
                            These are the actual products customers can purchase
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            // If placeholder, create product entry first
                            if (product.isPlaceholder) {
                              onEditProduct(product.id);
                            } else {
                              onAddSize(product.id);
                            }
                          }}
                          className="rounded-lg md:rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-xs md:text-sm px-3 md:px-4"
                        >
                          <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                          Add Product
                        </Button>
                      </div>
                      {(product.sizes || []).length > 0 && !product.isPlaceholder ? (
                        <div className="grid gap-3 xl:grid-cols-2">
                          {(product.sizes || []).map((size, index) => (
                            <div
                              key={`${product.id}-${getSizeLabel(size)}-${index}`}
                              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                              <div className="flex h-full flex-col gap-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                                  <div className="flex h-16 w-16 sm:h-24 sm:w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-3 shadow-sm">
                                    {size.id && sizeImageUrls[size.id] ? (
                                      <img
                                        src={sizeImageUrls[size.id]}
                                        alt={size.size_name?.trim() || getSizeLabel(size, product.unitToggle === true)}
                                        className="h-full w-full object-contain"
                                      />
                                    ) : (
                                      <ImageIcon className="h-6 w-6 text-slate-400" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                      <div className="min-w-0">
                                        <p className="text-sm leading-snug break-words text-slate-600">
                                          {size.size_name?.trim() || "No Product name added"}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                          <p className="text-lg font-semibold text-slate-900">
                                            {getSizeLabel(size, product.unitToggle === true)}
                                          </p>
                                          <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                              size.is_active === false
                                                ? "bg-rose-100 text-rose-700"
                                                : "bg-emerald-100 text-emerald-700"
                                            }`}
                                          >
                                            {size.is_active === false ? "Inactive" : "Active"}
                                          </span>
                                        </div>
                                        <p className="mt-2 text-xs text-slate-500">
                                          {size.sku?.trim() ? `SKU: ${size.sku}` : "No SKU added"}
                                        </p>
                                      </div>
                                      <div className="shrink-0 text-left sm:text-right">
                                        <p className="text-base sm:text-lg font-semibold text-slate-900">
                                          ${Number(size.price || 0).toFixed(2)}
                                        </p>
                                        <p className="text-xs text-slate-500">Size price</p>
                                      </div>
                                    </div>
                                    <p className="mt-4 text-sm text-slate-600">
                                      <span className="font-medium text-slate-800">Stock:</span>{" "}
                                      {Number(size.stock || 0)} units
                                    </p>
                                  </div>
                                </div>
                                {size.id && (
                                  <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className={
                                        size.is_active === false
                                          ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                          : "border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                                      }
                                      onClick={() => onToggleSizeStatus(size)}
                                    >
                                      {size.is_active === false ? "Set Active" : "Set Inactive"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                      onClick={() => onDeleteSize({
                                        ...size,
                                        unitToggle: product.unitToggle,
                                      })}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Size
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => onEditSize(size.id!)}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit Size
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                          <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                          <p className="text-sm font-medium text-slate-700 mb-1">No products added yet</p>
                          <p className="text-xs text-slate-500 mb-4">
                            {product.isPlaceholder 
                              ? 'Click "Add Product" button above to create this subcategory and add your first product'
                              : 'Click "Add Product" button above to add your first product'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
              <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-base font-medium text-slate-700 mb-2">No subcategories found in this category</p>
              <p className="text-sm text-slate-500 mb-6">Get started by adding your first subcategory</p>
              <Button
                onClick={onAddSubcategory}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Subcategory
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CategoryManagement = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [originalCategories, setOriginalCategories] = useState<CategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [productsByCategory, setProductsByCategory] = useState<Record<string, CategoryProductSummary[]>>({});
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({});
  const [editingSize, setEditingSize] = useState<EditableSize | null>(null);
  const [isEditSizeDialogOpen, setIsEditSizeDialogOpen] = useState(false);
  const [creatingSize, setCreatingSize] = useState<EditableSize | null>(null);
  const [isAddSizeDialogOpen, setIsAddSizeDialogOpen] = useState(false);
  const [addingSizeProductId, setAddingSizeProductId] = useState<string | null>(null);
  const [activeSizeUnits, setActiveSizeUnits] = useState<string[]>(FALLBACK_SIZE_UNITS);
  const [activeDefaultUnit, setActiveDefaultUnit] = useState<string>(FALLBACK_DEFAULT_UNIT);
  const [activeUnitToggle, setActiveUnitToggle] = useState<boolean>(true);
  const [sizeToDelete, setSizeToDelete] = useState<ProductSizeSummary | null>(null);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<CategoryProductSummary | null>(null);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);
  const [isEditSubcategoryDialogOpen, setIsEditSubcategoryDialogOpen] = useState(false);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [placeholderInitialData, setPlaceholderInitialData] = useState<Partial<ProductFormValues> | undefined>(undefined);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [categoryManagerInitialCategory, setCategoryManagerInitialCategory] = useState<string>('');
  const [categoryManagerInitialTab, setCategoryManagerInitialTab] = useState<'category' | 'subcategory'>('category');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const [data, subcategoriesResponse, productsResponse] = await Promise.all([
        fetchCategoryConfigs(),
        fetchOrderedSubcategories(),
        supabase
          .from("products")
          .select("id, name, category, subcategory, unitToggle, is_active, base_price, image_url, sizes:product_sizes(id, size_name, size_value, size_unit, stock, sku, price, image, is_active, sizeSquanence)")
          .order("name", { ascending: true }),
      ]);

      if (productsResponse.error) {
        throw productsResponse.error;
      }

      console.log('Subcategories loaded:', subcategoriesResponse);

      const groupedProducts = buildProductsByCategory(
        ((productsResponse.data || []) as CategoryProductSummary[]).map((product) => {
          const matchedSubcategory = (subcategoriesResponse || []).find(
            (subcategory) =>
              subcategory.category_name === product.category &&
              subcategory.subcategory_name.toLowerCase() === (product.subcategory || "").toLowerCase()
          );

          return {
            ...product,
            subcategoryConfigId: matchedSubcategory?.id ?? null,
          };
        }),
        (subcategoriesResponse || []) as Array<{ id: number; category_name: string; subcategory_name: string }>
      );

      setCategories(data);
      setOriginalCategories(JSON.parse(JSON.stringify(data)));
      setProductsByCategory(groupedProducts);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpanded = (categoryId: string) => {
    setExpandedCategoryIds((current) => ({
      ...current,
      [categoryId]: !current[categoryId],
    }));
  };

  const resolveCategoryUnits = (categoryName?: string | null) => {
    const matchedCategory = categories.find((item) => item.category_name === categoryName);
    const resolvedUnits =
      matchedCategory?.size_units && matchedCategory.size_units.length > 0
        ? matchedCategory.size_units
        : FALLBACK_SIZE_UNITS;
    const resolvedDefaultUnit = matchedCategory?.default_unit || resolvedUnits[0] || FALLBACK_DEFAULT_UNIT;

    setActiveSizeUnits(resolvedUnits);
    setActiveDefaultUnit(resolvedDefaultUnit);
  };

  const handleOpenSizeEdit = async (sizeId: string) => {
    try {
      const matchedProduct = Object.values(productsByCategory)
        .flat()
        .find((product) => (product.sizes || []).some((size) => size.id === sizeId));

      console.log(matchedProduct)
      resolveCategoryUnits(matchedProduct?.category);
      
      // Set unitToggle state
      setActiveUnitToggle(matchedProduct?.unitToggle === true);

      const { data, error } = await supabase
        .from("product_sizes")
        .select("id, size_name, size_value, size_unit, sku, price, price_per_case, stock, quantity_per_case, shipping_cost, ndcCode, upcCode, lotNumber, exipry, groupIds, disAllogroupIds, image, is_active")
        .eq("id", sizeId)
        .single();

      if (error) {
        throw error;
      }

      // Determine default unit based on unitToggle setting
      const matchedCategory = categories.find((item) => item.category_name === matchedProduct?.category);
      const resolvedUnits = matchedCategory?.size_units && matchedCategory.size_units.length > 0
        ? matchedCategory.size_units
        : FALLBACK_SIZE_UNITS;
      
      let defaultUnitValue: string;
      if (matchedProduct?.unitToggle === true) {
        // If unitToggle is ON, use actual unit (category default or existing unit)
        defaultUnitValue = data.size_unit || matchedCategory?.default_unit || resolvedUnits[0] || FALLBACK_DEFAULT_UNIT;
      } else {
        // If unitToggle is OFF, use "unit" or "NA"
        defaultUnitValue = "unit";
      }

      setEditingSize({
        id: data.id,
        size_name: data.size_name || "",
        size_value: data.size_value || "",
        size_unit: defaultUnitValue,
        sku: data.sku || "",
        price: Number(data.price || 0),
        price_per_case: Number(data.price_per_case || 0),
        stock: Number(data.stock || 0),
        quantity_per_case: Number(data.quantity_per_case || 0),
        shipping_cost: Number(data.shipping_cost || 0),
        ndcCode: data.ndcCode || "",
        upcCode: data.upcCode || "",
        lotNumber: data.lotNumber || "",
        exipry: data.exipry || "",
        groupIds: Array.isArray(data.groupIds) ? data.groupIds : [],
        disAllogroupIds: Array.isArray(data.disAllogroupIds) ? data.disAllogroupIds : [],
        image: data.image || "",
        is_active: data.is_active !== false,
      });
      setIsEditSizeDialogOpen(true);
    } catch (error) {
      console.error("Error loading size:", error);
      toast({
        title: "Error",
        description: "Failed to load size details",
        variant: "destructive",
      });
    }
  };

  const handleOpenAddSize = (productId: string) => {
    const matchedProduct = Object.values(productsByCategory)
      .flat()
      .find((product) => product.id === productId);
    const resolvedUnits =
      categories.find((item) => item.category_name === matchedProduct?.category)?.size_units || FALLBACK_SIZE_UNITS;
    
    // Set unitToggle state
    setActiveUnitToggle(matchedProduct?.unitToggle === true);
    
    // Determine default unit based on unitToggle setting
    let resolvedDefaultUnit: string;
    if (matchedProduct?.unitToggle === true) {
      // If unitToggle is ON, use category's default unit
      resolvedDefaultUnit = categories.find((item) => item.category_name === matchedProduct?.category)?.default_unit ||
        resolvedUnits[0] ||
        FALLBACK_DEFAULT_UNIT;
    } else {
      // If unitToggle is OFF, use the first available unit
      resolvedDefaultUnit = resolvedUnits[0] || FALLBACK_DEFAULT_UNIT;
    }

    setActiveSizeUnits(resolvedUnits.length > 0 ? resolvedUnits : FALLBACK_SIZE_UNITS);
    setActiveDefaultUnit(resolvedDefaultUnit);
    setAddingSizeProductId(productId);
    setCreatingSize({
      id: "",
      size_name: "",
      size_value: "",
      size_unit: resolvedDefaultUnit,
      sku: "",
      price: 0,
      price_per_case: 0,
      stock: 0,
      quantity_per_case: 1,
      shipping_cost: 0,
      ndcCode: "",
      upcCode: "",
      lotNumber: "",
      exipry: "",
      groupIds: [],
      disAllogroupIds: [],
      image: "",
      is_active: true,
    });
    setIsAddSizeDialogOpen(true);
  };

  const handleSaveSizeEdit = async (size: EditableSize) => {
    // Find the product to check unitToggle setting
    const matchedProduct = Object.values(productsByCategory)
      .flat()
      .find((product) => (product.sizes || []).some((s) => s.id === size.id));
    
    // Determine final unit based on unitToggle
    let finalSizeUnit: string;
    if (matchedProduct?.unitToggle === true) {
      // If unitToggle is ON, use the selected unit or default
      finalSizeUnit = size.size_unit || activeDefaultUnit || "unit";
    } else {
      // If unitToggle is OFF, always use "unit"
      finalSizeUnit = "unit";
    }
    
    const updates = {
      size_name: size.size_name || null,
      size_value: size.size_value,
      size_unit: finalSizeUnit,
      sku: size.sku || null,
      price: Number(size.price || 0),
      price_per_case: calculateSizeUnitPrice(size),
      stock: Number(size.stock || 0),
      quantity_per_case: Number(size.quantity_per_case || 0),
      shipping_cost: Number(size.shipping_cost || 0),
      ndcCode: size.ndcCode || null,
      upcCode: size.upcCode || null,
      lotNumber: size.lotNumber || null,
      exipry: size.exipry || null,
      groupIds: size.groupIds || [],
      disAllogroupIds: size.disAllogroupIds || [],
      image: size.image || null,
      is_active: size.is_active !== false,
    };

    const { error } = await supabase
      .from("product_sizes")
      .update(updates)
      .eq("id", size.id);

    if (error) {
      console.error("Error saving size:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update size",
        variant: "destructive",
      });
      throw error;
    }

    // 🔹 Sync actual_price in group_pricing after size price update
    const { data: groupPricingData, error: fetchError } = await supabase
      .from("group_pricing")
      .select("*");

    if (!fetchError && groupPricingData) {
      for (const group of groupPricingData) {
        if (!Array.isArray(group.product_arrayjson)) continue;

        let hasChanges = false;
        const updatedProducts = group.product_arrayjson.map((product: any) => {
          // Check if this product_id (size_id) matches the updated size
          if (product.product_id === size.id && product.actual_price !== updates.price) {
            hasChanges = true;
            return {
              ...product,
              actual_price: updates.price, // ✅ Update actual_price with new price
            };
          }
          return product;
        });

        // Only update if there are actual changes
        if (hasChanges) {
          await supabase
            .from("group_pricing")
            .update({ product_arrayjson: updatedProducts })
            .eq("id", group.id);
        }
      }
    }

    setProductsByCategory((current) => {
      const next = { ...current };
      Object.keys(next).forEach((categoryName) => {
        next[categoryName] = next[categoryName].map((product) => ({
          ...product,
          sizes: (product.sizes || []).map((productSize) =>
            productSize.id === size.id
              ? {
                  ...productSize,
                  size_name: size.size_name || "",
                  size_value: size.size_value,
                  size_unit: finalSizeUnit,
                  sku: size.sku || "",
                  price: Number(size.price || 0),
                  stock: Number(size.stock || 0),
                  image: size.image || "",
                  is_active: size.is_active !== false,
                }
              : productSize
          ),
        }));
      });
      return next;
    });

    setEditingSize({ ...size, size_unit: finalSizeUnit });
    toast({
      title: "Success",
      description: "Size updated successfully",
    });
  };

  const handleSaveNewSize = async (size: EditableSize) => {
    if (!addingSizeProductId) {
      const error = new Error("Missing target product for new size.");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }

    // Find the product to check unitToggle setting
    const matchedProduct = Object.values(productsByCategory)
      .flat()
      .find((product) => product.id === addingSizeProductId);
    
    // Determine final unit based on unitToggle
    let finalSizeUnit: string;
    if (matchedProduct?.unitToggle === true) {
      // If unitToggle is ON, use the selected unit or default
      finalSizeUnit = size.size_unit || activeDefaultUnit || "unit";
    } else {
      // If unitToggle is OFF, always use "unit"
      finalSizeUnit = "unit";
    }

    const payload = {
      product_id: addingSizeProductId,
      size_name: size.size_name || null,
      size_value: size.size_value || "0",
      size_unit: finalSizeUnit,
      sku: size.sku || null,
      price: Number(size.price || 0),
      price_per_case: calculateSizeUnitPrice(size),
      stock: Number(size.stock || 0),
      quantity_per_case: Number(size.quantity_per_case || 1),
      shipping_cost: Number(size.shipping_cost || 0),
      ndcCode: size.ndcCode || null,
      upcCode: size.upcCode || null,
      lotNumber: size.lotNumber || null,
      exipry: size.exipry || null,
      groupIds: size.groupIds || [],
      disAllogroupIds: size.disAllogroupIds || [],
      image: size.image || null,
      is_active: size.is_active !== false,
    };

    const { data, error } = await supabase
      .from("product_sizes")
      .insert(payload)
      .select("id, size_name, size_value, size_unit, stock, sku, price, image, is_active")
      .single();

    if (error) {
      console.error("Error creating size:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create size",
        variant: "destructive",
      });
      throw error;
    }

    setProductsByCategory((current) => {
      const next = { ...current };
      Object.keys(next).forEach((categoryName) => {
        next[categoryName] = next[categoryName].map((product) =>
          product.id === addingSizeProductId
            ? {
                ...product,
                sizes: [...(product.sizes || []), data],
              }
            : product
        );
      });
      return next;
    });

    toast({
      title: "Success",
      description: "New size added successfully",
    });
  };

  const handleToggleSizeStatus = async (size: ProductSizeSummary) => {
    if (!size.id) {
      return;
    }

    try {
      const newStatus = size.is_active === false;
      const { error } = await supabase
        .from("product_sizes")
        .update({ is_active: newStatus })
        .eq("id", size.id);

      if (error) {
        throw error;
      }

      setProductsByCategory((current) => {
        const next = { ...current };
        Object.keys(next).forEach((categoryName) => {
          next[categoryName] = next[categoryName].map((product) => ({
            ...product,
            sizes: (product.sizes || []).map((productSize) =>
              productSize.id === size.id
                ? {
                    ...productSize,
                    is_active: newStatus,
                  }
                : productSize
            ),
          }));
        });
        return next;
      });

      toast({
        title: "Success",
        description: `Size ${newStatus ? "activated" : "deactivated"} successfully`,
      });
    } catch (error: any) {
      console.error("Error updating size status:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update size status",
        variant: "destructive",
      });
    }
  };

  const handleToggleProductStatus = async (product: CategoryProductSummary) => {
    if (product.isPlaceholder) {
      return;
    }

    try {
      const newStatus = product.is_active === false;
      const { error } = await supabase
        .from("products")
        .update({ is_active: newStatus })
        .eq("id", product.id);

      if (error) {
        throw error;
      }

      setProductsByCategory((current) => {
        const next = { ...current };
        Object.keys(next).forEach((categoryName) => {
          next[categoryName] = next[categoryName].map((currentProduct) =>
            currentProduct.id === product.id
              ? {
                  ...currentProduct,
                  is_active: newStatus,
                }
              : currentProduct
          );
        });
        return next;
      });

      toast({
        title: "Success",
        description: `Subcategory ${newStatus ? "activated" : "deactivated"} successfully`,
      });
    } catch (error: any) {
      console.error("Error updating subcategory status:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update subcategory status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubcategory = async (product: CategoryProductSummary) => {
    const subcategoryName = product.subcategory?.trim();
    
    if (!subcategoryName) {
      toast({
        title: "Cannot Delete",
        description: "Subcategory name is missing",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if this product has any sizes (actual products)
      const hasSizes = (product.sizes || []).length > 0;
      
      if (hasSizes) {
        toast({
          title: "Cannot Delete Subcategory",
          description: `"${subcategoryName}" has ${product.sizes?.length} product(s). Delete all products first.`,
          variant: "destructive",
        });
        return;
      }

      setSubcategoryToDelete(product);
    } catch (error: unknown) {
      console.error("Error preparing subcategory deletion:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to prepare subcategory deletion",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDeleteSubcategory = async () => {
    if (!subcategoryToDelete) {
      return;
    }

    const subcategoryName = subcategoryToDelete.subcategory?.trim();

    if (!subcategoryName) {
      setSubcategoryToDelete(null);
      return;
    }

    try {
      const product = subcategoryToDelete;

      // If it's a placeholder, just reload (nothing to delete from DB)
      if (product.isPlaceholder) {
        // Remove from subcategory_configs if it exists there
        const { error: configError } = await supabase
          .from('subcategory_configs')
          .delete()
          .eq('category_name', product.category)
          .eq('subcategory_name', subcategoryName);
        
        if (configError) {
          console.error('Error deleting subcategory config:', configError);
        }
        
        await loadCategories();
        setSubcategoryToDelete(null);
        toast({
          title: "Success",
          description: "Subcategory deleted successfully",
        });
        return;
      }

      // Delete the product from products table
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      // Also delete from subcategory_configs if it exists
      await supabase
        .from('subcategory_configs')
        .delete()
        .eq('category_name', product.category)
        .eq('subcategory_name', subcategoryName);

      await loadCategories();
      setSubcategoryToDelete(null);
      toast({
        title: "Success",
        description: "Subcategory deleted successfully",
      });
    } catch (error: unknown) {
      console.error("Error deleting subcategory:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete subcategory",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSize = async () => {
    if (!sizeToDelete?.id) {
      return;
    }

    const sizeId = sizeToDelete.id;
    const { error } = await supabase
      .from("product_sizes")
      .delete()
      .eq("id", sizeId);

    if (error) {
      console.error("Error deleting size:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete size",
        variant: "destructive",
      });
      throw error;
    }

    setProductsByCategory((current) => {
      const next = { ...current };
      Object.keys(next).forEach((categoryName) => {
        next[categoryName] = next[categoryName].map((product) => ({
          ...product,
          sizes: (product.sizes || []).filter((size) => size.id !== sizeId),
        }));
      });
      return next;
    });

    setSizeToDelete(null);
    toast({
      title: "Success",
      description: "Size deleted successfully",
    });
  };

  const handleOpenProductEdit = async (productId: string) => {
    // Check if this is a placeholder
    if (productId.startsWith('placeholder-')) {
      // For placeholders, we need to create a product entry first, then open edit dialog
      const placeholderProduct = Object.values(productsByCategory)
        .flat()
        .find(p => p.id === productId);
      
      if (placeholderProduct && placeholderProduct.subcategoryConfigId) {
        try {
          // Create a minimal product entry
          const { data: newProduct, error } = await supabase
            .from('products')
            .insert({
              name: placeholderProduct.subcategory || placeholderProduct.name,
              category: placeholderProduct.category,
              subcategory: placeholderProduct.subcategory || placeholderProduct.name,
              description: '',
              base_price: 0,
              is_active: false,
              unitToggle: false,
            })
            .select('id')
            .single();

          if (error) throw error;

          // Reload categories to get the new product
          await loadCategories();

          // Open Edit Subcategory dialog for the new product
          setEditingSubcategoryId(newProduct.id);
          setIsEditSubcategoryDialogOpen(true);
          
          toast({
            title: "Product Created",
            description: `You can now edit ${placeholderProduct.subcategory || placeholderProduct.name}`,
          });
        } catch (error) {
          console.error('Error creating product:', error);
          toast({
            title: "Error",
            description: "Failed to create product entry",
            variant: "destructive",
          });
        }
      }
      return;
    }
    
    // Open the Edit Subcategory dialog for real products
    setEditingSubcategoryId(productId);
    setIsEditSubcategoryDialogOpen(true);
  };

  const handleOpenCategoryManager = (categoryName: string) => {
    setCategoryManagerInitialCategory(categoryName);
    setCategoryManagerInitialTab('subcategory');
    setIsCategoryManagerOpen(true);
  };

  const handleAddProduct = async (data: ProductFormValues) => {
    setIsSubmittingProduct(true);
    try {
      await addProductService(data);
      await loadCategories();
      toast({
        title: "Success",
        description: "Product added successfully.",
      });
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to add product",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleUpdateProduct = async (data: ProductFormValues) => {
    if (!editingProduct) return;

    setIsUpdatingProduct(true);
    try {
      await updateProductService(editingProduct.id, data);
      await loadCategories();
      setIsEditProductDialogOpen(false);
      setEditingProduct(null);
      toast({
        title: "Success",
        description: "Product updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update product",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newOrder;
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Create updates with new display_order based on array position
      const updates = categories.map((cat, index) => ({
        id: cat.id,
        display_order: index + 1,
      }));

      console.log('Saving category order:', updates);
      const success = await bulkUpdateCategoryOrders(updates);

      if (success) {
        toast({
          title: "Success",
          description: "Category order saved successfully",
        });
        // Reload from database to confirm changes
        await loadCategories();
      } else {
        throw new Error('Failed to update - check console for details');
      }
    } catch (error) {
      console.error('Error saving categories:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save category order. Please check console for details.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCategories(JSON.parse(JSON.stringify(originalCategories)));
    setHasChanges(false);
    toast({
      title: "Reset",
      description: "Changes discarded",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading categories...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Enhanced Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-5 md:p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl md:text-4xl font-bold leading-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent break-words">
                  Category Management
                </h1>
                <p className="text-gray-600 mt-2 text-base md:text-lg max-w-2xl">
                  Manage product categories, subcategories, and their display order
                </p>
              </div>
              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsCategoryManagerOpen(true)}
                  className="h-11 w-full sm:w-auto px-4 md:px-6 rounded-xl border-2 hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Category / Subcategory
                </Button>
                {hasChanges && (
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={saving}
                    className="h-11 w-full sm:w-auto px-4 md:px-6 rounded-xl border-2 hover:border-orange-400 hover:bg-orange-50 transition-all"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Reset Changes
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="h-11 w-full sm:w-auto px-4 md:px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {saving ? "Saving..." : "Save Order"}
                </Button>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Total Categories</p>
                    <p className="text-2xl font-bold text-blue-900">{categories.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">Total Subcategories</p>
                    <p className="text-2xl font-bold text-green-900">
                      {Object.values(productsByCategory).reduce((sum, products) => sum + products.length, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Total Products</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {Object.values(productsByCategory).reduce((sum, products) => 
                        sum + products.reduce((pSum, product) => pSum + (product.sizes?.length || 0), 0), 0
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Categories Card */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100 p-4 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-xl md:text-2xl font-bold text-gray-900">Product Categories</CardTitle>
                  <CardDescription className="text-sm md:text-base mt-2 break-words">
                    Drag categories using the <GripVertical className="w-4 h-4 inline mx-1" /> icon to reorder. Click "View Products" to see and manage products in each category.
                  </CardDescription>
                </div>
                {hasChanges && (
                  <div className="w-full md:w-auto bg-orange-100 border border-orange-300 rounded-lg px-4 py-2">
                    <p className="text-sm font-medium text-orange-800">Unsaved Changes</p>
                    <p className="text-xs text-orange-600">Click "Save Order" to apply</p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={categories.map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {categories.map((category, index) => (
                      <SortableCategoryItem
                        key={category.id}
                        category={category}
                        index={index}
                        products={productsByCategory[category.category_name] || []}
                        isExpanded={!!expandedCategoryIds[category.id]}
                        onToggleExpanded={handleToggleExpanded}
                        onEditProduct={handleOpenProductEdit}
                        onDeleteProduct={handleDeleteSubcategory}
                        onToggleProductStatus={handleToggleProductStatus}
                        onEditSize={handleOpenSizeEdit}
                        onAddSize={handleOpenAddSize}
                        onDeleteSize={setSizeToDelete}
                        onToggleSizeStatus={handleToggleSizeStatus}
                        onAddSubcategory={() => {
                          setCategoryManagerInitialCategory(category.category_name);
                          setCategoryManagerInitialTab('subcategory');
                          setIsCategoryManagerOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {categories.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No categories found</h3>
                  <p className="text-gray-500 mb-6">Get started by adding your first category</p>
                  <Button onClick={() => setIsCategoryManagerOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="text-blue-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                How to Use This Page
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <p><span className="font-semibold">Reorder Categories:</span> Click and drag the <GripVertical className="w-4 h-4 inline mx-1" /> icon to change category order</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <p><span className="font-semibold">View Products:</span> Click "View Products" button to expand and see all products in that category</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <p><span className="font-semibold">Manage Products:</span> Edit product details, add sizes, or manage inventory from the expanded view</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</div>
                <p><span className="font-semibold">Save Changes:</span> Click "Save Order" button to apply your category reordering changes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <EditSizeDialog
        open={isEditSizeDialogOpen}
        onOpenChange={(open) => {
          setIsEditSizeDialogOpen(open);
          if (!open) {
            setEditingSize(null);
          }
        }}
        size={editingSize}
        onSave={handleSaveSizeEdit}
        sizeUnits={activeSizeUnits}
        defaultUnit={activeDefaultUnit}
        showUnitField={activeUnitToggle}
      />

      <EditSizeDialog
        open={isAddSizeDialogOpen}
        onOpenChange={(open) => {
          setIsAddSizeDialogOpen(open);
          if (!open) {
            setCreatingSize(null);
            setAddingSizeProductId(null);
          }
        }}
        size={creatingSize}
        onSave={handleSaveNewSize}
        title="Add Size"
        saveLabel="Add Size"
        sizeUnits={activeSizeUnits}
        defaultUnit={activeDefaultUnit}
        showUnitField={activeUnitToggle}
      />

      <ConfirmDeleteDialog
        open={!!subcategoryToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setSubcategoryToDelete(null);
          }
        }}
        onConfirm={handleConfirmDeleteSubcategory}
        title={`Delete ${subcategoryToDelete?.subcategory?.trim() || "this subcategory"}?`}
        description={`This will permanently remove "${subcategoryToDelete?.subcategory?.trim() || "this subcategory"}" from ${subcategoryToDelete?.category || "this category"}. This action cannot be undone.`}
        confirmLabel="Confirm"
      />

      <ConfirmDeleteDialog
        open={!!sizeToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setSizeToDelete(null);
          }
        }}
        onConfirm={handleDeleteSize}
        title={`Delete ${sizeToDelete ? [sizeToDelete.size_value?.toString().trim(), sizeToDelete.unitToggle === true ? sizeToDelete.size_unit?.trim() : ""].filter(Boolean).join(" ") || "this size" : "this size"}?`}
        description={`This will permanently remove ${sizeToDelete?.size_name?.trim() || "this size option"} from the product. This action cannot be undone.`}
      />

      <EditSubcategoryDialog
        open={isEditSubcategoryDialogOpen}
        onOpenChange={setIsEditSubcategoryDialogOpen}
        productId={editingSubcategoryId || ''}
        onSuccess={loadCategories}
      />

      <CategorySubcategoryManager
        open={isCategoryManagerOpen}
        onOpenChange={(open) => {
          setIsCategoryManagerOpen(open);
          if (!open) {
            // Reset initial values when dialog closes
            setCategoryManagerInitialCategory('');
            setCategoryManagerInitialTab('category');
          }
        }}
        onSuccess={loadCategories}
        initialTab={categoryManagerInitialTab}
        initialCategory={categoryManagerInitialCategory}
      />

      <AddProductDialog
        open={isAddProductDialogOpen}
        onOpenChange={(open) => {
          setIsAddProductDialogOpen(open);
          if (!open) {
            setPlaceholderInitialData(undefined);
          }
        }}
        onSubmit={handleAddProduct}
        isSubmitting={isSubmittingProduct}
        onProductAdded={() => {}}
        initialData={placeholderInitialData}
      />

      {editingProduct && (
        <AddProductDialog
          open={isEditProductDialogOpen}
          onOpenChange={(open) => {
            setIsEditProductDialogOpen(open);
            if (!open) {
              setEditingProduct(null);
            }
          }}
          onSubmit={handleUpdateProduct}
          isSubmitting={isUpdatingProduct}
          onProductAdded={() => {}}
          initialData={editingProduct}
        />
      )}
    </DashboardLayout>
  );
};

export default CategoryManagement;
