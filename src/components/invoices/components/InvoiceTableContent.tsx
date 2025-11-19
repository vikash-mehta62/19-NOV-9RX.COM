
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
import { AlertTriangle, Ban, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge";
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
  console.log("invoices", invoices)
  return (
    <div className="rounded-md border">
      <Table>
        <InvoiceTableHeader onSort={onSort} sortConfig={sortConfig} />
        <TableBody>
          {invoices.map((invoice, index) => (
            <motion.tr
              key={invoice.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="hover:bg-muted/50 cursor-pointer"

            >
              <TableCell className="text-center" onClick={() => onPreview(invoice)}>{invoice.invoice_number}</TableCell>
              <TableCell className="text-center">
                <p className="font-medium">{invoice.orders?.order_number}</p>
                {invoice?.purchase_number_external && (
                  <p className="text-xs text-gray-500 mt-1">
                    PO - {invoice.purchase_number_external}
                  </p>
                )}
              </TableCell>

              <TableCell className="text-center">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-base font-semibold text-gray-800">
                    {typeof invoice.customer_info === "object" &&
                      invoice.customer_info !== null &&
                      "name" in invoice.customer_info
                      ? invoice.customer_info.name
                      : `${invoice.profiles?.first_name ?? ""} ${invoice.profiles?.last_name ?? ""}`.trim()}
                  </span>

                  {/* Voided badge */}
                  {invoice.void && (
                    <div className="mt-1 flex items-center gap-1 text-yellow-800 text-xs font-medium bg-yellow-100 px-2 py-1 rounded-full">
                      <AlertTriangle size={14} className="stroke-[2.5]" />
                      Voided
                    </div>
                  )}

                  {/* Cancelled badge */}
                  {!invoice.void && invoice.status === "cancelled" && (
                    <div className="mt-1 flex items-center gap-1 text-red-700 text-xs font-medium bg-red-100 px-2 py-1 rounded-full">
                      <XCircle size={14} className="stroke-[2.5]" />
                      Cancelled
                    </div>
                  )}

                </div>
              </TableCell>
              <TableCell className="text-center">${invoice.amount.toFixed(2)}</TableCell>
              {/* <TableCell className="text-center">
                <InvoiceStatusBadge status={invoice.payment_status} />
              </TableCell> */}

              <TableCell className="text-center border-gray-300">
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className={getStatusColor(invoice.orders?.payment_status || "")}>
                    {invoice.orders?.payment_status.toUpperCase() || "UNPAID"}
                  </Badge>
                  {
                    invoice.orders?.payment_status.toLowerCase() === "unpaid"
                    && !invoice.orders.void && invoice.status !== "cancelled" && (
                      <button
                        onClick={() => {
                          console.log("Cliced")
                          setSelectCustomerInfo(invoice.orders);
                          setModalIsOpen(true);
                        }}
                        className="bg-green-600 text-[14px] text-white px-5 py-1 rounded-md transition"
                      >
                        Pay
                      </button>
                    )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                {/* {new Date(invoice.created_at).toLocaleDateString()}  */}

                {(() => {
                  const dateObj = new Date(invoice.created_at);
                  const formattedDate = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  });
                  const formattedTime = dateObj.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });
                  return (
                    <>
                      {formattedDate} <br />

                    </>
                  );
                })()}
              </TableCell>
              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                <InvoiceRowActions invoice={invoice} onPreview={onPreview} onActionComplete={onActionComplete} />
              </TableCell>
            </motion.tr>
          ))}
          {invoices.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No invoices found
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
