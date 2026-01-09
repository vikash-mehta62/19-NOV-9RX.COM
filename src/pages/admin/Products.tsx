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
  Search, Grid3X3, List, Package, X, ArrowLeft,
  Edit, Trash2, Eye, MoreHorizontal, Filter
} from "lucide-react";
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
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SearchMatchIndicator } from "@/components/search/SearchMatchIndicator";
import { getSearchMatches } from "@/utils/searchHighlight";
import image1 from "../../assests/home/image1.jpg";
import image2 from "../../assests/home/image2.jpg";
import image3 from "../../assests/home/image3.jpg";
import image4 from "../../assests/home/image4.jpg";
import image5 from "../../assests/home/image5.jpg";
import image6 from "../../assests/home/image6.jpg";

const imageArray = [image6, image2, image3, image4, image5, image1];

const Products = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [categories, setCategories] = useState<string[]>([]);

  // Set category from navigation state (when coming back from product details)
  useEffect(() => {
    const state = location.state as { selectedCategory?: string } | null;
    if (state?.selectedCategory) {
      setSelectedCategory(state.selectedCategory);
      // Clear the state to prevent re-setting on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('category_configs')
          .select('category_name')
          .order('category_name');

        if (error) {
          console.error('Error fetching categories:', error);
          return;
        }

        const categoryNames = data?.map(item => item.category_name) || [];
        setCategories(categoryNames);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

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

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  }

  const hasActiveFilters = searchQuery || selectedCategory !== "all";

  return (
    <DashboardLayout role="admin">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="space-y-8 p-6 max-w-7xl mx-auto">
          {/* Enhanced Header with Stats */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">            
            <ProductHeader
              onUploadComplete={handleBulkAddProducts}
              onAddProduct={() => setIsAddDialogOpen(true)}
            />
          </div>

          {/* Enhanced Filters & Search */}
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div className="flex flex-1 gap-4 w-full lg:w-auto">
                  {/* Enhanced Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Search products, sizes, SKU, NDC codes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-11 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl shadow-sm"
                      title="Search in: Product name, description, category, SKU, size values, NDC/UPC codes"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Enhanced Category Filter */}
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[200px] h-11 bg-white border-gray-200 rounded-xl shadow-sm">
                      <Filter className="w-4 h-4 mr-2 text-gray-400" />
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearFilters} 
                      className="h-11 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl px-4"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Results Count */}
                  {/* <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
                    <span className="font-semibold text-gray-900">{totalProducts}</span> products
                  </div> */}

                  {/* Enhanced View Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-xl p-1 shadow-inner">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className={`h-9 px-4 rounded-lg transition-all ${viewMode === "grid"
                        ? "bg-white shadow-md text-blue-600 font-medium"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      <Grid3X3 className="w-4 h-4 mr-2" />
                      Grid
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("table")}
                      className={`h-9 px-4 rounded-lg transition-all ${viewMode === "table"
                        ? "bg-white shadow-md text-blue-600 font-medium"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      <List className="w-4 h-4 mr-2" />
                      Table
                    </Button>
                  </div>
                </div>
              </div>

              {/* Enhanced Active Filters */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
                  {searchQuery && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 rounded-full">
                      Search: "{searchQuery}"
                      <X className="w-3 h-3 ml-2 cursor-pointer hover:text-blue-900" onClick={() => setSearchQuery("")} />
                    </Badge>
                  )}
                  {selectedCategory !== "all" && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 rounded-full">
                      {selectedCategory}
                      <X className="w-3 h-3 ml-2 cursor-pointer hover:text-blue-900" onClick={() => setSelectedCategory("all")} />
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Grid - Show immediately when "all" is selected, no loading state */}
          {selectedCategory === "all" && (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
                    Product Categories
                  </h2>
                  <p className="text-gray-600">Browse products by category</p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 lg:gap-8">
                  {categories.length > 0 ? categories.map((category, index) => (
                    <div
                      key={category}
                      className="group relative flex flex-col items-center justify-center"
                    >
                      <div
                        onClick={() => handleCategoryClick(category)}
                        className="relative cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex flex-col items-center w-full"
                      >
                        {/* Enhanced Image Container */}
                        <div className="relative overflow-hidden rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50 w-full aspect-square max-w-[160px]">
                          <img
                            src={imageArray[index] || imageArray[0]}
                            alt={`Category ${category}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          
                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>

                        {/* Enhanced Category Label */}
                        <div className="mt-4 text-center w-full">
                          <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-300 block leading-tight">
                            {category}
                          </span>
                          <div className="w-0 group-hover:w-8 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 mx-auto mt-2 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    // Loading skeleton for categories
                    Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div className="w-full aspect-square max-w-[160px] rounded-2xl bg-gray-200 animate-pulse"></div>
                        <div className="mt-4 h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State - Only show when a specific category is selected and loading */}
          {selectedCategory !== "all" && loading ? (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                {/* Back button always visible */}
                <div className="mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedCategory("all")}
                    className="text-gray-600 hover:text-blue-600 -ml-2 mb-2"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Categories
                  </Button>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {selectedCategory}
                  </h2>
                </div>
                {/* Loading skeleton grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden">
                      <div className="aspect-square bg-gray-200 animate-pulse"></div>
                      <div className="p-5 space-y-3">
                        <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                        <div className="flex justify-between">
                          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : selectedCategory !== "all" && products.length === 0 ? (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                {/* Back button */}
                <div className="mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedCategory("all")}
                    className="text-gray-600 hover:text-blue-600 -ml-2 mb-2"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Categories
                  </Button>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {selectedCategory}
                  </h2>
                </div>
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No products found</h3>
                  <p className="text-gray-500 mb-8 text-center max-w-md leading-relaxed">
                    No products found in this category.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedCategory("all")} 
                    className="gap-2 px-6 py-3 rounded-xl border-2 hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Categories
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedCategory !== "all" && viewMode === "grid" ? (
            <>
              {/* Enhanced Selected Category Header */}
              <div className="mb-8">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedCategory("all")}
                  className="text-gray-600 hover:text-blue-600 -ml-2 mb-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Categories
                </Button>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      {selectedCategory}
                    </h2>
                    <Badge variant="secondary" className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 px-4 py-2 rounded-full text-sm font-medium">
                      {totalProducts} {totalProducts === 1 ? 'product' : 'products'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Enhanced Product Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="group border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden bg-white hover:-translate-y-1 cursor-pointer"
                  >
                    {/* Enhanced Product Image */}
                    <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                      <img
                        src={`https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/${product.images[0]}`}
                        alt={product.name}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Enhanced Quick Actions */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-9 w-9 bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl rounded-full border-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                            <DropdownMenuItem onClick={() => navigate(`/admin/product/${product.id}`)} className="rounded-lg">
                              <Eye className="w-4 h-4 mr-3" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setEditingProduct(product);
                              setIsEditDialogOpen(true);
                            }} className="rounded-lg">
                              <Edit className="w-4 h-4 mr-3" />
                              Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 rounded-lg"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-3" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                        {/* Enhanced Category Badge */}
                        {product.category && (
                          <Badge
                            variant="secondary"
                            className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm text-gray-700 text-xs px-2 py-1 rounded-lg shadow-sm"
                          >
                            {product.category}
                          </Badge>
                        )}

                        {/* Stock Status Indicator */}
                        {/* <div className="absolute top-3 left-3">
                          <div className={`w-3 h-3 rounded-full ${(product.current_stock || 0) > 0 ? 'bg-green-500' : 'bg-red-500'} shadow-sm`}></div>
                        </div> */}
                      </div>

                      {/* Enhanced Product Info */}
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors text-base leading-tight">
                          {product.name}
                        </h3>

                        {/* Search Match Indicator */}
                        {searchQuery && (
                          <SearchMatchIndicator
                            matches={getSearchMatches(product, searchQuery)}
                            searchQuery={searchQuery}
                            className="mb-3"
                          />
                        )}

                        <p className="text-xs text-gray-500 mb-3 font-mono bg-gray-50 px-2 py-1 rounded-md inline-block">
                          SKU: {product.sku || "N/A"}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                            ${Number(product.displayPrice || product.base_price || 0).toFixed(2)}
                          </span>
                          {/* <Badge
                            variant="outline"
                            className={`text-xs px-2 py-1 rounded-lg font-medium ${(product.current_stock || 0) > 0
                              ? "border-blue-300 text-blue-700 bg-blue-50"
                              : "border-red-300 text-red-700 bg-red-50"
                              }`}
                          >
                            {(product.current_stock || 0) > 0 ? `${product.current_stock} In Stock` : "Out of Stock"}
                          </Badge> */}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
          ) : selectedCategory !== "all" && viewMode === "table" ? (
            <>
              {/* Table View - Selected Category Header */}
              <div className="mb-8">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedCategory("all")}
                  className="text-gray-600 hover:text-blue-600 -ml-2 mb-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Categories
                </Button>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      {selectedCategory}
                    </h2>
                    <Badge variant="secondary" className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 px-4 py-2 rounded-full text-sm font-medium">
                      {totalProducts} {totalProducts === 1 ? 'product' : 'products'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Enhanced Table View */}
              <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                        <TableHead className="w-[80px] font-semibold text-gray-700 py-4">Image</TableHead>
                        <TableHead className="font-semibold text-gray-700">Product Details</TableHead>
                        <TableHead className="font-semibold text-gray-700">SKU</TableHead>
                        <TableHead className="font-semibold text-gray-700">Category</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700">Price</TableHead>
                        <TableHead className="text-center font-semibold text-gray-700">Stock Status</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product, index) => (
                        <TableRow
                          key={product.id}
                          className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                        >
                          <TableCell className="py-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-sm">
                              <img
                                src={product.images && product.images[0]
                                  ? `https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/${product.images[0]}`
                                  : "/placeholder.svg"
                                }
                                alt={product.name}
                                className="w-full h-full object-contain p-2 hover:scale-110 transition-transform duration-300"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div>
                              <p className="font-semibold text-gray-900 text-base mb-1">{product.name}</p>

                              {/* Search Match Indicator */}
                              {searchQuery && (
                                <SearchMatchIndicator
                                  matches={getSearchMatches(product, searchQuery)}
                                  searchQuery={searchQuery}
                                  className="mb-2"
                                />
                              )}

                              {product.description && (
                                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{product.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm text-gray-600 bg-gray-100 rounded-lg px-3 py-1 inline-block">
                              {product.sku || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {product.category && (
                              <Badge variant="secondary" className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 px-3 py-1 rounded-lg">
                                {product.category}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                              ${Number(product.displayPrice || product.base_price || 0).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`px-3 py-1 rounded-lg font-medium ${(product.current_stock || 0) > 0
                                ? "border-blue-300 text-blue-700 bg-blue-50"
                                : "border-red-300 text-red-700 bg-red-50"
                                }`}
                            >
                              {(product.current_stock || 0) > 0 ? `${product.current_stock} units` : "Out of Stock"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                                <DropdownMenuItem onClick={() => navigate(`/admin/product/${product.id}`)} className="rounded-lg">
                                  <Eye className="w-4 h-4 mr-3" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setEditingProduct(product);
                                  setIsEditDialogOpen(true);
                                }} className="rounded-lg">
                                  <Edit className="w-4 h-4 mr-3" />
                                  Edit Product
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 rounded-lg"
                                  onClick={() => handleDeleteProduct(product.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-3" />
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
              </>
          ) : null}

          {/* Enhanced Pagination */}
          {selectedCategory !== "all" && products.length > 0 && (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 flex justify-center">
                <PaginationControls
                  currentPage={currentPage}
                  totalItems={totalProducts}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                />
              </CardContent>
            </Card>
          )}

          {/* Enhanced Add Product Dialog */}
          <AddProductDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            onProductAdded={() => { }}
          />

          {/* Enhanced Edit Product Dialog */}
          {editingProduct && (
            <AddProductDialog
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              onSubmit={async (data) => { await handleUpdateProduct(data); }}
              onProductAdded={() => { }}
              initialData={editingProduct}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Products;
