import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { generateSalesForecast, SalesForecast } from "@/services/analyticsService";
import { TrendingUp, TrendingDown, Minus, Info, AlertCircle } from "lucide-react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";

// Custom tooltip component for better UX
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = new Date(label);
    const predicted = payload.find((p: any) => p.dataKey === 'predicted')?.value || 0;
    const upper = payload.find((p: any) => p.dataKey === 'confidence.upper')?.value || 0;
    const lower = payload.find((p: any) => p.dataKey === 'confidence.lower')?.value || 0;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-900 mb-2">
          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">Predicted Sales:</span>
            <span className="font-bold text-blue-600">${predicted.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-500">Range:</span>
            <span className="text-sm text-gray-700">${lower.toFixed(0)} - ${upper.toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
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
      console.error('Error loading forecast:', error);
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

  const TrendIcon = forecast.trend === 'up' ? TrendingUp : forecast.trend === 'down' ? TrendingDown : Minus;
  const trendColor = forecast.trend === 'up' ? 'text-green-600' : forecast.trend === 'down' ? 'text-red-600' : 'text-gray-600';
  const trendBgColor = forecast.trend === 'up' ? 'bg-green-50' : forecast.trend === 'down' ? 'bg-red-50' : 'bg-gray-50';
  const trendBorderColor = forecast.trend === 'up' ? 'border-green-200' : forecast.trend === 'down' ? 'border-red-200' : 'border-gray-200';
  
  // Confidence level interpretation
  const confidenceLevel = forecast.confidence * 100;
  const confidenceLabel = confidenceLevel >= 50 ? 'High' : confidenceLevel >= 20 ? 'Medium' : confidenceLevel >= 5 ? 'Low' : 'Very Low';
  const confidenceColor = confidenceLevel >= 50 ? 'bg-green-100 text-green-800' : confidenceLevel >= 20 ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800';

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl">Sales Forecast</CardTitle>
              <Badge variant="outline" className={`${trendBgColor} ${trendBorderColor} ${trendColor} border`}>
                <TrendIcon className="h-3 w-3 mr-1" />
                {forecast.trend === 'up' ? 'Growing' : forecast.trend === 'down' ? 'Declining' : 'Stable'}
              </Badge>
            </div>
            <CardDescription className="text-base">
              AI-powered revenue prediction for the next {period} days
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={period === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(30)}
              className="min-w-[80px]"
            >
              30 Days
            </Button>
            <Button
              variant={period === 60 ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(60)}
              className="min-w-[80px]"
            >
              60 Days
            </Button>
            <Button
              variant={period === 90 ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(90)}
              className="min-w-[80px]"
            >
              90 Days
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          {/* Expected Revenue */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-900">Expected Revenue</p>
              <Info className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-900">
              ${forecast.summary.expectedRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-blue-700 mt-1">Total for {period} days</p>
          </div>

          {/* Growth Rate */}
          <div className={`rounded-lg p-4 border ${
            forecast.summary.growthRate >= 0 
              ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' 
              : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-medium ${forecast.summary.growthRate >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                Growth Rate
              </p>
              <TrendIcon className={`h-4 w-4 ${forecast.summary.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <p className={`text-3xl font-bold ${forecast.summary.growthRate >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              {forecast.summary.growthRate >= 0 ? '+' : ''}{forecast.summary.growthRate.toFixed(2)}%
            </p>
            <p className={`text-xs mt-1 ${forecast.summary.growthRate >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              Weekly trend
            </p>
          </div>

          {/* Confidence */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-900">Confidence Level</p>
              <Badge className={confidenceColor} variant="secondary">
                {confidenceLabel}
              </Badge>
            </div>
            <p className="text-3xl font-bold text-purple-900">
              {confidenceLevel.toFixed(1)}%
            </p>
            <p className="text-xs text-purple-700 mt-1">Model accuracy</p>
          </div>
        </div>

        {/* Warning for low confidence */}
        {confidenceLevel < 10 && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Low Confidence Warning</p>
              <p className="text-xs text-amber-700 mt-1">
                This forecast has low confidence due to high sales variance. Use for directional guidance only, not precise planning.
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Revenue Forecast Trend</h3>
            <p className="text-xs text-gray-600">
              Blue line shows predicted daily sales. Shaded area represents confidence range.
            </p>
          </div>
          
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={forecast.forecast} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                stroke="#9ca3af"
              />
              
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                stroke="#9ca3af"
                width={60}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
                formatter={(value) => {
                  if (value === 'predicted') return 'Predicted Sales';
                  if (value === 'confidence.upper') return 'Confidence Range';
                  return value;
                }}
              />
              
              {/* Confidence band */}
              <Area
                type="monotone"
                dataKey="confidence.upper"
                fill="url(#confidenceGradient)"
                stroke="none"
                name="confidence.upper"
              />
              <Area
                type="monotone"
                dataKey="confidence.lower"
                fill="#ffffff"
                stroke="none"
              />
              
              {/* Main prediction line */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                name="predicted"
                activeDot={{ r: 6, fill: '#3b82f6' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">📊 What This Means</h4>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• Expected revenue: ${(forecast.summary.expectedRevenue / period).toFixed(0)}/day average</li>
              <li>• Trend is {forecast.trend === 'up' ? 'positive' : forecast.trend === 'down' ? 'negative' : 'stable'} at {Math.abs(forecast.summary.growthRate).toFixed(2)}% weekly</li>
              <li>• Confidence: {confidenceLabel} - {confidenceLevel < 10 ? 'use with caution' : 'reasonable reliability'}</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">💡 Recommendations</h4>
            <ul className="text-xs text-gray-700 space-y-1">
              {forecast.trend === 'up' && <li>• Capitalize on growth momentum</li>}
              {forecast.trend === 'down' && <li>• Review marketing and sales strategies</li>}
              <li>• Use 30-day forecast for operational planning</li>
              <li>• Monitor actual vs predicted weekly</li>
              {confidenceLevel < 10 && <li>• Consider external factors affecting sales</li>}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
