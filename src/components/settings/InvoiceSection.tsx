import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface InvoiceData {
  id: number;
  order_no: number;
  invoice_no: number;
  order_start: string;
  invoice_start: string;
}

export function InvoiceSection() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      invoice_start: "",
      order_start: "",
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
          invoice_start: "",
          order_start: "",
        });
        setLoading(false);
        return;
      }

      setInvoiceData(data);
      form.reset({
        invoice_start: data.invoice_start ?? "",
        order_start: data.order_start ?? "",
      });

      setLoading(false);
    };

    fetchData();
  }, []);

  const onSubmit = async (values: { invoice_start: string; order_start: string }) => {
    if (!invoiceData) return;

    setUpdating(true);
    const { error } = await supabase
      .from("centerize_data")
      .update({
        invoice_start: values.invoice_start,
        order_start: values.order_start,
      })
      .eq("id", invoiceData.id);

    if (error) {
      console.error("Update error:", error);
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Invoice & Order Prefix Updated Successfully" });
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
        <CardTitle>Invoice Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {invoiceData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium">Order No</label>
              <Input value={invoiceData.order_no} readOnly className="bg-gray-100" />
            </div>

            <div>
              <label className="text-sm font-medium">Invoice No</label>
              <Input value={invoiceData.invoice_no} readOnly className="bg-gray-100" />
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
            Invoice prefix configuration is not available for your current access.
          </p>
        )}

        <Button className="w-full md:w-auto" onClick={form.handleSubmit(onSubmit)} disabled={updating || !invoiceData}>
          {updating ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Update Prefixes"}
        </Button>
      </CardContent>
    </Card>
  );
}
