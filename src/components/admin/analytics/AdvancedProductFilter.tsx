import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
}

interface ProductSize {
  id: string;
  product_id: string;
  size_value: string;
  size_unit: string;
  product?: {
    name: string;
    category: string;
  };
}

interface FilterState {
  products: string[];
  categories: string[];
  subcategories: string[];
  sizes: string[];
}

interface AdvancedProductFilterProps {
  selectedFilters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function AdvancedProductFilter({ selectedFilters, onFiltersChange }: AdvancedProductFilterProps) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSizes, setProductSizes] = useState<ProductSize[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch products with categories
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, category, subcategory')
        .order('name');

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Extract unique categories and subcategories
      const uniqueCategories = [...new Set(productsData?.map(p => p.category).filter(Boolean))];
      const uniqueSubcategories = [...new Set(productsData?.map(p => p.subcategory).filter(Boolean))];
      
      setCategories(uniqueCategories);
      setSubcategories(uniqueSubcategories);

      // Fetch product sizes with product info
      const { data: sizesData, error: sizesError } = await supabase
        .from('product_sizes')
        .select(`
          id, 
          product_id, 
          size_value, 
          size_unit,
          products!inner(name, category)
        `)
        .order('size_value');

      if (sizesError) throw sizesError;
      setProductSizes(sizesData || []);

    } catch (error) {
      console.error('Error fetching filter data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    const newProducts = selectedFilters.products.includes(productId)
      ? selectedFilters.products.filter(id => id !== productId)
      : [...selectedFilters.products, productId];
    
    onFiltersChange({ ...selectedFilters, products: newProducts });
  };

  const handleCategorySelect = (category: string) => {
    const newCategories = selectedFilters.categories.includes(category)
      ? selectedFilters.categories.filter(c => c !== category)
      : [...selectedFilters.categories, category];
    
    onFiltersChange({ ...selectedFilters, categories: newCategories });
  };

  const handleSubcategorySelect = (subcategory: string) => {
    const newSubcategories = selectedFilters.subcategories.includes(subcategory)
      ? selectedFilters.subcategories.filter(s => s !== subcategory)
      : [...selectedFilters.subcategories, subcategory];
    
    onFiltersChange({ ...selectedFilters, subcategories: newSubcategories });
  };

  const handleSizeSelect = (sizeId: string) => {
    const newSizes = selectedFilters.sizes.includes(sizeId)
      ? selectedFilters.sizes.filter(id => id !== sizeId)
      : [...selectedFilters.sizes, sizeId];
    
    onFiltersChange({ ...selectedFilters, sizes: newSizes });
  };

  const handleClearAll = () => {
    onFiltersChange({
      products: [],
      categories: [],
      subcategories: [],
      sizes: []
    });
  };

  const getTotalFiltersCount = () => {
    return selectedFilters.products.length + 
           selectedFilters.categories.length + 
           selectedFilters.subcategories.length + 
           selectedFilters.sizes.length;
  };

  const getSelectedProductsData = () => products.filter(p => selectedFilters.products.includes(p.id));
  const getSelectedSizesData = () => productSizes.filter(s => selectedFilters.sizes.includes(s.id));
  const filteredSubcategories = useMemo(() => {
    if (selectedFilters.categories.length === 0) {
      return subcategories;
    }

    return subcategories.filter((subcategory) =>
      products.some(
        (product) =>
          product.subcategory === subcategory &&
          selectedFilters.categories.includes(product.category)
      )
    );
  }, [products, selectedFilters.categories, subcategories]);

  const filteredSizes = useMemo(() => {
    return productSizes.filter((size) => {
      const product = products.find((item) => item.id === size.product_id);
      if (!product) return false;

      if (
        selectedFilters.products.length > 0 &&
        !selectedFilters.products.includes(product.id)
      ) {
        return false;
      }

      if (
        selectedFilters.categories.length > 0 &&
        !selectedFilters.categories.includes(product.category)
      ) {
        return false;
      }

      if (
        selectedFilters.subcategories.length > 0 &&
        !selectedFilters.subcategories.includes(product.subcategory || "")
      ) {
        return false;
      }

      return true;
    });
  }, [
    productSizes,
    products,
    selectedFilters.products,
    selectedFilters.categories,
    selectedFilters.subcategories,
  ]);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[320px] justify-between"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {getTotalFiltersCount() === 0 ? (
                "Filter by products, categories & sizes..."
              ) : (
                <span className="truncate">
                  {getTotalFiltersCount()} filter{getTotalFiltersCount() > 1 ? 's' : ''} applied
                </span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[450px] p-0 mt-2" align="start" sideOffset={5}>
          {open && (
            <div className="rounded-lg border-0 shadow-none">
              {/* Header with Clear All */}
              <div className="flex items-center justify-between p-3 border-b">
                <h4 className="font-medium">Advanced Filters</h4>
                {getTotalFiltersCount() > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-7 px-2 text-xs"
                  >
                    Clear all ({getTotalFiltersCount()})
                  </Button>
                )}
              </div>

              <div className="grid gap-3 border-b bg-slate-50 p-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Quick subcategory</label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        handleSubcategorySelect(value);
                        e.target.value = "";
                      }
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select subcategory</option>
                    {filteredSubcategories.map((subcategory) => (
                      <option key={subcategory} value={subcategory}>
                        {subcategory}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Quick size</label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        handleSizeSelect(value);
                        e.target.value = "";
                      }
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select size</option>
                    {filteredSizes.map((size) => (
                      <option key={size.id} value={size.id}>
                        {size.size_value} {size.size_unit}
                        {size.product?.name ? ` - ${size.product.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filter Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
                  <TabsTrigger value="products" className="text-xs">
                    Products
                    {selectedFilters.products.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                        {selectedFilters.products.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="text-xs">
                    Categories
                    {selectedFilters.categories.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                        {selectedFilters.categories.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="subcategories" className="text-xs">
                    Subcategories
                    {selectedFilters.subcategories.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                        {selectedFilters.subcategories.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="sizes" className="text-xs">
                    Sizes
                    {selectedFilters.sizes.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                        {selectedFilters.sizes.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Products Tab */}
                <TabsContent value="products" className="mt-0">
                  <Command className="rounded-none border-0 shadow-none">
                    <CommandInput 
                      placeholder="Search products..." 
                      className="h-9 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <CommandList>
                      <CommandEmpty>
                        {loading ? "Loading products..." : "No product found."}
                      </CommandEmpty>
                      <CommandGroup className="max-h-[250px] overflow-auto p-2">
                        {products.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={product.name}
                            onSelect={() => handleProductSelect(product.id)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedFilters.products.includes(product.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col flex-1">
                              <span className="text-sm">{product.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {product.category}{product.subcategory ? ` • ${product.subcategory}` : ''}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories" className="mt-0">
                  <Command className="rounded-none border-0 shadow-none">
                    <CommandInput 
                      placeholder="Search categories..." 
                      className="h-9 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup className="max-h-[250px] overflow-auto p-2">
                        {categories.map((category) => (
                          <CommandItem
                            key={category}
                            value={category}
                            onSelect={() => handleCategorySelect(category)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedFilters.categories.includes(category) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="text-sm">{category}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </TabsContent>

                {/* Subcategories Tab */}
                <TabsContent value="subcategories" className="mt-0">
                  <Command className="rounded-none border-0 shadow-none">
                    <CommandInput 
                      placeholder="Search subcategories..." 
                      className="h-9 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <CommandList>
                      <CommandEmpty>No subcategory found.</CommandEmpty>
                      <CommandGroup className="max-h-[250px] overflow-auto p-2">
                        {subcategories.map((subcategory) => (
                          <CommandItem
                            key={subcategory}
                            value={subcategory}
                            onSelect={() => handleSubcategorySelect(subcategory)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedFilters.subcategories.includes(subcategory) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="text-sm">{subcategory}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </TabsContent>

                {/* Sizes Tab */}
                <TabsContent value="sizes" className="mt-0">
                  <Command className="rounded-none border-0 shadow-none">
                    <CommandInput 
                      placeholder="Search sizes..." 
                      className="h-9 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <CommandList>
                      <CommandEmpty>
                        {loading ? "Loading sizes..." : "No size found."}
                      </CommandEmpty>
                      <CommandGroup className="max-h-[250px] overflow-auto p-2">
                        {productSizes.map((size) => (
                          <CommandItem
                            key={size.id}
                            value={`${size.size_value} ${size.size_unit}`}
                            onSelect={() => handleSizeSelect(size.id)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedFilters.sizes.includes(size.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-medium">
                                {size.size_value} {size.size_unit}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {size.product?.name} • {size.product?.category}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </TabsContent>
              </Tabs>

              {/* Selected Filters Summary */}
              {getTotalFiltersCount() > 0 && (
                <div className="p-3 border-t bg-muted/30">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Applied Filters:
                  </div>
                  <ScrollArea className="max-h-[100px]">
                    <div className="flex flex-wrap gap-1">
                      {/* Selected Products */}
                      {getSelectedProductsData().map((product) => (
                        <Badge key={`product-${product.id}`} variant="default" className="text-xs">
                          {product.name}
                          <button
                            onClick={() => handleProductSelect(product.id)}
                            className="ml-1 hover:bg-primary/80 rounded-sm p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      
                      {/* Selected Categories */}
                      {selectedFilters.categories.map((category) => (
                        <Badge key={`category-${category}`} variant="secondary" className="text-xs">
                          Cat: {category}
                          <button
                            onClick={() => handleCategorySelect(category)}
                            className="ml-1 hover:bg-secondary/80 rounded-sm p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      
                      {/* Selected Subcategories */}
                      {selectedFilters.subcategories.map((subcategory) => (
                        <Badge key={`subcategory-${subcategory}`} variant="outline" className="text-xs">
                          Sub: {subcategory}
                          <button
                            onClick={() => handleSubcategorySelect(subcategory)}
                            className="ml-1 hover:bg-muted rounded-sm p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      
                      {/* Selected Sizes */}
                      {getSelectedSizesData().map((size) => (
                        <Badge key={`size-${size.id}`} variant="destructive" className="text-xs">
                          {size.size_value} {size.size_unit}
                          <button
                            onClick={() => handleSizeSelect(size.id)}
                            className="ml-1 hover:bg-destructive/80 rounded-sm p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {getTotalFiltersCount() > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="h-9 px-2"
          title="Clear all filters"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
