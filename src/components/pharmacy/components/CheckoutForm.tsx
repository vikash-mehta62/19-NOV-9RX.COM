import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCart } from "@/hooks/use-cart";
import { ShippingFields } from "./checkout/ShippingFields";
import { PaymentFields } from "./checkout/PaymentFields";
import { processACHPayment } from "@/components/orders/utils/authorizeNetUtils";
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

      // Show processing toast
      toast({
        title: "Processing Order",
        description: "Please wait while we process your order...",
      });

      // Validate payment method specific fields
      if (data.payment.method === "card") {
        if (
          !data.payment.cardNumber ||
          !data.payment.expiryDate ||
          !data.payment.cvv
        ) {
          toast({
            title: "Validation Error",
            description: "Please fill in all card details",
            variant: "destructive",
          });
          return;
        }
      } else if (data.payment.method === "ach") {
        if (
          !data.payment.achAccountType ||
          !data.payment.achAccountName ||
          !data.payment.achRoutingNumber ||
          !data.payment.achAccountNumber
        ) {
          toast({
            title: "Validation Error",
            description: "Please fill in all ACH details",
            variant: "destructive",
          });
          return;
        }

        const testMode =
          localStorage.getItem("authorize_net_test_mode") === "true";
        console.log("Test mode enabled:", testMode);

        const response = await processACHPayment({
          accountType: data.payment.achAccountType,
          accountName: data.payment.achAccountName,
          routingNumber: data.payment.achRoutingNumber,
          accountNumber: data.payment.achAccountNumber,
          amount: total,
          customerEmail: data.shippingAddress.email,
          customerName: data.shippingAddress.fullName,
          apiLoginId: localStorage.getItem("authorize_net_login_id") || "",
          transactionKey:
            localStorage.getItem("authorize_net_transaction_key") || "",
          testMode: testMode,
        });

        if (!response.success) {
          toast({
            title: "Payment Error",
            description:
              response.error?.text || "Failed to process ACH payment",
            variant: "destructive",
          });
          return;
        }
      }

      // Create order object
      const order = {
        ...data,
        items: cartItems,
        total: total,
        orderDate: new Date().toISOString(),
        status: "pending",
      };

      // Log order data for debugging
      console.log("Processing order:", order);

      // Store order in localStorage for persistence
      const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]");
      existingOrders.push(order);
      localStorage.setItem("orders", JSON.stringify(existingOrders));

      // Show success message
      toast({
        title: "Order placed successfully!",
        description: "We'll send you a confirmation email shortly.",
      });

      // Close the checkout form
      onClose();

      // Navigate to orders page
      navigate("/pharmacy/orders");
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
