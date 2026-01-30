import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function POItemsChecker() {
  const [poNumber, setPONumber] = useState("PO-9RX000196");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkPOItems = async () => {
    setLoading(true);
    try {
      // Get order by PO number
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, created_at, poApproved')
        .eq('order_number', poNumber)
        .single();

      if (orderError) throw orderError;

      console.log('📦 Order found:', order);

      // Get order_items
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      if (itemsError) throw itemsError;

      console.log('✅ Order Items:', items);
      console.table(items);

      setResult({
        order,
        items,
        itemsCount: items?.length || 0,
      });
    } catch (error) {
      console.error('❌ Error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>🔍 PO Items Checker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={poNumber}
            onChange={(e) => setPONumber(e.target.value)}
            placeholder="Enter PO Number (e.g., PO-9RX000196)"
          />
          <Button onClick={checkPOItems} disabled={loading}>
            {loading ? "Checking..." : "Check"}
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            {result.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-600 font-semibold">❌ Error:</p>
                <p className="text-red-800">{result.error}</p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="font-semibold text-blue-900">📦 Order Info:</p>
                  <p className="text-sm text-blue-800">ID: {result.order.id}</p>
                  <p className="text-sm text-blue-800">Number: {result.order.order_number}</p>
                  <p className="text-sm text-blue-800">Amount: ${result.order.total_amount}</p>
                  <p className="text-sm text-blue-800">
                    Type: {result.order.poApproved ? 'Purchase Order' : 'Sales Order'}
                  </p>
                </div>

                <div className={`p-4 border rounded ${
                  result.itemsCount > 0 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <p className={`font-semibold ${
                    result.itemsCount > 0 ? 'text-green-900' : 'text-yellow-900'
                  }`}>
                    {result.itemsCount > 0 ? '✅' : '⚠️'} Order Items: {result.itemsCount}
                  </p>
                  {result.itemsCount === 0 && (
                    <p className="text-sm text-yellow-800 mt-2">
                      No order_items found. This PO was created before the fix.
                    </p>
                  )}
                </div>

                {result.items && result.items.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 border text-left">Product ID</th>
                          <th className="p-2 border text-right">Quantity</th>
                          <th className="p-2 border text-right">Price</th>
                          <th className="p-2 border text-right">Total</th>
                          <th className="p-2 border text-left">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2 border text-xs">{item.product_id}</td>
                            <td className="p-2 border text-right">{item.quantity}</td>
                            <td className="p-2 border text-right">${item.price?.toFixed(2)}</td>
                            <td className="p-2 border text-right">${item.total_price?.toFixed(2)}</td>
                            <td className="p-2 border text-xs">{item.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="p-3 bg-gray-50 border rounded text-xs">
                  <p className="font-semibold mb-1">💡 Console Output:</p>
                  <p className="text-gray-600">Check browser console (F12) for detailed logs</p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
