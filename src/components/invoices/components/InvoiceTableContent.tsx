import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Invoice } from "../types/invoice.types";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { InvoiceRowActions } from "./InvoiceRowActions";
import { InvoiceTableHeader } from "./InvoiceTableHeader";
import { SortConfig } from "../types/table.types";
import { motion } from "framer-motion";
import { AlertTriangle, Ban, XCircle, FileText, Eye, Mail, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusColor } from "@/components/orders/utils/statusUtils";
import { useState } from "react";
import PaymentForm from "@/components/PaymentModal";

interface InvoiceTableContentProps {
  invoices: Invoice[];
  onSort: (key: string) => void;
  sortConfig: SortConfig | null;
  onActionComplete: () => void;
  onPreview: (invoice: Invoice) => void;
}

export function InvoiceTableContent({
  invoices,
  onSort,
  sortConfig,
  onActionComplete,
  onPreview
}: InvoiceTableContentProps) {
  const [selectCustomerInfo, setSelectCustomerInfo] = useState<any>({});
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Format currency with alignment
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date nicely
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Get payment status styling
  const getPaymentStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "unpaid":
        return "bg-red-100 text-red-700 border-red-200";
      case "partial":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="overflow-hidden">
      <Table>
        <InvoiceTableHeader onSort={onSort} sortConfig={sortConfig} />
        <TableBody>
          {invoices.map((invoice, index) => {
            const isHovered = hoveredRow === invoice.id;
            const isEvenRow = index % 2 === 0;
            
            return (
              <motion.tr
                key={invoice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={`
                  group cursor-pointer transition-all duration-200
                  ${isEvenRow ? 'bg-white' : 'bg-gray-50/50'}
                  ${isHovered ? 'bg-blue-50/70 shadow-sm' : 'hover:bg-blue-50/50'}
                  ${invoice.void ? 'opacity-60' : ''}
                `}
                onMouseEnter={() => setHoveredRow(invoice.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Invoice Number */}
                <TableCell 
                  className="font-mono text-sm font-medium text-gray-900 py-4"
                  onClick={() => onPreview(invoice)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <span>{invoice.invoice_number}</span>
                  </div>
                </TableCell>

                {/* Order Number */}
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{invoice.orders?.order_number}</span>
                    {invoice?.purchase_number_external && (
                      <span className="text-xs text-gray-500 mt-0.5">
                        PO: {invoice.purchase_number_external}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Customer */}
                <TableCell className="py-4">
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-gray-900">
                      {typeof invoice.customer_info === "object" &&
                        invoice.customer_info !== null &&
                        "name" in invoice.customer_info
                        ? String(invoice.customer_info.name)
                        : `${invoice.profiles?.first_name ?? ""} ${invoice.profiles?.last_name ?? ""}`.trim()}
                    </span>

                    {/* Status badges */}
                    <div className="flex gap-1 mt-1">
                      {invoice.void && (
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Voided
                        </Badge>
                      )}
                      {!invoice.void && invoice.status === "cancelled" && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          <XCircle className="w-3 h-3 mr-1" />
                          Cancelled
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Amount */}
                <TableCell className="py-4 text-right font-mono">
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(invoice.amount)}
                  </span>
                </TableCell>

                {/* Payment Status */}
                <TableCell className="py-4">
                  <div className="flex items-center justify-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`font-medium ${getPaymentStatusStyle(invoice.orders?.payment_status || "unpaid")}`}
                    >
                      {(invoice.orders?.payment_status || "UNPAID").toUpperCase()}
                    </Badge>
                    
                    {invoice.orders?.payment_status?.toLowerCase() === "unpaid" && 
                     !invoice.orders.void && 
                     invoice.status !== "cancelled" && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectCustomerInfo(invoice.orders);
                          setModalIsOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 h-7"
                      >
                        Pay Now
                      </Button>
                    )}
                  </div>
                </TableCell>

                {/* Date */}
                <TableCell className="py-4 text-gray-600">
                  {formatDate(invoice.created_at)}
                </TableCell>

                {/* Actions */}
                <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                  <div className={`
                    flex items-center justify-end gap-1 transition-opacity duration-200
                    ${isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  `}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                      onClick={() => onPreview(invoice)}
                      title="View Invoice"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <InvoiceRowActions 
                      invoice={invoice} 
                      onPreview={onPreview} 
                      onActionComplete={onActionComplete} 
                    />
                  </div>
                </TableCell>
              </motion.tr>
            );
          })}
          
          {invoices.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-16">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No invoices found</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search criteria</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {modalIsOpen && selectCustomerInfo && (
        <PaymentForm
          modalIsOpen={modalIsOpen}
          setModalIsOpen={setModalIsOpen}
          customer={selectCustomerInfo.customerInfo}
          amountP={selectCustomerInfo.total_amount}
          orderId={selectCustomerInfo.id}
          orders={selectCustomerInfo}
        />
      )}
    </div>
  );
}
