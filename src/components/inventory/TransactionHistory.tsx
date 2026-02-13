import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InventoryTransactionService, InventoryTransaction } from '@/services/inventoryTransactionService';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, Package, RefreshCw, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TransactionHistoryProps {
  productId?: string;
  limit?: number;
}

export function TransactionHistory({ productId, limit = 50 }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [productId]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      if (productId) {
        const data = await InventoryTransactionService.getProductHistory(productId, limit);
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    const negativeTypes = ['sale', 'damage', 'expired', 'theft'];
    return negativeTypes.includes(type) ? (
      <ArrowDown className="h-4 w-4 text-red-500" />
    ) : (
      <ArrowUp className="h-4 w-4 text-green-500" />
    );
  };

  const getTransactionBadge = (type: string) => {
    const colors: Record<string, string> = {
      sale: 'bg-blue-100 text-blue-800',
      receipt: 'bg-green-100 text-green-800',
      adjustment: 'bg-yellow-100 text-yellow-800',
      return: 'bg-purple-100 text-purple-800',
      restoration: 'bg-cyan-100 text-cyan-800',
      transfer: 'bg-indigo-100 text-indigo-800',
      damage: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800',
      theft: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>
        {type.toUpperCase()}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Quantity', 'Previous Stock', 'New Stock', 'Notes'];
    const rows = transactions.map(t => [
      format(new Date(t.created_at!), 'yyyy-MM-dd HH:mm:ss'),
      t.type,
      t.quantity,
      t.previous_stock,
      t.new_stock,
      t.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-transactions-${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadTransactions}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {transactions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                {getTransactionIcon(transaction.type)}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getTransactionBadge(transaction.type)}
                    <span className="text-sm text-gray-600">
                      {format(new Date(transaction.created_at!), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  {transaction.notes && (
                    <p className="text-sm text-gray-600">{transaction.notes}</p>
                  )}
                  {transaction.reference_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Ref: {transaction.reference_id.slice(0, 8)}...
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold text-lg ${
                  transaction.quantity > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.quantity > 0 ? '+' : ''}
                  {transaction.quantity} units
                </div>
                <div className="text-sm text-gray-600">
                  {transaction.previous_stock} → {transaction.new_stock}
                </div>
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No transactions recorded yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Transactions will appear here when stock movements occur
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
