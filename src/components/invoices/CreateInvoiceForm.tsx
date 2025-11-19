import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InvoiceStatus, PaymentMethod } from "./types/invoice.types";

const formSchema = z.object({
  orderSearch: z.string().min(1, {
    message: "Order ID or Order Number is required.",
  }),
  customerName: z.string().min(2, {
    message: "Customer name must be at least 2 characters.",
  }),
  orderNumber: z.string().min(1, {
    message: "Order number is required.",
  }),
  amount: z.string().min(1, {
    message: "Amount is required.",
  }),
  dueDate: z.string().min(1, {
    message: "Due date is required.",
  }),
  paymentMethod: z.string().optional(),
  paymentNotes: z.string().optional(),
  payment_status: z.string().optional(),
});

export function CreateInvoiceForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderSearch: "",
      customerName: "",
      orderNumber: "",
      amount: "",
      dueDate: "",
      paymentMethod: "",
      paymentNotes: "",
      payment_status:""
    },
  });

  async function fetchOrder(orderSearch: string) {
    setLoading(true);
    console.log('Fetching order with search:', orderSearch);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        profiles (id, first_name, last_name)
      `)
      .or(`id.eq.${orderSearch},order_number.ilike.%${orderSearch}%`)
      .single();

    setLoading(false);

    if (error) {
      console.error('Error fetching order:', error);
      toast({
        title: "Order Not Found",
        description: "No matching order found. Please try again.",
        variant: "destructive",
      });
      return null;
    }

    console.log('Found order data:', data);
    return data;
  }

  async function handleOrderSearch() {
    const orderSearch = form.getValues("orderSearch");
    if (!orderSearch) {
      toast({
        title: "Search Error",
        description: "Please enter an Order ID or Order Number to search.",
        variant: "destructive",
      });
      return;
    }

    const fetchedOrderData = await fetchOrder(orderSearch);
    if (fetchedOrderData) {
      setOrderData(fetchedOrderData);
      const customerName = fetchedOrderData.profiles 
        ? `${fetchedOrderData.profiles.first_name || ''} ${fetchedOrderData.profiles.last_name || ''}`.trim()
        : '';
      
      form.setValue("customerName", customerName);
      form.setValue("orderNumber", fetchedOrderData.order_number || "");
      form.setValue("amount", fetchedOrderData.total_amount?.toString() || "");
      form.setValue("dueDate", new Date().toISOString().split("T")[0]);
      
      toast({
        title: "Order Loaded",
        description: `Order ${fetchedOrderData.order_number} details have been loaded.`,
      });
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      console.log('Submitting form with values:', values);
      console.log('Using order data:', orderData);

      if (!orderData) {
        throw new Error('No order data available. Please search for an order first.');
      }

      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');


      console.log(values?.payment_status)

      const invoiceData = {
        invoice_number: invoiceNumber,
        order_id: orderData.id,
        profile_id: orderData.profiles?.id,
        status: "pending" as InvoiceStatus,
        amount: parseFloat(values.amount),
        tax_amount: orderData.tax_amount || 0,
        total_amount: parseFloat(values.amount),
        due_date: values.dueDate,
        payment_status: orderData.payment_status,
        payment_method: values.paymentMethod as PaymentMethod,
        payment_notes: values.paymentNotes || null,
        items: orderData.items || [],
        customer_info: {
          name: values.customerName,
          email: orderData.profiles?.email || '',
          phone: orderData.profiles?.phone || ''
        },
        shipping_info: orderData.shipping_address || {},
        subtotal: orderData.subtotal || parseFloat(values.amount)
      };

      console.log('Creating invoice with data:', invoiceData);


      
      const { data, error } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single();

      if (error) {
        console.error('Error creating invoice:', error);
        throw error;
      }

      console.log('Invoice created successfully:', data);

      toast({
        title: "Invoice Created",
        description: "The invoice has been created successfully.",
      });
      
      form.reset();
      setOrderData(null);
    } catch (error: any) {
      console.error('Error in form submission:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to create the invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Invoice</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="orderSearch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search Order (ID)</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter order ID or number"
                        {...field}
                      />
                      <Button
                        type="button"
                        onClick={handleOrderSearch}
                        disabled={loading}
                      >
                        {loading ? "Loading..." : "Search"}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer name" {...field} readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="orderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter order number" {...field} readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="border rounded px-3 py-2 w-full"
                    >
                      <option value="" disabled>
                        Select payment method
                      </option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="ach">ACH</option>
                      <option value="manual">Manual</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter payment notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Generate Invoice"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
