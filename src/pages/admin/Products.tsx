import { DashboardLayout } from "@/components/DashboardLayout";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { ProductHeader } from "@/components/products/ProductHeader";
import { useProducts } from "@/hooks/use-products";
import { useEffect, useState } from "react";
import { ProductFormValues } from "@/components/products/schemas/productSchema";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Grid3X3, List, Package, X, Loader2, 
  Edit, Trash2, Eye, MoreHorizontal, Filter
} from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/types/product";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { useNavigate } from "react-router-dom";

const Products = () => {
  const navigate = useNavigate();
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
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

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
      setEditingProduct(null);
    }
  }, [isEditDialogOpen]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
  };

  const hasActiveFilters = searchQuery || selectedCategory !== "all";

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <ProductHeader
            onUploadComplete={handleBulkAddProducts}
            onAddProduct={() => setIsAddDialogOpen(true)}
          />
        </div>

        {/* Filters & Search */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-1 gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px] h-10 bg-gray-50 border-gray-200">
                    <Filter className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 text-gray-500">
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Results Count */}
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{totalProducts}</span> products
                </p>

                {/* View Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`h-8 px-3 rounded-md ${
                      viewMode === "grid" 
                        ? "bg-white shadow-sm text-emerald-600" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className={`h-8 px-3 rounded-md ${
                      viewMode === "table" 
                        ? "bg-white shadow-sm text-emerald-600" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                {searchQuery && (
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Search: "{searchQuery}"
                    <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSearchQuery("")} />
                  </Badge>
                )}
                {selectedCategory !== "all" && (
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {selectedCategory}
                    <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSelectedCategory("all")} />
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products */}
        {loading ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
              <p className="text-gray-500">Loading products...</p>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                {hasActiveFilters 
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : "Get started by adding your first product."}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <X className="w-4 h-4" />
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  Add Product
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className="group border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-gray-50 overflow-hidden">
                  <img
                    src={product.image_url || product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Quick Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8 bg-white shadow-sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/admin/products/${product.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEditingProduct(product);
                          setIsEditDialogOpen(true);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Category Badge */}
                  {product.category && (
                    <Badge 
                      variant="secondary" 
                      className="absolute bottom-2 left-2 bg-white/90 text-gray-700 text-xs"
                    >
                      {product.category}
                    </Badge>
                  )}
                </div>

                {/* Product Info */}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-emerald-600 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">SKU: {product.sku || "N/A"}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-emerald-600">
                      ${Number(product.base_price || 0).toFixed(2)}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        (product.current_stock || 0) > 0 
                          ? "border-emerald-200 text-emerald-700 bg-emerald-50" 
                          : "border-red-200 text-red-700 bg-red-50"
                      }`}
                    >
                      {(product.current_stock || 0) > 0 ? "In Stock" : "Out of Stock"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Table View */
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, index) => (
                  <TableRow 
                    key={product.id}
                    className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <TableCell>
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={product.image_url || product.image || "/placeholder.svg"}
                          alt={product.name}
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">
                      {product.sku || "N/A"}
                    </TableCell>
                    <TableCell>
                      {product.category && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                          {product.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      ${Number(product.base_price || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={`${
                          (product.current_stock || 0) > 0 
                            ? "border-emerald-200 text-emerald-700 bg-emerald-50" 
                            : "border-red-200 text-red-700 bg-red-50"
                        }`}
                      >
                        {product.current_stock || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/products/${product.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditingProduct(product);
                            setIsEditDialogOpen(true);
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Pagination */}
        {products.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex justify-center">
              <PaginationControls
                currentPage={currentPage}
                totalItems={totalProducts}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>
        )}

        {/* Add Product Dialog */}
        <AddProductDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onProductAdded={() => {}}
        />

        {/* Edit Product Dialog */}
        {editingProduct && (
          <AddProductDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSubmit={async (data) => { await handleUpdateProduct(data); }}
            onProductAdded={() => {}}
            initialData={editingProduct}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Products;
