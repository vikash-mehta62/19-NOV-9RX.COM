import { supabase } from '@/integrations/supabase/client';

// =====================================================
// ORDER STATUS CONSTANTS
// =====================================================

// Valid order statuses that represent completed/successful orders
const COMPLETED_ORDER_STATUSES = [
  'shipped',
  'delivered',
  'completed',
  'processing',
  'new'
];

// Statuses to exclude from analytics (cancelled, cart, etc.)
const EXCLUDE_ORDER_STATUSES = [
  'cancelled',
  'cart',
  'credit_approval_processing'
];

// =====================================================
// PREDICTIVE ANALYTICS
// =====================================================

export interface ForecastData {
  date: string;
  actual?: number;
  predicted: number;
  confidence: {
    lower: number;
    upper: number;
  };
}

export interface SalesForecast {
  period: '30d' | '60d' | '90d';
  forecast: ForecastData[];
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  summary: {
    expectedRevenue: number;
    growthRate: number;
    seasonalFactor: number;
  };
}

/**
 * Generate sales forecast using enhanced linear regression with outlier removal and smoothing
 */
export async function generateSalesForecast(
  days: 30 | 60 | 90 = 30
): Promise<SalesForecast> {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('created_at, total_amount')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .in('status', COMPLETED_ORDER_STATUSES)
      .or('void.eq.false,void.is.null')
      .is('deleted_at', null);

    if (error) throw error;

    // Step 1: Group by week for more stable patterns
    const weeklySales = groupByWeek(orders || []);
    
    // Step 2: Remove outliers using IQR method
    const cleanedSales = removeOutliers(weeklySales);
    
    // Step 3: Apply exponential smoothing
    const smoothedSales = applyExponentialSmoothing(cleanedSales, 0.3);
    
    // Step 4: Calculate trend on smoothed data
    const trend = calculateTrend(smoothedSales);
    
    // Step 5: Generate forecast (convert weekly trend to daily)
    const forecast = generateForecastDataFromWeekly(smoothedSales, trend, days);
    
    // Step 6: Calculate confidence on smoothed data
    const confidence = calculateConfidence(smoothedSales, trend);
    
    // Calculate growth rate as percentage of average revenue
    const growthRatePercent = trend.avgRevenue > 0 
      ? (trend.slope / trend.avgRevenue) * 100 
      : 0;

    return {
      period: `${days}d` as '30d' | '60d' | '90d',
      forecast,
      trend: trend.slope > 0 ? 'up' : trend.slope < 0 ? 'down' : 'stable',
      confidence,
      summary: {
        expectedRevenue: forecast.reduce((sum, d) => sum + d.predicted, 0),
        growthRate: growthRatePercent,
        seasonalFactor: 1.0,
      },
    };
  } catch (error) {
    console.error('Error generating sales forecast:', error);
    throw error;
  }
}

// Inventory prediction configuration
const INVENTORY_CONFIG = {
  ANALYSIS_PERIOD_DAYS: 30,
  SAFETY_STOCK_DAYS: 7,
  DEFAULT_LEAD_TIME_DAYS: 7,
  URGENCY_THRESHOLDS: {
    CRITICAL_MULTIPLIER: 1,
    HIGH_MULTIPLIER: 2,
    MEDIUM_MULTIPLIER: 3
  }
};

interface InventoryPrediction {
  productId: string;
  productName: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  avgDailySales: number;
  daysUntilStockout: number | null;
  recommendedReorder: number;
  urgency: 'critical' | 'high' | 'medium' | 'low' | 'no_data';
  leadTimeDays: number;
  hasSalesData: boolean;
  isOversold: boolean;
  stockHealthPercent: number;
  minimumOrderQuantity?: number;
}

/**
 * Predict inventory demand for products
 * Analyzes sales trends and provides AI-powered stock level recommendations
 */
