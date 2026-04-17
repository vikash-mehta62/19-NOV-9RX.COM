import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductAnalyticsProps {
  dateRange: { from: Date; to: Date };
  refresh?: boolean;
  selectedProducts?: string[];
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export function ProductAnalytics({ dateRange, refresh, selectedProducts = [] }: ProductAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([]);
  const [productTrends, setProductTrends] = useState<any[]>([]);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRevenue: 0,
    totalUnitsSold: 0,
    avgOrderValue: 0
  });

  useEffect(() => {
    fetchProductAnalytics();
  }, [dateRange, refresh, selectedProducts]);

  const selectedProductForSizes = useMemo(() => {
    if (expandedProductId) {
      return topProducts.find((product) => product.id === expandedProductId) || null;
    }

    return topProducts[0] || null;
  }, [expandedProductId, topProducts]);

  const selectedProductSizeData = useMemo(() => {
    const sizeBreakdown = selectedProductForSizes?.sizeBreakdown || [];

    return [...sizeBreakdown]
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .map((size: any) => ({
        ...size,
        displayLabel: size.sizeName || size.label,
        value: size.revenue,
      }));
  }, [selectedProductForSizes]);

  const getSizeLabel = (size: { size_value?: string | number | null; size_unit?: string | null }, showUnit?: boolean) =>
    [size?.size_value, showUnit ? size?.size_unit : ""].filter(Boolean).join(" ").trim() || "Standard";

  const fetchProductAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch orders without nested relationships
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, poApproved, items')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        // Try without poApproved if column doesn't exist
        const { data: ordersWithoutPO } = await supabase
          .from('orders')
          .select('id, total_amount, created_at, items')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .or('void.eq.false,void.is.null')
          .is('deleted_at', null);

        if (!ordersWithoutPO || ordersWithoutPO.length === 0) {
          setStats({
            totalProducts: 0,
            totalRevenue: 0,
            totalUnitsSold: 0,
            avgOrderValue: 0
          });
          setTopProducts([]);
          setCategoryPerformance([]);
          setLoading(false);
          return;
        }

        // Continue with orders without PO filter
        await processOrders(ordersWithoutPO);
        setLoading(false);
        return;
      }

      // Filter sales orders (not purchase orders)
      const orders = allOrders?.filter(o => !o.poApproved) || [];

      console.log('🟢 PRODUCTS TAB - Total sales orders (before product filter):', orders.length);

      if (!orders || orders.length === 0) {
        setStats({
          totalProducts: 0,
          totalRevenue: 0,
          totalUnitsSold: 0,
          avgOrderValue: 0
        });
        setTopProducts([]);
        setCategoryPerformance([]);
        setLoading(false);
        return;
      }

      await processOrders(orders);

    } catch (error) {
      console.error('Error fetching product analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processOrders = async (orders: any[]) => {
    try {
      // Fetch order items from order_items table
      const orderIds = orders.map(o => o.id);
      let itemsQuery = supabase
        .from('order_items')
        .select('product_id, product_size_id, quantity, unit_price, order_id')
        .in('order_id', orderIds);

      // Apply product filter if selected
      if (selectedProducts.length > 0) {
        itemsQuery = itemsQuery.in('product_id', selectedProducts);
      }

      const { data: orderItems, error: itemsError } = await itemsQuery;

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        throw itemsError;
      }

      // ALSO parse items from orders.items JSON column (legacy orders)
      const itemsFromJson: any[] = [];
      orders.forEach((order: any) => {
        if (!order.items || !Array.isArray(order.items)) return;
        
        try {
          // items is an array with a single object that contains the order line
          order.items.forEach((itemWrapper: any) => {
            // itemWrapper is the actual order line object
            const productId = itemWrapper.productId || itemWrapper.product_id;
            
            // Skip if product filter is applied and this product is not selected
            if (selectedProducts.length > 0 && !selectedProducts.includes(productId)) {
              return;
            }
            
            const soldSizes = Array.isArray(itemWrapper.sizes) ? itemWrapper.sizes : [];
            
            soldSizes.forEach((soldSize: any) => {
              itemsFromJson.push({
                order_id: order.id,
                product_id: productId,
                product_size_id: soldSize.id,
                quantity: Number(soldSize.quantity) || 0,
                unit_price: Number(soldSize.price) || 0
              });
            });
          });
        } catch (e) {
          console.error('Error parsing order items JSON:', e, order.id);
        }
      });

      // Combine both sources
      const allOrderItems = [...(orderItems || []), ...itemsFromJson];
      
      console.log('🟢 PRODUCTS TAB - Items from order_items table:', orderItems?.length || 0);
      console.log('🟢 PRODUCTS TAB - Items from JSON:', itemsFromJson.length);
      console.log('🟢 PRODUCTS TAB - Total items:', allOrderItems.length);

      // Get unique product IDs
      const productIds = [...new Set(allOrderItems?.map(i => i.product_id).filter(Boolean))];

      if (productIds.length === 0) {
        setStats({
          totalProducts: 0,
          totalRevenue: 0,
          totalUnitsSold: 0,
          avgOrderValue: 0
        });
        setTopProducts([]);
        setCategoryPerformance([]);
        return;
      }

      // Fetch products separately
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category, subcategory, unitToggle, product_sizes(id, size_name, size_value, size_unit, sku, quantity_per_case)')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw productsError;
      }

      // Create product lookup map
      const productMap = new Map(products?.map(p => [p.id, p]) || []);
      const orderMap = new Map(orders.map((order) => [order.id, order]));

      const orderDerivedSizeMap = new Map<string, any[]>();

      orders.forEach((order: any) => {
        const orderItemsFromJson = Array.isArray(order.items) ? order.items : [];

        orderItemsFromJson.forEach((orderLine: any) => {
          const productId = orderLine.productId || orderLine.product_id;
          const product = productMap.get(productId);
          if (!product) return;

          const soldSizes = Array.isArray(orderLine.sizes) ? orderLine.sizes : [];
          if (soldSizes.length === 0) return;

          const existingSizes = orderDerivedSizeMap.get(product.id) || [];

          soldSizes.forEach((soldSize: any) => {
            const matchingCatalogSize = (product.product_sizes || []).find(
              (catalogSize: any) =>
                (soldSize.id && catalogSize.id === soldSize.id) ||
                (
                  String(catalogSize.size_value || "").trim().toLowerCase() === String(soldSize.size_value || "").trim().toLowerCase() &&
                  String(catalogSize.size_unit || "").trim().toLowerCase() === String(soldSize.size_unit || "").trim().toLowerCase()
                )
            );

            const quantity = Number(soldSize.quantity) || 0;
            const revenue = quantity * (Number(soldSize.price) || 0);
            const sizeLabel = getSizeLabel(
              {
                size_value: soldSize.size_value ?? matchingCatalogSize?.size_value,
                size_unit: soldSize.size_unit ?? matchingCatalogSize?.size_unit,
              },
              product.unitToggle
            );
            const sizeKey = soldSize.id || matchingCatalogSize?.id || sizeLabel;

            const existingSize = existingSizes.find((size: any) => size.id === sizeKey);

            if (existingSize) {
              existingSize.quantity += quantity;
              existingSize.revenue += revenue;
            } else {
              existingSizes.push({
                id: sizeKey,
                sizeName: soldSize.size_name || matchingCatalogSize?.size_name || "",
                label: sizeLabel,
                quantity,
                revenue,
                sku: soldSize.sku || matchingCatalogSize?.sku || "",
                quantityPerCase:
                  soldSize.quantity_per_case ??
                  soldSize.quantityPerCase ??
                  matchingCatalogSize?.quantity_per_case ??
                  null,
              });
            }
          });

          orderDerivedSizeMap.set(product.id, existingSizes);
        });
      });

      // Filter orders to only those containing selected products (if filter is applied)
      let filteredOrders = orders;
      if (selectedProducts.length > 0) {
        const orderIdsWithSelectedProducts = new Set(orderItems?.map(item => item.order_id));
        filteredOrders = orders.filter(order => orderIdsWithSelectedProducts.has(order.id));
        console.log('🟢 PRODUCTS TAB - Orders after product filter:', filteredOrders.length);
      }

      // Process data - calculate revenue proportionally from filtered order totals
      const productAggMap = new Map();
      const categoryMap = new Map();
      let totalRevenue = 0;
      let totalUnits = 0; 

      // Calculate total units from filtered items
      allOrderItems?.forEach((item: any) => {
        totalUnits += item.quantity;
      });

      console.log('🟢 PRODUCTS TAB - Final Revenue (from items):', totalRevenue, 'Total Units:', totalUnits, 'Orders:', filteredOrders.length);

      // Aggregate product data - use actual item prices
      allOrderItems?.forEach((item: any) => {
        const product = productMap.get(item.product_id);
        if (!product) return;

        // Calculate actual revenue from unit_price * quantity
        const itemRevenue = (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
        totalRevenue += itemRevenue;

        // Product aggregation
        const existing = productAggMap.get(product.id) || {
          id: product.id,
          name: product.name,
          category: product.category,
          subcategory: product.subcategory,
          sizes: product.product_sizes || [],
          sizeBreakdown: orderDerivedSizeMap.get(product.id) || [],
          quantity: 0,
          revenue: 0
        };
        existing.quantity += item.quantity;
        existing.revenue += itemRevenue;

        if (!orderDerivedSizeMap.has(product.id)) {
          const sizeMeta = (product.product_sizes || []).find((size: any) => size.id === item.product_size_id);
          const orderLine = (Array.isArray(orderMap.get(item.order_id)?.items) ? orderMap.get(item.order_id)?.items : []).find(
            (line: any) => (line.productId || line.product_id) === product.id
          );
          const matchingOrderSize = Array.isArray(orderLine?.sizes)
            ? orderLine.sizes.find((size: any) => size.id === item.product_size_id)
            : null;
          const sizeLabel = sizeMeta
            ? getSizeLabel(sizeMeta, product.unitToggle)
            : getSizeLabel(matchingOrderSize || {}, product.unitToggle);
          const actualRevenue = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);

          const existingSize = existing.sizeBreakdown.find((size: any) => size.id === (item.product_size_id || sizeLabel));
          if (existingSize) {
            existingSize.quantity += Number(item.quantity) || 0;
            existingSize.revenue += actualRevenue > 0 ? actualRevenue : itemRevenue;
          } else {
            existing.sizeBreakdown.push({
              id: item.product_size_id || sizeLabel,
              sizeName: matchingOrderSize?.size_name || sizeMeta?.size_name || "",
              label: sizeLabel,
              quantity: Number(item.quantity) || 0,
              revenue: actualRevenue > 0 ? actualRevenue : itemRevenue,
              sku: matchingOrderSize?.sku || sizeMeta?.sku || "",
              quantityPerCase:
                matchingOrderSize?.quantity_per_case ??
                matchingOrderSize?.quantityPerCase ??
                sizeMeta?.quantity_per_case ??
                null,
            });
          }
        }

        productAggMap.set(product.id, existing);

        // Category aggregation
        const category = product.category || 'Uncategorized';
        const catExisting = categoryMap.get(category) || {
          name: category,
          value: 0,
          count: 0
        };
        catExisting.value += itemRevenue;
        catExisting.count += item.quantity;
        categoryMap.set(category, catExisting);
      });

      // Sort and set top products
      const sortedProducts = Array.from(productAggMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      setTopProducts(sortedProducts);
      if (sortedProducts.length > 0) {
        setExpandedProductId((current) =>
          current && sortedProducts.some((product) => product.id === current)
            ? current
            : sortedProducts[0].id
        );
      } else {
        setExpandedProductId(null);
      }

      // Set category performance
      const categories = Array.from(categoryMap.values())
        .sort((a, b) => b.value - a.value);
      setCategoryPerformance(categories);

      // Set stats
      setStats({
        totalProducts: productAggMap.size,
        totalRevenue,
        totalUnitsSold: totalUnits,
        avgOrderValue: filteredOrders?.length ? totalRevenue / filteredOrders.length : 0
      });
    } catch (error) {
      console.error('Error in processOrders:', error);
    }
  };
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, payload } = props;
    const RADIAN = Math.PI / 180;
    const isSmallSlice = percent < 0.08;
    const radiusMultiplier = isSmallSlice ? 1.42 : 1.2;
    const radius = innerRadius + (outerRadius - innerRadius) * radiusMultiplier;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const baseY = cy + radius * Math.sin(-midAngle * RADIAN);
    const verticalOffset = isSmallSlice ? ((index % 3) - 1) * 14 : 0;
    const y = baseY + verticalOffset;
    const displayName = name || payload?.displayLabel || payload?.sizeName || payload?.label || payload?.name || "Unknown";
    return (
      <text x={x} y={y} fill={COLORS[index % COLORS.length]} fontSize={12} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${displayName}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedProductForSizes ? `Size Performance: ${selectedProductForSizes.name}` : "Top Products by Revenue"}
            </CardTitle>
            <CardDescription>
              {selectedProductForSizes
                ? "Revenue and quantity by catalog size for the selected product"
                : "Best performing products in selected period"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedProductForSizes ? selectedProductSizeData : topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey={selectedProductForSizes ? "displayLabel" : "name"} type="category" width={170} />
                  <Tooltip
                    formatter={(value: number, _name: string, payload: any) => {
                      if (selectedProductForSizes) {
                        return [`$${value.toFixed(2)} revenue`, `${payload?.payload?.quantity || 0} sold`];
                      }
                      return `$${value.toFixed(2)}`;
                    }}
                  />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedProductForSizes ? `Size Revenue Share: ${selectedProductForSizes.name}` : "Sales by Category"}
            </CardTitle>
            <CardDescription>
              {selectedProductForSizes
                ? "Revenue split across sizes for the selected product"
                : "Revenue distribution across categories"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={selectedProductForSizes ? selectedProductSizeData : categoryPerformance}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    nameKey={selectedProductForSizes ? "displayLabel" : "name"}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey={selectedProductForSizes ? "revenue" : "value"}
                  >
                    {(selectedProductForSizes ? selectedProductSizeData : categoryPerformance).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product List */}
      <Card>
        <CardHeader>
          <CardTitle>Product Performance Details</CardTitle>
          <CardDescription>Detailed breakdown of product sales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="hidden grid-cols-12 gap-4 border-b pb-2 text-sm font-medium text-muted-foreground md:grid">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Product Name</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2 text-right">Units Sold</div>
              <div className="col-span-2 text-right">Revenue</div>
            </div>
            {topProducts.map((product, index) => {
              const isExpanded = expandedProductId === product.id;
              return (
                <div key={product.id} className="rounded-lg transition-colors hover:bg-muted/40">
                  <div className="grid gap-3 py-3 text-sm md:grid-cols-12 md:items-center md:gap-4 md:py-2">
                    <div className="flex min-w-0 items-start gap-2 md:col-span-6">
                      <Badge variant="outline" className="shrink-0">{index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                        className="h-auto min-w-0 p-0 text-left hover:bg-transparent"
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          {isExpanded ? (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                          )}
                          <div className="min-w-0">
                            <div className="break-words font-medium text-slate-900">{product.name}</div>
                            <div className="break-words text-xs text-muted-foreground">
                              {product.subcategory || "No subcategory"} • {(product.sizes || []).length} sizes
                            </div>
                          </div>
                        </div>
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 rounded-xl border bg-slate-50 p-3 md:col-span-6 md:grid-cols-3 md:gap-4 md:border-0 md:bg-transparent md:p-0">
                      <div className="col-span-2 md:col-span-1">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 md:hidden">Category</div>
                        <Badge variant="secondary" className="mt-1 max-w-full whitespace-normal break-words text-center md:mt-0">
                          {product.category}
                        </Badge>
                      </div>
                      <div className="md:text-right">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 md:hidden">Units Sold</div>
                        <div className="mt-1 font-semibold md:mt-0">{product.quantity}</div>
                      </div>
                      <div className="md:text-right">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 md:hidden">Revenue</div>
                        <div className="mt-1 font-semibold text-green-600 md:mt-0">
                          ${product.revenue.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mb-3 rounded-2xl border bg-slate-50 p-4 md:ml-10 md:mr-2">
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Category</p>
                          <p className="mt-1 break-words text-sm font-medium text-slate-900">{product.category || "Uncategorized"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Subcategory</p>
                          <p className="mt-1 break-words text-sm font-medium text-slate-900">{product.subcategory || "Not assigned"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Catalog sizes</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{(product.sizes || []).length}</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Size sales and value</p>
                        <div className="mt-2 space-y-2">
                          {(product.sizeBreakdown || []).length > 0 ? (
                            [...product.sizeBreakdown]
                              .sort((a: any, b: any) => b.revenue - a.revenue)
                              .map((size: any) => (
                                <div
                                  key={size.id}
                                  className="grid gap-3 rounded-xl border bg-white px-3 py-3 text-sm sm:grid-cols-[minmax(0,1.2fr)_110px_120px] md:grid-cols-[minmax(0,1.5fr)_120px_140px]"
                                >
                                  <div className="min-w-0">
                                    {size.sizeName ? (
                                      <p className="break-words font-medium text-slate-900">
                                        <span className="text-slate-500">Size name: </span>
                                        {size.sizeName}
                                      </p>
                                    ) : null}
                                    <p className="break-words font-medium text-slate-900">
                                      <span className="text-slate-500">Size: </span>
                                      {size.label}
                                    </p>
                                    <p className="break-words text-xs text-muted-foreground">
                                      {size.quantityPerCase ? `${size.quantityPerCase}/case` : "Case pack not available"}
                                      {size.sku ? ` • ${size.sku}` : ""}
                                    </p>
                                  </div>
                                  <div className="font-medium text-slate-700 sm:text-right">
                                    {size.quantity} sold
                                  </div>
                                  <div className="font-semibold text-emerald-600 sm:text-right">
                                    ${Number(size.revenue || 0).toFixed(2)}
                                  </div>
                                </div>
                              ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No size-level sales found for this product.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
