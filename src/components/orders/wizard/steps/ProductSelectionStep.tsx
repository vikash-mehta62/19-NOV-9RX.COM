import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, Plus, Minus, Trash2, Package, X, 
  ShoppingBag, FileText, ChevronDown,
  ChevronRight, Layers, FolderOpen, Folder,
  Sparkles, ShoppingCart
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

const ProductSelectionStepComponent = ({ onCartUpdate }: ProductSelectionStepProps) => {
  const { toast } = useToast();
  const { cartItems, addToCart, removeFromCart, updateQuantity, updateDescription } = useCart();
  const userProfile = useSelector(selectUserProfile);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [showCustomProductDialog, setShowCustomProductDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<any>(null);
  const [tempNotes, setTempNotes] = useState("");
  
  // Category navigation state
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Fetch products with group pricing
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Fetch group pricing data
        const { data: groupData } = await supabase
          .from("group_pricing")
          .select("*");

        const { data, error } = await supabase
          .from("products")
          .select(`
            id, name, sku, category, subcategory, image_url,
            product_sizes (id, size_value, size_unit, price, price_per_case, stock, groupIds, disAllogroupIds)
          `)
          .order("name");

        if (error) throw error;

        const userId = userProfile?.id;

        // Apply group pricing to products
        const productsWithGroupPricing = (data || []).map((product: any) => ({
          ...product,
          product_sizes: product.product_sizes
            ?.filter((size: any) => {
              // Filter out sizes that are disallowed for user's group
              const disAllowGroupIds = size.disAllogroupIds || [];
              const isDisallowed = groupData?.some(
                (group: any) => disAllowGroupIds.includes(group.id) && group.group_ids?.includes(userId)
              );
              if (isDisallowed) return false;

              // Check if size is allowed for user's group
              const groupIds = size.groupIds || [];
              if (groupIds.length === 0) return true;
              return groupData?.some(
                (group: any) => group.group_ids?.includes(userId) && groupIds.includes(group.id)
              );
            })
            .map((size: any) => {
              let newPrice = size.price;
              let newPricePerCase = size.price_per_case;
              
              // Find applicable group pricing
              const applicableGroup = groupData?.find(
                (group: any) =>
                  group.group_ids?.includes(userId) &&
                  Array.isArray(group.product_arrayjson) &&
                  group.product_arrayjson.some((p: any) => p?.product_id === size.id)
              );

              if (applicableGroup && Array.isArray(applicableGroup.product_arrayjson)) {
                const groupProduct = applicableGroup.product_arrayjson.find(
                  (p: any) => p?.product_id === size.id
                ) as { product_id: string; new_price: string } | undefined;
                if (groupProduct?.new_price) {
                  newPrice = parseFloat(groupProduct.new_price) || size.price;
                }
              }

              return {
                ...size,
                price: newPrice,
                originalPrice: size.price === newPrice ? 0 : size.price,
                price_per_case: newPricePerCase,
              };
            }) || [],
        }));

        setProducts(productsWithGroupPricing);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [toast, userProfile]);

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
      {/* Header - Simple Compact Design */}
      <div className="flex items-center justify-between bg-white border rounded-lg p-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-gray-900">Add Products</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowCustomProductDialog(true)} 
            variant="outline" 
            size="sm"
            className="h-7 text-xs gap-1"
          >
            <Sparkles className="w-3 h-3" />
            Custom
          </Button>
          {orderTotals.itemCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
              {orderTotals.itemCount} items
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Left: Category Navigation - Simple */}
        <div className="col-span-12 lg:col-span-3">
          <Card className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-600" />
                  Categories
                </span>
                {(selectedCategory || selectedSubcategory) && (
                  <Button variant="ghost" size="sm" className="h-5 text-xs text-emerald-600 px-1" onClick={handleClearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <CardContent className="p-2">
              <ScrollArea className="h-[380px]">
                <div className="space-y-0.5">
                  {/* All Categories Option */}
                  <button
                    onClick={handleClearFilters}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs",
                      !selectedCategory 
                        ? "bg-emerald-600 text-white" 
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      <span>All Products</span>
                    </span>
                    <span className="text-xs">{products.length}</span>
                  </button>
                  
                  {/* Category List */}
                  {categories.map((category) => (
                    <div key={category.name}>
                      <button
                        onClick={() => handleCategoryClick(category.name)}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs",
                          selectedCategory === category.name && !selectedSubcategory
                            ? "bg-emerald-600 text-white"
                            : expandedCategory === category.name
                            ? "bg-emerald-50 text-emerald-900"
                            : "hover:bg-gray-100 text-gray-700"
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {expandedCategory === category.name ? (
                            <FolderOpen className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <Folder className="w-3 h-3 flex-shrink-0" />
                          )}
                          <span className="truncate">{category.name}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <span>{category.count}</span>
                          {category.subcategories.length > 0 && (
                            <ChevronRight className={cn(
                              "w-3 h-3 transition-transform",
                              expandedCategory === category.name && "rotate-90"
                            )} />
                          )}
                        </div>
                      </button>
                      
                      {/* Subcategories */}
                      {expandedCategory === category.name && category.subcategories.length > 0 && (
                        <div className="ml-4 mt-0.5 space-y-0.5 pl-2 border-l border-emerald-200">
                          {category.subcategories.map((subcat) => (
                            <button
                              key={subcat.name}
                              onClick={() => handleSubcategoryClick(subcat.name)}
                              className={cn(
                                "w-full flex items-center justify-between px-2 py-1 rounded text-xs",
                                selectedSubcategory === subcat.name
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "hover:bg-gray-100 text-gray-600"
                              )}
                            >
                              <span className="truncate">{subcat.name}</span>
                              <span>{subcat.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Middle: Product List - Simple */}
        <div className="col-span-12 lg:col-span-5">
          <Card className="border rounded-lg overflow-hidden">
            <CardContent className="p-0">
              {/* Search */}
              <div className="p-2 border-b bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-7 text-xs rounded"
                  />
                  {searchQuery && (
                    <Button variant="ghost" size="sm" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 p-0" onClick={() => setSearchQuery("")}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Product List */}
              <ScrollArea className="h-[380px]">
                <div className="p-1.5">
                  {loading ? (
                    <div className="flex items-center justify-center h-24">
                      <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-6">
                      <Package className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                      <p className="text-xs text-gray-500">No products found</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredProducts.map((product) => (
                        <div key={product.id} className="border rounded overflow-hidden">
                          {/* Product Header */}
                          <div
                            className="flex items-center gap-2 p-1.5 cursor-pointer hover:bg-gray-50"
                            onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                          >
                            <div className="w-8 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                              <img 
                                src={product.image_url || "/placeholder.svg"} 
                                alt="" 
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} 
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-gray-500">{product.product_sizes?.length || 0} sizes</p>
                            </div>
                            <ChevronDown className={cn(
                              "w-3 h-3 text-gray-400 transition-transform",
                              expandedProduct === product.id && "rotate-180"
                            )} />
                          </div>

                          {/* Expanded Sizes - 2-line layout */}
                          {expandedProduct === product.id && product.product_sizes && (
                            <div className="border-t bg-gray-50 p-1.5 space-y-1">
                              {product.product_sizes.map((size) => (
                                <div key={size.id} className="bg-white rounded p-1.5 border">
                                  {/* Line 1: Size + Discount Badge */}
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-gray-900">
                                      {size.size_value} {size.size_unit}
                                    </p>
                                    {size.originalPrice > 0 && (
                                      <Badge className="bg-red-100 text-red-700 text-xs h-4 px-1">
                                        {Math.round(((size.originalPrice - size.price) / size.originalPrice) * 100)}% OFF
                                      </Badge>
                                    )}
                                  </div>
                                  {/* Line 2: Price + Buttons */}
                                  <div className="flex items-center justify-between mt-1">
                                    <div className="flex gap-2 text-xs">
                                      {size.price_per_case > 0 && (
                                        <span className="text-gray-600">U: ${size.price_per_case?.toFixed(2)}</span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <span className="text-gray-900 font-medium">C: ${size.price?.toFixed(2)}</span>
                                        {size.originalPrice > 0 && (
                                          <span className="text-gray-400 line-through text-xs">${size.originalPrice?.toFixed(2)}</span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex gap-1">
                                      {size.price_per_case > 0 && (
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="h-5 px-1.5 text-xs"
                                          onClick={(e) => { e.stopPropagation(); handleAddSize(product, size, "unit"); }}
                                        >
                                          <Plus className="w-2.5 h-2.5 mr-0.5" />U
                                        </Button>
                                      )}
                                      <Button 
                                        size="sm" 
                                        className="h-5 px-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                                        onClick={(e) => { e.stopPropagation(); handleAddSize(product, size, "case"); }}
                                      >
                                        <Plus className="w-2.5 h-2.5 mr-0.5" />C
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Order Items - Simple */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3 text-emerald-600" />
                  Order ({cartItems.length})
                </span>
                {cartItems.length > 0 && (
                  <span className="text-sm font-semibold text-emerald-600">${orderTotals.subtotal.toFixed(2)}</span>
                )}
              </div>
            </div>

            <CardContent className="p-0">
              <ScrollArea className="h-[380px]">
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 px-4">
                    <ShoppingCart className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-xs text-gray-500 text-center">No items added</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1.5">
                    {cartItems.map((item, index) => (
                      <div key={item.productId} className="bg-white border rounded p-2">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                            <img 
                              src={item.image || "/placeholder.svg"} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} 
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-medium text-gray-900 line-clamp-1">{item.name}</p>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 w-5 p-0 text-gray-400 hover:text-red-500 flex-shrink-0"
                                onClick={() => handleRemoveItem(item.productId)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Size Items */}
                            <div className="mt-1.5 space-y-1">
                              {item.sizes?.map((size: any, idx: number) => (
                                <div key={`${size.id}-${idx}`} className="flex items-center justify-between bg-gray-50 p-1.5 rounded text-xs">
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-700">{size.size_value} {size.size_unit}</span>
                                    <span className={cn(
                                      "px-1 rounded text-xs",
                                      size.type === "case" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                    )}>
                                      {size.type === "case" ? "C" : "U"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Quantity */}
                                    <div className="flex items-center bg-white border rounded overflow-hidden">
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-5 w-5 p-0 rounded-none"
                                        onClick={() => handleQuantityChange(item.productId, size.id, size.quantity - 1)}
                                        disabled={size.quantity <= 1}
                                      >
                                        <Minus className="w-2.5 h-2.5" />
                                      </Button>
                                      <span className="w-6 text-center text-xs">{size.quantity}</span>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-5 w-5 p-0 rounded-none"
                                        onClick={() => handleQuantityChange(item.productId, size.id, size.quantity + 1)}
                                      >
                                        <Plus className="w-2.5 h-2.5" />
                                      </Button>
                                    </div>
                                    <span className="font-medium text-gray-900 w-12 text-right">
                                      ${(size.price * size.quantity).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Notes & Total */}
                            <div className="mt-1.5 flex items-center justify-between pt-1 border-t border-gray-100">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 text-xs text-gray-500 hover:text-emerald-600 p-0 gap-0.5"
                                onClick={() => { setSelectedItemForNotes(item); setTempNotes(item.description || ""); setShowNotesDialog(true); }}
                              >
                                <FileText className="w-3 h-3" />
                                {item.description ? "Edit" : "Note"}
                              </Button>
                              <span className="text-xs font-semibold text-emerald-600">${item.price?.toFixed(2)}</span>
                            </div>
                            {item.description && (
                              <p className="text-xs text-gray-500 italic mt-1 bg-amber-50 p-1 rounded text-xs">
                                📝 {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes Dialog - Simple */}
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
