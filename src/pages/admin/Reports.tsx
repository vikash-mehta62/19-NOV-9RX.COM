import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { 
  FileText, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Download
} from "lucide-react";
import { ReportingService } from "@/services/reportingService";
import { toast } from "sonner";

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<any>(null);

  const reports = [
    {
      id: 'inventory_valuation',
      name: 'Inventory Valuation',
      description: 'Total inventory value by product and category',
      icon: Package,
      color: 'text-blue-600'
    },
    {
      id: 'stock_movement',
      name: 'Stock Movement',
      description: 'Inbound and outbound stock analysis',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      id: 'abc_analysis',
      name: 'ABC Analysis',
      description: 'Product classification by value contribution',
      icon: FileText,
      color: 'text-purple-600'
    },
    {
      id: 'slow_moving',
      name: 'Slow-Moving Stock',
      description: 'Products with low turnover rates',
      icon: AlertTriangle,
      color: 'text-orange-600'
    },
    {
      id: 'stock_accuracy',
      name: 'Stock Accuracy',
      description: 'Cycle count accuracy metrics',
      icon: CheckCircle,
      color: 'text-teal-600'
    },
    {
      id: 'reorder',
      name: 'Reorder Report',
      description: 'Products below reorder point',
      icon: RefreshCw,
      color: 'text-red-600'
    }
  ];

  const generateReport = async (reportId: string) => {
    setLoading(true);
    try {
      let result = null;

      switch (reportId) {
        case 'inventory_valuation':
          result = await ReportingService.generateInventoryValuationReport();
          break;
        case 'stock_movement':
          const endDate = new Date().toISOString();
          const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          result = await ReportingService.generateStockMovementReport({ startDate, endDate });
          break;
        case 'abc_analysis':
          result = await ReportingService.generateABCAnalysisReport();
          break;
        case 'slow_moving':
          result = await ReportingService.generateSlowMovingStockReport(90);
          break;
        case 'stock_accuracy':
          result = await ReportingService.generateStockAccuracyReport();
          break;
        case 'reorder':
          result = await ReportingService.generateReorderReport();
          break;
      }

      if (result) {
        setActiveReport({ id: reportId, ...result });
        toast.success('Report generated successfully');
      } else {
        toast.error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error generating report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Advanced Reports
            </h1>
            <p className="text-base text-muted-foreground">
              Generate comprehensive inventory and business intelligence reports
            </p>
          </div>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate">Generate Reports</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
            <TabsTrigger value="history">Report History</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => {
                const Icon = report.icon;
                return (
                  <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg bg-gray-50 ${report.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{report.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                    <Button
                      onClick={() => generateReport(report.id)}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? 'Generating...' : 'Generate Report'}
                    </Button>
                  </Card>
                );
              })}
            </div>

            {activeReport && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">
                    {reports.find(r => r.id === activeReport.id)?.name}
                  </h3>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>

                {/* Summary Section */}
                {activeReport.summary && (
                  <div className="grid gap-4 md:grid-cols-4 mb-6">
                    {Object.entries(activeReport.summary).map(([key, value]: [string, any]) => (
                      <div key={key} className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-2xl font-bold">
                          {typeof value === 'number' 
                            ? value.toLocaleString(undefined, { 
                                maximumFractionDigits: 2 
                              })
                            : value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Data Table */}
                {activeReport.data && activeReport.data.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(activeReport.data[0]).slice(0, 6).map((key) => (
                            <th key={key} className="px-4 py-2 text-left font-semibold capitalize">
                              {key.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeReport.data.slice(0, 20).map((row: any, idx: number) => (
                          <tr key={idx} className="border-t hover:bg-gray-50">
                            {Object.entries(row).slice(0, 6).map(([key, value]: [string, any], i) => (
                              <td key={i} className="px-4 py-2">
                                {typeof value === 'number'
                                  ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                  : typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {activeReport.data.length > 20 && (
                      <p className="text-sm text-gray-500 mt-4 text-center">
                        Showing 20 of {activeReport.data.length} records
                      </p>
                    )}
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="scheduled">
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Scheduled reports feature coming soon</p>
              <p className="text-sm text-gray-400 mt-2">
                Automate report generation on daily, weekly, or monthly schedules
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Report history feature coming soon</p>
              <p className="text-sm text-gray-400 mt-2">
                View and download previously generated reports
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
