import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { predictInventoryDemand } from "@/services/analyticsService";
import {
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  CheckCircle2,
  Download,
  Package,
  Search,
} from "lucide-react";

interface InventoryPrediction {
  productId: string;
  productName: string;
  sizes?: InventoryProductSize[];
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  avgDailySales: number;
  daysUntilStockout: number | null;
  recommendedReorder: number;
  urgency: "critical" | "high" | "medium" | "low" | "no_data";
  leadTimeDays: number;
  hasSalesData: boolean;
  isOversold?: boolean;
  stockHealthPercent?: number;
}

interface InventoryProductSize {
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

interface SizeSalesInsight extends InventoryProductSize {
  daysCovered: number | null;
  reorderQty: number;
}

interface ProductSizeSalesInsight extends SizeSalesInsight {
  productId: string;
  productName: string;
  leadTimeDays: number;
}

type SortMode = "urgency" | "coverage" | "stock" | "sales";
type FilterValue = "all" | InventoryPrediction["urgency"];
type SizeFilterValue = Exclude<FilterValue, "all">;

const urgencyOrder: Record<InventoryPrediction["urgency"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  no_data: 4,
};

const filterOptions: Array<{ value: FilterValue; label: string }> = [
  { value: "all", label: "All Products" },
  { value: "critical", label: "Order now" },
  { value: "high", label: "Order soon" },
  { value: "medium", label: "Watch" },
  { value: "low", label: "Stock OK" },
  { value: "no_data", label: "No sales" },
];

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const formatNumber = (value: number) => numberFormatter.format(Math.round(value || 0));
const formatDailyUnits = (value: number) => {
  const dailySales = Math.max(0, value || 0);
  if (dailySales > 0 && dailySales < 1) return "<1 unit/day";

  const roundedSales = Math.round(dailySales);
  return `${formatNumber(roundedSales)} unit${roundedSales === 1 ? "" : "s"}/day`;
};

const getSizeValueLabel = (size: InventoryProductSize) => {
  const sizeValue = String(size.sizeValue || "").trim();
  const sizeUnit = String(size.sizeUnit || "").trim();

  return [sizeValue, size.unitToggle ? sizeUnit : ""].filter(Boolean).join(" ").trim();
};

const getSizePrimaryLabel = (size: InventoryProductSize) => {
  const sizeName = String(size.sizeName || "").trim();
  return sizeName || getSizeValueLabel(size) || size.label;
};

const getSizeSecondaryLabel = (size: InventoryProductSize) => {
  const sizeName = String(size.sizeName || "").trim();
  if (!sizeName) return "";

  return getSizeValueLabel(size);
};

const getSizeDisplayLabel = (size: InventoryProductSize) => {
  const primary = getSizePrimaryLabel(size);
  const secondary = getSizeSecondaryLabel(size);

  return secondary ? `${primary} - ${secondary}` : primary;
};

const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
};

const getActionMeta = (prediction: InventoryPrediction) => {
  if (prediction.isOversold) {
    return {
      label: "Oversold",
      tone: "critical",
      badgeClass: "bg-red-700 text-white",
      borderClass: "border-red-300",
      bgClass: "bg-red-50",
      textClass: "text-red-700",
      barClass: "bg-red-600",
    };
  }

  switch (prediction.urgency) {
    case "critical":
      return {
        label: "Order now",
        tone: "critical",
        badgeClass: "bg-red-600 text-white",
        borderClass: "border-red-300",
        bgClass: "bg-red-50",
        textClass: "text-red-700",
        barClass: "bg-red-500",
      };
    case "high":
      return {
        label: "Order soon",
        tone: "warning",
        badgeClass: "bg-orange-600 text-white",
        borderClass: "border-orange-300",
        bgClass: "bg-orange-50",
        textClass: "text-orange-700",
        barClass: "bg-orange-500",
      };
    case "medium":
      return {
        label: "Watch",
        tone: "plan",
        badgeClass: "bg-amber-500 text-white",
        borderClass: "border-amber-300",
        bgClass: "bg-amber-50",
        textClass: "text-amber-700",
        barClass: "bg-amber-500",
      };
    case "no_data":
      return {
        label: "No sales",
        tone: "neutral",
        badgeClass: "border border-slate-200 bg-slate-100 text-slate-700",
        borderClass: "border-slate-200",
        bgClass: "bg-white",
        textClass: "text-slate-600",
        barClass: "bg-slate-300",
      };
    default:
      return {
        label: "Stock OK",
        tone: "healthy",
        badgeClass: "bg-emerald-100 text-emerald-700",
        borderClass: "border-slate-200",
        bgClass: "bg-white",
        textClass: "text-emerald-700",
        barClass: "bg-emerald-500",
      };
  }
};

