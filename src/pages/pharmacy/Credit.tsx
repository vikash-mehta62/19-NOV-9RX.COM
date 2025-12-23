import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CreditCard, FileText } from "lucide-react";
import CreditApplicationForm from "@/components/credit/CreditApplicationForm";
import CreditInvoicesList from "@/components/credit/CreditInvoicesList";
import PendingCreditTerms from "@/components/credit/PendingCreditTerms";

const Credit = () => {
  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6 p-6">
        {/* Pending Credit Terms Banner */}
        <PendingCreditTerms />

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            Credit Account
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your credit line, view invoices, and make payments
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="overview" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Credit Line
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="w-4 h-4" />
              Invoices & Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <CreditApplicationForm />
          </TabsContent>

          <TabsContent value="invoices">
            <CreditInvoicesList />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Credit;
