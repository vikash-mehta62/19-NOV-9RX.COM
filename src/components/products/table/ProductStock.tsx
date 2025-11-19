
import { ProductSize } from "@/types/product";

interface ProductStockProps {
  sizes?: ProductSize[];
  currentStock?: number;
}

export const ProductStock = ({ sizes, currentStock }: ProductStockProps) => {
  return (
    <>
      {sizes && sizes.length > 0 ? (
        <div className="space-y-1">
          {sizes.map((size) => (
            <div key={size.id} className="text-sm">
              {size.size_value}{size.size_unit}: {size.stock}
            </div>
          ))}
        </div>
      ) : (
        currentStock
      )}
    </>
  );
};
