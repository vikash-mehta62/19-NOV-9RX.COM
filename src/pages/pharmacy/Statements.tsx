import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileBarChart, TrendingUp, TrendingDown, Eye, Mail, Printer, Download, Loader2, Calendar
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { statementPDFGenerator } from "@/utils/statement-pdf-generator";
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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const userProfile = useSelector((state: RootState) => state.user.profile);

  useEffect(() => {
    // Simulated statements data - replace with actual API call
    const mockStatements: Statement[] = [
      {
        id: "1",
        period: "December 2024",
        start_date: "2024-12-01",
        end_date: "2024-12-31",
        opening_balance: 1250.00,
        closing_balance: 890.50,
        total_purchases: 2340.50,
        total_payments: 2700.00,
        status: "current"
      },
      {
        id: "2",
        period: "November 2024",
        start_date: "2024-11-01",
        end_date: "2024-11-30",
        opening_balance: 800.00,
        closing_balance: 1250.00,
        total_purchases: 1850.00,
        total_payments: 1400.00,
        status: "available"
      },
      {
        id: "3",
        period: "October 2024",
        start_date: "2024-10-01",
        end_date: "2024-10-31",
        opening_balance: 450.00,
        closing_balance: 800.00,
        total_purchases: 1200.00,
        total_payments: 850.00,
        status: "available"
      },
    ];
    
    setTimeout(() => {
      setStatements(mockStatements);
      setLoading(false);
    }, 500);
  }, [userProfile]);

  const currentStatement = statements.find(s => s.status === "current");

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
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Mail className="w-4 h-4" />
              Email Statement
            </Button>
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

        {/* Statements Table */}
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
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
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
      </div>
    </DashboardLayout>
  );
};

export default Statements;
