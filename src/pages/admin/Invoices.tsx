
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceTableContainer } from "@/components/invoices/components/InvoiceTableContainer";
import { CreateInvoiceForm } from "@/components/invoices/CreateInvoiceForm";
import { InvoiceStatus } from "@/components/invoices/types/invoice.types";

const Invoices = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">
              Manage invoices and payment records
            </p>
          </div>
        </div>

        <Tabs defaultValue="list" className="space-y-4">
          {/* <TabsList>
            <TabsTrigger value="list">All Invoices</TabsTrigger>
            <TabsTrigger value="create">Create Invoice</TabsTrigger>
            <TabsTrigger value="pending">Needs Payment</TabsTrigger>
            <TabsTrigger value="sent">Payment Links Sent</TabsTrigger>
          </TabsList> */}

          <TabsContent value="list" className="space-y-4">
            <InvoiceTableContainer />
          </TabsContent>

          <TabsContent value="create">
            <CreateInvoiceForm />
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Payment Links</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceTableContainer filterStatus="needs_payment_link" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Links Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceTableContainer filterStatus="payment_link_sent" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Invoices;
