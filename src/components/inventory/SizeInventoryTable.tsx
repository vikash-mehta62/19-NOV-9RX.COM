import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Download, 
  Search,
  Package,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SizeStockEditModal } from './SizeStockEditModal';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  category: string;
  sizes: ProductSize[];
}

interface ProductSize {
  id: string;
  product_id: string;
  size_value: string;
  size_unit: string;
  sku: string;
  price: number;
  price_per_case: number;
  stock: number;
  quantity_per_case: number;
  ndcCode?: string;
  upcCode?: string;
  lotNumber?: string;
  exipry?: string;
}

export const SizeInventoryTable = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSizes: 0,
    lowStockSizes: 0,
    totalValue: 0
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, statusFilter, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          category,
          product_sizes (*)
        `)
        .order('name');

      if (error) throw error;

      const mappedProducts = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        sizes: p.product_sizes || []
      }));

      setProducts(mappedProducts);
      calculateStats(mappedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (prods: Product[]) => {
    const totalProducts = prods.length;
    const allSizes = prods.flatMap(p => p.sizes);
    const totalSizes = allSizes.length;
    const lowStockSizes = allSizes.filter(s => s.stock <= 20).length;
    const totalValue = allSizes.reduce((sum, s) => sum + (s.stock * s.price), 0);

    setStats({ totalProducts, totalSizes, lowStockSizes, totalValue });
  };

  const filterProducts = () => {
    let filtered = products;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.sizes.some(s => 
          s.size_value.toLowerCase().includes(query) ||
          s.sku?.toLowerCase().includes(query)
        )
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.map(p => ({
        ...p,
        sizes: p.sizes.filter(s => {
          const stock = Number(s.stock);
          switch (statusFilter) {
            case 'out-of-stock':
              return stock === 0;
            case 'critical':
              return stock > 0 && stock <= 10;
            case 'low':
              return stock > 10 && stock <= 20;
            case 'medium':
              return stock > 20 && stock <= 50;
            case 'good':
              return stock > 50;
            default:
              return true;
          }
        })
      })).filter(p => p.sizes.length > 0); // Remove products with no matching sizes
    }

    setFilteredProducts(filtered);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-500', textColor: 'text-red-700' };
    if (stock <= 10) return { label: 'Critical', color: 'bg-red-400', textColor: 'text-red-600' };
    if (stock <= 20) return { label: 'Low', color: 'bg-amber-400', textColor: 'text-amber-600' };
    if (stock <= 50) return { label: 'Medium', color: 'bg-blue-400', textColor: 'text-blue-600' };
    return { label: 'Good', color: 'bg-emerald-400', textColor: 'text-emerald-600' };
  };

  const exportToCSV = () => {
    const headers = ['Product Name', 'Category', 'Size', 'Unit', 'Size SKU', 'Stock', 'Price', 'Price/Case', 'Qty/Case'];
    const rows = products.flatMap(p => 
      p.sizes.map(s => [
        p.name,
        p.category,
        s.size_value,
        s.size_unit,
        s.sku || '',
        s.stock,
        s.price,
        s.price_per_case,
        s.quantity_per_case
      ])
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSizeUpdate = () => {
    fetchProducts();
    setSelectedSize(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">Total Products</p>
                  <p className="text-3xl font-bold text-indigo-900">{stats.totalProducts}</p>
                </div>
                <Package className="h-10 w-10 text-indigo-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Total Sizes</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.totalSizes}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Low Stock Sizes</p>
                  <p className="text-3xl font-bold text-amber-900">{stats.lowStockSizes}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-xl font-bold text-gray-800">
                Size-Level Inventory Management
              </CardTitle>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="out-of-stock">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Out of Stock
                      </div>
                    </SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        Critical (≤10)
                      </div>
                    </SelectItem>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                        Low (11-20)
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        Medium (21-50)
                      </div>
                    </SelectItem>
                    <SelectItem value="good">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                        Good (&gt;50)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products, sizes, SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="w-full">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50 border-b z-10">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Product</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Category</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Sizes</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Total Stock</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product, index) => {
                      const totalStock = product.sizes.reduce((sum, s) => sum + s.stock, 0);
                      const isExpanded = expandedProduct === product.id;

                      return (
                        <React.Fragment key={product.id}>
                          <tr
                            className={`border-b hover:bg-gray-50 transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-semibold text-gray-900">{product.name}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="font-normal">
                                {product.category}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                                {product.sizes.length}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-semibold text-gray-900">{totalStock}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr key={`${product.id}-sizes`}>
                              <td colSpan={5} className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100">
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-gray-700 mb-3">Size Variations</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {product.sizes.map((size) => {
                                      const status = getStockStatus(size.stock);
                                      return (
                                        <Card key={size.id} className="hover:shadow-md transition-shadow">
                                          <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-3">
                                              <div>
                                                <p className="font-bold text-lg text-gray-900">
                                                  {size.size_value} {size.size_unit.toUpperCase()}
                                                </p>
                                                {size.sku && (
                                                  <p className="text-xs text-gray-500">SKU: {size.sku}</p>
                                                )}
                                              </div>
                                              <Badge className={`${status.color} text-white`}>
                                                {status.label}
                                              </Badge>
                                            </div>

                                            <div className="space-y-2 mb-3">
                                              <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Stock:</span>
                                                <span className={`font-semibold ${status.textColor}`}>
                                                  {size.stock} units
                                                </span>
                                              </div>
                                              <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Price:</span>
                                                <span className="font-semibold text-gray-900">
                                                  ${size.price.toFixed(2)}
                                                </span>
                                              </div>
                                              <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Qty/Case:</span>
                                                <span className="font-semibold text-gray-900">
                                                  {size.quantity_per_case}
                                                </span>
                                              </div>
                                            </div>

                                            <Button
                                              size="sm"
                                              className="w-full"
                                              onClick={() => setSelectedSize(size)}
                                            >
                                              <Edit className="h-3 w-3 mr-2" />
                                              Edit Inventory
                                            </Button>
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {filteredProducts.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No products found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {selectedSize && (
        <SizeStockEditModal
          size={selectedSize}
          onClose={() => setSelectedSize(null)}
          onUpdate={handleSizeUpdate}
        />
      )}
    </>
  );
};
