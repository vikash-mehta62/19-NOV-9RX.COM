import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCart } from "@/hooks/use-cart";
import { ShippingFields } from "./checkout/ShippingFields";
import { PaymentFields } from "./checkout/PaymentFields";
import { processPaymentIPOSPay } from "@/services/paymentService";
import { useNavigate } from "react-router-dom";

const checkoutFormSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    city: z.string().min(2, "City must be at least 2 characters"),
    state: z.string().min(2, "State must be at least 2 characters"),
    zip_code: z.string().min(5, "ZIP code must be at least 5 characters"),
  }),
  payment: z.object({
    method: z.enum(["card", "ach", "bank_transfer"]),
    cardNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    cvv: z.string().optional(),
    achAccountType: z
      .enum(["checking", "savings", "businessChecking"])
      .optional(),
    achAccountName: z.string().optional(),
    achRoutingNumber: z.string().optional(),
    achAccountNumber: z.string().optional(),
  }),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

interface CheckoutFormProps {
  onClose: () => void;
  total: number;
}

export function CheckoutForm({ onClose, total }: CheckoutFormProps) {
  const { toast } = useToast();
  const { cartItems } = useCart();
  const navigate = useNavigate();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      shippingAddress: {
        fullName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zip_code: "",
      },
      payment: {
        method: "card",
      },
    },
  });

  const onSubmit = async (data: CheckoutFormValues) => {
    try {
      // Prevent default form submission behavior
      // event?.preventDefault();

      toast({
        title: "Processing Order",
        description: "Redirecting to secure checkout...",
      });

      const draftOrder = {
        ...data,
        items: cartItems,
        total: total,
        orderDate: new Date().toISOString(),
        status: "pending",
      };

      const response = await processPaymentIPOSPay({
        amount: total,
        orderId: "pharmacy-checkout",
        paymentMethod: data.payment.method === "ach" ? "ach" : "card",
        customerName: data.shippingAddress.fullName,
        customerEmail: data.shippingAddress.email,
        customerMobile: data.shippingAddress.phone,
        description: `Pharmacy checkout for ${data.shippingAddress.email}`,
        merchantName: "9RX Pharmacy",
        returnUrl: `${window.location.origin}/payment/callback`,
        failureUrl: `${window.location.origin}/payment/callback`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        calculateFee: data.payment.method === "card",
        calculateTax: false,
        tipsInputPrompt: false,
        themeColor: "#2563EB",
      });

      if (!response.success || !response.paymentUrl || !response.transactionReferenceId) {
        throw new Error(response.error || "Failed to start secure checkout");
      }

      localStorage.setItem("pending_payment", JSON.stringify({
        flowType: "pharmacy_checkout",
        transactionReferenceId: response.transactionReferenceId,
        amount: total,
        baseAmount: total,
        estimatedChargedAmount: total,
        estimatedProcessingFee: 0,
        paymentMethod: data.payment.method,
        orderDraft: draftOrder,
      }));

      onClose();
      window.location.href = response.paymentUrl;
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error placing order",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ShippingFields form={form} />
        <PaymentFields form={form} />

        <div className="flex justify-between items-center">
          <div>
            <p className="text-lg font-medium">Total: ${total.toFixed(2)}</p>
          </div>
          <div className="space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Place Order</Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
