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
      console.error('Error loading RFM:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSegmentIcon = (segment: string) => {
    if (segment === 'Champions') return <Award className="h-5 w-5" />;
    if (segment === 'Loyal Customers') return <UserCheck className="h-5 w-5" />;
    if (segment === 'At Risk') return <AlertTriangle className="h-5 w-5" />;
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
            <Users className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-center text-gray-500 text-lg">No customer data available</p>
            <p className="text-center text-gray-400 text-sm mt-2">Customer segments will appear here once orders are placed</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalValue = rfmData.segments.reduce((sum, s) => sum + s.totalValue, 0);
  const topSegment = rfmData.segments[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-6 w-6 text-purple-600" />
          RFM Customer Segmentation
        </CardTitle>
        <CardDescription>
          Analyze customer value by Recency, Frequency, and Monetary behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">Total Customers</span>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900">{rfmData.totalCustomers}</div>
            <div className="text-xs text-blue-600 mt-1">Active customers with orders</div>
          </div>

          <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">Total Value</span>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900">${totalValue.toLocaleString()}</div>
            <div className="text-xs text-green-600 mt-1">Lifetime customer value</div>
          </div>

          <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">Top Segment</span>
              <Award className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900">{topSegment.segment}</div>
            <div className="text-xs text-purple-600 mt-1">{topSegment.count} customers</div>
          </div>
        </div>

        {/* Segment Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rfmData.segments.map((segment) => (
            <div
              key={segment.segment}
              className="p-5 rounded-xl border-2 hover:shadow-lg transition-all duration-200 bg-white"
              style={{ borderColor: segment.color }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${segment.color}20` }}
                  >
                    <div style={{ color: segment.color }}>
                      {getSegmentIcon(segment.segment)}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg" style={{ color: segment.color }}>
                      {segment.segment}
                    </h4>
                    <p className="text-xs text-gray-500">{segment.count} customers</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-700">
                    {((segment.count / rfmData.totalCustomers) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 min-h-[40px]">{segment.description}</p>

              <div className="space-y-2 pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Total Value</span>
                  <span className="text-sm font-bold text-gray-900">
                    ${segment.totalValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Avg per Customer</span>
                  <span className="text-sm font-semibold text-gray-700">
                    ${segment.avgValue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Panel */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-900">
              <TrendingUp className="h-5 w-5" />
              What is RFM Analysis?
            </h4>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 min-w-[80px]">Recency:</span>
                <span>How recently did they purchase?</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-purple-600 min-w-[80px]">Frequency:</span>
                <span>How often do they purchase?</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-green-600 min-w-[80px]">Monetary:</span>
                <span>How much do they spend?</span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-900">
              <Award className="h-5 w-5" />
              Action Recommendations
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600">•</span>
                <span><strong>Champions:</strong> Reward with exclusive offers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                <span><strong>At Risk:</strong> Re-engage with special promotions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>New Customers:</strong> Nurture with onboarding</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
