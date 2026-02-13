import { useEffect, useState } from "react";
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
      console.error('Error loading funnel:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (stepName: string) => {
    if (stepName === 'Orders Created') return <ShoppingCart className="h-5 w-5" />;
    if (stepName === 'Checkout Started') return <CreditCard className="h-5 w-5" />;
    if (stepName === 'Purchase Completed') return <CheckCircle className="h-5 w-5" />;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-purple-600" />
          Purchase Funnel Analysis
        </CardTitle>
        <CardDescription>
          Order completion journey (Last 30 days)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">Total Orders</span>
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900">{funnel.steps[0].count}</div>
            <div className="text-xs text-blue-600 mt-1">Orders created in last 30 days</div>
          </div>

          <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">Completion Rate</span>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900">{funnel.overallConversion.toFixed(1)}%</div>
            <div className="text-xs text-green-600 mt-1">
              {funnel.steps[funnel.steps.length - 1].count} of {funnel.steps[0].count} completed
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-700">Biggest Dropoff</span>
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-lg font-bold text-orange-900">{funnel.biggestDropoff}</div>
            {funnel.creditApprovalPending !== undefined && funnel.creditApprovalPending > 0 ? (
              <div className="text-xs text-orange-600 mt-1">
                {funnel.creditApprovalPending} pending credit approval
              </div>
            ) : (
              <div className="text-xs text-orange-600 mt-1">Focus area for improvement</div>
            )}
          </div>
        </div>

        {/* How to Read This Funnel Guide */}
        <div className="p-5 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-xl border-2 border-indigo-200">
          <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-indigo-900">
            <TrendingUp className="h-5 w-5" />
            📊 How to Read This Funnel
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">1</div>
                <div className="text-sm text-gray-700">
                  <strong>Each step</strong> shows how many orders reached that stage
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">2</div>
                <div className="text-sm text-gray-700">
                  <strong>Percentage</strong> shows completion rate relative to total orders
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">3</div>
                <div className="text-sm text-gray-700">
                  <strong>Dropoff arrows</strong> show orders that didn't progress
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">4</div>
                <div className="text-sm text-gray-700">
                  <strong>Red bars</strong> highlight stages with biggest dropoff
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Funnel Steps */}
        <div className="space-y-5">
          {funnel.steps.map((step, index) => {
            const width = step.percentage;
            const isLargestDropoff = step.name === funnel.biggestDropoff && step.dropoff > 0;

            return (
              <div key={step.name}>
                <div className="mb-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isLargestDropoff ? 'bg-red-100' : 'bg-blue-100'}`}>
                      <div className={isLargestDropoff ? 'text-red-600' : 'text-blue-600'}>
                        {getStepIcon(step.name)}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900">{step.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {step.count.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="relative h-14 bg-gray-100 rounded-xl overflow-hidden shadow-inner">
                  <div
                    className={`h-full flex items-center justify-center text-white font-bold transition-all shadow-md ${
                      isLargestDropoff 
                        ? 'bg-gradient-to-r from-red-500 to-red-600' 
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
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
                  <div className="flex items-center justify-center my-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      isLargestDropoff ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <ArrowDown className={`h-4 w-4 ${isLargestDropoff ? 'text-red-600' : 'text-gray-600'}`} />
                      <span className={`text-sm font-semibold ${isLargestDropoff ? 'text-red-600' : 'text-gray-600'}`}>
                        {step.dropoff.toFixed(1)}% dropoff
                        {step.dropoff > 0 && (
                          <span className="ml-1 text-xs font-normal">
                            ({Math.round((step.count * step.dropoff) / 100)} orders)
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

        {/* Info Panels */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <h4 className="font-bold mb-3 flex items-center gap-2 text-green-900">
              <CheckCircle className="h-5 w-5" />
              ✅ What This Shows
            </h4>
            <ul className="text-sm space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span><strong>100% real data</strong> from your database (no estimates)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span><strong>Completion rate:</strong> {funnel.overallConversion.toFixed(1)}% of orders complete successfully</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span><strong>Bottleneck:</strong> {funnel.biggestDropoff} needs attention</span>
              </li>
              {funnel.creditApprovalPending !== undefined && funnel.creditApprovalPending > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span><strong>Pending:</strong> {funnel.creditApprovalPending} order{funnel.creditApprovalPending > 1 ? 's' : ''} awaiting credit approval</span>
                </li>
              )}
            </ul>
          </div>

          <div className="p-5 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
            <h4 className="font-bold mb-3 flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              💡 Optimization Tips
            </h4>
            <ul className="text-sm space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-0.5">•</span>
                <span>Focus on reducing: <strong>{funnel.biggestDropoff}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-0.5">•</span>
                <span>Industry average completion: <strong>95-98%</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className={funnel.overallConversion >= 95 ? 'text-green-600 mt-0.5' : 'text-orange-600 mt-0.5'}>•</span>
                <span>Your rate: <strong>{funnel.overallConversion.toFixed(1)}%</strong> {funnel.overallConversion >= 95 ? '✅ Excellent!' : '⚠️ Can improve'}</span>
              </li>
              {funnel.creditApprovalPending !== undefined && funnel.creditApprovalPending > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Review credit approval process to reduce delays</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Note about tracking */}
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-sm text-gray-700">
            <strong className="text-blue-700">📝 Note:</strong> This funnel tracks order completion from creation to fulfillment. 
            To see the full customer journey (product views → cart → checkout), implement product view and cart tracking analytics.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
