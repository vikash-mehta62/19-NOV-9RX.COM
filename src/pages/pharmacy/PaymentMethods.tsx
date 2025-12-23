import { DashboardLayout } from "@/components/DashboardLayout";
import SavedPaymentMethods from "@/components/payment/SavedPaymentMethods";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, CreditCard } from "lucide-react";

export default function PaymentMethods() {
  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Methods</h1>
          <p className="text-muted-foreground">
            Manage your saved cards and bank accounts for faster checkout
          </p>
        </div>

        <SavedPaymentMethods />

        {/* Security Info */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Shield className="h-5 w-5" />
              Your Payment Information is Secure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">256-bit Encryption</p>
                  <p className="text-sm text-green-700">
                    All data is encrypted using bank-level security
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">PCI Compliant</p>
                  <p className="text-sm text-green-700">
                    We follow strict PCI DSS standards
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Fraud Protection</p>
                  <p className="text-sm text-green-700">
                    Advanced fraud detection on all transactions
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
