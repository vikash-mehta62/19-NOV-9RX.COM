import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, Plus, Minus, Trash2, Package, X, 
  ShoppingBag, FileText, ChevronDown, ChevronUp,
  ChevronRight, Layers, FolderOpen, Folder
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import CustomProductForm from "@/components/orders/Customitems";
import { cn } from "@/lib/utils";

interface ProductSize {
  id: string;
  size_value: string;
  size_unit: string;
  price: number;
  price_per_case: number;
  stock: number;
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

export interface ProductSelectionStepProps {
  onCartUpdate?: () => void;
}

const ProductSelectionStepComponent = ({ onCartUpdate }: ProductSelectionStepProps) => {
  const { toast } = useToast();
  const { cartItems, addToCart, removeFromCart, updateQuantity, updateDescription } = useCart();
  
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

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            id, name, sku, category, subcategory, image_url,
            product_sizes (id, size_value, size_unit, price, price_per_case, stock)
          `)
          .order("name");

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [toast]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Add Products</h2>
          <p className="text-sm text-gray-500">Browse categories or search products</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCustomProductDialog(true)} variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Custom Item
          </Button>
          {orderTotals.itemCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1">
              <ShoppingBag className="w-4 h-4 mr-1" />
              {orderTotals.itemCount} items
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: Category Navigation */}
        <div className="col-span-12 lg:col-span-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Categories
                </h3>
                {(selectedCategory || selectedSubcategory) && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-500" onClick={handleClearFilters}>
                    Clear
                  </Button>
                )}
              </div>
              
              <ScrollArea className="h-[380px]">
                <div className="space-y-1">
                  {/* All Categories Option */}
                  <button
                    onClick={handleClearFilters}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                      !selectedCategory 
                        ? "bg-emerald-100 text-emerald-700 font-medium" 
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      All Products
                    </span>
                    <Badge variant="secondary" className="text-xs">{products.length}</Badge>
                  </button>
                  
                  {/* Category List */}
                  {categories.map((category) => (
                    <div key={category.name}>
                      <button
                        onClick={() => handleCategoryClick(category.name)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                          selectedCategory === category.name && !selectedSubcategory
                            ? "bg-emerald-100 text-emerald-700 font-medium"
                            : expandedCategory === category.name
                            ? "bg-gray-100 text-gray-900"
                            : "hover:bg-gray-100 text-gray-700"
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {expandedCategory === category.name ? (
                            <FolderOpen className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{category.name}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">{category.count}</Badge>
                          {category.subcategories.length > 0 && (
                            <ChevronRight className={cn(
                              "w-4 h-4 text-gray-400 transition-transform",
                              expandedCategory === category.name && "rotate-90"
                            )} />
                          )}
                        </div>
                      </button>
                      
                      {/* Subcategories */}
                      {expandedCategory === category.name && category.subcategories.length > 0 && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-emerald-200 pl-2">
                          {category.subcategories.map((subcat) => (
                            <button
                              key={subcat.name}
                              onClick={() => handleSubcategoryClick(subcat.name)}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors",
                                selectedSubcategory === subcat.name
                                  ? "bg-emerald-100 text-emerald-700 font-medium"
                                  : "hover:bg-gray-100 text-gray-600"
                              )}
                            >
                              <span className="truncate">{subcat.name}</span>
                              <Badge variant="outline" className="text-xs">{subcat.count}</Badge>
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

        {/* Middle: Product List */}
        <div className="col-span-12 lg:col-span-5">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearchQuery("")}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Active Filters */}
              {(selectedCategory || selectedSubcategory) && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs text-gray-500">Showing:</span>
                  {selectedCategory && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {selectedCategory}
                      {!selectedSubcategory && (
                        <X className="w-3 h-3 cursor-pointer" onClick={() => { setSelectedCategory(null); setExpandedCategory(null); }} />
                      )}
                    </Badge>
                  )}
                  {selectedSubcategory && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1">
                      {selectedSubcategory}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSubcategory(null)} />
                    </Badge>
                  )}
                </div>
              )}

              {/* Product List */}
              <ScrollArea className="h-[350px]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No products found</p>
                    {(selectedCategory || selectedSubcategory || searchQuery) && (
                      <Button variant="link" size="sm" onClick={handleClearFilters} className="mt-2">
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="border rounded-lg overflow-hidden hover:border-emerald-300 transition-colors">
                        <div
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate text-sm">{product.name}</h4>
                            <p className="text-xs text-gray-500">SKU: {product.sku} • {product.product_sizes?.length || 0} sizes</p>
                          </div>
                          {expandedProduct === product.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>

                        {expandedProduct === product.id && product.product_sizes && (
                          <div className="border-t bg-gray-50 p-3">
                            <div className="space-y-2">
                              {product.product_sizes.map((size) => (
                                <div key={size.id} className="flex items-center justify-between bg-white p-2 rounded-lg border">
                                  <div>
                                    <span className="font-medium text-sm">{size.size_value} {size.size_unit}</span>
                                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                                      {size.price_per_case > 0 && <span>Unit: ${size.price_per_case?.toFixed(2)}</span>}
                                      <span>Case: ${size.price?.toFixed(2)}</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    {size.price_per_case > 0 && (
                                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddSize(product, size, "unit")}>
                                        <Plus className="w-3 h-3 mr-1" />Unit
                                      </Button>
                                    )}
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddSize(product, size, "case")}>
                                      <Plus className="w-3 h-3 mr-1" />Case
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Order Items */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Order Items</h3>
                {cartItems.length > 0 && (
                  <span className="text-sm text-gray-500">
                    Subtotal: <span className="font-semibold text-emerald-600">${orderTotals.subtotal.toFixed(2)}</span>
                  </span>
                )}
              </div>

              <ScrollArea className="h-[380px]">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No items added</p>
                    <p className="text-sm">Click on products to add them</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.productId} className="border rounded-lg p-3 hover:border-gray-300 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img src={item.image || "/placeholder.svg"} alt={item.name} className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm text-gray-900 truncate">{item.name}</h4>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleRemoveItem(item.productId)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>

                            <div className="mt-2 space-y-1.5">
                              {item.sizes?.map((size: any, idx: number) => (
                                <div key={`${size.id}-${idx}`} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-700">{size.size_value} {size.size_unit}</span>
                                    <Badge variant="outline" className="text-xs h-5">{size.type}</Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center border rounded">
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                        onClick={() => handleQuantityChange(item.productId, size.id, size.quantity - 1)}
                                        disabled={size.quantity <= 1}>
                                        <Minus className="w-3 h-3" />
                                      </Button>
                                      <span className="w-8 text-center text-sm font-medium">{size.quantity}</span>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                        onClick={() => handleQuantityChange(item.productId, size.id, size.quantity + 1)}>
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <span className="font-medium text-gray-900 w-14 text-right">${(size.price * size.quantity).toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700 p-0"
                                onClick={() => { setSelectedItemForNotes(item); setTempNotes(item.description || ""); setShowNotesDialog(true); }}>
                                <FileText className="w-3 h-3 mr-1" />
                                {item.description ? "Edit Note" : "Add Note"}
                              </Button>
                              <span className="text-sm font-semibold text-gray-900">${item.price?.toFixed(2)}</span>
                            </div>
                            {item.description && <p className="text-xs text-gray-500 italic mt-1 truncate">{item.description}</p>}
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

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Product Notes</DialogTitle>
          </DialogHeader>
          {selectedItemForNotes && (
            <div>
              <p className="text-sm text-gray-600 mb-2">{selectedItemForNotes.name}</p>
              <Textarea
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="Add special instructions or notes..."
                className="min-h-[100px]"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveNotes}>Save</Button>
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
