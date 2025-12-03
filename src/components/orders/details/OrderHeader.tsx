import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Copy, Edit, Download, Trash2, Package } from "lucide-react";
import { OrderFormValues } from "../schemas/orderSchema";
import { useToast } from "@/hooks/use-toast";

interface OrderHeaderProps {
  order: OrderFormValues;
  onEdit?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  isGeneratingPDF?: boolean;
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
  poIs?: boolean;
}

const statusConfig = {
  pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "Pending" },
  confirmed: { color: "bg-blue-100 text-blue-800 border-blue-300", label: "Confirmed" },
  processing: { color: "bg-purple-100 text-purple-800 border-purple-300", label: "Processing" },
  shipped: { color: "bg-indigo-100 text-indigo-800 border-indigo-300", label: "Shipped" },
  delivered: { color: "bg-green-100 text-green-800 border-green-300", label: "Delivered" },
  cancelled: { color: "bg-red-100 text-red-800 border-red-300", label: "Cancelled" },
  refunded: { color: "bg-gray-100 text-gray-800 border-gray-300", label: "Refunded" },
};

export const OrderHeader = ({
  order,
  onEdit,
  onDownload,
  onDelete,
  isGeneratingPDF,
  userRole,
  poIs,
}: OrderHeaderProps) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Order number copied to clipboard",
      duration: 2000,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  };

  const status = statusConfig[order.status] || statusConfig.pending;

  return (
    <Card className="p-4 md:p-6 mb-4 md:mb-6 border-2">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Left Section */}
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-bold">#{order.order_number}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(order.order_number)}
              className="h-8 w-8 p-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(order.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatTime(order.date)}
            </span>
          </div>

          <Badge className={`${status.color} border px-3 py-1 text-xs md:text-sm font-semibold`}>
            {status.label}
          </Badge>

          {order.payment_status && (
            <Badge
              className={`${
                order.payment_status === "paid"
                  ? "bg-green-100 text-green-800 border-green-300"
                  : "bg-red-100 text-red-800 border-red-300"
              } border px-3 py-1 text-xs md:text-sm font-semibold ml-2`}
            >
              {order.payment_status === "paid" ? "Paid" : "Unpaid"}
            </Badge>
          )}
        </div>

        {/* Right Section */}
        <div className="flex flex-col md:items-end gap-3">
          <div className="text-2xl md:text-3xl font-bold text-primary">
            ${parseFloat(order.total || "0").toFixed(2)}
          </div>

          <div className="flex flex-wrap gap-2">
            {userRole === "admin" && order.status !== "cancelled" && !order.void && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-1">
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            )}

            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
                disabled={isGeneratingPDF}
                className="gap-1"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isGeneratingPDF ? "Generating..." : "PDF"}
                </span>
              </Button>
            )}

            {userRole === "admin" && onDelete && (
              <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1">
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
