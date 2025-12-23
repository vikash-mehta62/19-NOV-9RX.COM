import { supabase } from "@/integrations/supabase/client";

// Types for dashboard data
export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  // Trend data (comparing to previous period)
  salesTrend: { change: number; direction: 'up' | 'down' | 'neutral' };
  ordersTrend: { change: number; direction: 'up' | 'down' | 'neutral' };
  customersTrend: { change: number; direction: 'up' | 'down' | 'neutral' };
  avgOrderTrend: { change: number; direction: 'up' | 'down' | 'neutral' };
}

export interface LowStockProduct {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  urgency: 'critical' | 'warning' | 'low';
}

export interface DashboardAlerts {
  lowStockProducts: LowStockProduct[];
  pendingInvoicesCount: number;
  pendingAccessRequestsCount: number;
}

// Calculate trend between two values
const calculateTrend = (current: number, previous: number): { change: number; direction: 'up' | 'down' | 'neutral' } => {
  if (previous === 0) {
    return { change: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'neutral' };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    change: Math.abs(parseFloat(change.toFixed(1))),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  };
};

// Get date range based on time filter
export const getDateRange = (timeRange: string): { from: Date | null; to: Date } => {
  const to = new Date();
  if (timeRange === 'all') return { from: null, to };
  
  const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { from, to };
};

// Get previous period date range for comparison
const getPreviousPeriodRange = (timeRange: string): { from: Date; to: Date } => {
  const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : timeRange === 'all' ? 365 : 30;
  const to = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
};

// Fetch dashboard stats with real trend calculations
export const fetchDashboardStats = async (timeRange: string): Promise<DashboardStats> => {
  const { from, to } = getDateRange(timeRange);
  const prevRange = getPreviousPeriodRange(timeRange);

  // Current period query
  let currentQuery = supabase
    .from('orders')
    .select('id, total_amount, profile_id, created_at')
    .or('void.eq.false,void.is.null')
    .is('deleted_at', null);

  if (from) {
    currentQuery = currentQuery.gte('created_at', from.toISOString());
  }

  // Previous period query for comparison
  let prevQuery = supabase
    .from('orders')
    .select('id, total_amount, profile_id')
    .or('void.eq.false,void.is.null')
    .is('deleted_at', null)
    .gte('created_at', prevRange.from.toISOString())
    .lt('created_at', prevRange.to.toISOString());

  const [{ data: currentOrders }, { data: prevOrders }] = await Promise.all([
    currentQuery,
    prevQuery
  ]);

  // Calculate current period stats
  const currentSales = currentOrders?.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0;
  const currentOrderCount = currentOrders?.length || 0;
  const currentCustomers = new Set(currentOrders?.map(o => o.profile_id) || []).size;
  const currentAvg = currentOrderCount > 0 ? currentSales / currentOrderCount : 0;

  // Calculate previous period stats
  const prevSales = prevOrders?.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0;
  const prevOrderCount = prevOrders?.length || 0;
  const prevCustomers = new Set(prevOrders?.map(o => o.profile_id) || []).size;
  const prevAvg = prevOrderCount > 0 ? prevSales / prevOrderCount : 0;

  return {
    totalSales: currentSales,
    totalOrders: currentOrderCount,
    totalCustomers: currentCustomers,
    avgOrderValue: currentAvg,
    salesTrend: calculateTrend(currentSales, prevSales),
    ordersTrend: calculateTrend(currentOrderCount, prevOrderCount),
    customersTrend: calculateTrend(currentCustomers, prevCustomers),
    avgOrderTrend: calculateTrend(currentAvg, prevAvg),
  };
};

// Fetch low stock products with urgency levels
export const fetchLowStockProducts = async (): Promise<LowStockProduct[]> => {
  const { data, error } = await supabase.rpc('get_low_stock_products');
  
  if (error) {
    console.error('Error fetching low stock products:', error);
    return [];
  }

  return (data || []).map((product: any) => {
    const stockRatio = product.current_stock / (product.min_stock || 1);
    let urgency: 'critical' | 'warning' | 'low' = 'low';
    
    if (stockRatio <= 0.25 || product.current_stock <= 0) {
      urgency = 'critical';
    } else if (stockRatio <= 0.5) {
      urgency = 'warning';
    }

    return {
      id: product.id,
      name: product.name,
      current_stock: product.current_stock,
      min_stock: product.min_stock,
      urgency
    };
  }).sort((a: LowStockProduct, b: LowStockProduct) => {
    const urgencyOrder = { critical: 0, warning: 1, low: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
};

// Fetch dashboard alerts
export const fetchDashboardAlerts = async (): Promise<DashboardAlerts> => {
  const [lowStockProducts, pendingInvoices, pendingRequests] = await Promise.all([
    fetchLowStockProducts(),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'unpaid')
      .or('void.eq.false,void.is.null'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
  ]);

  return {
    lowStockProducts,
    pendingInvoicesCount: pendingInvoices.count || 0,
    pendingAccessRequestsCount: pendingRequests.count || 0
  };
};

// Fetch revenue chart data
export const fetchRevenueChartData = async (timeRange: string) => {
  const { from } = getDateRange(timeRange);
  
  let query = supabase
    .from('orders')
    .select('total_amount, created_at')
    .or('void.eq.false,void.is.null')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (from) {
    query = query.gte('created_at', from.toISOString());
  }

  const { data: orders } = await query;

  if (!orders) return [];

  // Group by date
  const dailyRevenue = new Map<string, number>();
  orders.forEach(order => {
    const date = new Date(order.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + (parseFloat(order.total_amount) || 0));
  });

  return Array.from(dailyRevenue.entries()).map(([date, revenue]) => ({
    date,
    revenue: parseFloat(revenue.toFixed(2))
  }));
};

// Fetch top performing products
export const fetchTopProducts = async (timeRange: string, limit = 10) => {
  const { from } = getDateRange(timeRange);
  
  let query = supabase
    .from('orders')
    .select('items')
    .or('void.eq.false,void.is.null')
    .is('deleted_at', null);

  if (from) {
    query = query.gte('created_at', from.toISOString());
  }

  const { data: orders } = await query;

  if (!orders) return [];

  const productStats = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();

  for (const order of orders) {
    if (!order.items || !Array.isArray(order.items)) continue;
    for (const item of order.items as any[]) {
      const productId = item.product_id || item.id;
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const revenue = quantity * price;

      const existing = productStats.get(productId) || { 
        id: productId, 
        name: item.name || item.product_name || 'Unknown', 
        quantity: 0, 
        revenue: 0 
      };
      existing.quantity += quantity;
      existing.revenue += revenue;
      productStats.set(productId, existing);
    }
  }

  return Array.from(productStats.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
};
