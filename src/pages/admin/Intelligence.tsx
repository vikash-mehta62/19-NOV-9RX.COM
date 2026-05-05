import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPIDashboard } from "@/components/analytics/KPIDashboard";
import { SalesForecastChart } from "@/components/analytics/SalesForecastChart";
import { FunnelAnalysis } from "@/components/analytics/FunnelAnalysis";
import { RFMSegmentation } from "@/components/analytics/RFMSegmentation";
import { CohortAnalysisTable } from "@/components/analytics/CohortAnalysisTable";
import { InventoryDemandPredictor } from "@/components/analytics/InventoryDemandPredictor";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AlertTriangle, Brain, ClipboardCheck, Package, ShoppingCart, TrendingUp, Users } from "lucide-react";

export default function Intelligence() {
  return (
    <DashboardLayout role="admin">
      <div className="container mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold">Business Intelligence</h1>
          </div>
          <p className="text-gray-600">Analytics and predictive insights for data-driven decisions</p>
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
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 p-6">
                <h3 className="mb-2 font-semibold">Forecast Basis</h3>
                <p className="text-sm text-gray-700">
                  Forecasts use real completed sales orders only: shipped, delivered, and completed statuses.
                  Pending, cart, cancelled, void, deleted, and purchase-order rows are not counted as sales revenue.
                </p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-green-50 to-blue-50 p-6">
                <h3 className="mb-2 font-semibold">How to Use</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>- Use 30-day forecast for short-term planning</li>
                  <li>- Use 90-day forecast only for broader planning</li>
                  <li>- Higher model fit means the historical trend is more consistent</li>
                  <li>- Compare forecast against actual completed revenue weekly</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <RFMSegmentation />
            <CohortAnalysisTable />
            <div className="rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 p-6">
              <h3 className="mb-3 font-semibold">Customer Insights</h3>
              <div className="grid gap-4 text-sm text-gray-700 md:grid-cols-2">
                <div>
                  <h4 className="mb-1 font-semibold">RFM Segmentation</h4>
                  <p>
                    Identifies your most valuable customers and those at risk of churning. Focus retention efforts on
                    "At Risk" and "Can't Lose Them" segments.
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 font-semibold">Cohort Analysis</h4>
                  <p>
                    Shows how customer behavior changes over time. Declining retention rates indicate need for
                    engagement campaigns.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="funnel" className="space-y-6">
            <FunnelAnalysis />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="mb-2 font-semibold">Identify Bottlenecks</h4>
                <p className="text-sm text-gray-700">
                  The biggest dropoff point shows where real order statuses are stalling. Check that workflow first.
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <h4 className="mb-2 font-semibold">Status Hygiene</h4>
                <p className="text-sm text-gray-700">
                  Make sure shipped, delivered, and completed statuses are updated consistently so reporting stays useful.
                </p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4">
                <h4 className="mb-2 font-semibold">No Event Tracking</h4>
                <p className="text-sm text-gray-700">
                  This funnel uses order rows only. Product views, cart additions, and checkout starts need separate event tracking.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <InventoryDemandPredictor />
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-orange-100 bg-orange-50 p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950">Product Reorder Guide</h3>
                </div>
                <p className="mb-3 text-sm text-slate-700">
                  Use the product action labels to decide what needs buying first. The planner checks valid products,
                  product stock, and lead time.
                </p>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  <li><strong>Order now:</strong> buy this product today.</li>
                  <li><strong>Order soon:</strong> add this product to the next PO.</li>
                  <li><strong>Watch:</strong> selling product, check weekly.</li>
                  <li><strong>Stock OK:</strong> no action needed right now.</li>
                </ul>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950">How Quantity Is Suggested</h3>
                </div>
                <p className="mb-3 text-sm text-slate-700">
                  Suggested quantity is calculated per product, so the admin can reorder the exact product that is
                  selling or running low.
                </p>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  <li><strong>Sorted first by need:</strong> products needing reorder appear first.</li>
                  <li><strong>Then by sales:</strong> faster selling products rank higher.</li>
                  <li><strong>No sales:</strong> products without valid sales stay separate.</li>
                  <li><strong>Check details:</strong> expand products to confirm SKU, stock, and units/day.</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
