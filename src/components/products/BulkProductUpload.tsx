import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/types/product";

export const BulkProductUpload = ({
  onUploadComplete,
}: {
  onUploadComplete: (products: Product[]) => void;
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const transformProductData = (rawProduct: any): Product => {
    const basePrice = parseFloat(rawProduct.RATE_CS) || 0;
    const stock = parseInt(rawProduct.QTY_CASE) || 0;
    const sku = `${rawProduct.CATEGORY?.substring(
      0,
      2
    ).toUpperCase()}${rawProduct.SIZE?.replace(/\s+/g, "")}`;

    return {
      id: crypto.randomUUID(),
      name: rawProduct.PRODUCT || "",
      sku: sku,
      key_features: rawProduct.key_features,
      squanence: rawProduct.squanence || "",
      description: rawProduct.PRODUCT || "",
      category: rawProduct.CATEGORY || "OTHER",
      base_price: basePrice,
      current_stock: stock,
      min_stock: Math.floor(stock * 0.2),
      reorder_point: Math.floor(stock * 0.3),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customization: {
        allowed: false,
        options: [],
        price: 0,
      },
    };
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const rawProducts = JSON.parse(text);

          if (!Array.isArray(rawProducts)) {
            throw new Error("Uploaded file must contain an array of products");
          }

          const transformedProducts = rawProducts.map(transformProductData);

          onUploadComplete(transformedProducts);
          toast({
            title: "Upload Successful",
            description: `${transformedProducts.length} products have been uploaded successfully.`,
          });
        } catch (error) {
          toast({
            title: "Upload Failed",
            description:
              error instanceof Error ? error.message : "Invalid file format",
            variant: "destructive",
          });
        }
      };

      reader.readAsText(file);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "There was an error processing your file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        className="hidden"
        id="product-upload"
      />
      <label htmlFor="product-upload">
        <Button
          variant="outline"
          className="cursor-pointer"
          disabled={isUploading}
          asChild
        >
          <span>
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Products"}
          </span>
        </Button>
      </label>
    </div>
  );
};
