import { ProductCard } from "../ProductCard";
import { ProductDetails } from "../../types/product.types";
import { useEffect, useState } from "react";

interface ProductGridProps {
  products: ProductDetails[];
   isEditing?: boolean;
  form?: any;
}

export const ProductGrid = ({ products,isEditing=false,form={}  }: ProductGridProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="h-[300px] rounded-lg bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-gray-600">No products found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} isEditing={isEditing} form={form}  />
      ))}
    </div>
  );
};