const getSizeSalesInsights = (prediction: InventoryPrediction): SizeSalesInsight[] => {
  const targetCoverageDays = prediction.leadTimeDays + 7;

  return (prediction.sizes || [])
    .filter((size) => size.isActive && size.avgDailySales > 0)
    .map((size) => {
      const daysCovered = size.avgDailySales > 0 ? size.stock / size.avgDailySales : null;
      const targetStock = Math.ceil(size.avgDailySales * targetCoverageDays);

      return {
        ...size,
        daysCovered,
        reorderQty: Math.max(0, targetStock - size.stock),
      };
    })
    .sort((a, b) => {
      if (a.reorderQty > 0 && b.reorderQty === 0) return -1;
      if (a.reorderQty === 0 && b.reorderQty > 0) return 1;
      return b.avgDailySales - a.avgDailySales;
    });
};

const getSizeInsight = (
  prediction: InventoryPrediction,
  size: InventoryProductSize
): SizeSalesInsight | null => {
  if (!size.isActive || size.avgDailySales <= 0) return null;

  const targetCoverageDays = prediction.leadTimeDays + 7;
  const daysCovered = size.stock / size.avgDailySales;
  const targetStock = Math.ceil(size.avgDailySales * targetCoverageDays);

  return {
    ...size,
    daysCovered,
    reorderQty: Math.max(0, targetStock - size.stock),
  };
};

const getSizeFilterValue = (
  prediction: InventoryPrediction,
  size: InventoryProductSize
): SizeFilterValue | null => {
  if (!size.isActive) return null;
  const insight = getSizeInsight(prediction, size);

  if (!insight) return "no_data";
  if (insight.reorderQty > 0 && insight.daysCovered !== null && insight.daysCovered <= prediction.leadTimeDays) {
    return "critical";
  }
  if (insight.reorderQty > 0) return "high";
  if (insight.daysCovered !== null && insight.daysCovered <= prediction.leadTimeDays + 21) return "medium";

  return "low";
};

const getFilteredSizes = (
  prediction: InventoryPrediction,
  filterValue: FilterValue
): InventoryProductSize[] => {
  const activeSizes = (prediction.sizes || []).filter((size) => size.isActive);
  if (filterValue === "all") return activeSizes;

  return activeSizes.filter((size) => getSizeFilterValue(prediction, size) === filterValue);
};

const getFilteredSizeInsights = (
  prediction: InventoryPrediction,
  filterValue: FilterValue
): SizeSalesInsight[] => {
  return getFilteredSizes(prediction, filterValue)
    .map((size) => getSizeInsight(prediction, size))
    .filter((size): size is SizeSalesInsight => Boolean(size))
    .sort((a, b) => {
      if (a.reorderQty > 0 && b.reorderQty === 0) return -1;
      if (a.reorderQty === 0 && b.reorderQty > 0) return 1;
      return b.avgDailySales - a.avgDailySales;
    });
};

