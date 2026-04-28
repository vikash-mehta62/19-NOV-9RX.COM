import { supabase } from "@/integrations/supabase/client";

// Types for dashboard data
export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  customerBreakdown: {
    pharmacy: number;
    group: number;
    hospital: number;
  };
  avgOrderValue: number;
  paymentBreakdown: {
    paid: number;
    unpaid: number;
    pending: number;
    partial: number;
  };
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
  const getRecognizedRevenue = (order: any) => {
    const status = String(order?.payment_status || "").toLowerCase();
    const totalAmount = Number(order?.total_amount || 0);
    const paidAmount = Number(order?.paid_amount || 0);

    if (status === 'paid') return totalAmount;
    if (status === 'partial_paid' || status === 'partial' || status === 'partially_paid') return paidAmount;
    return 0;
  };

  const { from, to } = getDateRange(timeRange);
  const prevRange = getPreviousPeriodRange(timeRange);

  const fetchOrdersInRange = async (rangeFrom: Date | null, rangeTo: Date, endExclusive = false) => {
    const all: any[] = [];
    let start = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('orders')
        .select('id, total_amount, paid_amount, payment_status, poAccept, profile_id, created_at', { count: 'exact' })
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null)
        .range(start, start + batchSize - 1);

      if (rangeFrom) {
        query = query.gte('created_at', rangeFrom.toISOString());
      }
      query = endExclusive
        ? query.lt('created_at', rangeTo.toISOString())
        : query.lte('created_at', rangeTo.toISOString());

      const { data, error, count } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        all.push(...data);
        start += batchSize;
        if ((count && all.length >= count) || data.length < batchSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return all;
  };

  const [currentOrders, prevOrders] = await Promise.all([
    fetchOrdersInRange(from, to, false),
    fetchOrdersInRange(prevRange.from, prevRange.to, true),
  ]);

  // Calculate current period stats
  const currentSalesOrders = (currentOrders || []).filter((o: any) => o.poAccept !== false);
  const prevSalesOrders = (prevOrders || []).filter((o: any) => o.poAccept !== false);

  const currentSales = currentSalesOrders.reduce((sum, o) => sum + getRecognizedRevenue(o), 0);
  const currentOrderCount = currentSalesOrders.length;
  // Customer totals should match Users page (profiles table), not order activity.
  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('id, type')
    .in('type', ['pharmacy', 'group', 'hospital']);

  if (profilesError) throw profilesError;

  const customerBreakdown = (profileRows || []).reduce(
    (acc: { pharmacy: number; group: number; hospital: number }, row: any) => {
      const t = String(row?.type || '').toLowerCase();
      if (t === 'pharmacy') acc.pharmacy += 1;
      else if (t === 'group') acc.group += 1;
      else if (t === 'hospital') acc.hospital += 1;
      return acc;
    },
    { pharmacy: 0, group: 0, hospital: 0 }
  );

  const currentCustomers =
    customerBreakdown.pharmacy + customerBreakdown.group + customerBreakdown.hospital;
  const currentAvg = currentOrderCount > 0 ? currentSales / currentOrderCount : 0;

  // Calculate previous period stats
  const prevSales = prevSalesOrders.reduce((sum, o) => sum + getRecognizedRevenue(o), 0);
  const prevOrderCount = prevSalesOrders.length;
  const prevCustomers = new Set(prevSalesOrders.map(o => o.profile_id) || []).size;
  const prevAvg = prevOrderCount > 0 ? prevSales / prevOrderCount : 0;

  const paymentBreakdown = currentSalesOrders.reduce(
    (acc, order) => {
      const status = String(order.payment_status || "").toLowerCase();
      if (status === "paid") acc.paid += 1;
      else if (status === "partial_paid" || status === "partial" || status === "partially_paid") acc.partial += 1;
      else if (status === "pending") acc.pending += 1;
      else acc.unpaid += 1;
      return acc;
    },
    { paid: 0, unpaid: 0, pending: 0, partial: 0 }
  );

  return {
    totalSales: currentSales,
    totalOrders: currentOrderCount,
    totalCustomers: currentCustomers,
    customerBreakdown,
    avgOrderValue: currentAvg,
    paymentBreakdown,
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
  const getRecognizedRevenue = (order: any) => {
    const status = String(order?.payment_status || "").toLowerCase();
    const totalAmount = Number(order?.total_amount || 0);
    const paidAmount = Number(order?.paid_amount || 0);

    if (status === 'paid') return totalAmount;
    if (status === 'partial_paid' || status === 'partial' || status === 'partially_paid') return paidAmount;
    return 0;
  };

  const { from } = getDateRange(timeRange);

  const allOrders: any[] = [];
  let start = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('orders')
      .select('total_amount, paid_amount, payment_status, poAccept, created_at', { count: 'exact' })
      .or('void.eq.false,void.is.null')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(start, start + batchSize - 1);

    if (from) {
      query = query.gte('created_at', from.toISOString());
    }

    const { data, error, count } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      allOrders.push(...data);
      start += batchSize;
      if ((count && allOrders.length >= count) || data.length < batchSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  // Group by date
  const dailyRevenue = new Map<string, number>();
  allOrders.filter((order: any) => order.poAccept !== false).forEach(order => {
    const date = new Date(order.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + getRecognizedRevenue(order));
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
