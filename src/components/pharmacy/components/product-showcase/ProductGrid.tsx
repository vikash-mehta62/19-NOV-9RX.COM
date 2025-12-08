import { ProductCard } from "../ProductCard";
import { ProductDetails } from "../../types/product.types";
import { useEffect, useState } from "react";
import { Package, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductGridProps {
  products: ProductDetails[];
  isEditing?: boolean;
  form?: any;
}

export const ProductGrid = ({
  products,
  isEditing = false,
  form = {},
}: ProductGridProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [products]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Loading header */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        {/* Loading grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-md overflow-hidden"
            >
              <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-purple-100 rounded-full blur-2xl opacity-50"></div>
          <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-full">
            <Search className="h-16 w-16 text-purple-600" />
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          No Products Found
        </h3>
        <p className="text-gray-600 text-center max-w-md mb-6">
          We couldn't find any products matching your search criteria. 
          Try adjusting your filters or search terms.
        </p>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            View All Products
          </Button>
          <Button
            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Sparkles className="h-4 w-4" />
            Browse Categories
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Products header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Available Products
            </h2>
            <p className="text-sm text-gray-600">
              {products.length} {products.length === 1 ? 'product' : 'products'} found
            </p>
          </div>
        </div>
        
        {/* Sort options - can be added later */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
          <span>Showing {products.length} results</span>
        </div>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="animate-fade-in"
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'both'
            }}
          >
            <ProductCard
              product={product}
              isEditing={isEditing}
              form={form}
            />
          </div>
        ))}
      </div>

      {/* Load more section - if needed */}
      {products.length > 0 && products.length % 12 === 0 && (
        <div className="flex justify-center pt-8">
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
          >
            Load More Products
            <Package className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
