import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2
} from "lucide-react";
import * as XLSX from 'xlsx';

interface ReportGeneratorProps {
  dateRange: { from: Date; to: Date };
}

export function ReportGenerator({ dateRange }: ReportGeneratorProps) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>("sales");
  const [format, setFormat] = useState<string>("excel");
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(false);

  const reportTypes = [
    { value: "sales", label: "Sales Order Report", description: "Complete sales analysis with orders and revenue" },
    { value: "Purchase", label: "Purchase Order Report", description: "Complete purchase analysis with orders and expenses" },
    { value: "products", label: "Product Performance", description: "Product-wise sales and inventory analysis" },
    { value: "stores", label: "Store Performance", description: "Store/pharmacy-wise performance metrics" },
    { value: "inventory", label: "Inventory Report", description: "Stock levels and inventory valuation" },
    { value: "financial", label: "Financial Summary", description: "Sales vs Purchase with profit analysis" },
    { value: "customer", label: "Customer Analysis", description: "Customer behavior and purchase patterns" }
  ];

  const generateSalesReport = async () => {
    // Fetch ONLY sales orders (not purchase orders) - try with paid_amount first
    let orders: any[] = [];
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, paid_amount, payment_status, status, created_at, profile_id, poApproved')
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString())
      .or('void.eq.false,void.is.null')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    console.log("generateSalesReport - All orders:", ordersData);

    if (error) {
      console.error('Sales Report Error (trying without paid_amount):', error);
      // Try without paid_amount if column doesn't exist
      const { data: ordersWithoutPaid, error: error2 } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, payment_status, status, created_at, profile_id, poApproved')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error2) {
        console.error('Sales Report Error:', error2);
        throw new Error(`Failed to fetch orders: ${error2.message}`);
      }
      orders = ordersWithoutPaid || [];
    } else {
      orders = ordersData || [];
    }

    // Filter ONLY sales orders (exclude purchase orders)
    // Check both poApproved field AND order_number prefix
    const salesOrders = orders.filter(o => {
      // Exclude if poApproved is explicitly true
      if (o.poApproved === true || o.poApproved === 'true') return false;
      // Exclude if order number starts with "PO-"
      if (o.order_number && o.order_number.toString().startsWith('PO-')) return false;
      return true;
    });
    console.log("generateSalesReport - Filtered sales orders:", salesOrders.length, "out of", orders.length);
    console.log("generateSalesReport - Sample filtered order:", salesOrders[0]);
    orders = salesOrders;

    // Get unique profile IDs
    const profileIds = [...new Set(orders?.map(o => o.profile_id).filter(Boolean))];

    // Fetch profiles separately
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, company_name, first_name, last_name, email')
      .in('id', profileIds);

    if (profilesError) {
      console.error('Profiles fetch error:', profilesError);
      throw new Error(`Failed to fetch customer profiles: ${profilesError.message}`);
    }

    // Fetch order items with quantity to count total items per order
    const orderIds = orders?.map(o => o.id) || [];
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('order_id, quantity')
      .in('order_id', orderIds);

    if (itemsError) {
      console.error('Order items fetch error:', itemsError);
      throw new Error(`Failed to fetch order items: ${itemsError.message}`);
    }

    // Count total items per order (sum of quantities)
    const itemsCountMap = new Map();
    orderItems?.forEach(item => {
      const currentCount = itemsCountMap.get(item.order_id) || 0;
      itemsCountMap.set(item.order_id, currentCount + (item.quantity || 0));
    });

    // Create profile lookup map
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const reportData = orders?.map(order => {
      const profile = profileMap.get(order.profile_id);
      const paidAmount = order.paid_amount !== undefined ? parseFloat(order.paid_amount || 0) : parseFloat(order.total_amount || 0);

      return {
        'Order Number': order.order_number,
        'Customer': profile?.company_name ||
          `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
          profile?.email || 'Unknown',
        'Date': new Date(order.created_at).toLocaleDateString(),
        'Total Amount': parseFloat(order.total_amount || 0).toFixed(2),
        'Paid Amount': paidAmount.toFixed(2),
        'Payment Status': order.payment_status,
        'Order Status': order.status,
        'Items Count': itemsCountMap.get(order.id) || 0
      };
    }) || [];

    return reportData;
  };

  const generatePurchaseReport = async () => {
    // Fetch ONLY purchase orders
    let orders: any[] = [];
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, paid_amount, payment_status, status, created_at, profile_id, poApproved')
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString())
      .eq('poApproved', true)
      .or('void.eq.false,void.is.null')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    console.log("generatePurchaseReport:", ordersData);

    if (error) {
      console.error('Purchase Report Error (trying without paid_amount):', error);
      // Try without paid_amount if column doesn't exist
      const { data: ordersWithoutPaid, error: error2 } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, payment_status, status, created_at, profile_id, poApproved')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .eq('poApproved', true)
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error2) {
        console.error('Purchase Report Error:', error2);
        throw new Error(`Failed to fetch purchase orders: ${error2.message}`);
      }
      orders = ordersWithoutPaid || [];
    } else {
      orders = ordersData || [];
    }

    // Get unique profile IDs (vendors)
    const profileIds = [...new Set(orders?.map(o => o.profile_id).filter(Boolean))];

    // Fetch profiles separately
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, company_name, first_name, last_name, email')
      .in('id', profileIds);

    if (profilesError) {
      console.error('Profiles fetch error:', profilesError);
      throw new Error(`Failed to fetch vendor profiles: ${profilesError.message}`);
    }

    // Fetch order items with quantity to count total items per order
    const orderIds = orders?.map(o => o.id) || [];
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('order_id, quantity')
      .in('order_id', orderIds);

    if (itemsError) {
      console.error('Order items fetch error:', itemsError);
      throw new Error(`Failed to fetch order items: ${itemsError.message}`);
    }

    // Count total items per order (sum of quantities)
    const itemsCountMap = new Map();
    orderItems?.forEach(item => {
      const currentCount = itemsCountMap.get(item.order_id) || 0;
      itemsCountMap.set(item.order_id, currentCount + (item.quantity || 0));
    });

    // Create profile lookup map
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const reportData = orders?.map(order => {
      const profile = profileMap.get(order.profile_id);
      const paidAmount = order.paid_amount !== undefined ? parseFloat(order.paid_amount || 0) : parseFloat(order.total_amount || 0);

      return {
        'PO Number': order.order_number,
        'Vendor': profile?.company_name ||
          `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
          profile?.email || 'Unknown',
        'Date': new Date(order.created_at).toLocaleDateString(),
        'Total Amount': parseFloat(order.total_amount || 0).toFixed(2),
        'Paid Amount': paidAmount.toFixed(2),
        'Payment Status': order.payment_status,
        'Order Status': order.status,
        'Items Count': itemsCountMap.get(order.id) || 0
      };
    }) || [];

    return reportData;
  };

  const generateProductReport = async () => {
    // Fetch orders first to get date range
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString())
      .or('void.eq.false,void.is.null')
      .is('deleted_at', null);

    if (ordersError) {
      console.error('Product Report - orders query error:', ordersError);
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    const orderIds = orders?.map(o => o.id) || [];

    if (orderIds.length === 0) {
      return []; // No orders in this period
    }

    // Fetch order items without price column
    let itemsQuery = supabase
      .from('order_items')
      .select('product_id, quantity, order_id')
      .in('order_id', orderIds);

    const { data: items, error: itemsError } = await itemsQuery;

    if (itemsError) {
      console.error('Product Report - items query error:', itemsError);
      throw new Error(`Failed to fetch order items: ${itemsError.message}`);
    }

    // Get unique product IDs
    const productIds = [...new Set(items?.map(i => i.product_id).filter(Boolean))];

    if (productIds.length === 0) {
      return []; // No products found
    }

    // Fetch products separately
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, category, subcategory')
      .in('id', productIds);

    if (productsError) {
      console.error('Product Report - products query error:', productsError);
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    // Fetch order totals to calculate revenue proportionally
    const { data: ordersWithTotals, error: totalsError } = await supabase
      .from('orders')
      .select('id, total_amount')
      .in('id', orderIds);

    if (totalsError) {
      console.error('Product Report - order totals error:', totalsError);
      throw new Error(`Failed to fetch order totals: ${totalsError.message}`);
    }

    const orderTotalsMap = new Map(ordersWithTotals?.map(o => [o.id, parseFloat(String(o.total_amount || '0'))]) || []);
    const productMap = new Map(products?.map(p => [p.id, p]) || []);
    const aggregatedMap = new Map();

    // Calculate total quantity per order for proportional revenue distribution
    const orderQuantityMap = new Map();
    items?.forEach(item => {
      orderQuantityMap.set(item.order_id, (orderQuantityMap.get(item.order_id) || 0) + item.quantity);
    });

    items?.forEach(item => {
      const product = productMap.get(item.product_id);
      if (!product) return;

      const orderTotal = orderTotalsMap.get(item.order_id) || 0;
      const orderQuantity = orderQuantityMap.get(item.order_id) || 1;
      const itemRevenue = (orderTotal * item.quantity) / orderQuantity;

      const existing = aggregatedMap.get(product.id) || {
        name: product.name,
        category: product.category,
        subcategory: product.subcategory,
        quantity: 0,
        revenue: 0,
        avgPrice: 0
      };

      existing.quantity += item.quantity;
      existing.revenue += itemRevenue;
      existing.avgPrice = existing.revenue / existing.quantity;

      aggregatedMap.set(product.id, existing);
    });

    const reportData = Array.from(aggregatedMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map(product => ({
        'Product Name': product.name,
        'Category': product.category,
        'Subcategory': product.subcategory,
        'Units Sold': product.quantity,
        'Total Revenue': product.revenue.toFixed(2),
        'Avg Price': product.avgPrice.toFixed(2)
      }));

    return reportData;
  };

  const generateStoreReport = async () => {
    // Try with paid_amount first
    let orders: any[] = [];
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('id, profile_id, total_amount, paid_amount, payment_status')
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString())
      .or('void.eq.false,void.is.null')
      .is('deleted_at', null);

    if (error) {
      console.error('Store Report Error (trying without paid_amount):', error);
      // Try without paid_amount if column doesn't exist
      const { data: ordersWithoutPaid, error: error2 } = await supabase
        .from('orders')
        .select('id, profile_id, total_amount, payment_status')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null);

      if (error2) {
        console.error('Store Report Error:', error2);
        throw new Error(`Failed to fetch orders: ${error2.message}`);
      }
      orders = ordersWithoutPaid || [];
    } else {
      orders = ordersData || [];
    }

    const storeMap = new Map();

    orders?.forEach(order => {
      const paidAmount = order.paid_amount !== undefined ? parseFloat(order.paid_amount || 0) : parseFloat(order.total_amount || 0);
      const totalAmount = parseFloat(order.total_amount || 0);

      const existing = storeMap.get(order.profile_id) || {
        profileId: order.profile_id,
        orderCount: 0,
        totalRevenue: 0,
        paidAmount: 0,
        pendingAmount: 0
      };

      existing.orderCount += 1;
      existing.totalRevenue += totalAmount;
      existing.paidAmount += paidAmount;
      existing.pendingAmount = existing.totalRevenue - existing.paidAmount;

      storeMap.set(order.profile_id, existing);
    });

    // Fetch profile details separately
    const profileIds = Array.from(storeMap.keys());
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, company_name, first_name, last_name, email, type')
      .in('id', profileIds);

    if (profilesError) {
      console.error('Profiles fetch error:', profilesError);
      throw new Error(`Failed to fetch store profiles: ${profilesError.message}`);
    }

    // Merge profile data with store data
    const reportData = Array.from(storeMap.values())
      .map(store => {
        const profile = profiles?.find(p => p.id === store.profileId);
        return {
          'Store Name': profile?.company_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'Unknown',
          'Type': profile?.type || 'N/A',
          'Total Orders': store.orderCount,
          'Total Revenue': store.totalRevenue.toFixed(2),
          'Paid Amount': store.paidAmount.toFixed(2),
          'Pending Amount': store.pendingAmount.toFixed(2),
          'Avg Order Value': (store.totalRevenue / store.orderCount).toFixed(2)
        };
      })
      .sort((a, b) => parseFloat(b['Total Revenue']) - parseFloat(a['Total Revenue']));

    return reportData;
  };

  const generateFinancialReport = async () => {
    // Fetch all orders
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('id, total_amount, created_at, "poApproved"')
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString())
      .or('void.eq.false,void.is.null')
      .is('deleted_at', null);

    if (error) {
      console.error('Financial Report Error:', error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    // Separate sales orders (regular orders) from purchase orders (PO)
    const salesOrders = allOrders?.filter(order => !order.poApproved) || [];
    const purchaseOrders = allOrders?.filter(order => order.poApproved === true) || [];

    const monthlyMap = new Map();

    salesOrders?.forEach(order => {
      const month = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      const existing = monthlyMap.get(month) || { month, sales: 0, purchases: 0 };
      existing.sales += parseFloat(String(order.total_amount || '0'));
      monthlyMap.set(month, existing);
    });

    purchaseOrders?.forEach(order => {
      const month = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      const existing = monthlyMap.get(month) || { month, sales: 0, purchases: 0 };
      existing.purchases += parseFloat(String(order.total_amount || '0'));
      monthlyMap.set(month, existing);
    });

    const reportData = Array.from(monthlyMap.values()).map(item => ({
      'Month': item.month,
      'Sales Revenue': item.sales.toFixed(2),
      'Purchase Cost': item.purchases.toFixed(2),
      'Gross Profit': (item.sales - item.purchases).toFixed(2),
      'Profit Margin %': item.sales > 0 ? ((item.sales - item.purchases) / item.sales * 100).toFixed(2) : '0.00'
    }));

    return reportData;
  };

  const generateInventoryReport = async () => {
    // Fetch all products with their sizes
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, category, subcategory')
      .order('name');

    if (error) {
      console.error('Inventory Report Error:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    // Fetch product sizes separately - try with cost_price first
    const productIds = products?.map(p => p.id) || [];
    let productSizes: any[] = [];
    let hasCostPrice = false;

    const { data: sizesWithCost, error: sizesError } = await supabase
      .from('product_sizes')
      .select('product_id, size_value, size_unit, stock, price, cost_price')
      .in('product_id', productIds);

    if (sizesError) {
      console.error('Product sizes fetch error (trying without cost_price):', sizesError);
      // Try without cost_price if column doesn't exist
      const { data: sizesWithoutCost, error: minimalError } = await supabase
        .from('product_sizes')
        .select('product_id, size_value, size_unit, stock, price')
        .in('product_id', productIds);

      if (minimalError) {
        console.error('Minimal product sizes fetch error:', minimalError);
        throw new Error(`Failed to fetch product sizes: ${minimalError.message}`);
      }

      productSizes = sizesWithoutCost || [];
      hasCostPrice = false;
    } else {
      productSizes = sizesWithCost || [];
      hasCostPrice = true;
    }

    // Create product lookup map
    const productMap = new Map(products?.map(p => [p.id, p]) || []);

    const reportData = productSizes?.map(size => {
      const product = productMap.get(size.product_id);
      const stockQty = size.stock || 0;
      const sellingPrice = parseFloat(String(size.price || '0'));

      // Use cost_price if available, otherwise estimate as 70% of selling price
      const costPrice = hasCostPrice && size.cost_price
        ? parseFloat(String(size.cost_price || '0'))
        : sellingPrice * 0.7;

      const stockValue = stockQty * costPrice;

      return {
        'Product Name': product?.name || 'Unknown',
        'Category': product?.category || 'N/A',
        'Subcategory': product?.subcategory || 'N/A',
        'Size': size.size_value || 'Standard',
        'Unit': size.size_unit || 'Unit',
        'Stock Quantity': stockQty,
        'Cost Price': costPrice.toFixed(2),
        'Selling Price': sellingPrice.toFixed(2),
        'Stock Value': stockValue.toFixed(2),
        'Status': stockQty > 10 ? 'In Stock' : stockQty > 0 ? 'Low Stock' : 'Out of Stock'
      };
    }) || [];

    return reportData;
  };

  const generateCustomerReport = async () => {
    // Fetch all customers (profiles)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, company_name, first_name, last_name, email, type, created_at')
      .in('type', ['pharmacy', 'hospital', 'group'])
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // Fetch orders for these customers - try with paid_amount first
    const profileIds = profiles?.map(p => p.id) || [];
    let orders: any[] = [];

    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, profile_id, total_amount, paid_amount, created_at')
      .in('profile_id', profileIds)
      .or('void.eq.false,void.is.null')
      .is('deleted_at', null);

    if (ordersError) {
      console.error('Orders fetch error (trying without paid_amount):', ordersError);
      // Try without paid_amount if column doesn't exist
      const { data: ordersWithoutPaid, error: error2 } = await supabase
        .from('orders')
        .select('id, profile_id, total_amount, created_at')
        .in('profile_id', profileIds)
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null);

      if (error2) {
        console.error('Orders fetch error:', error2);
        throw new Error(`Failed to fetch customer orders: ${error2.message}`);
      }
      orders = ordersWithoutPaid || [];
    } else {
      orders = ordersData || [];
    }

    // Aggregate by customer
    const customerMap = new Map();

    orders?.forEach(order => {
      const totalAmount = parseFloat(String(order.total_amount || '0'));
      const paidAmount = order.paid_amount !== undefined ? parseFloat(String(order.paid_amount || '0')) : totalAmount;

      const existing = customerMap.get(order.profile_id) || {
        orderCount: 0,
        totalSpent: 0,
        totalPaid: 0,
        lastOrderDate: order.created_at
      };

      existing.orderCount += 1;
      existing.totalSpent += totalAmount;
      existing.totalPaid += paidAmount;

      if (new Date(order.created_at) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = order.created_at;
      }

      customerMap.set(order.profile_id, existing);
    });

    const reportData = profiles?.map(profile => {
      const stats = customerMap.get(profile.id) || {
        orderCount: 0,
        totalSpent: 0,
        totalPaid: 0,
        lastOrderDate: null
      };

      return {
        'Customer Name': profile.company_name || `${profile.first_name} ${profile.last_name}` || profile.email,
        'Email': profile.email,
        'Type': profile.type,
        'Member Since': new Date(profile.created_at).toLocaleDateString(),
        'Total Orders': stats.orderCount,
        'Total Spent': stats.totalSpent.toFixed(2),
        'Total Paid': stats.totalPaid.toFixed(2),
        'Outstanding': (stats.totalSpent - stats.totalPaid).toFixed(2),
        'Last Order': stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString() : 'Never',
        'Avg Order Value': stats.orderCount > 0 ? (stats.totalSpent / stats.orderCount).toFixed(2) : '0.00'
      };
    }).sort((a, b) => parseFloat(b['Total Spent']) - parseFloat(a['Total Spent'])) || [];

    return reportData;
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      let reportData: any[] = [];
      let reportName = "";

      switch (reportType) {
        case "sales":
          reportData = await generateSalesReport();
          reportName = "Sales_Order_Report";
          break;
        case "Purchase":
          reportData = await generatePurchaseReport();
          reportName = "Purchase_Order_Report";
          break;
        case "products":
          reportData = await generateProductReport();
          reportName = "Product_Performance_Report";
          break;
        case "stores":
          reportData = await generateStoreReport();
          reportName = "Store_Performance_Report";
          break;
        case "financial":
          reportData = await generateFinancialReport();
          reportName = "Financial_Summary_Report";
          break;
        case "inventory":
          reportData = await generateInventoryReport();
          reportName = "Inventory_Report";
          break;
        case "customer":
          reportData = await generateCustomerReport();
          reportName = "Customer_Analysis_Report";
          break;
        default:
          throw new Error("Report type not implemented");
      }

      if (reportData.length === 0) {
        toast({
          title: "No Data",
          description: "No data available for the selected period",
          variant: "destructive"
        });
        return;
      }

      // Export based on format
      if (format === "excel") {
        exportToExcel(reportData, reportName);
      } else {
        exportToCSV(reportData, reportName);
      }

      toast({
        title: "Report Generated",
        description: `${reportName} has been downloaded successfully`,
      });

    } catch (error) {
      console.error('Error generating report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate report. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToExcel = (data: any[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...data.map(row => String(row[key] || '').length)))
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToCSV = (data: any[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Configuration Panel */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Select report type and format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Report Type</Label>
            <RadioGroup value={reportType} onValueChange={setReportType}>
              {reportTypes.map(type => (
                <div key={type.value} className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor={type.value} className="font-medium cursor-pointer">
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Format */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Export Format</Label>
            <RadioGroup value={format} onValueChange={setFormat}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="cursor-pointer flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Excel (.xlsx)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="cursor-pointer flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  CSV (.csv)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="details"
                  checked={includeDetails}
                  onCheckedChange={(checked) => setIncludeDetails(checked as boolean)}
                />
                <Label htmlFor="details" className="cursor-pointer text-sm">
                  Include detailed breakdown
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="charts"
                  checked={includeCharts}
                  onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                  disabled
                />
                <Label htmlFor="charts" className="cursor-pointer text-sm text-muted-foreground">
                  Include charts (Coming soon)
                </Label>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Panel */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <CardDescription>
            Selected: {reportTypes.find(t => t.value === reportType)?.label} |
            Format: {format.toUpperCase()} |
            Period: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-6 bg-muted/30">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    {reportTypes.find(t => t.value === reportType)?.label}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {reportTypes.find(t => t.value === reportType)?.description}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Data from {dateRange.from.toLocaleDateString()} to {dateRange.to.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Export format: {format.toUpperCase()}</span>
                    </div>
                    {includeDetails && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Detailed breakdown included</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Note:</strong> The report will be downloaded to your default downloads folder.
              </p>
              <p>
                Reports include all relevant data for the selected date range and can be opened in Excel,
                Google Sheets, or any spreadsheet application.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