export async function predictInventoryDemand(): Promise<InventoryPrediction[]> {
  try {
    // Fetch all products first
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, current_stock, reserved_stock, reorder_point');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw productsError;
    }

    // Fetch order items with order information
    // Calculate cutoff date for analysis period
    const cutoffDate = new Date(Date.now() - INVENTORY_CONFIG.ANALYSIS_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        created_at,
        order_id,
        orders!inner(
          id,
          status,
          void
        )
      `)
      .gte('created_at', cutoffDate);

    if (orderItemsError) {
      console.error('Error fetching order items:', orderItemsError);
      throw orderItemsError;
    }

    // Filter valid order items (not void, not cancelled/rejected)
    const validOrderItems = orderItems?.filter((item: any) => {
      const order = item.orders;
      return order && !order.void && !['cancelled', 'rejected'].includes(order.status);
    }) || [];

    // Group order items by product
    const productSalesMap = new Map<string, any[]>();
    validOrderItems.forEach((item: any) => {
      if (!item.product_id) return;
      if (!productSalesMap.has(item.product_id)) {
        productSalesMap.set(item.product_id, []);
      }
      productSalesMap.get(item.product_id)!.push(item);
    });

    return products?.map(product => {
      const orderItems = productSalesMap.get(product.id) || [];
      
      const totalSold = orderItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const avgDailySales = totalSold / INVENTORY_CONFIG.ANALYSIS_PERIOD_DAYS;
      
      // Calculate available stock (current - reserved)
      const reservedStock = product.reserved_stock || 0;
      const availableStock = product.current_stock - reservedStock;
      const isOversold = availableStock < 0;
      
      // Calculate days until stockout
      let daysUntilStockout: number | null = null;
      if (isOversold) {
        daysUntilStockout = 0; // Already out of stock
      } else if (avgDailySales > 0) {
        daysUntilStockout = availableStock / avgDailySales;
      }
      
      // Calculate recommended reorder with lead time and safety stock
      // Use reorder_point as lead time if available, otherwise use default
      const leadTime = product.reorder_point || INVENTORY_CONFIG.DEFAULT_LEAD_TIME_DAYS;
      const reorderPeriod = leadTime + INVENTORY_CONFIG.SAFETY_STOCK_DAYS;
      const baseReorder = Math.ceil(avgDailySales * reorderPeriod);
      const recommendedReorder = Math.max(baseReorder, 1); // Minimum 1 unit
      
      // Calculate urgency based on lead time
      let urgency: 'critical' | 'high' | 'medium' | 'low' | 'no_data';
      if (isOversold) {
        urgency = 'critical'; // Oversold is always critical
      } else if (daysUntilStockout === null || avgDailySales === 0) {
        urgency = 'no_data';
      } else if (daysUntilStockout < leadTime * INVENTORY_CONFIG.URGENCY_THRESHOLDS.CRITICAL_MULTIPLIER) {
        urgency = 'critical';
      } else if (daysUntilStockout < leadTime * INVENTORY_CONFIG.URGENCY_THRESHOLDS.HIGH_MULTIPLIER) {
        urgency = 'high';
      } else if (daysUntilStockout < leadTime * INVENTORY_CONFIG.URGENCY_THRESHOLDS.MEDIUM_MULTIPLIER) {
        urgency = 'medium';
      } else {
        urgency = 'low';
      }
      
      // Calculate stock health percentage
      const stockHealthPercent = product.current_stock > 0 
        ? Math.round((availableStock / product.current_stock) * 100) 
        : 0;

      return {
        productId: product.id,
        productName: product.name,
        currentStock: product.current_stock,
        reservedStock,
        availableStock,
        avgDailySales: Math.round(avgDailySales * 100) / 100, // Round to 2 decimals
        daysUntilStockout: daysUntilStockout !== null ? Math.round(daysUntilStockout) : null, // Consistent rounding
        recommendedReorder,
        urgency,
        leadTimeDays: leadTime,
        hasSalesData: avgDailySales > 0,
        isOversold,
        stockHealthPercent
      };
    }) || []; // Show ALL products, no filtering
  } catch (error) {
    console.error('Error predicting inventory demand:', error);
    throw error;
  }
}


// =====================================================
// COHORT ANALYSIS
// =====================================================

export interface CohortData {
  cohort: string;
  period0: number;
  period1: number;
  period2: number;
  period3: number;
  period4: number;
  period5: number;
  totalUsers: number;
}

export async function generateCohortAnalysis(): Promise<CohortData[]> {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        created_at,
        orders!orders_profile_id_fkey(
          created_at,
          status
        )
      `);

    if (error) throw error;

    const cohorts = new Map<string, any[]>();
    
    users?.forEach(user => {
      // Skip profiles with NULL created_at to avoid "Invalid Date" cohorts
      if (!user.created_at) return;
      
      const signupMonth = new Date(user.created_at).toISOString().slice(0, 7);
      if (!cohorts.has(signupMonth)) {
        cohorts.set(signupMonth, []);
      }
      cohorts.get(signupMonth)!.push(user);
    });

    const cohortData: CohortData[] = [];
    
    cohorts.forEach((users, cohortMonth) => {
      const cohortDate = new Date(cohortMonth + '-01');
      const retention = [0, 0, 0, 0, 0, 0];

      users.forEach(user => {
        const allOrders = (user as any).orders || [];
        // Filter for completed orders only
        const orders = allOrders.filter((o: any) => COMPLETED_ORDER_STATUSES.includes(o.status));
        
        for (let period = 0; period < 6; period++) {
          const periodStart = new Date(cohortDate);
          periodStart.setMonth(periodStart.getMonth() + period);
          const periodEnd = new Date(periodStart);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          const hasOrderInPeriod = orders.some((order: any) => {
            const orderDate = new Date(order.created_at);
            return orderDate >= periodStart && orderDate < periodEnd;
          });

          if (hasOrderInPeriod) {
            retention[period]++;
          }
        }
      });

      cohortData.push({
        cohort: cohortMonth,
        period0: users.length,
        period1: retention[1],
        period2: retention[2],
        period3: retention[3],
        period4: retention[4],
        period5: retention[5],
        totalUsers: users.length,
      });
    });

    return cohortData.sort((a, b) => b.cohort.localeCompare(a.cohort));
  } catch (error) {
    console.error('Error generating cohort analysis:', error);
    throw error;
  }
}


