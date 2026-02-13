import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { generateCohortAnalysis, CohortData } from "@/services/analyticsService";
import { Calendar, TrendingDown, TrendingUp, Users, Activity } from "lucide-react";

export function CohortAnalysisTable() {
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCohorts();
  }, []);

  const loadCohorts = async () => {
    try {
      setLoading(true);
      const data = await generateCohortAnalysis();
      setCohorts(data);
    } catch (error) {
      console.error('Error loading cohorts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRetentionColor = (retention: number, total: number) => {
    const percentage = (retention / total) * 100;
    if (percentage >= 50) return 'bg-green-500 text-white';
    if (percentage >= 30) return 'bg-yellow-500 text-white';
    if (percentage >= 10) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getRetentionBgColor = (retention: number, total: number) => {
    const percentage = (retention / total) * 100;
    if (percentage >= 50) return 'bg-green-50';
    if (percentage >= 30) return 'bg-yellow-50';
    if (percentage >= 10) return 'bg-orange-50';
    return 'bg-red-50';
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

  if (cohorts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cohort Analysis</CardTitle>
          <CardDescription>Customer retention by signup month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-center text-gray-500 text-lg">No cohort data available</p>
            <p className="text-center text-gray-400 text-sm mt-2">Cohort retention data will appear here once customers make repeat purchases</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate average retention rates
  const avgRetention = cohorts.reduce((acc, cohort) => {
    const retention1 = (cohort.period1 / cohort.totalUsers) * 100;
    return acc + retention1;
  }, 0) / cohorts.length;

  const bestCohort = cohorts.reduce((best, current) => {
    const currentRetention = (current.period1 / current.totalUsers) * 100;
    const bestRetention = (best.period1 / best.totalUsers) * 100;
    return currentRetention > bestRetention ? current : best;
  }, cohorts[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-blue-600" />
          Cohort Retention Analysis
        </CardTitle>
        <CardDescription>
          Track customer retention over time by signup month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">Total Cohorts</span>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900">{cohorts.length}</div>
            <div className="text-xs text-blue-600 mt-1">Signup months tracked</div>
          </div>

          <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">Avg Retention</span>
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900">{avgRetention.toFixed(0)}%</div>
            <div className="text-xs text-green-600 mt-1">Month 1 retention rate</div>
          </div>

          <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">Best Cohort</span>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900">{bestCohort.cohort}</div>
            <div className="text-xs text-purple-600 mt-1">
              {((bestCohort.period1 / bestCohort.totalUsers) * 100).toFixed(0)}% retention
            </div>
          </div>
        </div>

        {/* How to Read This Chart Guide */}
        <div className="p-5 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-xl border-2 border-indigo-200">
          <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-indigo-900">
            <Activity className="h-6 w-6" />
            📊 How to Read This Chart
          </h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                <div>
                  <p className="font-semibold text-gray-900">Read Each Row (Left to Right)</p>
                  <p className="text-sm text-gray-600 mt-1">Each row = One group of customers who signed up in the same month</p>
                  <p className="text-xs text-gray-500 mt-1 italic">Example: "2026-01" row shows 3 customers who joined in January 2026</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                <div>
                  <p className="font-semibold text-gray-900">Follow Their Journey Over Time</p>
                  <p className="text-sm text-gray-600 mt-1">Columns show if they came back to order in each month after signup</p>
                  <p className="text-xs text-gray-500 mt-1 italic">Month 0 = signup month, Month 1 = next month, Month 2 = 2 months later...</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">3</div>
                <div>
                  <p className="font-semibold text-gray-900">Understand the Percentages</p>
                  <p className="text-sm text-gray-600 mt-1">Percentage = How many from that group ordered in that month</p>
                  <p className="text-xs text-gray-500 mt-1 italic">Example: "50%" in Month 1 means half the customers came back</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">4</div>
                <div>
                  <p className="font-semibold text-gray-900">Look for Patterns</p>
                  <p className="text-sm text-gray-600 mt-1">Green = Great! Red = Problem! Compare rows to find trends</p>
                  <p className="text-xs text-gray-500 mt-1 italic">Goal: See more green colors in Month 1, 2, 3 columns</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-200">
            <p className="text-sm text-gray-700">
              <span className="font-bold text-indigo-700">💡 Quick Tip:</span> If you see lots of red (0%) in Month 1 column, it means customers aren't coming back after their first purchase. Time to send follow-up emails or special offers!
            </p>
          </div>
        </div>

        {/* Cohort Table */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-700 border-r">Cohort Month</th>
                  <th className="text-center p-4 font-semibold text-gray-700 border-r">Users</th>
                  <th className="text-center p-4 font-semibold text-blue-700 border-r">Month 0</th>
                  <th className="text-center p-4 font-semibold text-gray-700 border-r">Month 1</th>
                  <th className="text-center p-4 font-semibold text-gray-700 border-r">Month 2</th>
                  <th className="text-center p-4 font-semibold text-gray-700 border-r">Month 3</th>
                  <th className="text-center p-4 font-semibold text-gray-700 border-r">Month 4</th>
                  <th className="text-center p-4 font-semibold text-gray-700">Month 5</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((cohort, idx) => (
                  <tr 
                    key={cohort.cohort} 
                    className={`border-b hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="p-4 font-semibold text-gray-900 border-r">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {cohort.cohort}
                      </div>
                    </td>
                    <td className="text-center p-4 text-gray-700 border-r font-medium">
                      {cohort.totalUsers}
                    </td>
                    <td className={`text-center p-4 border-r bg-blue-50`}>
                      <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-blue-500 text-white font-semibold text-sm min-w-[60px]">
                        100%
                      </span>
                    </td>
                    {[1, 2, 3, 4, 5].map((period) => {
                      const retention = cohort[`period${period}` as keyof CohortData] as number;
                      const percentage = ((retention / cohort.totalUsers) * 100).toFixed(0);
                      return (
                        <td 
                          key={period} 
                          className={`text-center p-4 border-r ${getRetentionBgColor(retention, cohort.totalUsers)}`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-semibold text-sm min-w-[60px] ${getRetentionColor(retention, cohort.totalUsers)}`}>
                              {percentage}%
                            </span>
                            <span className="text-xs text-gray-500">{retention} users</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend and Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-900">
              <Activity className="h-5 w-5" />
              Retention Color Guide
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="inline-block px-3 py-1 rounded-lg bg-green-500 text-white font-semibold min-w-[60px] text-center">50%+</span>
                <span className="text-gray-700">Excellent retention</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block px-3 py-1 rounded-lg bg-yellow-500 text-white font-semibold min-w-[60px] text-center">30-49%</span>
                <span className="text-gray-700">Good retention</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block px-3 py-1 rounded-lg bg-orange-500 text-white font-semibold min-w-[60px] text-center">10-29%</span>
                <span className="text-gray-700">Needs improvement</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block px-3 py-1 rounded-lg bg-red-500 text-white font-semibold min-w-[60px] text-center">&lt;10%</span>
                <span className="text-gray-700">Critical - take action</span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-900">
              <TrendingUp className="h-5 w-5" />
              How to Improve Retention
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600">•</span>
                <span>Send personalized follow-up emails after first purchase</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Offer loyalty rewards for repeat customers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Create targeted campaigns for low-retention cohorts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                <span>Analyze why certain cohorts perform better</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
