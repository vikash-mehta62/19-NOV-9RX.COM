
import { BulkProductUpload } from "@/components/products/BulkProductUpload";
import { AddProductButton } from "@/components/products/AddProductButton";
import { Product } from "@/types/product";

interface ProductHeaderProps {
  onUploadComplete: (products: Product[]) => Promise<void>;
  onAddProduct: () => void;
}

export const ProductHeader = ({ onUploadComplete, onAddProduct }: ProductHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          Manage your product inventory and catalog
        </p>
      </div>
      <div className="flex items-center gap-4">
        <BulkProductUpload onUploadComplete={onUploadComplete} />
        <AddProductButton onClick={onAddProduct} />
      </div>
    </div>
  );
};