export function InventoryDemandPredictor() {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState<InventoryPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUrgency, setFilterUrgency] = useState<FilterValue>("all");
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("urgency");
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const data = await predictInventoryDemand();
      setPredictions(data);
    } catch (error) {
      console.error("Error loading predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const sizeSummary = useMemo(() => {
    const activeSizes = predictions.flatMap((prediction) =>
      (prediction.sizes || []).filter((size) => size.isActive)
    );
    const sellingSizes: ProductSizeSalesInsight[] = predictions.flatMap((prediction) =>
      getSizeSalesInsights(prediction).map((size) => ({
        ...size,
        productId: prediction.productId,
        productName: prediction.productName,
        leadTimeDays: prediction.leadTimeDays,
      }))
    );

    const orderNow = sellingSizes.filter(
      (size) => size.reorderQty > 0 && size.daysCovered !== null && size.daysCovered <= size.leadTimeDays
    );
    const reorderSoon = sellingSizes.filter(
      (size) => size.reorderQty > 0 && (size.daysCovered === null || size.daysCovered > size.leadTimeDays)
    );
    const plan = sellingSizes.filter(
      (size) =>
        size.reorderQty === 0 &&
        size.daysCovered !== null &&
        size.daysCovered <= size.leadTimeDays + 21
    );
    const healthy = sellingSizes.filter(
      (size) =>
        size.reorderQty === 0 &&
        (size.daysCovered === null || size.daysCovered > size.leadTimeDays + 21)
    );
    const noSales = activeSizes.filter((size) => (size.avgDailySales || 0) <= 0);
    const reorderSizes = [...orderNow, ...reorderSoon].sort((a, b) => {
      if (b.reorderQty !== a.reorderQty) return b.reorderQty - a.reorderQty;
      return b.avgDailySales - a.avgDailySales;
    });
    const fastestSellingSize = [...sellingSizes].sort((a, b) => b.avgDailySales - a.avgDailySales)[0] || null;

    return {
      monitored: activeSizes.length,
      orderNow: orderNow.length,
      reorderSoon: reorderSoon.length,
      plan: plan.length,
      healthy: healthy.length,
      noSales: noSales.length,
      firstReorderSize: reorderSizes[0] || null,
      fastestSellingSize,
    };
  }, [predictions]);

  const filteredPredictions = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return predictions
      .filter((prediction) => {
        const matchesSearch = !search || prediction.productName.toLowerCase().includes(search);
        const matchesFilter =
          filterUrgency === "all" || getFilteredSizes(prediction, filterUrgency).length > 0;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (sortBy === "stock") return a.availableStock - b.availableStock;
        if (sortBy === "sales") return b.avgDailySales - a.avgDailySales;
        if (sortBy === "coverage") {
          if (a.daysUntilStockout === null) return 1;
          if (b.daysUntilStockout === null) return -1;
          return a.daysUntilStockout - b.daysUntilStockout;
        }

        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        if (a.daysUntilStockout === null) return 1;
        if (b.daysUntilStockout === null) return -1;
        return a.daysUntilStockout - b.daysUntilStockout;
      });
  }, [filterUrgency, predictions, searchTerm, sortBy]);

  const displayedPredictions = showAll ? filteredPredictions : filteredPredictions.slice(0, 10);
  const sizeActionCount = sizeSummary.orderNow + sizeSummary.reorderSoon;

  const toggleProductSizes = (productId: string) => {
    setExpandedProductIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const exportToCSV = () => {
    const headers = [
      "Product Name",
      "Action",
      "Current Stock",
      "Reserved",
      "Available",
      "Avg Daily Sales",
      "Days Covered",
      "Suggested Reorder",
      "Lead Time",
      "Sizes",
    ];
    const rows = filteredPredictions.map((prediction) => [
      prediction.productName,
      getActionMeta(prediction).label,
      prediction.currentStock,
      prediction.reservedStock,
      prediction.availableStock,
      prediction.avgDailySales,
      prediction.daysUntilStockout ?? "N/A",
      prediction.recommendedReorder,
      prediction.leadTimeDays,
      (prediction.sizes || [])
        .map((size) => `${getSizeDisplayLabel(size)}: ${formatNumber(size.stock)} in stock`)
        .join("; "),
    ]);

    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-restock-plan-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-slate-950">Inventory Demand Prediction</h3>
                <p className="truncate text-xs text-slate-600">
                  Restock recommendations from recent valid sales, available stock, and lead time
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                {formatNumber(sizeSummary.monitored)} products monitored
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={predictions.length === 0}
                className="h-9 gap-2 border-slate-300 bg-white text-slate-950 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export Plan
              </Button>
            </div>
          </div>

          <div className="grid gap-3 bg-slate-50 p-3 xl:grid-cols-[minmax(260px,1fr)_520px]">
            <div
              className={`flex min-h-[92px] items-center gap-3 rounded-lg border p-3 ${
                sizeActionCount > 0 ? "border-orange-200 bg-orange-50" : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                sizeActionCount > 0 ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                {sizeActionCount > 0 ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-950">
                  {sizeActionCount > 0
                    ? `${formatNumber(sizeActionCount)} product${sizeActionCount === 1 ? "" : "s"} need reorder`
                    : "No product restocks needed right now"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {sizeSummary.firstReorderSize
                    ? `Start with ${getSizeDisplayLabel(sizeSummary.firstReorderSize)} in ${sizeSummary.firstReorderSize.productName}: reorder ${formatNumber(sizeSummary.firstReorderSize.reorderQty)}.`
                    : sizeSummary.fastestSellingSize
                      ? `Fastest seller is ${getSizeDisplayLabel(sizeSummary.fastestSellingSize)} in ${sizeSummary.fastestSellingSize.productName} at ${formatDailyUnits(sizeSummary.fastestSellingSize.avgDailySales)}.`
                      : "Products without recent sales are grouped separately."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                {
                  label: "Order now",
                  helper: "Need purchase today",
                  value: sizeSummary.orderNow,
                  className: "text-red-600",
                  cardClass: "border-red-100 bg-red-50/40",
                },
                {
                  label: "Order soon",
                  helper: "Add to next PO",
                  value: sizeSummary.reorderSoon,
                  className: "text-orange-600",
                  cardClass: "border-orange-100 bg-orange-50/40",
                },
                {
                  label: "Watch",
                  helper: "Check weekly",
                  value: sizeSummary.plan,
                  className: "text-amber-600",
                  cardClass: "border-amber-100 bg-amber-50/40",
                },
                {
                  label: "Stock OK",
                  helper: "No action",
                  value: sizeSummary.healthy,
                  className: "text-emerald-600",
                  cardClass: "border-emerald-100 bg-emerald-50/40",
                },
              ].map((item) => (
                <div key={item.label} className={`rounded-lg border p-3 shadow-sm ${item.cardClass}`}>
                  <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${item.className}`}>{formatNumber(item.value)}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{item.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_220px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            {/* <label className="relative block">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortMode)}
                className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="urgency">Action first</option>
                <option value="coverage">Least days covered</option>
                <option value="sales">Fastest sales</option>
                <option value="stock">Lowest stock</option>
              </select>
            </label> */}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {filterOptions.map((option) => {
              const count =
                option.value === "all"
                  ? sizeSummary.monitored
                  : option.value === "critical"
                    ? sizeSummary.orderNow
                    : option.value === "high"
                      ? sizeSummary.reorderSoon
                      : option.value === "medium"
                        ? sizeSummary.plan
                        : option.value === "low"
                          ? sizeSummary.healthy
                          : sizeSummary.noSales;

              return (
                <Button
                  key={option.value}
                  variant={filterUrgency === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFilterUrgency(option.value);
                    setShowAll(false);
                  }}
                  className="h-8 shrink-0 whitespace-nowrap rounded-full px-3"
                >
                  {option.label} <span className="ml-1 opacity-75">{formatNumber(count)}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          {displayedPredictions.map((prediction) => {
            const action = getActionMeta(prediction);
            const visibleSizes = getFilteredSizes(prediction, filterUrgency);
            const isExpanded = expandedProductIds.has(prediction.productId);
            const sizeSalesInsights = getFilteredSizeInsights(prediction, filterUrgency);
            const topSizeSalesInsights = sizeSalesInsights.slice(0, 3);
            const topSellingSize = topSizeSalesInsights[0];
            const reorderSizeInsights = sizeSalesInsights.filter((size) => size.reorderQty > 0);
            const firstReorderSize = reorderSizeInsights[0];
            const noSalesPreviewSizes = visibleSizes
              .filter((size) => (size.avgDailySales || 0) <= 0)
              .slice(0, 3);
            const activeFilter = filterOptions.find((option) => option.value === filterUrgency);
            const cardBadgeLabel = filterUrgency === "all" ? action.label : activeFilter?.label || action.label;

            return (
              <div
                key={prediction.productId}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${action.borderClass}`}
              >
                <div className="p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={action.badgeClass}>{cardBadgeLabel}</Badge>
                        {prediction.reservedStock > 0 && (
                          <Badge variant="outline" className="text-orange-700">
                            {formatNumber(prediction.reservedStock)} reserved
                          </Badge>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/product/${prediction.productId}`)}
                        className="mt-2 block max-w-full truncate text-left text-base font-semibold text-slate-950 hover:text-blue-700"
                      >
                        {prediction.productName}
                      </button>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          Total stock: {formatNumber(prediction.currentStock)}
                        </span>
                        {topSellingSize && (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                            Best seller: {getSizeDisplayLabel(topSellingSize)} ({formatDailyUnits(topSellingSize.avgDailySales)})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-[320px]">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Available</p>
                        <p className={`mt-1 text-lg font-bold ${
                          prediction.availableStock < 0 ? "text-red-700" : "text-slate-950"
                        }`}>
                          {formatNumber(prediction.availableStock)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Avg sold/day</p>
                        <p className="mt-1 text-base font-bold text-slate-950">
                          {formatDailyUnits(prediction.avgDailySales)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`mt-3 grid gap-3 rounded-lg p-3 lg:grid-cols-[260px_minmax(0,1fr)] ${action.bgClass}`}>
                    <div className="rounded-lg bg-white/80 p-3 shadow-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Product reorder priority
                        </p>
                        <p className={`mt-1 text-lg font-bold ${firstReorderSize ? "text-orange-700" : action.textClass}`}>
                          {firstReorderSize
                            ? `${formatNumber(reorderSizeInsights.length)} product${reorderSizeInsights.length === 1 ? "" : "s"} need reorder`
                            : "No product reorder needed"}
                        </p>
                      </div>
                      <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs">
                        <p className="text-slate-500">
                          {firstReorderSize ? "Recommended first" : "Fastest selling size"}
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {firstReorderSize
                            ? `${getSizeDisplayLabel(firstReorderSize)} - reorder ${formatNumber(firstReorderSize.reorderQty)}`
                            : topSellingSize
                              ? `${getSizeDisplayLabel(topSellingSize)} (${formatDailyUnits(topSellingSize.avgDailySales)})`
                              : noSalesPreviewSizes[0]
                                ? `${getSizeDisplayLabel(noSalesPreviewSizes[0])} has no valid sales yet`
                                : "No product sales in this filter"}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          Sorted by reorder need
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          Then units/day
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Top sales products
                        </p>
                        {/* TODO */}
                        {/* {(topSizeSalesInsights.length > 0 || noSalesPreviewSizes.length > 0) && (
                          <p className="text-xs text-slate-500">Showing {activeFilter?.label.toLowerCase() || "matching"}</p>
                        )} */}
                      </div>
                      {topSizeSalesInsights.length > 0 ? (
                        <div className="grid gap-2 md:grid-cols-3">
                          {topSizeSalesInsights.map((size) => (
                            <div key={size.id} className="rounded-lg bg-white p-3 text-xs shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {getSizePrimaryLabel(size)}
                                  </p>
                                  {getSizeSecondaryLabel(size) && (
                                    <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                                      {getSizeSecondaryLabel(size)}
                                    </p>
                                  )}
                                  <p className="mt-1 text-slate-500">
                                    {formatDailyUnits(size.avgDailySales)}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${
                                    size.reorderQty > 0
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {size.reorderQty > 0
                                    ? `Reorder ${formatNumber(size.reorderQty)}`
                                    : "Covered"}
                                </span>
                              </div>
                              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-slate-500">
                                <span>{formatNumber(size.stock)} in stock</span>
                                <span>
                                  {size.daysCovered !== null
                                    ? `${formatNumber(size.daysCovered)} days left`
                                    : "No coverage"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : noSalesPreviewSizes.length > 0 ? (
                        <div className="grid gap-2 md:grid-cols-3">
                          {noSalesPreviewSizes.map((size) => (
                            <div key={size.id} className="rounded-lg bg-white p-3 text-xs shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {getSizePrimaryLabel(size)}
                                  </p>
                                  {getSizeSecondaryLabel(size) && (
                                    <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                                      {getSizeSecondaryLabel(size)}
                                    </p>
                                  )}
                                </div>
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                  No sales
                                </span>
                              </div>
                              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-slate-500">
                                <span>{formatNumber(size.stock)} in stock</span>
                                <span>No valid sales</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg bg-white px-3 py-4 text-sm text-slate-500 shadow-sm">
                          No sizes match this filter.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {visibleSizes.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Products
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatNumber(visibleSizes.length)} product{visibleSizes.length === 1 ? "" : "s"} in this filter
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleProductSizes(prediction.productId)}
                      aria-expanded={isExpanded}
                      className="h-8 gap-1.5 rounded-full"
                    >
                      {isExpanded ? "Hide Products" : "Show Products"}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </div>
                )}

                {visibleSizes.length > 0 && isExpanded && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="mb-2 flex items-center justify-between gap-2 px-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Products
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatNumber(visibleSizes.length)} total
                      </p>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {visibleSizes.map((size) => (
                        <div
                          key={size.id}
                          className={`rounded-lg border bg-white px-3 py-2 ${
                            size.isActive ? "border-slate-200" : "border-slate-200 opacity-70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {getSizePrimaryLabel(size)}
                              </p>
                              {getSizeSecondaryLabel(size) && (
                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                  {getSizeSecondaryLabel(size)}
                                </p>
                              )}
                              <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                                {size.sku && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                    SKU: {size.sku}
                                  </span>
                                )}
                                {!size.isActive && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p
                                className={`text-sm font-bold ${
                                  size.stock <= 0 ? "text-red-700" : "text-slate-950"
                                }`}
                              >
                                {formatNumber(size.stock)}
                              </p>
                              <p className="text-[11px] text-slate-500">stock</p>
                            </div>
                          </div>
                          {size.avgDailySales > 0 && (
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                              <span className="text-slate-500">Avg sold/day</span>
                              <span className="font-semibold text-slate-700">
                                {formatDailyUnits(size.avgDailySales)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredPredictions.length > 10 && !showAll && (
          <div className="text-center">
            <Button variant="outline" onClick={() => setShowAll(true)}>
              Show all {formatNumber(filteredPredictions.length)} products
            </Button>
          </div>
        )}

        {showAll && filteredPredictions.length > 10 && (
          <div className="text-center">
            <Button variant="outline" onClick={() => setShowAll(false)}>
              Show fewer
            </Button>
          </div>
        )}

        {filteredPredictions.length === 0 && predictions.length > 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
            No products match this search or filter.
          </p>
        )}

        {predictions.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
            No inventory products found.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
