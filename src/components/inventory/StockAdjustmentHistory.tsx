
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
import { ScrollArea } from "@/components/ui/scroll-area";

const mockAdjustments = [
  // {
  //   id: 1,
  //   date: "2024-03-20",
  //   product: "20 DRAM VIALS",
  //   type: "add",
  //   quantity: 100,
  //   reason: "New Purchase",
  //   notes: "Restocking order #12345",
  // },
  // {
  //   id: 2,
  //   date: "2024-03-19",
  //   product: "Thermal RX Labels",
  //   type: "remove",
  //   quantity: 5,
  //   reason: "Damaged/Expired",
  //   notes: "Water damage",
  // },
];

export const StockAdjustmentHistory = () => {
  return (
    <Card className="transition-all duration-200 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Stock Adjustment History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[150px]">Product</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[100px] text-right">Quantity</TableHead>
                  <TableHead className="w-[120px]">Reason</TableHead>
                  <TableHead className="hidden md:table-cell w-[200px]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAdjustments.map((adjustment) => (
                  <TableRow key={adjustment.id} className="hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap">{adjustment.date}</TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">{adjustment.product}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          adjustment.type === "add"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        }
                      >
                        {adjustment.type === "add" ? "Added" : "Removed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{adjustment.quantity}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{adjustment.reason}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                      {adjustment.notes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
