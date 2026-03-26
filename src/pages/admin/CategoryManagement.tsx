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
import { fetchOrderedSubcategories } from "@/services/productTreeService";
import { supabase } from "@/supabaseClient";
import { EditSizeDialog, type EditableSize } from "@/components/products/EditSizeDialog";
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
  onEditSize: (sizeId: string) => void;
  onAddSize: (productId: string) => void;
  onDeleteSize: (size: ProductSizeSummary) => void;
  onToggleSizeStatus: (size: ProductSizeSummary) => void;
}

interface CategoryProductSummary {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
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
  subcategories: Array<{ category_name: string; subcategory_name: string }>
) => {
  const groupedProducts = products.reduce<Record<string, CategoryProductSummary[]>>(
    (acc, product) => {
      const categoryName = product.category || "Uncategorized";
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
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
  onEditSize,
  onAddSize,
  onDeleteSize,
  onToggleSizeStatus,
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

  const getSizeLabel = (size: ProductSizeSummary, showUnit = true) =>
    [size.size_value?.toString().trim(), showUnit ? size.size_unit?.trim() : ""]
      .filter(Boolean)
      .join(" ") || "Size";

  const toggleProductSizes = (productId: string) => {
    setExpandedProductIds((current) => ({
      ...current,
      [productId]: !current[productId],
    }));
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 p-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded"
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </button>

        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-slate-50 p-2">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={category.category_name}
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-gray-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium">{category.category_name}</div>
          <div className="text-sm text-gray-500">Display Order: {index + 1}</div>
          <div className="text-xs text-gray-400 mt-1 font-mono break-all">ID: {category.id}</div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onToggleExpanded(category.id)}
          className="shrink-0"
        >
          <ChevronDown
            className={`w-4 h-4 mr-2 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
          {isExpanded ? "Hide Products" : `View Products (${products.length})`}
        </Button>
      </div>

      {isExpanded && (
        <div className="border-t bg-slate-50/70 px-4 py-4">
          {products.length > 0 ? (
            <div className="space-y-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4 px-4 py-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                        {productImageUrls[product.id] ? (
                          <img
                            src={productImageUrls[product.id]}
                            alt={product.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-lg font-semibold text-slate-900">{product.name}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              product.is_active === false || product.isPlaceholder
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {product.is_active === false || product.isPlaceholder ? "Inactive" : "Active"}
                          </span>
                        </div>

                        <div className="mt-2 grid gap-1 text-sm text-slate-600">
                          <p>
                            <span className="font-medium text-slate-800">Subcategory:</span>{" "}
                            {product.subcategory?.trim() || "General"}
                          </p>
                          <p>
                            <span className="font-medium text-slate-800">Sizes:</span>{" "}
                            {getSizeSummary(product)}
                          </p>
                          <p>
                            <span className="font-medium text-slate-800">Inventory:</span>{" "}
                            {getStockSummary(product)}
                          </p>
                        </div>
                      </div>
                    </div>

                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold text-slate-900">
                        ${getDisplayPrice(product).toFixed(2)}
                      </p>
                      <p className="text-sm text-slate-500">{product.isPlaceholder ? "Placeholder" : "Base price"}</p>
                      <div className="mt-3 flex flex-row items-end gap-2">
                        {!product.isPlaceholder && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleProductSizes(product.id)}
                            >
                              <ChevronDown
                                className={`mr-2 h-4 w-4 transition-transform ${
                                  expandedProductIds[product.id] ? "rotate-180" : ""
                                }`}
                              />
                              {(product.sizes || []).length} size option{(product.sizes || []).length === 1 ? "" : "s"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onEditProduct(product.id)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Product
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedProductIds[product.id] && !product.isPlaceholder && (
                    <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Size Options</p>
                          <p className="text-xs text-slate-500">
                            Add a new size for this product from here.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onAddSize(product.id)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Size <br />
                        </Button>
                      </div>
                      {(product.sizes || []).length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          {(product.sizes || []).map((size, index) => (
                            <div
                              key={`${product.id}-${getSizeLabel(size)}-${index}`}
                              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                              <div className="flex h-full flex-col gap-4">
                                <div className="flex items-start gap-4">
                                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
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
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm text-slate-600">
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
                                      <div className="shrink-0 text-right">
                                        <p className="text-lg font-semibold text-slate-900">
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
                                  <div className="mt-auto flex justify-end gap-2 border-t border-slate-100 pt-4">
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
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                          No size options found for this product.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
              No products found in this category.
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
  const [sizeToDelete, setSizeToDelete] = useState<ProductSizeSummary | null>(null);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

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
          .select("id, name, category, subcategory, unitToggle, is_active, base_price, image_url, sizes:product_sizes(id, size_name, size_value, size_unit, stock, sku, price, image, is_active)")
          .order("name", { ascending: true }),
      ]);

      if (productsResponse.error) {
        throw productsResponse.error;
      }

      const groupedProducts = buildProductsByCategory(
        (productsResponse.data || []) as CategoryProductSummary[],
        (subcategoriesResponse || []) as Array<{ category_name: string; subcategory_name: string }>
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

      resolveCategoryUnits(matchedProduct?.category);

      const { data, error } = await supabase
        .from("product_sizes")
        .select("id, size_name, size_value, size_unit, sku, price, price_per_case, stock, quantity_per_case, shipping_cost, ndcCode, upcCode, lotNumber, exipry, groupIds, disAllogroupIds, image, is_active")
        .eq("id", sizeId)
        .single();

      if (error) {
        throw error;
      }

      setEditingSize({
        id: data.id,
        size_name: data.size_name || "",
        size_value: data.size_value || "",
        size_unit: data.size_unit || "",
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
    const resolvedDefaultUnit =
      categories.find((item) => item.category_name === matchedProduct?.category)?.default_unit ||
      resolvedUnits[0] ||
      FALLBACK_DEFAULT_UNIT;

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
    const updates = {
      size_name: size.size_name || null,
      size_value: size.size_value,
      size_unit: size.size_unit,
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
                  size_unit: size.size_unit,
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

    setEditingSize(size);
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

    const payload = {
      product_id: addingSizeProductId,
      size_name: size.size_name || null,
      size_value: size.size_value || "0",
      size_unit: size.size_unit || "unit",
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
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          sizes:product_sizes(*)
        `)
        .eq("id", productId)
        .single();

      if (error) {
        throw error;
      }

      const transformed = transformProductData(data ? [data] : []);
      if (!transformed[0]) {
        throw new Error("Failed to load product details.");
      }

      setEditingProduct(transformed[0]);
      setIsEditProductDialogOpen(true);
    } catch (error) {
      console.error("Error loading product details:", error);
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
    }
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Category Management</h1>
            <p className="text-gray-500 mt-1">
              Drag and drop to reorder categories. Changes affect all product displays.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCategoryManagerOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
            {hasChanges && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saving}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Order"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
            <CardDescription>
              Drag categories to reorder them. New categories will appear at the end by default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {categories.map((category, index) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      index={index}
                      products={productsByCategory[category.category_name] || []}
                      isExpanded={!!expandedCategoryIds[category.id]}
                      onToggleExpanded={handleToggleExpanded}
                      onEditProduct={handleOpenProductEdit}
                      onEditSize={handleOpenSizeEdit}
                      onAddSize={handleOpenAddSize}
                      onDeleteSize={setSizeToDelete}
                      onToggleSizeStatus={handleToggleSizeStatus}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {categories.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No categories found
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2">
            <p>• Categories are displayed in this order across all product pages</p>
            <p>• New categories added to the database will appear at the end automatically</p>
            <p>• Changes take effect immediately after saving</p>
            <p>• Users will see the new order on their next page load</p>
          </CardContent>
        </Card>

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

        <CategorySubcategoryManager
          open={isCategoryManagerOpen}
          onOpenChange={setIsCategoryManagerOpen}
          onSuccess={loadCategories}
        />

        <AddProductDialog
          open={isAddProductDialogOpen}
          onOpenChange={setIsAddProductDialogOpen}
          onSubmit={handleAddProduct}
          isSubmitting={isSubmittingProduct}
          onProductAdded={() => {}}
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
      </div>
    </DashboardLayout>
  );
};

export default CategoryManagement;
