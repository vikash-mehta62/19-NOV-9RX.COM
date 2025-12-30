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

interface ProductSize {
  id: string;
  size_value: string;
  size_unit: string;
  price: number;
  originalPrice: number;
  price_per_case: number;
  stock: number;
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
        id, size_value, size_unit, price, price_per_case, stock, 
        groupIds, disAllogroupIds
      )
    `)
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
            newPrice = parseFloat(groupProduct.new_price) || size.price;
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
  
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [showCustomProductDialog, setShowCustomProductDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<any>(null);
  const [tempNotes, setTempNotes] = useState("");
  
  // Category navigation state
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

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
    
    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

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
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
      );
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
    }
  }, [expandedCategory]);

  // Handle subcategory click
  const handleSubcategoryClick = useCallback((subcategoryName: string) => {
    setSelectedSubcategory(subcategoryName);
  }, []);

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
    const uniqueSizeId = `${size.id}-${type}`;
    
    try {
      const cartItem = {
        productId: product.id,
        name: product.name,
        image: product.image_url || "",
        price: price,
        quantity: 1,
        sizes: [{
          id: uniqueSizeId,
          size_value: size.size_value,
          size_unit: size.size_unit,
          price: price,
          quantity: 1,
          type: type,
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
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
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
              className="h-8 text-xs gap-1.5 border-emerald-300 hover:bg-emerald-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Custom Item
            </Button>
            {orderTotals.itemCount > 0 && (
              <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-1">
                {orderTotals.itemCount} items • ${orderTotals.subtotal.toFixed(2)}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Quick Search Bar */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Quick search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-white border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
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

      <div className="grid grid-cols-12 gap-3">
        {/* Left: Category Navigation */}
        <div className="col-span-3">
          <Card className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 border-b bg-emerald-50">
              <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Categories
              </span>
            </div>
            <ScrollArea className="h-[420px]">
              <div className="p-2 space-y-1">
                {/* All Products Option */}
                <button
                  onClick={handleClearFilters}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all",
                    !selectedCategory 
                      ? "bg-emerald-600 text-white" 
                      : "hover:bg-gray-100 text-gray-700"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 flex-shrink-0" />
                    <span>All Products</span>
                  </span>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    !selectedCategory ? "bg-white/20" : "bg-emerald-100 text-emerald-700"
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
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all",
                      selectedCategory === category.name
                        ? "bg-emerald-600 text-white"
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Folder className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{category.name}</span>
                    </span>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2",
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
        <div className="col-span-5">
          <Card className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 border-b bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 text-sm bg-white"
                />
                {searchQuery && (
                  <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearchQuery("")}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="h-[420px]">
              <div className="p-2 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center h-24">
                    <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-6">
                    <Package className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                    <p className="text-sm text-gray-500">No products found</p>
                  </div>
                ) : (
                  filteredProducts.slice(0, 50).map((product) => (
                    <div key={product.id} className={cn(
                      "border rounded-lg overflow-hidden transition-all",
                      expandedProduct === product.id 
                        ? "border-emerald-400 ring-1 ring-emerald-100" 
                        : "hover:border-gray-300"
                    )}>
                      {/* Product Header */}
                      <div
                        className={cn(
                          "flex items-center gap-3 p-2.5 cursor-pointer",
                          expandedProduct === product.id ? "bg-emerald-50" : "hover:bg-gray-50"
                        )}
                        onClick={() => handleProductClick(product)}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border">
                          <img 
                            src={product.image_url || "/placeholder.svg"} 
                            alt="" 
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.product_sizes?.length || 0} sizes</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-emerald-100 rounded-full"
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
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          </Button>
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform",
                            expandedProduct === product.id ? "rotate-180 text-emerald-600" : "text-gray-400"
                          )} />
                        </div>
                      </div>

                      {/* Expanded Sizes */}
                      {expandedProduct === product.id && product.product_sizes && (
                        <div className="border-t bg-gray-50 p-2 space-y-2">
                          {product.product_sizes.map((size) => (
                            <div key={size.id} className="bg-white rounded-lg p-3 border text-center">
                              <p className="text-sm font-semibold text-gray-900">
                                {size.size_value} {size.size_unit}
                              </p>
                              <p className="text-base text-emerald-600 font-bold mt-1">
                                ${size.price?.toFixed(2)}
                              </p>
                              <Button 
                                size="sm" 
                                className="mt-2 h-9 w-full bg-emerald-600 hover:bg-emerald-700"
                                onClick={(e) => { e.stopPropagation(); handleAddSize(product, size, "case"); }}
                              >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Add to Cart
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
        <div className="col-span-4">
          <Card className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 border-b bg-emerald-50 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Order ({cartItems.length})
              </span>
              {cartItems.length > 0 && (
                <span className="text-base font-bold text-emerald-600">${orderTotals.subtotal.toFixed(2)}</span>
              )}
            </div>

            <ScrollArea className="h-[420px]">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <ShoppingCart className="w-10 h-10 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No items added</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.productId} className="bg-white border rounded-lg p-3">
                      {/* Product Name & Delete */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full flex-shrink-0"
                          onClick={() => handleRemoveItem(item.productId)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Size Items - Name on top, Quantity below */}
                      {item.sizes?.map((size: any, idx: number) => (
                        <div key={`${size.id}-${idx}`} className="bg-gray-50 p-3 rounded-lg mb-2">
                          {/* Size Name */}
                          <p className="text-sm font-medium text-gray-800 mb-2">
                            {size.size_value} {size.size_unit}
                          </p>
                          {/* Quantity Counter */}
                          <div className="flex items-center justify-center">
                            <div className="flex items-center bg-white border rounded-lg overflow-hidden">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-10 p-0 rounded-none hover:bg-gray-100"
                                onClick={() => handleQuantityChange(item.productId, size.id, size.quantity - 1)}
                                disabled={size.quantity <= 1}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-12 text-center text-base font-semibold">{size.quantity}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-10 p-0 rounded-none hover:bg-gray-100"
                                onClick={() => handleQuantityChange(item.productId, size.id, size.quantity + 1)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Note & Price */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-gray-500 hover:text-emerald-600 px-2"
                          onClick={() => { setSelectedItemForNotes(item); setTempNotes(item.description || ""); setShowNotesDialog(true); }}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          {item.description ? "Edit Note" : "Add Note"}
                        </Button>
                        <span className="text-base font-bold text-emerald-600">${item.price?.toFixed(2)}</span>
                      </div>
                      
                      {item.description && (
                        <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-2">📝 {item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      </div>      {/* Notes Dialog - Simple */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1 text-sm">
              <FileText className="w-4 h-4 text-emerald-600" />
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
            <Button size="sm" onClick={handleSaveNotes} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
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
