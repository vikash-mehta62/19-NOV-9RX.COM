
import { useState, useEffect } from "react";
import { Product } from "@/types/product";
import { useToast } from "@/hooks/use-toast";
import { ProductFormValues } from "@/components/products/schemas/productSchema";
import { 
  fetchProductsService, 
  addProductService, 
  updateProductService, 
  deleteProductService,
  bulkAddProductsService 
} from "@/services/productService";
import { transformProductData } from "@/utils/productTransformers";

export const PAGE_SIZE = 10;

export const useProducts = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading,setLoading] = useState(false)

  const fetchProducts = async (page = 1) => {
    setLoading(true)
    try {
      const { data: productsData, error, count } = await fetchProductsService(
        page,
        PAGE_SIZE,
        selectedCategory,
        searchQuery
      );

      if (error) {
        toast({ title: "Error", description: "Failed to fetch products." });
        console.error("Error fetching products:", error);
      } else {
        console.log(productsData)
        const transformedProducts = transformProductData(productsData || []);
        setProducts(transformedProducts);
        setTotalProducts(count || 0);
    setLoading(false)

      }
    } catch (error) {
      console.error("Error in fetchProducts:", error);
      toast({ 
        title: "Error", 
        description: "Failed to fetch products.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchProducts(currentPage);
  }, [currentPage, selectedCategory, searchQuery]);

  const handleAddProduct = async (data: ProductFormValues) => {
    try {
      await addProductService(data);
      toast({ title: "Success", description: "Product added successfully." });
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to add product.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProduct = async (data: ProductFormValues) => {
    console.log(data)
   
    
    if (!editingProduct) return;

    try {
      await updateProductService(editingProduct.id, data);
      toast({ title: "Success", description: "Product updated successfully." });
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error updating product:", error);
      toast({ 
        title: "Error", 
        description: "Failed to update product.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProductService(id);
      toast({ 
        title: "Success", 
        description: "Product deleted successfully." 
      });
      const newTotalProducts = totalProducts - 1;
      const lastPage = Math.max(1, Math.ceil(newTotalProducts / PAGE_SIZE));
      setCurrentPage(Math.min(currentPage, lastPage));
      fetchProducts(currentPage);
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({ 
        title: "Error", 
        description: "Failed to delete product." 
      });
    }
  };

  const handleBulkAddProducts = async (products: Product[]) => {
    try {
      await bulkAddProductsService(products);
      toast({ 
        title: "Success", 
        description: `${products.length} products added successfully.` 
      });
      fetchProducts();
    } catch (error) {
      console.error("Error adding bulk products:", error);
      toast({ 
        title: "Error", 
        description: "Failed to add bulk products." 
      });
    }
  };

  return {
    products,
    currentPage,
    totalProducts,
    PAGE_SIZE,
    searchQuery,
    selectedCategory,
    editingProduct,
    isEditDialogOpen,
    setSearchQuery,
    setSelectedCategory,
    setCurrentPage,
    setEditingProduct,
    setIsEditDialogOpen,
    handleAddProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleBulkAddProducts,
    loading
  };
};
