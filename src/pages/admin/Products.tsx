
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProductsTable } from "@/components/products/ProductsTable";
import { ProductFilters } from "@/components/products/ProductFilters";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { ProductHeader } from "@/components/products/ProductHeader";
import { useProducts } from "@/hooks/use-products";
import { useEffect, useState } from "react";
import { ProductFormValues } from "@/components/products/schemas/productSchema";

const Products = () => {
  const {
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
  } = useProducts();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSubmit = async (data: ProductFormValues): Promise<void> => {
    
    setIsSubmitting(true);
    try {
      return await handleAddProduct(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {

    if (!isEditDialogOpen) {
      console.log("rest ")
      setEditingProduct(null)
    }
  }, [isEditDialogOpen])
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <ProductHeader
          onUploadComplete={handleBulkAddProducts}
          onAddProduct={() => setIsAddDialogOpen(true)}
        />

        <ProductFilters
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSearchChange={setSearchQuery}
          onCategoryChange={setSelectedCategory}
        />

        {loading ? <>
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
          </div>

        </> : <ProductsTable
          products={products}
          currentPage={currentPage}
          totalProducts={totalProducts}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          onEdit={(product) => {
            setEditingProduct(product);
            setIsEditDialogOpen(true);
          }}
          onDelete={handleDeleteProduct}
        />}

        <AddProductDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onProductAdded={() => { }}
        />

        {editingProduct && (
          <AddProductDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSubmit={async (data) => { console.log(data); await handleUpdateProduct(data) }}
            onProductAdded={() => { }}
            initialData={editingProduct}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Products;
