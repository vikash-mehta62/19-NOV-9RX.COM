import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

interface InvoiceData {
  id: number;
  order_no: number;
  invoice_no: number;
  purchase_no: number;
  sales_order_no: number;
  order_start: string;
  invoice_start: string;
  purchase_start: string;
  sales_order_start: string;
}

export function InvoiceSection() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      order_no: 0,
      invoice_no: 0,
      purchase_no: 0,
      invoice_start: "",
      order_start: "",
      purchase_start: "",
      sales_order_start: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("centerize_data")
        .select("*")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Supabase fetch error:", error);
        toast({ title: "Error fetching data", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!data) {
        setInvoiceData(null);
        form.reset({
          order_no: 0,
          invoice_no: 0,
          purchase_no: 0,
          invoice_start: "",
          order_start: "",
          purchase_start: "",
          sales_order_start: "",
        });
        setLoading(false);
        return;
      }

      setInvoiceData(data);
      form.reset({
        order_no: data.order_no ?? 0,
        invoice_no: data.invoice_no ?? 0,
        purchase_no: data.purchase_no ?? 0,
        invoice_start: data.invoice_start ?? "",
        order_start: data.order_start ?? "",
        purchase_start: data.purchase_start ?? "",
        sales_order_start: data.sales_order_start ?? "",
      });

      setLoading(false);
    };

    fetchData();
  }, []);

  const onSubmit = async (values: {
    order_no: number;
    invoice_no: number;
    purchase_no: number;
    invoice_start: string;
    order_start: string;
    purchase_start: string;
    sales_order_start: string;
  }) => {
    if (!invoiceData) return;

    setUpdating(true);
    const { error } = await supabase
      .from("centerize_data")
      .update({
        order_no: values.order_no,
        invoice_no: values.invoice_no,
        purchase_no: values.purchase_no,
        invoice_start: values.invoice_start,
        order_start: values.order_start,
        purchase_start: values.purchase_start,
        sales_order_start: values.sales_order_start,
      })
      .eq("id", invoiceData.id);

    if (error) {
      console.error("Update error:", error);
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } else {
      setInvoiceData((current) =>
        current
          ? {
              ...current,
              order_no: values.order_no,
              invoice_no: values.invoice_no,
              purchase_no: values.purchase_no,
              invoice_start: values.invoice_start,
              order_start: values.order_start,
              purchase_start: values.purchase_start,
              sales_order_start: values.sales_order_start,
            }
          : current
      );
      setConfirmOpen(false);
      toast({ title: "Success", description: "Document prefixes updated successfully" });
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order, Invoice & PO Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {invoiceData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium">Order No</label>
              <Input
                type="number"
                {...form.register("order_no", { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Invoice No</label>
              <Input
                type="number"
                {...form.register("invoice_no", { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Purchase Order No</label>
              <Input
                type="number"
                {...form.register("purchase_no", { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Order Prefix</label>
              <Input {...form.register("order_start")} />
            </div>

            <div>
              <label className="text-sm font-medium">Invoice Prefix</label>
              <Input {...form.register("invoice_start")} />
            </div>

          </div>
        )}
        {!invoiceData && (
          <p className="text-sm text-muted-foreground">
            Document numbering configuration is not available for your current access.
          </p>
        )}

        <Button
          type="button"
          className="w-full md:w-auto"
          onClick={() => setConfirmOpen(true)}
          disabled={updating || !invoiceData}
        >
          Update Prefixes
        </Button>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent className="sm:max-w-lg overflow-hidden border-0 p-0 shadow-2xl">
            <div className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-white/20 p-2">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <AlertDialogTitle className="text-xl font-semibold">
                  Are You Sure You Want To Make This Change?
                </AlertDialogTitle>
              </div>
            </div>

            <AlertDialogHeader className="px-6 pt-5">
              <AlertDialogDescription className="space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  You are about to update order and invoice numbering settings.
                </p>
                <p>
                  This can affect future generated document numbers and may create confusion if changed incorrectly.
                </p>
                <p className="font-medium text-slate-900">
                  Please confirm that these values are correct before continuing.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="px-6 pb-6 pt-2">
              <AlertDialogCancel type="button" className="rounded-xl" disabled={updating}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={updating}
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Yes, Update Prefixes"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
