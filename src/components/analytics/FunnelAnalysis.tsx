import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { generateFunnelAnalysis, FunnelData } from "@/services/analyticsService";
import { ArrowDown, ShoppingCart, CreditCard, CheckCircle, TrendingUp, AlertTriangle } from "lucide-react";

export function FunnelAnalysis() {
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFunnel();
  }, []);

  const loadFunnel = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const data = await generateFunnelAnalysis(startDate, endDate);
      setFunnel(data);
    } catch (error) {
      console.error("Error loading funnel:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const getStepIcon = (stepName: string) => {
    if (stepName === "Orders Created") return <ShoppingCart className="h-5 w-5" />;
    if (stepName === "Ready for Processing") return <CreditCard className="h-5 w-5" />;
    if (stepName === "Processing Started") return <TrendingUp className="h-5 w-5" />;
    if (stepName === "Fulfilled") return <CheckCircle className="h-5 w-5" />;
    return <ShoppingCart className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!funnel) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Failed to load funnel data</p>
        </CardContent>
      </Card>
    );
  }

  const totalOrders = funnel.steps[0]?.count || 0;
  const fulfilledOrders = funnel.steps[funnel.steps.length - 1]?.count || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-purple-600" />
          Purchase Funnel Analysis
        </CardTitle>
        <CardDescription>
          Real order status movement from the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">Sales Orders</span>
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900">{totalOrders.toLocaleString()}</div>
            <div className="mt-1 text-xs text-blue-600">Real orders created in range</div>
          </div>

          <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-green-700">Fulfillment Rate</span>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900">{funnel.overallConversion.toFixed(1)}%</div>
            <div className="mt-1 text-xs text-green-600">
              {fulfilledOrders.toLocaleString()} of {totalOrders.toLocaleString()} fulfilled
            </div>
          </div>

          <div className="rounded-lg border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-orange-700">Biggest Dropoff</span>
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-lg font-bold text-orange-900">{funnel.biggestDropoff}</div>
            <div className="mt-1 text-xs text-orange-600">
              {funnel.biggestDropoffCount > 0
                ? `${funnel.biggestDropoffCount.toLocaleString()} order${funnel.biggestDropoffCount === 1 ? "" : "s"} stopped before this step`
                : "No status dropoff in this range"}
            </div>
          </div>
        </div>

          {/* <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <strong>Data source:</strong> orders table, {formatDate(funnel.analysisStart)} to{" "}
            {formatDate(funnel.analysisEnd)}. Scanned {funnel.totalRowsScanned.toLocaleString()} row
            {funnel.totalRowsScanned === 1 ? "" : "s"}.
            {funnel.excludedOrders > 0 && (
              <span>
                {" "}Excluded {funnel.excludedOrders.toLocaleString()} void, deleted, cart, or purchase-order row
                {funnel.excludedOrders === 1 ? "" : "s"}.
              </span>
            )}
          </div> */}

        <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-5">
          <h4 className="mb-3 flex items-center gap-2 text-lg font-bold text-indigo-900">
            <TrendingUp className="h-5 w-5" />
            How to Read This Funnel
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <GuidePoint number="1" tone="bg-indigo-600">
                <strong>Each step</strong> shows how many real orders are currently at or beyond that status.
              </GuidePoint>
              <GuidePoint number="2" tone="bg-purple-600">
                <strong>Percentage</strong> is calculated against real orders created in the selected date range.
              </GuidePoint>
            </div>
            <div className="space-y-2">
              <GuidePoint number="3" tone="bg-blue-600">
                <strong>Dropoff arrows</strong> show the real count that did not reach the next status group.
              </GuidePoint>
              <GuidePoint number="4" tone="bg-red-600">
                <strong>Red bars</strong> highlight the status group with the biggest dropoff.
              </GuidePoint>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {funnel.steps.map((step, index) => {
            const width = Math.max(0, Math.min(100, step.percentage));
            const isLargestDropoff = step.name === funnel.biggestDropoff && step.dropoff > 0;

            return (
              <div key={step.name}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-2 ${isLargestDropoff ? "bg-red-100" : "bg-blue-100"}`}>
                      <div className={isLargestDropoff ? "text-red-600" : "text-blue-600"}>
                        {getStepIcon(step.name)}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900">{step.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{step.count.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{step.percentage.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="relative h-14 overflow-hidden rounded-xl bg-gray-100 shadow-inner">
                  <div
                    className={`flex h-full items-center justify-center font-bold text-white shadow-md transition-all ${
                      isLargestDropoff
                        ? "bg-gradient-to-r from-red-500 to-red-600"
                        : "bg-gradient-to-r from-blue-500 to-blue-600"
                    }`}
                    style={{ width: `${width}%` }}
                  >
                    {width > 15 && (
                      <span className="text-sm">
                        {step.count.toLocaleString()} orders ({step.percentage.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>

                {index < funnel.steps.length - 1 && (
                  <div className="my-3 flex items-center justify-center">
                    <div
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 ${
                        isLargestDropoff ? "border border-red-200 bg-red-50" : "border border-gray-200 bg-gray-50"
                      }`}
                    >
                      <ArrowDown className={`h-4 w-4 ${isLargestDropoff ? "text-red-600" : "text-gray-600"}`} />
                      <span className={`text-sm font-semibold ${isLargestDropoff ? "text-red-600" : "text-gray-600"}`}>
                        {step.dropoff.toFixed(1)}% dropoff
                        {step.dropoffCount > 0 && (
                          <span className="ml-1 text-xs font-normal">
                            ({step.dropoffCount.toLocaleString()} orders)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
            <h4 className="mb-3 flex items-center gap-2 font-bold text-green-900">
              <CheckCircle className="h-5 w-5" />
              What This Shows
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <InfoItem tone="text-green-600">
                <strong>Real funnel data</strong> from database orders only, with no sample or estimated counts.
              </InfoItem>
              <InfoItem tone="text-green-600">
                <strong>Fulfillment rate:</strong> {funnel.overallConversion.toFixed(1)}% of real orders reached
                shipped, delivered, or completed.
              </InfoItem>
              <InfoItem tone="text-green-600">
                <strong>Fulfilled means:</strong> shipped, delivered, and completed statuses only.
              </InfoItem>
              <InfoItem tone="text-green-600">
                <strong>Bottleneck:</strong>{" "}
                {funnel.biggestDropoffCount > 0
                  ? `${funnel.biggestDropoff} has the largest status dropoff.`
                  : "No status dropoff found."}
              </InfoItem>
              {funnel.creditApprovalPending > 0 && (
                <InfoItem tone="text-orange-600">
                  <strong>Pending:</strong> {funnel.creditApprovalPending.toLocaleString()} order
                  {funnel.creditApprovalPending === 1 ? "" : "s"} awaiting credit approval.
                </InfoItem>
              )}
              {funnel.cancelledOrRejected > 0 && (
                <InfoItem tone="text-orange-600">
                  <strong>Stopped:</strong> {funnel.cancelledOrRejected.toLocaleString()} order
                  {funnel.cancelledOrRejected === 1 ? "" : "s"} cancelled, rejected, or voided.
                </InfoItem>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 p-5">
            <h4 className="mb-3 flex items-center gap-2 font-bold text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              Operational Checks
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <InfoItem tone="text-orange-600">
                Review the largest real dropoff: <strong>{funnel.biggestDropoff}</strong>.
              </InfoItem>
              <InfoItem tone="text-orange-600">
                Check orders waiting in <strong>new</strong> or <strong>pending</strong> before they reach processing.
              </InfoItem>
              <InfoItem tone="text-orange-600">
                Verify shipped, delivered, and completed orders are being updated consistently.
              </InfoItem>
              {funnel.creditApprovalPending > 0 && (
                <InfoItem tone="text-orange-600">
                  Review credit approval processing to reduce delays.
                </InfoItem>
              )}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-gray-700">
            <strong className="text-blue-700">Note:</strong> This funnel tracks order status movement from creation to
            fulfillment. It does not invent product-view, cart, or checkout event counts. To see the full customer
            journey, add dedicated event tracking for views, cart additions, and checkout starts.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function GuidePoint({
  number,
  tone,
  children,
}: {
  number: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${tone}`}>
        {number}
      </div>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}

function InfoItem({
  tone,
  children,
}: {
  tone: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      <span className={`${tone} mt-0.5`}>-</span>
      <span>{children}</span>
    </li>
  );
}
