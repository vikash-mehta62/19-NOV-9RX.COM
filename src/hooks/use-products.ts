
import { useState, useEffect, useCallback, useRef } from "react";
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
import { testSizeSearch, getSizeReference } from "@/utils/testSizeSearch";

export const PAGE_SIZE = 10;

const formatErrorMessage = (error: any): string => {
  if (Array.isArray(error)) {
    const messages = error.map((err) => {
      if (typeof err === "object") {
        return Object.entries(err)
          .map(([key, val]: [string, any]) => {
            if (val && typeof val === "object" && "message" in val) {
              return `${key}: ${val.message}`;
            }
            return null;
          })
          .filter(Boolean)
          .join(", ");
      }
      return null;
    }).filter(Boolean);

    if (messages.length > 0) return messages.join("; ");
  }
  
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error?.message) return error.message;

  return "An unexpected error occurred.";
};

export const useProducts = (includeInactive: boolean = false) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Debouncing refs
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  const fetchProducts = useCallback(async (page = 1, search = searchQuery, category = selectedCategory) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    try {
      console.log('=== USE-PRODUCTS FETCH ===');
      console.log('Fetching products with:', { page, search, category, includeInactive });
      
      const { data: productsData, error, count } = await fetchProductsService(
        page,
        PAGE_SIZE,
        category,
        search,
        includeInactive
      );

      console.log('=== FETCH RESULT ===');
      console.log('Products data:', productsData);
      console.log('Error:', error);
      console.log('Count:', count);

      if (error) {
        console.error("Error fetching products:", error);
        toast({ title: "Error", description: formatErrorMessage(error) });
      } else {
        const transformedProducts = transformProductData(productsData || []);
        console.log('Transformed products:', transformedProducts);
        setProducts(transformedProducts);
        setTotalProducts(count || 0);
      }
    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name !== 'AbortError') {
        console.error("Error in fetchProducts:", error);
        toast({ 
          title: "Error", 
          description: formatErrorMessage(error),
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast, includeInactive]);

  // Debounced search effect
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      console.log('Debounced search triggered:', { searchQuery, selectedCategory });
      
      // Test size search if query looks like a size
      if (searchQuery && (searchQuery.match(/\d/) || searchQuery.toLowerCase().includes('oz') || searchQuery.toLowerCase().includes('ml'))) {
        console.log('Testing size search for:', searchQuery);
        testSizeSearch(searchQuery);
      }
      
      setCurrentPage(1); // Reset to first page on search
      fetchProducts(1, searchQuery, selectedCategory);
    }, 300); // 300ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedCategory, fetchProducts]);

  // Page change effect (no debouncing needed)
  useEffect(() => {
    if (currentPage > 1) {
      fetchProducts(currentPage);
    }
  }, [currentPage, fetchProducts]);

  // Initial load effect
  useEffect(() => {
    console.log('Initial load triggered');
    // Get size reference for debugging
    getSizeReference();
    fetchProducts(1, "", "all");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleAddProduct = async (data: ProductFormValues) => {
    try {
      await addProductService(data);
      toast({ title: "Success", description: "Product added successfully." });
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      toast({ 
        title: "Error", 
        description: formatErrorMessage(error),
        variant: "destructive"
      });
      throw error;
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
        description: formatErrorMessage(error),
        variant: "destructive"
      });
      throw error;
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
        description: formatErrorMessage(error) 
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
        description: formatErrorMessage(error) 
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
