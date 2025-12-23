import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CreditCard, FileText } from "lucide-react";
import CreditApplicationForm from "@/components/credit/CreditApplicationForm";
import CreditInvoicesList from "@/components/credit/CreditInvoicesList";
import PendingCreditTerms from "@/components/credit/PendingCreditTerms";
import { EnhancedPaymentTab } from "@/components/users/EnhancedPaymentTab";

const Credit = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [hasActiveCredit, setHasActiveCredit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCreditStatus();
  }, []);

  const checkCreditStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Check if user has active credit line or good standing
        const { data: profile } = await supabase
          .from('profiles')
          .select('credit_status')
          .eq('id', user.id)
          .single();
        
        // Also check if they have an active credit line record
        const { data: creditLine } = await supabase
          .from('user_credit_lines')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (profile?.credit_status === 'good' || profile?.credit_status === 'active' || creditLine) {
          setHasActiveCredit(true);
        }
      }
    } catch (error) {
      console.error("Error checking credit status:", error);
    } finally {
      setLoading(false);
    }
  };

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
            {hasActiveCredit && userId ? (
              <EnhancedPaymentTab userId={userId} readOnly={true} />
            ) : (
              <CreditApplicationForm />
            )}
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
