import { useState, Dispatch, SetStateAction } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const refundFormSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a valid number greater than 0",
  }),
  reason: z.string().min(1, "Reason is required"),
  itemsReturned: z.string().min(1, "Please specify returned items"),
  notes: z.string().optional(),
  refundMethod: z.enum(["original_payment", "store_credit", "bank_transfer"]),
  accountingReference: z.string().optional(),
});

type RefundFormValues = z.infer<typeof refundFormSchema>;

export interface ProcessRefundDialogProps {
  orderId: string;
  orderTotal: number;
  originalTransactionId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProcessRefundDialog({ 
  orderId, 
  orderTotal,
  originalTransactionId = "",
  open,
  onOpenChange
}: ProcessRefundDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<RefundFormValues>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: {
      amount: "",
      reason: "",
      itemsReturned: "",
      notes: "",
      refundMethod: "original_payment",
      accountingReference: "",
    },
  });

  const onSubmit = async (data: RefundFormValues) => {
    try {
      setIsProcessing(true);
      const refundAmount = Number(data.amount);

      // Validate refund amount against order total
      if (refundAmount > orderTotal) {
        toast({
          title: "Error",
          description: "Refund amount cannot exceed order total",
          variant: "destructive",
        });
        return;
      }

      // Process refund through Authorize.net
      if (data.refundMethod === "original_payment") {
        console.log("Processing refund through Authorize.net:", {
          transactionId: originalTransactionId,
          amount: refundAmount,
        });
      }

      // Create refund transaction record
      const refundTransaction = {
        type: "refund" as const,
        orderId,
        amount: refundAmount,
        date: new Date().toISOString(),
        reason: data.reason,
        itemsReturned: data.itemsReturned,
        notes: data.notes,
        refundMethod: data.refundMethod,
        processedBy: "current_user", // Replace with actual user ID
        accountingReference: data.accountingReference,
        originalTransactionId,
        status: "completed" as const,
      };

      console.log("Refund transaction logged:", refundTransaction);

      toast({
        title: "Refund Processed",
        description: `Refund of $${refundAmount.toFixed(2)} has been processed for order #${orderId}`,
      });

      onOpenChange?.(false);
      form.reset();
    } catch (error) {
      console.error("Refund processing error:", error);
      toast({
        title: "Error",
        description: "Failed to process refund. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Refund Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter refund amount"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum refund amount: ${orderTotal.toFixed(2)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="refundMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Refund Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select refund method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="original_payment">Original Payment Method</SelectItem>
                      <SelectItem value="store_credit">Store Credit</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemsReturned"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Items Returned</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="List items being returned"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Refund</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter reason for refund"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountingReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accounting Reference (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter accounting reference"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    For internal accounting purposes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert>
              <AlertDescription>
                Please ensure all returned items have been received and inspected before processing the refund.
              </AlertDescription>
            </Alert>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Process Refund"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}