
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Send, DollarSign, Clock, Ban, Bell, RefreshCcw } from "lucide-react";
import { Invoice } from "./types/invoice.types";
import { InvoiceAction, handleInvoiceAction, shouldShowReminder } from "./utils/invoiceWorkflow";
import { ProcessRefundDialog } from "../orders/refunds/ProcessRefundDialog";
import { useState } from "react";

interface InvoiceActionsProps {
  invoice: Invoice;
  onActionComplete?: () => void;
}

export function InvoiceActions({ invoice, onActionComplete }: InvoiceActionsProps) {
  const [showRefundDialog, setShowRefundDialog] = useState(false);

  const handleAction = async (action: InvoiceAction) => {
    await handleInvoiceAction(invoice, action);
    onActionComplete?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {invoice.status === "pending" && (
            <>
              <DropdownMenuItem onClick={() => handleAction("mark_paid")}>
                <DollarSign className="mr-2 h-4 w-4" />
                Mark as Paid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("mark_overdue")}>
                <Clock className="mr-2 h-4 w-4" />
                Mark as Overdue
              </DropdownMenuItem>
            </>
          )}
          {invoice.status === "overdue" && (
            <DropdownMenuItem onClick={() => handleAction("mark_paid")}>
              <DollarSign className="mr-2 h-4 w-4" />
              Mark as Paid
            </DropdownMenuItem>
          )}
          {shouldShowReminder(invoice) && (
            <DropdownMenuItem onClick={() => handleAction("remind")}>
              <Bell className="mr-2 h-4 w-4" />
              Send Reminder
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => handleAction("send")}>
            <Send className="mr-2 h-4 w-4" />
            Resend Invoice
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowRefundDialog(true)}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Process Refund
          </DropdownMenuItem>
          {/* <DropdownMenuItem onClick={() => handleAction("cancel")} className="text-red-600">
            <Ban className="mr-2 h-4 w-4" />
            Cancel Invoice
          </DropdownMenuItem> */}
        </DropdownMenuContent>
      </DropdownMenu>

      {showRefundDialog && (
        <ProcessRefundDialog
          orderId={invoice.order_id || ''}
          orderTotal={invoice.total_amount}
          originalTransactionId=""
          open={showRefundDialog}
          onOpenChange={setShowRefundDialog}
        />
      )}
    </>
  );
}
