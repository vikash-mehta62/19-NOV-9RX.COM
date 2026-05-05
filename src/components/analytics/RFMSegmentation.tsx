import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { generateRFMAnalysis, RFMData } from "@/services/analyticsService";
import { Users, TrendingUp, DollarSign, Award, AlertTriangle, UserCheck } from "lucide-react";

export function RFMSegmentation() {
  const [rfmData, setRfmData] = useState<RFMData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRFM();
  }, []);

  const loadRFM = async () => {
    try {
      setLoading(true);
      const data = await generateRFMAnalysis();
      setRfmData(data);
    } catch (error) {
      console.error("Error loading RFM:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value || 0);

  const formatNumber = (value: number, digits = 0) =>
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: digits,
    }).format(value || 0);

  const getSegmentIcon = (segment: string) => {
    if (segment === "Champions") return <Award className="h-5 w-5" />;
    if (segment === "Loyal Customers") return <UserCheck className="h-5 w-5" />;
    if (segment === "At Risk") return <AlertTriangle className="h-5 w-5" />;
    return <Users className="h-5 w-5" />;
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

  if (!rfmData || rfmData.segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>RFM Customer Segmentation</CardTitle>
          <CardDescription>Customer segments by Recency, Frequency, and Monetary value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-16 w-16 text-gray-300" />
            <p className="text-center text-lg text-gray-500">No completed sales-order data available</p>
            <p className="mt-2 text-center text-sm text-gray-400">
              Customer segments will appear after orders reach shipped, delivered, or completed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topSegment = rfmData.segments[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-6 w-6 text-purple-600" />
          RFM Customer Segmentation
        </CardTitle>
        <CardDescription>Real customer groups from completed sales orders</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>Data source:</strong> orders table only. RFM includes completed sales orders with statuses{" "}
          <strong>shipped, delivered, completed</strong>. Scanned {rfmData.ordersScanned.toLocaleString()} order
          {rfmData.ordersScanned === 1 ? "" : "s"} and excluded {rfmData.excludedOrders.toLocaleString()} void,
          deleted, purchase-order, pending, cart, cancelled, or rejected row
          {rfmData.excludedOrders === 1 ? "" : "s"}.
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">RFM Customers</span>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900">{rfmData.totalCustomers.toLocaleString()}</div>
            <div className="mt-1 text-xs text-blue-600">Customers with completed sales orders</div>
          </div>

          <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-green-700">Completed Revenue</span>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(rfmData.totalValue)}</div>
            <div className="mt-1 text-xs text-green-600">From included completed orders</div>
          </div>

          <div className="rounded-lg border border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-cyan-700">Completed Orders</span>
              <TrendingUp className="h-5 w-5 text-cyan-600" />
            </div>
            <div className="text-2xl font-bold text-cyan-900">{rfmData.totalCompletedOrders.toLocaleString()}</div>
            <div className="mt-1 text-xs text-cyan-600">Used for RFM scoring</div>
          </div>

          <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-purple-700">Highest Value Segment</span>
              <Award className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-xl font-bold text-purple-900">{topSegment.segment}</div>
            <div className="mt-1 text-xs text-purple-600">{topSegment.count.toLocaleString()} customers</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rfmData.segments.map((segment) => (
            <div
              key={segment.segment}
              className="rounded-xl border-2 bg-white p-5 transition-all duration-200 hover:shadow-lg"
              style={{ borderColor: segment.color }}
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg p-2" style={{ backgroundColor: `${segment.color}20` }}>
                    <div style={{ color: segment.color }}>{getSegmentIcon(segment.segment)}</div>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold" style={{ color: segment.color }}>
                      {segment.segment}
                    </h4>
                    <p className="text-xs text-gray-500">{segment.count.toLocaleString()} customers</p>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  {((segment.count / rfmData.totalCustomers) * 100).toFixed(0)}%
                </div>
              </div>

              <p className="mb-4 min-h-[40px] text-sm text-gray-600">{segment.description}</p>

              <div className="space-y-2 border-t pt-3">
                <MetricRow label="Total value" value={formatCurrency(segment.totalValue)} strong />
                <MetricRow label="Avg customer value" value={formatCurrency(segment.avgValue)} />
                <MetricRow label="Orders/customer" value={formatNumber(segment.avgFrequency, 1)} />
                <MetricRow label="Avg days since order" value={`${formatNumber(segment.avgRecencyDays)} days`} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 p-5">
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-blue-900">
              <TrendingUp className="h-5 w-5" />
              What This Uses
            </h4>
            <div className="space-y-2 text-sm text-gray-700">
              <InfoLine label="Recency:" tone="text-blue-600">
                Days since the customer's latest completed sales order.
              </InfoLine>
              <InfoLine label="Frequency:" tone="text-purple-600">
                Number of completed sales orders for that customer.
              </InfoLine>
              <InfoLine label="Monetary:" tone="text-green-600">
                Total completed sales-order value for that customer.
              </InfoLine>
            </div>
          </div>

          <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-blue-50 p-5">
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-green-900">
              <Award className="h-5 w-5" />
              Action Recommendations
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600">-</span>
                <span>
                  <strong>Champions:</strong> reward high-value repeat buyers.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">-</span>
                <span>
                  <strong>At Risk:</strong> contact customers who bought often before but have gone quiet.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">-</span>
                <span>
                  <strong>New Customers:</strong> nurture recent first-time or low-frequency buyers.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={strong ? "text-sm font-bold text-gray-900" : "text-sm font-semibold text-gray-700"}>
        {value}
      </span>
    </div>
  );
}

function InfoLine({
  label,
  tone,
  children,
}: {
  label: string;
  tone: string;
  children: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={`${tone} min-w-[80px] font-semibold`}>{label}</span>
      <span>{children}</span>
    </div>
  );
}
