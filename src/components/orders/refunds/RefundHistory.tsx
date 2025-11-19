import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefundTransaction } from "../types/refund.types";

interface RefundHistoryProps {
  refunds: RefundTransaction[];
}

export function RefundHistory({ refunds }: RefundHistoryProps) {
  const totalRefunded = refunds.reduce((sum, refund) => sum + refund.amount, 0);

  const getStatusColor = (status: RefundTransaction['status']) => {
    switch (status) {
      case 'completed':
        return "bg-green-100 text-green-800 border-green-200";
      case 'pending':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'failed':
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between">
          <span>Refund History</span>
          <span className="text-muted-foreground">
            Total Refunded: ${totalRefunded.toFixed(2)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Items Returned</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.map((refund, index) => (
              <TableRow key={refund.id || index}>
                <TableCell>
                  {new Date(refund.date).toLocaleDateString()}
                </TableCell>
                <TableCell>${refund.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {refund.refundMethod.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {refund.itemsReturned}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {refund.reason}
                </TableCell>
                <TableCell>
                  {refund.accountingReference || '-'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={getStatusColor(refund.status)}
                  >
                    {refund.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}