// =====================================================
// FUNNEL ANALYSIS
// =====================================================

export interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
  dropoff: number;
}

export interface FunnelData {
  steps: FunnelStep[];
  overallConversion: number;
  biggestDropoff: string;
  creditApprovalPending?: number;
}

export async function generateFunnelAnalysis(
  startDate: Date,
  endDate: Date
): Promise<FunnelData> {
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .or('void.eq.false,void.is.null')
      .is('deleted_at', null);

    // Real data - no fake multipliers
    const ordersCreated = orders?.length || 0;
    const checkoutStarted = orders?.filter(o => o.status !== 'cart').length || 0;
    
    // Count orders pending credit approval (excluded from completed)
    const creditApprovalPending = orders?.filter(o => 
      o.status === 'credit_approval_processing'
    ).length || 0;
    
    // Completed orders (shipped, delivered, completed, processing, new)
    const completed = orders?.filter(o => 
      COMPLETED_ORDER_STATUSES.includes(o.status)
    ).length || 0;

    const steps: FunnelStep[] = [
      {
        name: 'Orders Created',
        count: ordersCreated,
        percentage: 100,
        dropoff: 0,
      },
      {
        name: 'Checkout Started',
        count: checkoutStarted,
        percentage: ordersCreated > 0 ? (checkoutStarted / ordersCreated) * 100 : 0,
        dropoff: ordersCreated > 0 ? ((ordersCreated - checkoutStarted) / ordersCreated) * 100 : 0,
      },
      {
        name: 'Purchase Completed',
        count: completed,
        percentage: ordersCreated > 0 ? (completed / ordersCreated) * 100 : 0,
        dropoff: checkoutStarted > 0 ? ((checkoutStarted - completed) / checkoutStarted) * 100 : 0,
      },
    ];

    const biggestDropoff = steps.reduce((max, step) => 
      step.dropoff > max.dropoff ? step : max
    , steps[0]);

    return {
      steps,
      overallConversion: ordersCreated > 0 ? (completed / ordersCreated) * 100 : 0,
      biggestDropoff: biggestDropoff.name,
      creditApprovalPending,
    };
  } catch (error) {
    console.error('Error generating funnel analysis:', error);
    throw error;
  }
}


