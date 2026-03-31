
import { ProductSize } from "@/types/product";

interface ProductStockProps {
  sizes?: ProductSize[];
  currentStock?: number;
  unitToggle?: boolean;
}

export const ProductStock = ({ sizes, currentStock, unitToggle }: ProductStockProps) => {
  // Sort sizes by sizeSquanence before displaying
  const sortedSizes = sizes ? [...sizes].sort((a, b) => (a.sizeSquanence || 0) - (b.sizeSquanence || 0)) : [];
  
  return (
    <>
      {sortedSizes.length > 0 ? (
        <div className="space-y-1">
          {sortedSizes.map((size) => (
            <div key={size.id} className="text-sm">
              {size.size_value}{unitToggle ? size.size_unit : ""}: {size.stock}
            </div>
          ))}
        </div>
      ) : (
        currentStock
      )}
    </>
  );
};
