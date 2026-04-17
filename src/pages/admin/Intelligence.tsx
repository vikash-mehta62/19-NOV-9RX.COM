import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPIDashboard } from "@/components/analytics/KPIDashboard";
import { SalesForecastChart } from "@/components/analytics/SalesForecastChart";
import { FunnelAnalysis } from "@/components/analytics/FunnelAnalysis";
import { RFMSegmentation } from "@/components/analytics/RFMSegmentation";
import { CohortAnalysisTable } from "@/components/analytics/CohortAnalysisTable";
import { InventoryDemandPredictor } from "@/components/analytics/InventoryDemandPredictor";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Brain, TrendingUp, Users, ShoppingCart, Package } from "lucide-react";

export default function Intelligence() {
  return (
    <DashboardLayout role="admin">
      <div className="container mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Business Intelligence</h1>
        </div>
        <p className="text-gray-600">
          AI-powered analytics and predictive insights for data-driven decisions
        </p>
      </div>

      <Tabs defaultValue="kpis" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="kpis" className="flex min-w-0 items-center gap-2 px-3 py-2 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4" />
            KPIs
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex min-w-0 items-center gap-2 px-3 py-2 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4" />
            Forecast
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex min-w-0 items-center gap-2 px-3 py-2 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="funnel" className="flex min-w-0 items-center gap-2 px-3 py-2 text-xs sm:text-sm">
            <ShoppingCart className="h-4 w-4" />
            Funnel
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex min-w-0 items-center gap-2 px-3 py-2 text-xs sm:text-sm">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kpis" className="space-y-6">
          <KPIDashboard />
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <SalesForecastChart />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
              <h3 className="font-semibold mb-2">📈 Predictive Analytics</h3>
              <p className="text-sm text-gray-700">
                Our forecasting model uses linear regression on historical sales data to predict future revenue. 
                The confidence interval shows the range of likely outcomes.
              </p>
            </div>
            <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">💡 How to Use</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Use 30-day forecast for short-term planning</li>
                <li>• Use 90-day forecast for strategic decisions</li>
                <li>• Higher confidence = more reliable predictions</li>
                <li>• Upward trend = growing business</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <RFMSegmentation />
          <CohortAnalysisTable />
          <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
            <h3 className="font-semibold mb-3">🎯 Customer Insights</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <h4 className="font-semibold mb-1">RFM Segmentation</h4>
                <p>Identifies your most valuable customers and those at risk of churning. Focus retention efforts on "At Risk" and "Can't Lose Them" segments.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Cohort Analysis</h4>
                <p>Shows how customer behavior changes over time. Declining retention rates indicate need for engagement campaigns.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <FunnelAnalysis />
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2">🔍 Identify Bottlenecks</h4>
              <p className="text-sm text-gray-700">
                The biggest dropoff point shows where customers are leaving. Focus optimization efforts here first.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold mb-2">📊 Benchmark</h4>
              <p className="text-sm text-gray-700">
                E-commerce average conversion is 2-3%. Above 3% is excellent, below 1% needs immediate attention.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold mb-2">🚀 Optimize</h4>
              <p className="text-sm text-gray-700">
                Test different checkout flows, reduce form fields, add trust signals, and offer guest checkout.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <InventoryDemandPredictor />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
              <h3 className="font-semibold mb-2">⚠️ Stockout Prevention</h3>
              <p className="text-sm text-gray-700 mb-3">
                Running out of stock costs you sales and damages customer trust. Our AI predicts when you'll run out based on current sales velocity.
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• High Priority: Reorder immediately</li>
                <li>• Medium Priority: Plan reorder this week</li>
                <li>• Low Priority: Monitor and plan ahead</li>
              </ul>
            </div>
            <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
              <h3 className="font-semibold mb-2">📦 Optimal Inventory</h3>
              <p className="text-sm text-gray-700 mb-3">
                Balance between too much inventory (tied up capital) and too little (lost sales).
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Recommended reorder = 30 days supply</li>
                <li>• Adjust based on lead times</li>
                <li>• Consider seasonal variations</li>
                <li>• Factor in storage costs</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}
