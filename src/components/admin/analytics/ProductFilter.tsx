import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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

interface Product {
  id: string;
  name: string;
  category: string;
}

interface ProductFilterProps {
  selectedProducts: string[];
  onProductsChange: (productIds: string[]) => void;
}

export function ProductFilter({ selectedProducts, onProductsChange }: ProductFilterProps) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (productId: string) => {
    const newSelection = selectedProducts.includes(productId)
      ? selectedProducts.filter(id => id !== productId)
      : [...selectedProducts, productId];
    onProductsChange(newSelection);
  };

  const handleClearAll = () => {
    onProductsChange([]);
  };

  const handleRemoveProduct = (productId: string) => {
    onProductsChange(selectedProducts.filter(id => id !== productId));
  };

  const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[280px] justify-between"
          >
            {selectedProducts.length === 0 ? (
              "Filter by products..."
            ) : (
              <span className="truncate">
                {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0 mt-2" align="start" sideOffset={5}>
          {open && (
            <Command className="rounded-lg border-0 shadow-none">
              <CommandInput 
                placeholder="Search products..." 
                className="h-9 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              
              {/* Selected Products Section */}
              {selectedProducts.length > 0 && (
                <>
                  <div className="px-2 py-2 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Selected ({selectedProducts.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        className="h-6 px-2 text-xs"
                      >
                        Clear all
                      </Button>
                    </div>
                    <ScrollArea className="max-h-[120px]">
                      <div className="flex flex-wrap gap-1">
                        {selectedProductsData.map((product) => (
                          <Badge
                            key={product.id}
                            variant="secondary"
                            className="text-xs pl-2 pr-1 py-1"
                          >
                            <span className="max-w-[200px] truncate">
                              {product.name}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveProduct(product.id);
                              }}
                              className="ml-1 hover:bg-muted rounded-sm p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}

              <CommandList>
                <CommandEmpty>
                  {loading ? "Loading products..." : "No product found."}
                </CommandEmpty>
                <CommandGroup className="max-h-[300px] overflow-auto p-2">
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => handleSelect(product.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedProducts.includes(product.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1">
                        <span className="text-sm">{product.name}</span>
                        <span className="text-xs text-muted-foreground">{product.category}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>

      {selectedProducts.length > 0 && (
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
