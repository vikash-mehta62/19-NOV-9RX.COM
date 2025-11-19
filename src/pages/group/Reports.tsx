import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useMemo } from "react";

export default function GroupReports() {
  // Use useMemo to create a stable reference for the reports array
  const reports = useMemo(() => [
    { 
      id: "1",
      name: "Monthly Order Summary", 
      date: "March 2024", 
      type: "PDF",
      downloadUrl: "#" 
    },
    { 
      id: "2",
      name: "Location Performance", 
      date: "Q1 2024", 
      type: "Excel",
      downloadUrl: "#"
    },
    { 
      id: "3",
      name: "Inventory Status", 
      date: "March 2024", 
      type: "PDF",
      downloadUrl: "#"
    },
  ], []);

  const handleDownload = (reportId: string) => {
    // console.log(`Downloading report ${reportId}`);
    // Add download logic here
  };

  return (
    <DashboardLayout role="group">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Access and download your reports</p>
        </div>

        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{report.name}</h3>
                  <p className="text-sm text-muted-foreground">{report.date}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownload(report.id)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download {report.type}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}