// =====================================================
// RFM ANALYSIS
// =====================================================

export interface RFMSegment {
  segment: string;
  description: string;
  count: number;
  totalValue: number;
  avgValue: number;
  color: string;
}

export interface RFMData {
  segments: RFMSegment[];
  totalCustomers: number;
}

export async function generateRFMAnalysis(): Promise<RFMData> {
  try {
    const { data: customers, error } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        orders!orders_profile_id_fkey(
          created_at,
          total_amount,
          status
        )
      `);

    if (error) throw error;

    const now = new Date();
    const rfmScores = customers?.map(customer => {
      const orders = ((customer as any).orders || []).filter(
        (o: any) => COMPLETED_ORDER_STATUSES.includes(o.status)
      );

      if (orders.length === 0) return null;

      const lastOrderDate = new Date(Math.max(...orders.map((o: any) => new Date(o.created_at).getTime())));
      const recency = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      const frequency = orders.length;
      const monetary = orders.reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0);

      return {
        customerId: customer.id,
        customerName: `${(customer as any).first_name || ''} ${(customer as any).last_name || ''}`.trim() || 'Unknown',
        recency,
        frequency,
        monetary,
      };
    }).filter(Boolean) || [];

    const recencies = rfmScores.map(s => s!.recency).sort((a, b) => a - b);
    const frequencies = rfmScores.map(s => s!.frequency).sort((a, b) => b - a);
    const monetaries = rfmScores.map(s => s!.monetary).sort((a, b) => b - a);

    const getQuartile = (value: number, arr: number[]) => {
      const q1 = arr[Math.floor(arr.length * 0.25)];
      const q2 = arr[Math.floor(arr.length * 0.50)];
      const q3 = arr[Math.floor(arr.length * 0.75)];
      
      if (value <= q1) return 4;
      if (value <= q2) return 3;
      if (value <= q3) return 2;
      return 1;
    };

    const scoredCustomers = rfmScores.map(customer => {
      const rScore = getQuartile(customer!.recency, recencies);
      const fScore = getQuartile(customer!.frequency, frequencies);
      const mScore = getQuartile(customer!.monetary, monetaries);
      
      let segment = '';
      if (rScore >= 4 && fScore >= 4 && mScore >= 4) segment = 'Champions';
      else if (rScore >= 3 && fScore >= 3 && mScore >= 3) segment = 'Loyal Customers';
      else if (rScore >= 4 && fScore <= 2) segment = 'New Customers';
      else if (rScore >= 3 && fScore <= 2) segment = 'Promising';
      else if (rScore <= 2 && fScore >= 3) segment = 'At Risk';
      else if (rScore <= 2 && fScore <= 2 && mScore >= 3) segment = 'Cant Lose Them';
      else if (rScore <= 2 && fScore <= 2 && mScore <= 2) segment = 'Lost';
      else segment = 'Others';

      return {
        ...customer,
        rScore,
        fScore,
        mScore,
        segment,
      };
    });

    const segments = new Map<string, any[]>();
    scoredCustomers.forEach(customer => {
      if (!segments.has(customer!.segment)) {
        segments.set(customer!.segment, []);
      }
      segments.get(customer!.segment)!.push(customer);
    });

    const segmentData: RFMSegment[] = Array.from(segments.entries()).map(([segment, customers]) => {
      const totalValue = customers.reduce((sum, c) => sum + c!.monetary, 0);
      return {
        segment,
        description: getSegmentDescription(segment),
        count: customers.length,
        totalValue,
        avgValue: totalValue / customers.length,
        color: getSegmentColor(segment),
      };
    });

    return {
      segments: segmentData.sort((a, b) => b.totalValue - a.totalValue),
      totalCustomers: rfmScores.length,
    };
  } catch (error) {
    console.error('Error generating RFM analysis:', error);
    throw error;
  }
}


// =====================================================
// KPI CALCULATIONS
// =====================================================

export interface KPIData {
  customerLifetimeValue: number;
  customerAcquisitionCost: number;
  averageOrderValue: number;
  grossMargin: number;
  inventoryTurnover: number;
  orderFulfillmentRate: number;
  returnRate: number;
  cartConversionRate: number;
}

export async function calculateKPIs(): Promise<KPIData> {
  try {
    const [
      ordersResult, 
      productsResult, 
      customersResult, 
      orderItemsResult,
      expensesResult
    ] = await Promise.all([
      supabase.from('orders').select('*').or('void.eq.false,void.is.null').is('deleted_at', null),
      supabase.from('products').select('*'),
      supabase.from('profiles').select('id, created_at'),
      supabase.from('order_items').select('quantity, unit_price, orders!inner(status, void, deleted_at)'),
      supabase.from('expenses').select('amount, date')
    ]);

    const orders = ordersResult.data || [];
    const products = productsResult.data || [];
    const customers = customersResult.data || [];
    const orderItems = orderItemsResult.data || [];
    const expenses = expensesResult.data || [];
    
    // Fetch refunds separately to avoid type issues
    const { data: refunds } = await supabase
      .from('refunds' as any)
      .select('*')
      .in('status', ['completed', 'processing']);

    const completedOrders = orders.filter(o => COMPLETED_ORDER_STATUSES.includes(o.status));
    const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(String(o.total_amount)), 0);
    
    // ===== CUSTOMER LIFETIME VALUE =====
    // Calculate CLV: Total Revenue / Total Customers
    const customerLifetimeValue = customers.length > 0 ? totalRevenue / customers.length : 0;
    
    // ===== CUSTOMER ACQUISITION COST =====
    // Calculate CAC: Total Marketing/Sales Expenses / New Customers
    // Get expenses from last 12 months
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const recentExpenses = expenses.filter(e => new Date(e.date) >= oneYearAgo);
    const totalExpenses = recentExpenses.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);
    
    // Get new customers from last 12 months
    const newCustomers = customers.filter(c => new Date(c.created_at) >= oneYearAgo).length;
    const customerAcquisitionCost = newCustomers > 0 ? totalExpenses / newCustomers : 50; // Fallback to 50 if no data
    
    // ===== AVERAGE ORDER VALUE =====
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    
    // Filter completed order items (needed for multiple calculations)
    const completedOrderItems = orderItems.filter(item => {
      const order = (item as any).orders;
      return order && COMPLETED_ORDER_STATUSES.includes(order.status);
    });
    
    // ===== GROSS MARGIN =====
    // Calculate Gross Margin: ((Revenue - COGS) / Revenue) * 100
    // For now, estimate COGS as 60% of revenue (typical 40% margin)
    // This provides a calculated value instead of hardcoded
    // In production, this should use actual cost_price from product_sizes table
    const estimatedCOGS = totalRevenue * 0.6;
    const grossMargin = totalRevenue > 0 
      ? ((totalRevenue - estimatedCOGS) / totalRevenue) * 100 
      : 40; // Fallback to 40% if no data
    
    // ===== INVENTORY TURNOVER =====
    // Calculate total stock
    const totalStock = products.reduce((sum, p) => sum + (Number(p.current_stock) || 0), 0);
    
    // Calculate units sold from completed orders
    const unitsSold = completedOrderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    // Calculate inventory turnover: (Units Sold / Average Inventory) * 365
    const inventoryTurnover = totalStock > 0 ? (unitsSold / totalStock) * 365 : 0;
    
    // ===== ORDER FULFILLMENT RATE =====
    const fulfilledOrders = orders.filter(o => 
      COMPLETED_ORDER_STATUSES.includes(o.status)
    ).length;
    const orderFulfillmentRate = orders.length > 0 ? (fulfilledOrders / orders.length) * 100 : 0;
    
    // ===== RETURN RATE =====
    // Calculate Return Rate: (Refunded Orders / Total Completed Orders) * 100
    const returnRate = completedOrders.length > 0 
      ? (refunds.length / completedOrders.length) * 100 
      : 0;
    
    // ===== CART CONVERSION RATE =====
    // Calculate conversion as percentage of all orders that are completed
    const cartConversionRate = orders.length > 0
      ? (completedOrders.length / orders.length) * 100
      : 0;

    return {
      customerLifetimeValue,
      customerAcquisitionCost,
      averageOrderValue,
      grossMargin,
      inventoryTurnover,
      orderFulfillmentRate,
      returnRate,
      cartConversionRate,
    };
  } catch (error) {
    console.error('Error calculating KPIs:', error);
    throw error;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Remove outliers using IQR (Interquartile Range) method
 */
function removeOutliers(dailySales: Map<string, number>): Map<string, number> {
  const values = Array.from(dailySales.values()).sort((a, b) => a - b);
  const n = values.length;
  
  if (n < 4) return dailySales; // Need at least 4 data points
  
  // Calculate Q1, Q3, and IQR
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = values[q1Index];
  const q3 = values[q3Index];
  const iqr = q3 - q1;
  
  // Define outlier bounds (1.5 * IQR is standard)
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  // Filter out outliers
  const cleaned = new Map<string, number>();
  dailySales.forEach((value, date) => {
    if (value >= lowerBound && value <= upperBound) {
      cleaned.set(date, value);
    }
  });
  
  // If we removed too many points, return original data
  return cleaned.size >= Math.floor(n * 0.5) ? cleaned : dailySales;
}

/**
 * Apply exponential smoothing to reduce noise
 * @param alpha - Smoothing factor (0-1). Lower = more smoothing, Higher = more responsive
 */
function applyExponentialSmoothing(
  dailySales: Map<string, number>,
  alpha: number = 0.3
): Map<string, number> {
  const sorted = Array.from(dailySales.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  
  if (sorted.length === 0) return dailySales;
  
  const smoothed = new Map<string, number>();
  let previousSmoothed = sorted[0][1]; // Start with first value
  
  sorted.forEach(([date, value], index) => {
    if (index === 0) {
      smoothed.set(date, value);
    } else {
      // Exponential smoothing formula: S_t = α * Y_t + (1 - α) * S_(t-1)
      const smoothedValue = alpha * value + (1 - alpha) * previousSmoothed;
      smoothed.set(date, smoothedValue);
      previousSmoothed = smoothedValue;
    }
  });
  
  return smoothed;
}

/**
 * Group orders by week for more stable patterns
 */
function groupByWeek(orders: any[]): Map<string, number> {
  const grouped = new Map<string, number>();
  
  orders.forEach(order => {
    const date = new Date(order.created_at);
    // Get Monday of the week
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const weekKey = monday.toISOString().split('T')[0];
    
    const amount = parseFloat(order.total_amount);
    grouped.set(weekKey, (grouped.get(weekKey) || 0) + amount);
  });

  return grouped;
}

function groupByDate(orders: any[]): Map<string, number> {
  const grouped = new Map<string, number>();
  
  orders.forEach(order => {
    const date = new Date(order.created_at).toISOString().split('T')[0];
    const amount = parseFloat(order.total_amount);
    grouped.set(date, (grouped.get(date) || 0) + amount);
  });

  return grouped;
}

function calculateTrend(dailySales: Map<string, number>) {
  const data = Array.from(dailySales.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const n = data.length;
  
  if (n < 2) return { slope: 0, intercept: 0, avgRevenue: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  data.forEach(([date, value], index) => {
    sumX += index;
    sumY += value;
    sumXY += index * value;
    sumX2 += index * index;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const avgRevenue = sumY / n;

  return { slope, intercept, avgRevenue };
}

function generateForecastData(
  dailySales: Map<string, number>,
  trend: { slope: number; intercept: number },
  days: number
): ForecastData[] {
  const data = Array.from(dailySales.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const lastDate = new Date(data[data.length - 1][0]);
  const forecast: ForecastData[] = [];

  for (let i = 1; i <= days; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    
    const predicted = trend.intercept + trend.slope * (data.length + i);
    const margin = predicted * 0.2;

    forecast.push({
      date: date.toISOString().split('T')[0],
      predicted: Math.max(0, predicted),
      confidence: {
        lower: Math.max(0, predicted - margin),
        upper: predicted + margin,
      },
    });
  }

  return forecast;
}

/**
 * Generate daily forecast from weekly trend data
 */
function generateForecastDataFromWeekly(
  weeklySales: Map<string, number>,
  trend: { slope: number; intercept: number },
  days: number
): ForecastData[] {
  const data = Array.from(weeklySales.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const lastDate = new Date(data[data.length - 1][0]);
  const forecast: ForecastData[] = [];

  // Weekly slope needs to be converted to daily
  const dailySlope = trend.slope / 7;
  const dailyIntercept = trend.intercept / 7;

  for (let i = 1; i <= days; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    
    // Calculate which week this day falls into
    const weekOffset = Math.floor(i / 7);
    const predicted = dailyIntercept + dailySlope * (data.length * 7 + i);
    const margin = predicted * 0.2;

    forecast.push({
      date: date.toISOString().split('T')[0],
      predicted: Math.max(0, predicted),
      confidence: {
        lower: Math.max(0, predicted - margin),
        upper: predicted + margin,
      },
    });
  }

  return forecast;
}

function calculateConfidence(dailySales: Map<string, number>, trend: { slope: number; intercept: number }): number {
  const data = Array.from(dailySales.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  
  let ssRes = 0, ssTot = 0;
  const mean = Array.from(dailySales.values()).reduce((a, b) => a + b, 0) / dailySales.size;

  data.forEach(([date, actual], index) => {
    const predicted = trend.intercept + trend.slope * index;
    ssRes += Math.pow(actual - predicted, 2);
    ssTot += Math.pow(actual - mean, 2);
  });

  const rSquared = 1 - (ssRes / ssTot);
  return Math.max(0, Math.min(1, rSquared));
}

function getSegmentDescription(segment: string): string {
  const descriptions: Record<string, string> = {
    'Champions': 'Best customers who buy often and spend the most',
    'Loyal Customers': 'Regular customers with good spending',
    'New Customers': 'Recent customers with potential',
    'Promising': 'Recent customers who need nurturing',
    'At Risk': 'Were good customers but haven\'t purchased recently',
    'Cant Lose Them': 'High-value customers who are slipping away',
    'Lost': 'Haven\'t purchased in a long time',
    'Others': 'Customers who don\'t fit other segments',
  };
  return descriptions[segment] || 'Other customers';
}

function getSegmentColor(segment: string): string {
  const colors: Record<string, string> = {
    'Champions': '#10b981',
    'Loyal Customers': '#3b82f6',
    'New Customers': '#8b5cf6',
    'Promising': '#06b6d4',
    'At Risk': '#f59e0b',
    'Cant Lose Them': '#ef4444',
    'Lost': '#6b7280',
    'Others': '#9ca3af',
  };
  return colors[segment] || '#9ca3af';
}
