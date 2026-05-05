import { supabase } from '@/integrations/supabase/client';

// =====================================================
// ORDER STATUS CONSTANTS
// =====================================================

// Valid order statuses that represent completed/successful orders
const COMPLETED_ORDER_STATUSES = [
  'shipped',
  'delivered',
  'completed'
];

// Statuses to exclude from analytics (cancelled, cart, etc.)
const EXCLUDE_ORDER_STATUSES = [
  'cancelled',
  'cart',
  'credit_approval_processing',
  'rejected',
  'voided'
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
    historicalRevenue: number;
    historicalDailyAverage: number;
    includedOrders: number;
    excludedOrders: number;
    totalRowsScanned: number;
    historyStart: string;
    historyEnd: string;
    basis: string;
  };
}

interface ForecastOrderRow {
  id: string;
  created_at?: string | null;
  total_amount?: number | string | null;
  status?: string | null;
  void?: boolean | null;
  deleted_at?: string | null;
  poApproved?: boolean | string | null;
  poAccept?: boolean | string | null;
}

interface ForecastTrend {
  slope: number;
  intercept: number;
  avgRevenue: number;
  residualStdDev: number;
}

function isPurchaseOrderLike(order: Pick<ForecastOrderRow, 'poApproved' | 'poAccept'>): boolean {
  return order.poApproved === true ||
    order.poApproved === 'true' ||
    order.poAccept === false ||
    order.poAccept === 'false';
}

/**
 * Generate sales forecast from completed sales orders only.
 */
