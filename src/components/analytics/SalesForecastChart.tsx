import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { generateSalesForecast, SalesForecast } from "@/services/analyticsService";
import { TrendingUp, TrendingDown, Minus, Info, AlertCircle } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatCurrency = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value || 0);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const date = new Date(label);
  const predicted = payload.find((p: any) => p.dataKey === "predicted")?.value || 0;
  const upper = payload.find((p: any) => p.dataKey === "confidence.upper")?.value || 0;
  const lower = payload.find((p: any) => p.dataKey === "confidence.lower")?.value || 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
      <p className="mb-2 font-semibold text-gray-900">
        {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600">Forecast revenue:</span>
          <span className="font-bold text-blue-600">{formatCurrency(predicted, 2)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-500">Estimated range:</span>
          <span className="text-sm text-gray-700">
            {formatCurrency(lower)} - {formatCurrency(upper)}
          </span>
        </div>
      </div>
    </div>
  );
};

export function SalesForecastChart() {
  const [forecast, setForecast] = useState<SalesForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<30 | 60 | 90>(30);

  useEffect(() => {
    loadForecast();
  }, [period]);

  const loadForecast = async () => {
    try {
      setLoading(true);
      const data = await generateSalesForecast(period);
      setForecast(data);
    } catch (error) {
      console.error("Error loading forecast:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!forecast) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Failed to load forecast</p>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = forecast.trend === "up" ? TrendingUp : forecast.trend === "down" ? TrendingDown : Minus;
  const trendColor = forecast.trend === "up" ? "text-green-600" : forecast.trend === "down" ? "text-red-600" : "text-gray-600";
  const trendBgColor = forecast.trend === "up" ? "bg-green-50" : forecast.trend === "down" ? "bg-red-50" : "bg-gray-50";
  const trendBorderColor = forecast.trend === "up" ? "border-green-200" : forecast.trend === "down" ? "border-red-200" : "border-gray-200";
  const confidenceLevel = forecast.confidence * 100;
  const confidenceLabel =
    confidenceLevel >= 60 ? "Strong" : confidenceLevel >= 30 ? "Moderate" : confidenceLevel >= 10 ? "Low" : "Very Low";
  const confidenceColor =
    confidenceLevel >= 60
      ? "bg-green-100 text-green-800"
      : confidenceLevel >= 30
        ? "bg-yellow-100 text-yellow-800"
        : "bg-orange-100 text-orange-800";
  const dailyForecastAverage = forecast.summary.expectedRevenue / period;
  const hasCompletedOrderData = forecast.summary.includedOrders > 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <CardTitle className="text-2xl leading-tight">Sales Forecast</CardTitle>
              <Badge variant="outline" className={`${trendBgColor} ${trendBorderColor} ${trendColor} border`}>
                <TrendIcon className="mr-1 h-3 w-3" />
                {forecast.trend === "up" ? "Growing" : forecast.trend === "down" ? "Declining" : "Stable"}
              </Badge>
            </div>
            <CardDescription className="max-w-2xl text-base">
              Trend-based revenue forecast from real completed sales orders
            </CardDescription>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            {[30, 60, 90].map((value) => (
              <Button
                key={value}
                variant={period === value ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(value as 30 | 60 | 90)}
                className={value === 90 ? "col-span-2 w-full sm:col-span-1 sm:min-w-[80px]" : "w-full sm:min-w-[80px]"}
              >
                {value} Days
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>Data source:</strong> orders table, last 90 days. Included{" "}
          {forecast.summary.includedOrders.toLocaleString()} shipped, delivered, or completed sales order
          {forecast.summary.includedOrders === 1 ? "" : "s"} and excluded{" "}
          {forecast.summary.excludedOrders.toLocaleString()} void, deleted, purchase-order, pending, cart, cancelled,
          or rejected row{forecast.summary.excludedOrders === 1 ? "" : "s"}.
        </div>

        {!hasCompletedOrderData && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">No completed sales orders in the 90-day history</p>
              <p className="mt-1 text-xs text-amber-700">
                The forecast is $0 because no shipped, delivered, or completed sales revenue was available for the model.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-blue-900">Forecast Revenue</p>
              <Info className="h-4 w-4 text-blue-600" />
            </div>
            <p className="break-words text-2xl font-bold text-blue-900 sm:text-3xl">
              {formatCurrency(forecast.summary.expectedRevenue)}
            </p>
            <p className="mt-1 text-xs text-blue-700">Total for next {period} days</p>
          </div>

          <div
            className={`rounded-lg border p-4 ${
              forecast.summary.growthRate >= 0
                ? "border-green-200 bg-gradient-to-br from-green-50 to-green-100"
                : "border-red-200 bg-gradient-to-br from-red-50 to-red-100"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className={`text-sm font-medium ${forecast.summary.growthRate >= 0 ? "text-green-900" : "text-red-900"}`}>
                Weekly Trend
              </p>
              <TrendIcon className={`h-4 w-4 ${forecast.summary.growthRate >= 0 ? "text-green-600" : "text-red-600"}`} />
            </div>
            <p className={`break-words text-2xl font-bold ${forecast.summary.growthRate >= 0 ? "text-green-900" : "text-red-900"} sm:text-3xl`}>
              {forecast.summary.growthRate >= 0 ? "+" : ""}
              {forecast.summary.growthRate.toFixed(2)}%
            </p>
            <p className={`mt-1 text-xs ${forecast.summary.growthRate >= 0 ? "text-green-700" : "text-red-700"}`}>
              Based on weekly completed revenue
            </p>
          </div>

          <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-purple-900">Model Fit</p>
              <Badge className={confidenceColor} variant="secondary">
                {confidenceLabel}
              </Badge>
            </div>
            <p className="break-words text-2xl font-bold text-purple-900 sm:text-3xl">
              {confidenceLevel.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-purple-700">Reliability of the historical trend</p>
          </div>
        </div>

        {confidenceLevel < 30 && hasCompletedOrderData && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Low forecast reliability</p>
              <p className="mt-1 text-xs text-amber-700">
                Sales history is too uneven for a precise prediction. Use this as directional guidance and check actuals weekly.
              </p>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Revenue Forecast Trend</h3>
            <p className="text-xs text-gray-600">
              Blue line shows daily forecast revenue. Shaded area shows the estimated range from historical variance.
            </p>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={forecast.forecast} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                tick={{ fontSize: 12, fill: "#6b7280" }}
                stroke="#9ca3af"
                minTickGap={24}
              />
              <YAxis
                domain={[0, "auto"]}
                tickFormatter={(value) => `$${(Number(value) / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12, fill: "#6b7280" }}
                stroke="#9ca3af"
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="line"
                formatter={(value) => {
                  if (value === "predicted") return "Forecast Revenue";
                  if (value === "confidence.upper") return "Estimated Range";
                  return value;
                }}
              />

              <Area
                type="monotone"
                dataKey="confidence.upper"
                fill="url(#confidenceGradient)"
                stroke="none"
                name="confidence.upper"
              />
              <Area type="monotone" dataKey="confidence.lower" fill="#ffffff" stroke="none" />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                name="predicted"
                activeDot={{ r: 6, fill: "#3b82f6" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="mb-2 text-sm font-semibold text-gray-900">What This Means</h4>
            <ul className="space-y-1 text-xs text-gray-700">
              <li>- Forecast average: {formatCurrency(dailyForecastAverage)}/day for the selected period</li>
              <li>- Historical average: {formatCurrency(forecast.summary.historicalDailyAverage)}/day over 90 days</li>
              <li>
                - Trend is {forecast.trend === "up" ? "positive" : forecast.trend === "down" ? "negative" : "stable"} at{" "}
                {Math.abs(forecast.summary.growthRate).toFixed(2)}% per week
              </li>
              <li>- Model fit: {confidenceLabel.toLowerCase()}, based only on completed sales order revenue</li>
            </ul>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="mb-2 text-sm font-semibold text-gray-900">Admin Checks</h4>
            <ul className="space-y-1 text-xs text-gray-700">
              <li>- Use 30 days for purchasing and staffing decisions</li>
              <li>- Use 90 days only for broader planning</li>
              <li>- Compare actual revenue against this forecast weekly</li>
              <li>- Confirm shipped, delivered, and completed statuses are being updated consistently</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
