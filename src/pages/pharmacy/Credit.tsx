import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wallet, CreditCard, DollarSign, 
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle,
  AlertCircle, TrendingUp
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { format } from "date-fns";

interface CreditTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  balance: number;
}

const Credit = () => {
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const [loading, setLoading] = useState(true);
  
  // Credit info from user profile or defaults - ensure they are numbers
  const creditLimit = Number(userProfile?.credit_limit) || 5000;
  const creditUsed = Number(userProfile?.credit_used) || 1250;
  const availableCredit = creditLimit - creditUsed;
  const creditPercentage = creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0;
  const creditDays = Number(userProfile?.credit_days) || 30;

  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);

  useEffect(() => {
    // Mock transactions - replace with actual API
    const mockTransactions: CreditTransaction[] = [
      { id: "1", date: "2024-12-10", description: "Order #ORD-2024-001", amount: 450.00, type: "debit", balance: 1250.00 },
      { id: "2", date: "2024-12-08", description: "Payment Received", amount: 500.00, type: "credit", balance: 800.00 },
      { id: "3", date: "2024-12-05", description: "Order #ORD-2024-002", amount: 320.00, type: "debit", balance: 1300.00 },
      { id: "4", date: "2024-12-01", description: "Payment Received", amount: 1000.00, type: "credit", balance: 980.00 },
      { id: "5", date: "2024-11-28", description: "Order #ORD-2024-003", amount: 680.00, type: "debit", balance: 1980.00 },
    ];
    
    setTimeout(() => {
      setTransactions(mockTransactions);
      setLoading(false);
    }, 500);
  }, []);

  const getCreditStatusColor = () => {
    if (creditPercentage >= 90) return "text-red-600";
    if (creditPercentage >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getCreditProgressColor = () => {
    if (creditPercentage >= 90) return "bg-red-500";
    if (creditPercentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-green-600" />
              Credit Balance
            </h1>
            <p className="text-gray-500 mt-1">Manage your credit account and view transactions</p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700 gap-2">
            <CreditCard className="w-4 h-4" />
            Make Payment
          </Button>
        </div>

        {/* Credit Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Available Credit */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Available Credit</p>
                  <h2 className="text-3xl font-bold text-green-700 mt-1">
                    ${availableCredit.toFixed(2)}
                  </h2>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Used */}
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Credit Used</p>
                  <h2 className="text-3xl font-bold text-orange-700 mt-1">
                    ${creditUsed.toFixed(2)}
                  </h2>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Limit */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Credit Limit</p>
                  <h2 className="text-3xl font-bold text-blue-700 mt-1">
                    ${creditLimit.toFixed(2)}
                  </h2>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Credit Usage Progress */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Credit Utilization</h3>
              <span className={`font-bold ${getCreditStatusColor()}`}>
                {creditPercentage.toFixed(1)}% Used
              </span>
            </div>
            <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full ${getCreditProgressColor()} transition-all duration-500`}
                style={{ width: `${creditPercentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span>$0</span>
              <span>${creditLimit.toFixed(2)}</span>
            </div>
            
            {/* Credit Terms */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Payment Terms: Net {creditDays} Days</span>
              </div>
              {creditPercentage >= 80 && (
                <div className="flex items-center gap-2 mt-2 text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">You're approaching your credit limit. Consider making a payment.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${transaction.type === "credit" ? "bg-green-100" : "bg-red-100"}`}>
                      {transaction.type === "credit" ? (
                        <ArrowDownRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(transaction.date), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                      {transaction.type === "credit" ? "-" : "+"}${transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">Balance: ${transaction.balance.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Credit;