export async function generateSalesForecast(
  days: 30 | 60 | 90 = 30
): Promise<SalesForecast> {
  try {
    const historyDays = 90;
    const historyEnd = new Date();
    const historyStart = new Date(historyEnd);
    historyStart.setDate(historyStart.getDate() - historyDays + 1);
    historyStart.setHours(0, 0, 0, 0);

    let rows: ForecastOrderRow[] = [];

    try {
      rows = await fetchAllPages<ForecastOrderRow>((from, to) =>
        supabase
          .from('orders')
          .select('id, created_at, total_amount, status, void, deleted_at, poApproved, poAccept')
          .gte('created_at', historyStart.toISOString())
          .lte('created_at', historyEnd.toISOString())
          .range(from, to)
      );
    } catch (ordersError) {
      console.warn('Sales forecast order query fell back without purchase-order flags:', ordersError);
      rows = await fetchAllPages<ForecastOrderRow>((from, to) =>
        supabase
          .from('orders')
          .select('id, created_at, total_amount, status, void, deleted_at')
          .gte('created_at', historyStart.toISOString())
          .lte('created_at', historyEnd.toISOString())
          .range(from, to)
      );
    }

    const completedSalesOrders = rows.filter((order) => {
      const status = normalizeStatus(order.status);
      const createdAt = new Date(order.created_at || '').getTime();

      return Number.isFinite(createdAt) &&
        order.void !== true &&
        !order.deleted_at &&
        !isPurchaseOrderLike(order) &&
        COMPLETED_ORDER_STATUSES.includes(status);
    });
    const excludedOrders = rows.length - completedSalesOrders.length;

    // Step 1: Build a complete 90-day calendar so quiet days are represented as real zero-sales days.
    const dailySales = buildDailySalesSeries(completedSalesOrders, historyStart, historyEnd);
    const weeklySales = groupDailySalesByWeek(dailySales);
    
    // Step 2: Remove outliers using IQR method
    const cleanedSales = removeOutliers(weeklySales);
    
    // Step 3: Apply exponential smoothing
    const smoothedSales = applyExponentialSmoothing(cleanedSales, 0.3);
    
    // Step 4: Calculate trend on smoothed data
    const trend = calculateTrend(smoothedSales);
    
    // Step 5: Generate forecast from weekly trend, starting tomorrow.
    const forecast = generateForecastDataFromWeekly(smoothedSales, trend, days, historyEnd);
    
    // Step 6: Calculate confidence on smoothed data
    const confidence = calculateConfidence(smoothedSales, trend);
    
    // Calculate growth rate as percentage of average revenue
    const growthRatePercent = trend.avgRevenue > 0
      ? (trend.slope / trend.avgRevenue) * 100
      : 0;
    const historicalRevenue = completedSalesOrders.reduce(
      (sum, order) => sum + Math.max(0, toNumber(order.total_amount)),
      0
    );

    return {
      period: `${days}d` as '30d' | '60d' | '90d',
      forecast,
      trend: trend.slope > 0 ? 'up' : trend.slope < 0 ? 'down' : 'stable',
      confidence,
      summary: {
        expectedRevenue: forecast.reduce((sum, d) => sum + d.predicted, 0),
        growthRate: growthRatePercent,
        historicalRevenue,
        historicalDailyAverage: historicalRevenue / historyDays,
        includedOrders: completedSalesOrders.length,
        excludedOrders,
        totalRowsScanned: rows.length,
        historyStart: historyStart.toISOString(),
        historyEnd: historyEnd.toISOString(),
        basis: `${historyDays} days of completed sales orders`,
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
  sizes: InventorySizePrediction[];
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

interface InventorySizePrediction {
  id: string;
  label: string;
  sizeName?: string | null;
  sizeValue?: string | null;
  sizeUnit?: string | null;
  unitToggle?: boolean;
  sku?: string | null;
  stock: number;
  avgDailySales: number;
  isActive: boolean;
}

interface InventoryProductRow {
  id: string;
  name: string;
  unitToggle?: boolean | null;
  current_stock?: number | string | null;
  reserved_stock?: number | string | null;
  reorder_point?: number | string | null;
  product_sizes?: Array<{
    id: string;
    size_name?: string | null;
    size_value?: number | string | null;
    size_unit?: string | null;
    sku?: string | null;
    stock?: number | string | null;
    is_active?: boolean | null;
    sizeSquanence?: number | string | null;
  }> | null;
}

interface InventoryOrderRow {
  id: string;
  created_at?: string | null;
  status?: string | null;
  void?: boolean | null;
  deleted_at?: string | null;
  poApproved?: boolean | string | null;
  items?: any;
}

interface InventoryOrderItemRow {
  order_id?: string | null;
  product_id?: string | null;
  product_size_id?: string | null;
  quantity?: number | string | null;
}

const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
  buildQuery: (from: number, to: number) => any
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const page = (data || []) as T[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isSalesOrder(order: InventoryOrderRow): boolean {
  const status = String(order.status || '').toLowerCase();
  const isPurchaseOrder = order.poApproved === true || order.poApproved === 'true';

  return !isPurchaseOrder &&
    order.void !== true &&
    !order.deleted_at &&
    !EXCLUDE_ORDER_STATUSES.includes(status);
}

function getProductCurrentStock(product: InventoryProductRow): number {
  const activeSizes = (product.product_sizes || []).filter((size) => size.is_active !== false);

  if (activeSizes.length > 0) {
    return activeSizes.reduce((sum, size) => sum + toNumber(size.stock), 0);
  }

  return toNumber(product.current_stock);
}

function getSizeValueLabel(
  size: NonNullable<InventoryProductRow['product_sizes']>[number],
  showUnit: boolean
): string {
  const sizeValue = String(size.size_value || '').trim();
  const sizeUnit = String(size.size_unit || '').trim();

  return [sizeValue, showUnit ? sizeUnit : ''].filter(Boolean).join(' ').trim();
}

function getSizeLabel(
  size: NonNullable<InventoryProductRow['product_sizes']>[number],
  fallback: string,
  showUnit: boolean
): string {
  const sizeName = String(size.size_name || '').trim();
  const sizePack = getSizeValueLabel(size, showUnit);

  return sizeName || sizePack || fallback;
}

function extractOrderItemsFromJson(order: InventoryOrderRow): InventoryOrderItemRow[] {
  if (!Array.isArray(order.items)) return [];

  return order.items.flatMap((item: any) => {
    const productId = item?.productId || item?.product_id;
    if (!productId) return [];

    const sizes = Array.isArray(item?.sizes) ? item.sizes : [];
    if (sizes.length > 0) {
      return sizes
        .map((size: any) => ({
          order_id: order.id,
          product_id: productId,
          product_size_id: size?.id || size?.product_size_id || null,
          quantity: size?.quantity ?? size?.qty ?? item?.quantity ?? 0,
        }))
        .filter((line: InventoryOrderItemRow) => toNumber(line.quantity) > 0);
    }

    return [{
      order_id: order.id,
      product_id: productId,
      product_size_id: item?.product_size_id || null,
      quantity: item?.quantity ?? item?.qty ?? 0,
    }].filter((line) => toNumber(line.quantity) > 0);
  });
}

/**
 * Predict inventory demand for products
 * Analyzes sales trends and provides AI-powered stock level recommendations
 */
export async function predictInventoryDemand(): Promise<InventoryPrediction[]> {
  try {
    const cutoffDate = new Date(Date.now() - INVENTORY_CONFIG.ANALYSIS_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const products = await fetchAllPages<InventoryProductRow>((from, to) =>
      supabase
        .from('products')
        .select(`
          id,
          name,
          unitToggle,
          current_stock,
          reserved_stock,
          reorder_point,
          product_sizes (
            id,
            size_name,
            size_value,
            size_unit,
            sku,
            stock,
            is_active,
            sizeSquanence
          )
        `)
        .order('name', { ascending: true })
        .range(from, to)
    );

    let orders: InventoryOrderRow[] = [];
    try {
      orders = await fetchAllPages<InventoryOrderRow>((from, to) =>
        supabase
          .from('orders')
          .select('id, created_at, status, void, deleted_at, poApproved, items')
          .gte('created_at', cutoffDate)
          .or('void.eq.false,void.is.null')
          .is('deleted_at', null)
          .range(from, to)
      );
    } catch (ordersError) {
      // Some environments do not expose poApproved in generated metadata.
      // Fall back to the common columns so demand analytics still work.
      console.warn('Inventory demand order query fell back without poApproved:', ordersError);
      orders = await fetchAllPages<InventoryOrderRow>((from, to) =>
        supabase
          .from('orders')
          .select('id, created_at, status, void, deleted_at, items')
          .gte('created_at', cutoffDate)
          .or('void.eq.false,void.is.null')
          .is('deleted_at', null)
          .range(from, to)
      );
    }

    const validOrders = orders.filter(isSalesOrder);
    const validOrderIds = validOrders.map((order) => order.id).filter(Boolean);
    const orderItemsFromTable: InventoryOrderItemRow[] = [];

    for (let i = 0; i < validOrderIds.length; i += 100) {
      const chunk = validOrderIds.slice(i, i + 100);
      const chunkItems = await fetchAllPages<InventoryOrderItemRow>((from, to) =>
        supabase
          .from('order_items')
          .select('order_id, product_id, product_size_id, quantity')
          .in('order_id', chunk)
          .range(from, to)
      );
      orderItemsFromTable.push(...chunkItems);
    }

    const orderIdsWithTableItems = new Set(
      orderItemsFromTable
        .map((item) => item.order_id)
        .filter(Boolean)
    );

    const orderItemsFromJson = validOrders
      .filter((order) => !orderIdsWithTableItems.has(order.id))
      .flatMap(extractOrderItemsFromJson);

    const validOrderItems = [...orderItemsFromTable, ...orderItemsFromJson]
      .filter((item) => item.product_id && toNumber(item.quantity) > 0);

    // Group order items by product
    const productSalesMap = new Map<string, InventoryOrderItemRow[]>();
    validOrderItems.forEach((item) => {
      if (!item.product_id) return;
      if (!productSalesMap.has(item.product_id)) {
        productSalesMap.set(item.product_id, []);
      }
      productSalesMap.get(item.product_id)!.push(item);
    });

    return products.map(product => {
      const orderItems = productSalesMap.get(product.id) || [];
      
      const totalSold = orderItems.reduce((sum, item) => sum + toNumber(item.quantity), 0);
      const avgDailySales = totalSold / INVENTORY_CONFIG.ANALYSIS_PERIOD_DAYS;
      const salesBySizeId = new Map<string, number>();
      orderItems.forEach((item) => {
        if (!item.product_size_id) return;
        salesBySizeId.set(
          item.product_size_id,
          (salesBySizeId.get(item.product_size_id) || 0) + toNumber(item.quantity)
        );
      });
      const sizes = [...(product.product_sizes || [])]
        .sort((a, b) => {
          const sequenceA = toNumber(a.sizeSquanence, Number.MAX_SAFE_INTEGER);
          const sequenceB = toNumber(b.sizeSquanence, Number.MAX_SAFE_INTEGER);
          if (sequenceA !== sequenceB) return sequenceA - sequenceB;
          const showUnit = product.unitToggle === true;
          return getSizeLabel(a, product.name, showUnit).localeCompare(getSizeLabel(b, product.name, showUnit));
        })
        .map((size) => {
          const sold = salesBySizeId.get(size.id) || 0;
          const showUnit = product.unitToggle === true;

          return {
            id: size.id,
            label: getSizeLabel(size, product.name, showUnit),
            sizeName: size.size_name || null,
            sizeValue: size.size_value === null || size.size_value === undefined ? null : String(size.size_value),
            sizeUnit: size.size_unit || null,
            unitToggle: showUnit,
            sku: size.sku || null,
            stock: toNumber(size.stock),
            avgDailySales: Math.round((sold / INVENTORY_CONFIG.ANALYSIS_PERIOD_DAYS) * 100) / 100,
            isActive: size.is_active !== false,
          };
        });
      
      // Calculate available stock from size-level inventory when present.
      const currentStock = getProductCurrentStock(product);
      const reservedStock = toNumber(product.reserved_stock);
      const availableStock = currentStock - reservedStock;
      const isOversold = availableStock < 0;
      
      // Calculate days until stockout
      let daysUntilStockout: number | null = null;
      if (isOversold) {
        daysUntilStockout = 0; // Already out of stock
      } else if (avgDailySales > 0) {
        daysUntilStockout = availableStock / avgDailySales;
      }
      
      // Calculate recommended reorder with lead time and safety stock.
      // product.reorder_point is a stock threshold, not a lead-time value.
      const leadTime = INVENTORY_CONFIG.DEFAULT_LEAD_TIME_DAYS;
      const reorderPeriod = leadTime + INVENTORY_CONFIG.SAFETY_STOCK_DAYS;
      const baseReorder = Math.ceil(avgDailySales * reorderPeriod);
      const reorderPoint = toNumber(product.reorder_point);
      const recommendedReorder = Math.max(baseReorder, reorderPoint, avgDailySales > 0 ? 1 : 0);
      
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
      const stockHealthPercent = currentStock > 0
        ? Math.round((availableStock / currentStock) * 100)
        : 0;

      return {
        productId: product.id,
        productName: product.name,
        sizes,
        currentStock,
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
    }); // Show ALL products, no filtering
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
  dropoffCount: number;
}

export interface FunnelData {
  steps: FunnelStep[];
  overallConversion: number;
  biggestDropoff: string;
  biggestDropoffCount: number;
  creditApprovalPending?: number;
  cancelledOrRejected: number;
  excludedOrders: number;
  analysisStart: string;
  analysisEnd: string;
  totalRowsScanned: number;
}

interface FunnelOrderRow {
  id: string;
  status?: string | null;
  created_at?: string | null;
  void?: boolean | null;
  deleted_at?: string | null;
  poApproved?: boolean | string | null;
}

const FUNNEL_BLOCKED_STATUSES = ['cancelled', 'rejected', 'voided', 'credit_approval_processing'];
const FUNNEL_READY_STATUSES = ['new', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed'];
const FUNNEL_PROCESSING_STATUSES = ['processing', 'shipped', 'delivered', 'completed'];

function normalizeStatus(status: unknown): string {
  return String(status || '').trim().toLowerCase();
}

function isPurchaseOrderRow(order: Pick<FunnelOrderRow, 'poApproved'>): boolean {
  return order.poApproved === true || order.poApproved === 'true';
}

function buildFunnelStep(name: string, count: number, previousCount: number | null, totalOrders: number): FunnelStep {
  const dropoffCount = previousCount === null ? 0 : Math.max(0, previousCount - count);

  return {
    name,
    count,
    percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0,
    dropoff: previousCount && previousCount > 0 ? (dropoffCount / previousCount) * 100 : 0,
    dropoffCount,
  };
}

export async function generateFunnelAnalysis(
  startDate: Date,
  endDate: Date
): Promise<FunnelData> {
  try {
    const queryStart = startDate.toISOString();
    const queryEnd = endDate.toISOString();
    let rows: FunnelOrderRow[] = [];

    try {
      rows = await fetchAllPages<FunnelOrderRow>((from, to) =>
        supabase
          .from('orders')
          .select('id, status, created_at, void, deleted_at, poApproved')
          .gte('created_at', queryStart)
          .lte('created_at', queryEnd)
          .range(from, to)
      );
    } catch (ordersError) {
      console.warn('Funnel analysis order query fell back without poApproved:', ordersError);
      rows = await fetchAllPages<FunnelOrderRow>((from, to) =>
        supabase
          .from('orders')
          .select('id, status, created_at, void, deleted_at')
          .gte('created_at', queryStart)
          .lte('created_at', queryEnd)
          .range(from, to)
      );
    }

    const usableRows = rows.filter((order) =>
      order.void !== true &&
      !order.deleted_at &&
      !isPurchaseOrderRow(order)
    );
    const salesOrders = usableRows.filter((order) => normalizeStatus(order.status) !== 'cart');
    const excludedOrders = rows.length - salesOrders.length;

    const ordersCreated = salesOrders.length;
    const creditApprovalPending = salesOrders.filter(
      (order) => normalizeStatus(order.status) === 'credit_approval_processing'
    ).length;
    const cancelledOrRejected = salesOrders.filter((order) =>
      ['cancelled', 'rejected', 'voided'].includes(normalizeStatus(order.status))
    ).length;
    const readyForProcessing = salesOrders.filter((order) => {
      const status = normalizeStatus(order.status);
      return FUNNEL_READY_STATUSES.includes(status) && !FUNNEL_BLOCKED_STATUSES.includes(status);
    }).length;
    const processingStarted = salesOrders.filter((order) =>
      FUNNEL_PROCESSING_STATUSES.includes(normalizeStatus(order.status))
    ).length;
    const fulfilled = salesOrders.filter((order) =>
      COMPLETED_ORDER_STATUSES.includes(normalizeStatus(order.status))
    ).length;

    const steps: FunnelStep[] = [
      buildFunnelStep('Orders Created', ordersCreated, null, ordersCreated),
      buildFunnelStep('Ready for Processing', readyForProcessing, ordersCreated, ordersCreated),
      buildFunnelStep('Processing Started', processingStarted, readyForProcessing, ordersCreated),
      buildFunnelStep('Fulfilled', fulfilled, processingStarted, ordersCreated),
    ];

    const biggestDropoff = steps.reduce((max, step) => 
      step.dropoff > max.dropoff ? step : max
    , steps[0]);

    return {
      steps,
      overallConversion: ordersCreated > 0 ? (fulfilled / ordersCreated) * 100 : 0,
      biggestDropoff: biggestDropoff.dropoff > 0 ? biggestDropoff.name : 'No dropoff',
      biggestDropoffCount: biggestDropoff.dropoffCount,
      creditApprovalPending,
      cancelledOrRejected,
      excludedOrders,
      analysisStart: queryStart,
      analysisEnd: queryEnd,
      totalRowsScanned: rows.length,
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
  avgRecencyDays: number;
  avgFrequency: number;
  avgOrderValue: number;
  color: string;
}

export interface RFMData {
  segments: RFMSegment[];
  totalCustomers: number;
  totalCompletedOrders: number;
  totalValue: number;
  ordersScanned: number;
  excludedOrders: number;
  generatedAt: string;
}

interface RFMOrderRow {
  id: string;
  profile_id?: string | null;
  created_at?: string | null;
  total_amount?: number | string | null;
  status?: string | null;
  void?: boolean | null;
  deleted_at?: string | null;
  poApproved?: boolean | string | null;
  poAccept?: boolean | string | null;
}

interface RFMCustomerScore {
  customerId: string;
  recency: number;
  frequency: number;
  monetary: number;
  avgOrderValue: number;
  rScore: number;
  fScore: number;
  mScore: number;
  segment: string;
}

function isPurchaseOrderAnalyticsRow(order: Pick<RFMOrderRow, 'poApproved' | 'poAccept'>): boolean {
  return order.poApproved === true ||
    order.poApproved === 'true' ||
    order.poAccept === false ||
    order.poAccept === 'false';
}

function getRFMScore(value: number, sortedAscending: number[], higherIsBetter: boolean): number {
  if (sortedAscending.length <= 1) return 5;

  const betterOrEqualCount = sortedAscending.filter((candidate) =>
    higherIsBetter ? candidate <= value : candidate >= value
  ).length;
  const percentile = betterOrEqualCount / sortedAscending.length;

  if (percentile >= 0.8) return 5;
  if (percentile >= 0.6) return 4;
  if (percentile >= 0.4) return 3;
  if (percentile >= 0.2) return 2;
  return 1;
}

export async function generateRFMAnalysis(): Promise<RFMData> {
  try {
    let orders: RFMOrderRow[] = [];

    try {
      orders = await fetchAllPages<RFMOrderRow>((from, to) =>
        supabase
          .from('orders')
          .select('id, profile_id, created_at, total_amount, status, void, deleted_at, poApproved, poAccept')
          .range(from, to)
      );
    } catch (ordersError) {
      console.warn('RFM order query fell back without purchase-order flags:', ordersError);
      orders = await fetchAllPages<RFMOrderRow>((from, to) =>
        supabase
          .from('orders')
          .select('id, profile_id, created_at, total_amount, status, void, deleted_at')
          .range(from, to)
      );
    }

    const now = new Date();
    const completedSalesOrders = orders.filter((order) => {
      const status = normalizeStatus(order.status);
      return Boolean(order.profile_id) &&
        order.void !== true &&
        !order.deleted_at &&
        !isPurchaseOrderAnalyticsRow(order) &&
        COMPLETED_ORDER_STATUSES.includes(status);
    });
    const excludedOrders = orders.length - completedSalesOrders.length;
    const ordersByCustomer = new Map<string, RFMOrderRow[]>();

    completedSalesOrders.forEach((order) => {
      const customerId = order.profile_id;
      if (!customerId) return;
      if (!ordersByCustomer.has(customerId)) {
        ordersByCustomer.set(customerId, []);
      }
      ordersByCustomer.get(customerId)!.push(order);
    });

    const baseScores = Array.from(ordersByCustomer.entries()).map(([customerId, customerOrders]) => {
      const validOrderDates = customerOrders
        .map((order) => new Date(order.created_at || '').getTime())
        .filter(Number.isFinite);
      const lastOrderDate = new Date(Math.max(...validOrderDates));
      const recency = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      const frequency = customerOrders.length;
      const monetary = customerOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0);

      return {
        customerId,
        recency,
        frequency,
        monetary,
        avgOrderValue: frequency > 0 ? monetary / frequency : 0,
      };
    }).filter((customer) => Number.isFinite(customer.recency));

    const recencies = baseScores.map((score) => score.recency).sort((a, b) => a - b);
    const frequencies = baseScores.map((score) => score.frequency).sort((a, b) => a - b);
    const monetaries = baseScores.map((score) => score.monetary).sort((a, b) => a - b);

    const scoredCustomers: RFMCustomerScore[] = baseScores.map((customer) => {
      const rScore = getRFMScore(customer.recency, recencies, false);
      const fScore = getRFMScore(customer.frequency, frequencies, true);
      const mScore = getRFMScore(customer.monetary, monetaries, true);
      
      let segment = '';
      if (rScore >= 4 && fScore >= 4 && mScore >= 4) segment = 'Champions';
      else if (rScore >= 3 && fScore >= 4 && mScore >= 3) segment = 'Loyal Customers';
      else if (rScore >= 4 && fScore <= 2) segment = 'New Customers';
      else if (rScore >= 3 && fScore <= 2) segment = 'Promising';
      else if (rScore <= 2 && fScore >= 3) segment = 'At Risk';
      else if (rScore <= 2 && fScore <= 2 && mScore >= 4) segment = "Can't Lose Them";
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
    scoredCustomers.forEach((customer) => {
      if (!segments.has(customer.segment)) {
        segments.set(customer.segment, []);
      }
      segments.get(customer.segment)!.push(customer);
    });

    const segmentData: RFMSegment[] = Array.from(segments.entries()).map(([segment, customers]) => {
      const totalValue = customers.reduce((sum, c) => sum + c!.monetary, 0);
      const totalFrequency = customers.reduce((sum, c) => sum + c!.frequency, 0);
      const totalRecency = customers.reduce((sum, c) => sum + c!.recency, 0);
      return {
        segment,
        description: getSegmentDescription(segment),
        count: customers.length,
        totalValue,
        avgValue: totalValue / customers.length,
        avgRecencyDays: totalRecency / customers.length,
        avgFrequency: totalFrequency / customers.length,
        avgOrderValue: totalFrequency > 0 ? totalValue / totalFrequency : 0,
        color: getSegmentColor(segment),
      };
    });
    const totalValue = completedSalesOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0);

    return {
      segments: segmentData.sort((a, b) => b.totalValue - a.totalValue),
      totalCustomers: baseScores.length,
      totalCompletedOrders: completedSalesOrders.length,
      totalValue,
      ordersScanned: orders.length,
      excludedOrders,
      generatedAt: now.toISOString(),
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
      supabase.from('order_items').select('quantity, unit_price, product_size_id, orders!inner(status, void, deleted_at)'),
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
    const customerAcquisitionCost = newCustomers > 0 ? totalExpenses / newCustomers : 0;
    
    // ===== AVERAGE ORDER VALUE =====
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    
    // Filter completed order items (needed for multiple calculations)
    const completedOrderItems = orderItems.filter(item => {
      const order = (item as any).orders;
      return order && COMPLETED_ORDER_STATUSES.includes(order.status);
    });
    
    // ===== GROSS MARGIN =====
    // Calculate COGS from product size cost_price for sold items.
    // If a size has no cost_price, fall back to unit_price to avoid overstatement.
    const sizeIds = Array.from(
      new Set(
        completedOrderItems
          .map((item: any) => item.product_size_id)
          .filter(Boolean)
      )
    );
    const sizeCostMap = await fetchSizeCostMap(sizeIds as string[]);
    const totalCOGS = completedOrderItems.reduce((sum, item: any) => {
      const quantity = Number(item.quantity) || 0;
      const fallbackUnitPrice = Number(item.unit_price) || 0;
      const sizeCost = item.product_size_id ? sizeCostMap.get(item.product_size_id) : undefined;
      const unitCost = typeof sizeCost === 'number' && sizeCost > 0 ? sizeCost : fallbackUnitPrice;
      return sum + (quantity * unitCost);
    }, 0);
    const grossMargin = totalRevenue > 0
      ? ((totalRevenue - totalCOGS) / totalRevenue) * 100
      : 0;
    
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

async function fetchSizeCostMap(sizeIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!sizeIds.length) return map;

  // Chunk IDs to avoid oversized IN queries
  const chunkSize = 500;
  for (let i = 0; i < sizeIds.length; i += chunkSize) {
    const chunk = sizeIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('product_sizes')
      .select('id, cost_price')
      .in('id', chunk);

    if (error) {
      console.error('Error fetching product size costs:', error);
      continue;
    }

    (data || []).forEach((size: any) => {
      map.set(size.id, Number(size.cost_price) || 0);
    });
  }

  return map;
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

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function buildDailySalesSeries(
  orders: ForecastOrderRow[],
  startDate: Date,
  endDate: Date
): Map<string, number> {
  const grouped = new Map<string, number>();
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    grouped.set(getDateKey(current), 0);
    current.setDate(current.getDate() + 1);
  }

  orders.forEach((order) => {
    const date = new Date(order.created_at || '');
    if (!Number.isFinite(date.getTime())) return;

    const dateKey = getDateKey(date);
    if (!grouped.has(dateKey)) return;

    grouped.set(dateKey, (grouped.get(dateKey) || 0) + Math.max(0, toNumber(order.total_amount)));
  });

  return grouped;
}

function groupDailySalesByWeek(dailySales: Map<string, number>): Map<string, number> {
  const grouped = new Map<string, number>();

  dailySales.forEach((amount, dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`);
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    const weekKey = getDateKey(monday);

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

function calculateTrend(dailySales: Map<string, number>): ForecastTrend {
  const data = Array.from(dailySales.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const n = data.length;
  
  if (n < 2) return { slope: 0, intercept: 0, avgRevenue: 0, residualStdDev: 0 };

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
  const residualVariance = data.reduce((sum, [, value], index) => {
    const predicted = Math.max(0, intercept + slope * index);
    return sum + Math.pow(value - predicted, 2);
  }, 0) / Math.max(1, n - 2);
  const residualStdDev = Math.sqrt(residualVariance);

  return { slope, intercept, avgRevenue, residualStdDev };
}

function generateForecastData(
  dailySales: Map<string, number>,
  trend: ForecastTrend,
  days: number
): ForecastData[] {
  const data = Array.from(dailySales.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const lastDate = new Date(data[data.length - 1][0]);
  const forecast: ForecastData[] = [];

  for (let i = 1; i <= days; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    
    const rawPrediction = trend.intercept + trend.slope * (data.length + i);
    const predicted = Math.max(0, rawPrediction);
    const margin = Math.max(predicted * 0.2, trend.residualStdDev);

    forecast.push({
      date: date.toISOString().split('T')[0],
      predicted,
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
  trend: ForecastTrend,
  days: number,
  forecastStartDate: Date = new Date()
): ForecastData[] {
  const data = Array.from(weeklySales.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const forecast: ForecastData[] = [];

  for (let i = 1; i <= days; i++) {
    const date = new Date(forecastStartDate);
    date.setDate(date.getDate() + i);
    
    // Calculate which week this day falls into
    const weekOffset = Math.floor((i - 1) / 7);
    const weeklyPrediction = trend.intercept + trend.slope * (data.length + weekOffset);
    const predicted = Math.max(0, weeklyPrediction / 7);
    const dailyResidual = trend.residualStdDev / 7;
    const margin = Math.max(predicted * 0.2, dailyResidual);

    forecast.push({
      date: date.toISOString().split('T')[0],
      predicted,
      confidence: {
        lower: Math.max(0, predicted - margin),
        upper: predicted + margin,
      },
    });
  }

  return forecast;
}

function calculateConfidence(dailySales: Map<string, number>, trend: ForecastTrend): number {
  const data = Array.from(dailySales.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (data.length < 3) return 0;
  
  let ssRes = 0, ssTot = 0;
  const mean = Array.from(dailySales.values()).reduce((a, b) => a + b, 0) / dailySales.size;
  const activePeriods = data.filter(([, value]) => value > 0).length;

  data.forEach(([date, actual], index) => {
    const predicted = Math.max(0, trend.intercept + trend.slope * index);
    ssRes += Math.pow(actual - predicted, 2);
    ssTot += Math.pow(actual - mean, 2);
  });

  if (ssTot === 0) {
    return mean > 0 ? Math.min(1, activePeriods / 8) : 0;
  }

  const rSquared = 1 - (ssRes / ssTot);
  const activePeriodCoverage = Math.min(1, activePeriods / 8);
  return Math.max(0, Math.min(1, rSquared * activePeriodCoverage));
}

function getSegmentDescription(segment: string): string {
  const descriptions: Record<string, string> = {
    'Champions': 'Best customers who buy often and spend the most',
    'Loyal Customers': 'Regular customers with good spending',
    'New Customers': 'Recent customers with potential',
    'Promising': 'Recent customers who need nurturing',
    'At Risk': 'Bought often before, but not recently',
    "Can't Lose Them": 'High-value customers who are slipping away',
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
    "Can't Lose Them": '#ef4444',
    'Lost': '#6b7280',
    'Others': '#9ca3af',
  };
  return colors[segment] || '#9ca3af';
}
