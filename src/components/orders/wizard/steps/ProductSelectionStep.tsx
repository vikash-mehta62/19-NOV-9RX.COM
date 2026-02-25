import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, Plus, Minus, Trash2, Package, X, 
  ShoppingBag, FileText, ChevronDown,
  ChevronRight, Layers, FolderOpen, Folder,
  Sparkles, ShoppingCart, Eye
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import CustomProductForm from "@/components/orders/Customitems";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScreenSize } from "@/hooks/use-mobile";
import { fetchCategories } from "@/utils/categoryUtils";

interface ProductSize {
  id: string;
  size_value: string;
  size_unit: string;
  price: number;
  originalPrice: number;
  price_per_case: number;
  stock: number;
  sku?: string;
  groupIds?: string[];
  disAllogroupIds?: string[];
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  subcategory: string;
  image_url: string;
  product_sizes: ProductSize[];
}

interface CategoryData {
  name: string;
  count: number;
  subcategories: { name: string; count: number }[];
}

interface GroupPricing {
  id: string;
  group_ids: string[];
  product_arrayjson: { product_id: string; new_price: string }[];
}

export interface ProductSelectionStepProps {
  onCartUpdate?: () => void;
}

// Optimized products fetcher with React Query
const fetchProductsWithGroupPricing = async (userId: string) => {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, name, sku, category, subcategory, image_url,
      product_sizes!inner (
        id, size_value, size_unit, price, price_per_case, stock, sku,
        groupIds, disAllogroupIds
      )
    `)
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  // Fetch group pricing separately but cache it
  const { data: groupData } = await supabase
    .from("group_pricing")
    .select("*")
    .in("group_ids", [userId]);

  // Process products with group pricing
  return (data || []).map((product: any) => ({
    ...product,
    product_sizes: product.product_sizes
      ?.filter((size: any) => {
        const disAllowGroupIds = size.disAllogroupIds || [];
        const groupIds = size.groupIds || [];
        
        const isDisallowed = groupData?.some(
          (group: any) => disAllowGroupIds.includes(group.id) && group.group_ids?.includes(userId)
        );
        if (isDisallowed) return false;
        
        if (groupIds.length === 0) return true;
        return groupData?.some(
          (group: any) => group.group_ids?.includes(userId) && groupIds.includes(group.id)
        );
      })
      .map((size: any) => {
        let newPrice = size.price;
        
        const applicableGroup = groupData?.find(
          (group: any) =>
            group.group_ids?.includes(userId) &&
            Array.isArray(group.product_arrayjson) &&
            group.product_arrayjson.some((p: any) => p?.product_id === size.id)
        );

        if (applicableGroup) {
          const groupProduct = applicableGroup.product_arrayjson.find(
            (p: any) => p?.product_id === size.id
          );
          if (groupProduct?.new_price) {
            const parsed = parseFloat(groupProduct.new_price);
            newPrice = (parsed > 0) ? parsed : size.price;
          }
        }

        return {
          ...size,
          price: newPrice,
          originalPrice: size.price === newPrice ? 0 : size.price,
          price_per_case: size.price_per_case,
        };
      }) || [],
  }));
};

const ProductSelectionStepComponent = ({ onCartUpdate }: ProductSelectionStepProps) => {
  const { toast } = useToast();
  const { cartItems, addToCart, removeFromCart, updateQuantity, updateDescription } = useCart();
  const userProfile = useSelector(selectUserProfile);
  const queryClient = useQueryClient();
  const screenSize = useScreenSize();
  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';
  const isLaptop = screenSize === 'laptop';
  const isCompact = isMobile || isTablet; // Use tabs for mobile and tablet
  
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [showCustomProductDialog, setShowCustomProductDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<any>(null);
  const [tempNotes, setTempNotes] = useState("");
  
  // Mobile/Tablet tab state
  const [mobileActiveTab, setMobileActiveTab] = useState<"categories" | "products" | "cart">("products");
  
  // Category navigation state
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [dbCategoryOrder, setDbCategoryOrder] = useState<string[]>([]);

  // Fetch category order from database
  useEffect(() => {
    const loadCategories = async () => {
      const cats = await fetchCategories();
      setDbCategoryOrder(cats);
    };
    loadCategories();
  }, []);

  // Use React Query for products with caching
  const { 
    data: products = [], 
    isLoading: loading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['products-with-group-pricing', userProfile?.id],
    queryFn: () => fetchProductsWithGroupPricing(userProfile?.id || ''),
    enabled: !!userProfile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Handle query error
  useEffect(() => {
    if (error) {
      console.error("Error fetching products:", error);
      toast({ 
        title: "Error", 
        description: "Failed to load products", 
        variant: "destructive" 
      });
    }
  }, [error, toast]);

  // Build category structure from products
  const categories = useMemo(() => {
    const categoryMap = new Map<string, CategoryData>();
    
    products.forEach(product => {
      const cat = product.category || "Uncategorized";
      const subcat = product.subcategory || "";
      
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { name: cat, count: 0, subcategories: [] });
      }
      
      const categoryData = categoryMap.get(cat)!;
      categoryData.count++;
      
      if (subcat) {
        const existingSubcat = categoryData.subcategories.find(s => s.name === subcat);
        if (existingSubcat) {
          existingSubcat.count++;
        } else {
          categoryData.subcategories.push({ name: subcat, count: 1 });
        }
      } 
    });
    
    // Sort categories based on database order
    return Array.from(categoryMap.values()).sort((a, b) => {
      const indexA = dbCategoryOrder.findIndex(cat => cat.toUpperCase() === a.name.toUpperCase());
      const indexB = dbCategoryOrder.findIndex(cat => cat.toUpperCase() === b.name.toUpperCase());
      
      // If both are in dbCategoryOrder, sort by their position
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      
      // If only one is in dbCategoryOrder, it comes first
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither is in dbCategoryOrder, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [products, dbCategoryOrder]);

  // Filter products based on search and category selection
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    // Filter by subcategory
    if (selectedSubcategory) {
      filtered = filtered.filter(p => p.subcategory === selectedSubcategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const isNumericSearch = /^\d+$/.test(query);
      const hasSpace = query.includes(' ');
      
      // Optimized size matching function
      const sizeMatches = (size: ProductSize): boolean => {
        const sizeText = `${size.size_value} ${size.size_unit}`.toLowerCase();
        
        // Fast path: exact match
        if (sizeText === query) return true;
        
        // For "6 oz" type searches with space
        if (hasSpace) {
          return sizeText.startsWith(query + ' ') || sizeText.endsWith(' ' + query);
        }
        
        // For numeric searches (e.g., "6"), exact value match only
        if (isNumericSearch) {
          return size.size_value?.toString() === query;
        }
        
        // For text searches (e.g., "oz", "ml"), check unit or SKU
        const sizeUnit = size.size_unit?.toLowerCase();
        const sizeSku = size.sku?.toLowerCase();
        return sizeUnit?.includes(query) || sizeSku?.includes(query);
      };
      
      filtered = filtered
        .map(p => {
          // Cache lowercase values to avoid repeated conversions
          const productName = p.name.toLowerCase();
          const productSku = p.sku?.toLowerCase();
          const productCategory = p.category?.toLowerCase();
          const productSubcategory = p.subcategory?.toLowerCase();
          
          // Check product-level matches
          const matchesProduct = productName.includes(query) || productSku?.includes(query);
          const matchesCategory = productCategory?.includes(query) || productSubcategory?.includes(query);
          const matchesProductOrCategory = matchesProduct || matchesCategory;
          
          // If product/category matches, return with all sizes
          if (matchesProductOrCategory) {
            return { product: p, shouldInclude: true, filterSizes: false };
          }
          
          // Check if any size matches
          const hasSizeMatch = p.product_sizes?.some(sizeMatches);
          
          return { 
            product: p, 
            shouldInclude: hasSizeMatch, 
            filterSizes: hasSizeMatch 
          };
        })
        .filter(item => item.shouldInclude)
        .map(item => {
          if (!item.filterSizes) {
            return item.product;
          }
          
          // Filter sizes only when needed
          return {
            ...item.product,
            product_sizes: item.product.product_sizes?.filter(sizeMatches) || []
          };
        });
    }
    
    return filtered;
  }, [products, searchQuery, selectedCategory, selectedSubcategory]);

  // Calculate order totals
  const orderTotals = useMemo(() => {
    const itemCount = cartItems.reduce((sum, item) => 
      sum + (item.sizes?.reduce((s, size) => s + size.quantity, 0) || 0), 0
    );
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
    return { itemCount, subtotal };
  }, [cartItems]);

  // Handle category click
  const handleCategoryClick = useCallback((categoryName: string) => {
    if (expandedCategory === categoryName) {
      // Collapse if already expanded
      setExpandedCategory(null);
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    } else {
      // Expand and select category
      setExpandedCategory(categoryName);
      setSelectedCategory(categoryName);
      setSelectedSubcategory(null);
      // On mobile/tablet, switch to products tab after selecting category
      if (isCompact) {
        setMobileActiveTab("products");
      }
    }
  }, [expandedCategory, isCompact, products]);

  // Handle subcategory click
  const handleSubcategoryClick = useCallback((subcategoryName: string) => {
    setSelectedSubcategory(subcategoryName);
    // On mobile/tablet, switch to products tab after selecting subcategory
    if (isCompact) {
      setMobileActiveTab("products");
    }
  }, [isCompact]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setExpandedCategory(null);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSearchQuery("");
  }, []);

  // Handle product click - show inline details instead of opening new tab
  const handleProductClick = useCallback((product: Product) => {
    // Toggle product expansion - if same product clicked, collapse it
    if (expandedProduct === product.id) {
      setExpandedProduct(null);
    } else {
      setExpandedProduct(product.id);
    }
  }, [expandedProduct]);

  // Add product size to order
  const handleAddSize = useCallback(async (product: Product, size: ProductSize, type: "unit" | "case") => {
    const price = type === "case" ? size.price : size.price_per_case;
    // Use original size ID directly - no need for suffix since only one type is used
    const sizeId = size.id;
    
    try {
      const cartItem = {
        productId: product.id,
        name: product.name,
        sku: product.sku || "",
        image: product.image_url || "",
        price: price,
        quantity: 1,
        sizes: [{
          id: sizeId,
          size_value: size.size_value,
          size_unit: size.size_unit,
          price: price,
          quantity: 1,
          type: type,
          sku: size.sku || "",
        }],
        customizations: {},
        notes: "",
        shipping_cost: 0,
      };
      
      await addToCart(cartItem);
      onCartUpdate?.();
      toast({
        title: "Added to Order",
        description: `${product.name} - ${size.size_value} ${size.size_unit} (${type})`,
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add product", variant: "destructive" });
    }
  }, [addToCart, onCartUpdate, toast]);

  // Update quantity
  const handleQuantityChange = useCallback(async (productId: string, sizeId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateQuantity(productId, newQuantity, sizeId);
      onCartUpdate?.();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update quantity", variant: "destructive" });
    }
  }, [updateQuantity, onCartUpdate, toast]);

  // Remove item
  const handleRemoveItem = useCallback(async (productId: string) => {
    try {
      await removeFromCart(productId);
      onCartUpdate?.();
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove item", variant: "destructive" });
    }
  }, [removeFromCart, onCartUpdate, toast]);

  // Save notes
  const handleSaveNotes = useCallback(async () => {
    if (!selectedItemForNotes) return;
    try {
      await updateDescription(selectedItemForNotes.productId, tempNotes);
      onCartUpdate?.();
      setShowNotesDialog(false);
      toast({ title: "Notes saved" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save notes", variant: "destructive" });
    }
  }, [selectedItemForNotes, tempNotes, updateDescription, onCartUpdate, toast]);

  return (
    <div className="space-y-4">
      {/* Header with Search and Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Add Products to Order
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {products.length} products available • {filteredProducts.length} showing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowCustomProductDialog(true)} 
              variant="outline" 
              size="sm"
              className="h-8 text-xs gap-1.5 border-blue-300 hover:bg-blue-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Custom Item
            </Button>
            {orderTotals.itemCount > 0 && (
              <Badge className="bg-blue-600 text-white text-xs px-2.5 py-1">
                {orderTotals.itemCount} items • ${orderTotals.subtotal.toFixed(2)}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Quick Search Bar - Hidden on mobile/tablet since tabs have their own context */}
        <div className={cn("mt-3 relative", isCompact && "hidden")}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Quick search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400"
          />
          {searchQuery && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100" 
              onClick={() => setSearchQuery("")}
            >
              <X className="w-4 h-4 text-gray-400" />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile & Tablet Tab Layout */}
      {isCompact ? (
        <Tabs value={mobileActiveTab} onValueChange={(v) => setMobileActiveTab(v as "categories" | "products" | "cart")} className="w-full">
          <TabsList className={cn("w-full grid grid-cols-3 mb-3", isTablet && "h-12")}>
            <TabsTrigger value="categories" className={cn("text-xs gap-1.5", isTablet && "text-sm gap-2")}>
              <Layers className={cn("w-3.5 h-3.5", isTablet && "w-4 h-4")} />
              Categories
            </TabsTrigger>
            <TabsTrigger value="products" className={cn("text-xs gap-1.5", isTablet && "text-sm gap-2")}>
              <Package className={cn("w-3.5 h-3.5", isTablet && "w-4 h-4")} />
              Products
            </TabsTrigger>
            <TabsTrigger value="cart" className={cn("text-xs gap-1.5 relative", isTablet && "text-sm gap-2")}>
              <ShoppingBag className={cn("w-3.5 h-3.5", isTablet && "w-4 h-4")} />
              Cart
              {cartItems.length > 0 && (
                <span className={cn(
                  "absolute -top-1 -right-1 bg-blue-600 text-white rounded-full flex items-center justify-center",
                  isMobile ? "text-[10px] w-4 h-4" : "text-xs w-5 h-5"
                )}>
                  {cartItems.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Mobile/Tablet Categories Tab */}
          <TabsContent value="categories" className="mt-0">
            <Card className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <ScrollArea className={cn("h-[400px]", isTablet && "h-[500px]")}>
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => { handleClearFilters(); setMobileActiveTab("products"); }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all",
                      !selectedCategory ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5" />
                      <span>All Products</span>
                    </span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", !selectedCategory ? "bg-white/20" : "bg-blue-100 text-blue-700")}>
                      {products.length}
                    </span>
                  </button>
                  {categories.map((category) => (
                      <button
                        key={category.name}
                        onClick={() => handleCategoryClick(category.name)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all",
                          selectedCategory === category.name ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-700"
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="text-left leading-tight">{category.name}</span>
                        </span>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2", selectedCategory === category.name ? "bg-white/20" : "bg-gray-200 text-gray-600")}>
                          {category.count}
                        </span>
                      </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Mobile/Tablet Products Tab */}
          <TabsContent value="products" className="mt-0">
            <Card className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Search Bar */}
              <div className="px-3 py-2.5 border-b bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn("pl-10 text-sm bg-white", isTablet ? "h-11" : "h-10")}
                  />
                  {searchQuery && (
                    <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0" onClick={() => setSearchQuery("")}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              {selectedCategory && (
                <div className="px-3 py-2 bg-blue-50 border-b flex items-center justify-between">
                  <span className={cn("text-blue-700 font-medium", isTablet ? "text-sm" : "text-xs")}>{selectedCategory}</span>
                  <Button variant="ghost" size="sm" className={cn(isTablet ? "h-8 text-sm" : "h-6 text-xs")} onClick={handleClearFilters}>Clear</Button>
                </div>
              )}
              <ScrollArea className={cn(isTablet ? "h-[500px]" : "h-[400px]")}>
                {/* Tablet: Grid layout for products */}
                {isTablet ? (
                  <div className="p-3 grid grid-cols-2 gap-3">
                    {loading ? (
                      <div className="col-span-2 flex items-center justify-center h-24">
                        <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="col-span-2 text-center py-6">
                        <Package className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                        <p className="text-sm text-gray-500">No products found</p>
                      </div>
                    ) : (
                      filteredProducts.slice(0, 50).map((product) => (
                        <div key={product.id} className={cn("border rounded-lg overflow-hidden transition-all", expandedProduct === product.id ? "border-blue-400 ring-1 ring-blue-100 col-span-2" : "hover:border-gray-300")}>
                          <div className={cn("flex items-center gap-3 p-3 cursor-pointer", expandedProduct === product.id ? "bg-blue-50" : "hover:bg-gray-50")} onClick={() => handleProductClick(product)}>
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border">
                              <img src={product.image_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-gray-500">{product.product_sizes?.length || 0} sizes</p>
                            </div>
                            <ChevronDown className={cn("w-5 h-5 transition-transform", expandedProduct === product.id ? "rotate-180 text-blue-600" : "text-gray-400")} />
                          </div>
                          {expandedProduct === product.id && product.product_sizes && (
                            <div className="border-t bg-gray-50 p-3 grid grid-cols-2 gap-2">
                              {product.product_sizes.map((size) => (
                                <div key={size.id} className="bg-white rounded-lg p-3 border">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">{size.size_value} {size.size_unit}</p>
                                      {size.sku && <p className="text-xs text-gray-400">SKU: {size.sku}</p>}
                                    </div>
                                    <p className="text-lg text-emerald-600 font-bold">${size.price?.toFixed(2)}</p>
                                  </div>
                                  <Button size="sm" className="h-10 w-full bg-blue-600 hover:bg-blue-700" onClick={(e) => { e.stopPropagation(); handleAddSize(product, size, "case"); setMobileActiveTab("cart"); }}>
                                    <Plus className="w-4 h-4 mr-1.5" />Add to Cart
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Mobile: List layout */
                  <div className="p-2 space-y-2">
                    {loading ? (
                      <div className="flex items-center justify-center h-24">
                        <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-center py-6">
                        <Package className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                        <p className="text-sm text-gray-500">No products found</p>
                      </div>
                    ) : (
                      filteredProducts.slice(0, 50).map((product) => (
                        <div key={product.id} className={cn("border rounded-lg overflow-hidden transition-all", expandedProduct === product.id ? "border-blue-400 ring-1 ring-blue-100" : "hover:border-gray-300")}>
                          <div className={cn("flex items-center gap-3 p-3 cursor-pointer", expandedProduct === product.id ? "bg-blue-50" : "hover:bg-gray-50")} onClick={() => handleProductClick(product)}>
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border">
                              <img src={product.image_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-gray-500">{product.product_sizes?.length || 0} sizes</p>
                            </div>
                            <ChevronDown className={cn("w-5 h-5 transition-transform", expandedProduct === product.id ? "rotate-180 text-blue-600" : "text-gray-400")} />
                          </div>
                          {expandedProduct === product.id && product.product_sizes && (
                            <div className="border-t bg-gray-50 p-2 space-y-2">
                              {product.product_sizes.map((size) => (
                                <div key={size.id} className="bg-white rounded-lg p-3 border">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">{size.size_value} {size.size_unit}</p>
                                      {size.sku && <p className="text-xs text-gray-400">SKU: {size.sku}</p>}
                                    </div>
                                    <p className="text-base text-emerald-600 font-bold">${size.price?.toFixed(2)}</p>
                                  </div>
                                  <Button size="sm" className="mt-2 h-10 w-full bg-blue-600 hover:bg-blue-700" onClick={(e) => { e.stopPropagation(); handleAddSize(product, size, "case"); setMobileActiveTab("cart"); }}>
                                    <Plus className="w-4 h-4 mr-1.5" />Add to Cart
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Mobile/Tablet Cart Tab */}
          <TabsContent value="cart" className="mt-0">
            <Card className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className={cn("px-3 py-2.5 border-b bg-blue-50 flex items-center justify-between", isTablet && "px-4 py-3")}>
                <span className={cn("font-semibold text-gray-800 flex items-center gap-2", isTablet ? "text-base" : "text-sm")}>
                  <ShoppingBag className={cn("text-blue-600", isTablet ? "w-5 h-5" : "w-4 h-4")} />
                  Order ({cartItems.length})
                </span>
                {cartItems.length > 0 && <span className={cn("font-bold text-blue-600", isTablet ? "text-lg" : "text-base")}>${orderTotals.subtotal.toFixed(2)}</span>}
              </div>
              <ScrollArea className={cn(isTablet ? "h-[500px]" : "h-[400px]")}>
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <ShoppingCart className={cn("text-gray-300 mb-2", isTablet ? "w-12 h-12" : "w-10 h-10")} />
                    <p className={cn("text-gray-500", isTablet ? "text-base" : "text-sm")}>No items added</p>
                    <Button variant="outline" size={isTablet ? "default" : "sm"} className="mt-3" onClick={() => setMobileActiveTab("products")}>Browse Products</Button>
                  </div>
                ) : (
                  /* Tablet: Grid layout for cart items */
                  isTablet ? (
                    <div className="p-3 grid grid-cols-2 gap-3">
                      {cartItems.map((item) => (
                        <div key={item.productId} className="bg-white border rounded-lg p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-bold text-gray-900">{item.name}</p>
                              {item.sku && <p className="text-sm text-gray-400">SKU: {item.sku}</p>}
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full flex-shrink-0" onClick={() => handleRemoveItem(item.productId)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {item.sizes?.map((size: any, idx: number) => (
                            <div key={`${size.id}-${idx}`} className="bg-gray-50 p-3 rounded-lg mb-2">
                              <p className="text-sm font-medium text-gray-800 mb-0.5">{size.size_value} {size.size_unit}</p>
                              {size.sku && <p className="text-xs text-gray-400 mb-2">SKU: {size.sku}</p>}
                              <div className="flex items-center justify-center">
                                <div className="flex items-center bg-white border rounded-lg overflow-hidden">
                                  <Button variant="ghost" size="sm" className="h-10 w-12 p-0 rounded-none hover:bg-gray-100" onClick={() => handleQuantityChange(item.productId, size.id, size.quantity - 1)} disabled={size.quantity <= 1}>
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  <span className="w-14 text-center text-base font-semibold">{size.quantity}</span>
                                  <Button variant="ghost" size="sm" className="h-10 w-12 p-0 rounded-none hover:bg-gray-100" onClick={() => handleQuantityChange(item.productId, size.id, size.quantity + 1)}>
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <Button variant="ghost" size="sm" className="h-8 text-sm text-gray-500 hover:text-blue-600 px-2" onClick={() => { setSelectedItemForNotes(item); setTempNotes(item.description || ""); setShowNotesDialog(true); }}>
                              <FileText className="w-4 h-4 mr-1" />{item.description ? "Edit Note" : "Add Note"}
                            </Button>
                            <span className="text-lg font-bold text-blue-600">${item.price?.toFixed(2)}</span>
                          </div>
                          {item.description && <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded mt-2">📝 {item.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Mobile: List layout */
                    <div className="p-2 space-y-2">
                      {cartItems.map((item) => (
                        <div key={item.productId} className="bg-white border rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900">{item.name}</p>
                              {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full flex-shrink-0" onClick={() => handleRemoveItem(item.productId)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {item.sizes?.map((size: any, idx: number) => (
                            <div key={`${size.id}-${idx}`} className="bg-gray-50 p-3 rounded-lg mb-2">
                              <p className="text-sm font-medium text-gray-800 mb-0.5">{size.size_value} {size.size_unit}</p>
                              {size.sku && <p className="text-xs text-gray-400 mb-2">SKU: {size.sku}</p>}
                              <div className="flex items-center justify-center">
                                <div className="flex items-center bg-white border rounded-lg overflow-hidden">
                                  <Button variant="ghost" size="sm" className="h-10 w-12 p-0 rounded-none hover:bg-gray-100" onClick={() => handleQuantityChange(item.productId, size.id, size.quantity - 1)} disabled={size.quantity <= 1}>
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  <span className="w-14 text-center text-base font-semibold">{size.quantity}</span>
                                  <Button variant="ghost" size="sm" className="h-10 w-12 p-0 rounded-none hover:bg-gray-100" onClick={() => handleQuantityChange(item.productId, size.id, size.quantity + 1)}>
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500 hover:text-blue-600 px-2" onClick={() => { setSelectedItemForNotes(item); setTempNotes(item.description || ""); setShowNotesDialog(true); }}>
                              <FileText className="w-3.5 h-3.5 mr-1" />{item.description ? "Edit Note" : "Add Note"}
                            </Button>
                            <span className="text-base font-bold text-blue-600">${item.price?.toFixed(2)}</span>
                          </div>
                          {item.description && <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded mt-2">📝 {item.description}</p>}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        /* Laptop & Desktop Grid Layout */
        <div className={cn("grid", isLaptop ? "grid-cols-12 gap-2" : "grid-cols-12 gap-3")}>
          {/* Left: Category Navigation */}
          <div className={cn(isLaptop ? "col-span-3" : "col-span-3")}>
            <Card className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className={cn("border-b bg-blue-50", isLaptop ? "px-2 py-1.5" : "px-3 py-2.5")}>
                <span className={cn("font-semibold text-gray-800 flex items-center", isLaptop ? "text-[10px] gap-1" : "text-xs gap-1.5")}>
                  <Layers className={cn("text-blue-600", isLaptop ? "w-3 h-3" : "w-4 h-4")} />
                  Categories
                </span>
              </div>
              <ScrollArea className={cn(isLaptop ? "h-[380px]" : "h-[420px]")}>
                <div className={cn(isLaptop ? "p-1 space-y-0.5" : "p-2 space-y-1")}>
                  {/* All Products Option */}
                  <button
                    onClick={handleClearFilters}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg transition-all",
                      isLaptop ? "px-1.5 py-1.5 text-[9px]" : "px-2 py-1.5 text-xs",
                      !selectedCategory 
                        ? "bg-blue-600 text-white" 
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    <span className={cn("flex items-center min-w-0", isLaptop ? "gap-1" : "gap-1.5")}>
                      <Package className={cn("flex-shrink-0", isLaptop ? "w-2.5 h-2.5" : "w-3 h-3")} />
                      <span className="break-words text-left leading-tight">All Products</span>
                    </span>
                    <span className={cn(
                      "font-medium rounded-full flex-shrink-0 ml-1",
                      isLaptop ? "text-[8px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5",
                      !selectedCategory ? "bg-white/20" : "bg-blue-100 text-blue-700"
                    )}>
                      {products.length}
                    </span>
                  </button>
                  
                  {/* Category List */}
                  {categories.map((category) => (
                      <button
                        key={category.name}
                        onClick={() => handleCategoryClick(category.name)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-lg transition-all",
                          isLaptop ? "px-1.5 py-1.5 text-[9px]" : "px-2 py-1.5 text-xs",
                          selectedCategory === category.name
                            ? "bg-blue-600 text-white"
                            : "hover:bg-gray-100 text-gray-700"
                        )}
                      >
                        <span className={cn("flex items-center min-w-0 flex-1", isLaptop ? "gap-1" : "gap-1.5")}>
                          <Folder className={cn("flex-shrink-0", isLaptop ? "w-2.5 h-2.5" : "w-3 h-3")} />
                          <span className="break-words text-left leading-tight">{category.name}</span>
                        </span>
                        <span className={cn(
                          "font-medium rounded-full flex-shrink-0 ml-1",
                          isLaptop ? "text-[8px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5",
                          selectedCategory === category.name ? "bg-white/20" : "bg-gray-200 text-gray-600"
                        )}>
                          {category.count}
                        </span>
                      </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Middle: Product List */}
          <div className={cn(isLaptop ? "col-span-5" : "col-span-5")}>
            <Card className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className={cn("border-b bg-gray-50", isLaptop ? "px-2 py-1.5" : "px-3 py-2.5")}>
                <div className="relative">
                  <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400", isLaptop ? "w-3 h-3" : "w-4 h-4")} />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn("bg-white", isLaptop ? "pl-7 h-7 text-[11px]" : "pl-10 h-9 text-sm")}
                  />
                  {searchQuery && (
                    <Button variant="ghost" size="sm" className={cn("absolute right-1 top-1/2 -translate-y-1/2 p-0", isLaptop ? "h-5 w-5" : "h-7 w-7")} onClick={() => setSearchQuery("")}>
                      <X className={cn(isLaptop ? "w-3 h-3" : "w-4 h-4")} />
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className={cn(isLaptop ? "h-[380px]" : "h-[420px]")}>
              <div className={cn(isLaptop ? "p-1 space-y-0.5" : "p-2 space-y-2")}>
                {loading ? (
                  <div className="flex items-center justify-center h-24">
                    <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-6">
                    <Package className={cn("mx-auto mb-1 text-gray-300", isLaptop ? "w-6 h-6" : "w-8 h-8")} />
                    <p className={cn("text-gray-500", isLaptop ? "text-[11px]" : "text-sm")}>No products found</p>
                  </div>
                ) : (
                  filteredProducts.slice(0, 50).map((product) => (
                    <div key={product.id} className={cn(
                      "border rounded-lg overflow-hidden transition-all",
                      expandedProduct === product.id 
                        ? "border-blue-400 ring-1 ring-blue-100" 
                        : "hover:border-gray-300"
                    )}>
                      {/* Product Header */}
                      <div
                        className={cn(
                          "flex items-center cursor-pointer",
                          isLaptop ? "gap-1.5 p-1.5" : "gap-3 p-2.5",
                          expandedProduct === product.id ? "bg-blue-50" : "hover:bg-gray-50"
                        )}
                        onClick={() => handleProductClick(product)}
                      >
                        <div className={cn("rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border", isLaptop ? "w-7 h-7" : "w-10 h-10")}>
                          <img 
                            src={product.image_url || "/placeholder.svg"} 
                            alt="" 
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-medium text-gray-900 truncate", isLaptop ? "text-[11px]" : "text-sm")}>{product.name}</p>
                          <p className={cn("text-gray-500", isLaptop ? "text-[9px]" : "text-xs")}>{product.product_sizes?.length || 0} sizes</p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("p-0 hover:bg-blue-100 rounded-full", isLaptop ? "h-5 w-5" : "h-7 w-7")}
                            onClick={(e) => {
                              e.stopPropagation();
                              const userType = sessionStorage.getItem('userType')?.toLowerCase();
                              if (userType === 'group') {
                                window.open(`/group/product/${product.id}`, '_blank');
                              } else if (userType === 'admin') {
                                window.open(`/admin/product/${product.id}`, '_blank');
                              } else {
                                window.open(`/pharmacy/product/${product.id}`, '_blank');
                              }
                            }}
                          >
                            <Eye className={cn("text-blue-600", isLaptop ? "w-2.5 h-2.5" : "w-3.5 h-3.5")} />
                          </Button>
                          <ChevronDown className={cn(
                            "transition-transform",
                            isLaptop ? "w-3 h-3" : "w-4 h-4",
                            expandedProduct === product.id ? "rotate-180 text-blue-600" : "text-gray-400"
                          )} />
                        </div>
                      </div>

                      {/* Expanded Sizes */}
                      {expandedProduct === product.id && product.product_sizes && (
                        <div className={cn("border-t bg-gray-50", isLaptop ? "p-1 space-y-1" : "p-2 space-y-2")}>
                          {product.product_sizes.map((size) => (
                            <div key={size.id} className={cn("bg-white rounded-lg border text-center", isLaptop ? "p-1.5" : "p-3")}>
                              <p className={cn("font-semibold text-gray-900", isLaptop ? "text-[11px]" : "text-sm")}>
                                {size.size_value} {size.size_unit}
                              </p>
                              {size.sku && (
                                <p className={cn("text-gray-400", isLaptop ? "text-[9px]" : "text-xs")}>
                                  SKU: {size.sku}
                                </p>
                              )}
                              <p className={cn("text-emerald-600 font-bold mt-0.5", isLaptop ? "text-xs" : "text-base")}>
                                ${size.price?.toFixed(2)}
                              </p>
                              <Button 
                                size="sm" 
                                className={cn("w-full bg-blue-600 hover:bg-blue-700", isLaptop ? "mt-1 h-6 text-[10px]" : "mt-2 h-9")}
                                onClick={(e) => { e.stopPropagation(); handleAddSize(product, size, "case"); }}
                              >
                                <Plus className={cn(isLaptop ? "w-2.5 h-2.5 mr-0.5" : "w-4 h-4 mr-1.5")} />
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Right: Order Cart */}
        <div className={cn(isLaptop ? "col-span-4" : "col-span-4")}>
          <Card className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className={cn("border-b bg-blue-50 flex items-center justify-between", isLaptop ? "px-2 py-1.5" : "px-3 py-2.5")}>
              <span className={cn("font-semibold text-gray-800 flex items-center", isLaptop ? "text-[11px] gap-1" : "text-sm gap-1.5")}>
                <ShoppingBag className={cn("text-blue-600", isLaptop ? "w-3 h-3" : "w-4 h-4")} />
                Order ({cartItems.length})
              </span>
              {cartItems.length > 0 && (
                <span className={cn("font-bold text-blue-600", isLaptop ? "text-xs" : "text-base")}>${orderTotals.subtotal.toFixed(2)}</span>
              )}
            </div>

            <ScrollArea className={cn(isLaptop ? "h-[380px]" : "h-[420px]")}>
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <ShoppingCart className={cn("text-gray-300 mb-2", isLaptop ? "w-6 h-6" : "w-10 h-10")} />
                  <p className={cn("text-gray-500", isLaptop ? "text-[11px]" : "text-sm")}>No items added</p>
                </div>
              ) : (
                <div className={cn(isLaptop ? "p-1 space-y-1" : "p-2 space-y-2")}>
                  {cartItems.map((item) => (
                    <div key={item.productId} className={cn("bg-white border rounded-lg", isLaptop ? "p-1.5" : "p-3")}>
                      {/* Product Name & Delete */}
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-bold text-gray-900 truncate", isLaptop ? "text-[11px]" : "text-sm")}>{item.name}</p>
                          {item.sku && (
                            <p className={cn("text-gray-400", isLaptop ? "text-[9px]" : "text-xs")}>SKU: {item.sku}</p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn("p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full flex-shrink-0", isLaptop ? "h-4 w-4" : "h-6 w-6")}
                          onClick={() => handleRemoveItem(item.productId)}
                        >
                          <Trash2 className={cn(isLaptop ? "w-2.5 h-2.5" : "w-3.5 h-3.5")} />
                        </Button>
                      </div>

                      {/* Size Items - Name on top, Quantity below */}
                      {item.sizes?.map((size: any, idx: number) => (
                        <div key={`${size.id}-${idx}`} className={cn("bg-gray-50 rounded-lg mb-1", isLaptop ? "p-1.5" : "p-3")}>
                          {/* Size Name */}
                          <p className={cn("font-medium text-gray-800 mb-0.5", isLaptop ? "text-[11px]" : "text-sm")}>
                            {size.size_value} {size.size_unit}
                          </p>
                          {/* Size SKU - always show if available */}
                          <p className={cn("text-gray-400", isLaptop ? "text-[9px] mb-0.5" : "text-xs mb-2")}>
                            {size.sku ? `SKU: ${size.sku}` : ""}
                          </p>
                          {/* Quantity Counter */}
                          <div className="flex items-center justify-center">
                            <div className="flex items-center bg-white border rounded-lg overflow-hidden">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={cn("p-0 rounded-none hover:bg-gray-100", isLaptop ? "h-5 w-6" : "h-8 w-10")}
                                onClick={() => handleQuantityChange(item.productId, size.id, size.quantity - 1)}
                                disabled={size.quantity <= 1}
                              >
                                <Minus className={cn(isLaptop ? "w-2.5 h-2.5" : "w-4 h-4")} />
                              </Button>
                              <span className={cn("text-center font-semibold", isLaptop ? "w-6 text-[11px]" : "w-12 text-base")}>{size.quantity}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={cn("p-0 rounded-none hover:bg-gray-100", isLaptop ? "h-5 w-6" : "h-8 w-10")}
                                onClick={() => handleQuantityChange(item.productId, size.id, size.quantity + 1)}
                              >
                                <Plus className={cn(isLaptop ? "w-2.5 h-2.5" : "w-4 h-4")} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Note & Price */}
                      <div className={cn("flex items-center justify-between border-t", isLaptop ? "pt-1" : "pt-2")}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn("text-gray-500 hover:text-blue-600 px-1", isLaptop ? "h-5 text-[9px]" : "h-7 text-xs")}
                          onClick={() => { setSelectedItemForNotes(item); setTempNotes(item.description || ""); setShowNotesDialog(true); }}
                        >
                          <FileText className={cn("mr-0.5", isLaptop ? "w-2.5 h-2.5" : "w-3.5 h-3.5")} />
                          {item.description ? "Edit" : "Note"}
                        </Button>
                        <span className={cn("font-bold text-blue-600", isLaptop ? "text-xs" : "text-base")}>${item.price?.toFixed(2)}</span>
                      </div>
                      
                      {item.description && (
                        <p className={cn("text-blue-700 bg-blue-50 rounded mt-1", isLaptop ? "text-[9px] p-1" : "text-xs p-2")}>📝 {item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
        </div>
      )}
  
      {/* Notes Dialog - Simple */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1 text-sm">
              <FileText className="w-4 h-4 text-blue-600" />
              Product Notes
            </DialogTitle>
          </DialogHeader>
          {selectedItemForNotes && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <div className="w-8 h-8 rounded overflow-hidden bg-white">
                  <img 
                    src={selectedItemForNotes.image || "/placeholder.svg"} 
                    alt={selectedItemForNotes.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs font-medium text-gray-900">{selectedItemForNotes.name}</span>
              </div>
              <Textarea
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="Add notes..."
                className="min-h-[80px] text-sm rounded resize-none"
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNotesDialog(false)} className="h-7 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveNotes} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Product Dialog */}
      <CustomProductForm
        isOpen={showCustomProductDialog}
        onClose={() => setShowCustomProductDialog(false)}
        isEditing={false}
        form={null}
      />
    </div>
  );
};

export const ProductSelectionStep = memo(ProductSelectionStepComponent);
