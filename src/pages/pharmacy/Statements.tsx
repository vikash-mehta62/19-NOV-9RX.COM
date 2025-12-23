import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileBarChart, TrendingUp, TrendingDown, Eye, Mail, Printer, Download, Loader2, Calendar
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { statementPDFGenerator } from "@/utils/statement-pdf-generator";
import { statementService } from "@/services/statementService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Statement {
  id: string;
  period: string;
  start_date: string;
  end_date: string;
  opening_balance: number;
  closing_balance: number;
  total_purchases: number;
  total_payments: number;
  status: string;
}

const Statements = () => {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const { toast } = useToast();

  // Generate available years (current year and 2 previous years)
  const availableYears = Array.from({ length: 3 }, (_, i) => 
    (new Date().getFullYear() - i).toString()
  );

  const fetchStatements = useCallback(async () => {
    if (!userProfile?.id) return;
    
    setLoading(true);
    try {
      const year = parseInt(selectedYear);
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      // Generate statements for each month of the selected year
      const monthlyStatements: Statement[] = [];
      
      // Determine how many months to show (all 12 for past years, up to current month for current year)
      const monthsToShow = year < currentYear ? 12 : currentMonth + 1;
      
      for (let month = monthsToShow - 1; month >= 0; month--) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999); // Last day of month
        
        try {
          const statementData = await statementService.fetchStatementData(
            userProfile.id,
            startDate,
            endDate
          );
          
          const monthName = startDate.toLocaleString('default', { month: 'long' });
          const isCurrentMonth = year === currentYear && month === currentMonth;
          
          monthlyStatements.push({
            id: `${year}-${month}`,
            period: `${monthName} ${year}`,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            opening_balance: statementData.openingBalance,
            closing_balance: statementData.closingBalance,
            total_purchases: statementData.totalPurchases,
            total_payments: statementData.totalPayments,
            status: isCurrentMonth ? "current" : "available"
          });
        } catch (err) {
          console.error(`Error fetching statement for ${month}/${year}:`, err);
        }
      }
      
      setStatements(monthlyStatements);
    } catch (error) {
      console.error("Error fetching statements:", error);
      toast({
        title: "Error",
        description: "Failed to load statements. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id, selectedYear, toast]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  const handleDownloadStatement = async (statement: Statement) => {
    if (!userProfile?.id) return;
    
    setDownloadingId(statement.id);
    try {
      const startDate = new Date(statement.start_date);
      const endDate = new Date(statement.end_date);
      endDate.setHours(23, 59, 59, 999);
      
      const statementData = await statementService.fetchStatementData(
        userProfile.id,
        startDate,
        endDate
      );
      
      // Get user profile for PDF
      const profile = await statementService.getUserProfile(userProfile.id);
      
      // Generate PDF using the correct interface
      const pdfBlob = await statementPDFGenerator.createPDF(statementData, profile);
      
      // Download PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `statement_${statement.period.replace(' ', '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Statement downloaded successfully"
      });
    } catch (error) {
      console.error("Error downloading statement:", error);
      toast({
        title: "Error",
        description: "Failed to download statement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrintStatement = async (statement: Statement) => {
    if (!userProfile?.id) return;
    
    setDownloadingId(statement.id);
    try {
      const startDate = new Date(statement.start_date);
      const endDate = new Date(statement.end_date);
      endDate.setHours(23, 59, 59, 999);
      
      const statementData = await statementService.fetchStatementData(
        userProfile.id,
        startDate,
        endDate
      );
      
      const profile = await statementService.getUserProfile(userProfile.id);
      
      const pdfBlob = await statementPDFGenerator.createPDF(statementData, profile);
      
      // Open in new window for printing
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error("Error printing statement:", error);
      toast({
        title: "Error",
        description: "Failed to print statement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const currentStatement = statements.find(s => s.status === "current");

  if (loading) {
    return (
      <DashboardLayout role="pharmacy">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileBarChart className="w-6 h-6 text-indigo-600" />
              Account Statements
            </h1>
            <p className="text-gray-500 mt-1">View and download your monthly account statements</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current Balance Card */}
        {currentStatement && (
          <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-indigo-200 text-sm">Current Balance</p>
                  <h2 className="text-3xl font-bold mt-1">${currentStatement.closing_balance.toFixed(2)}</h2>
                  <p className="text-indigo-200 text-sm mt-2">
                    Statement Period: {currentStatement.period}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-white/10 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 text-indigo-200 text-sm">
                      <TrendingUp className="w-4 h-4" />
                      Purchases
                    </div>
                    <p className="text-xl font-semibold mt-1">${currentStatement.total_purchases.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 text-indigo-200 text-sm">
                      <TrendingDown className="w-4 h-4" />
                      Payments
                    </div>
                    <p className="text-xl font-semibold mt-1">${currentStatement.total_payments.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Statements Message */}
        {statements.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileBarChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Statements Available</h3>
              <p className="text-gray-500 mt-2">
                No account activity found for {selectedYear}. Statements will appear here once you have transactions.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Statements Table */}
        {statements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statement History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Opening Balance</TableHead>
                    <TableHead>Purchases</TableHead>
                    <TableHead>Payments</TableHead>
                    <TableHead>Closing Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((statement) => (
                    <TableRow key={statement.id}>
                      <TableCell className="font-medium">{statement.period}</TableCell>
                      <TableCell>${statement.opening_balance.toFixed(2)}</TableCell>
                      <TableCell className="text-red-600">+${statement.total_purchases.toFixed(2)}</TableCell>
                      <TableCell className="text-green-600">-${statement.total_payments.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">${statement.closing_balance.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={statement.status === "current" ? "default" : "secondary"}>
                          {statement.status === "current" ? "Current" : "Available"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadStatement(statement)}
                            disabled={downloadingId === statement.id}
                          >
                            {downloadingId === statement.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handlePrintStatement(statement)}
                            disabled={downloadingId === statement.id}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Statements;
