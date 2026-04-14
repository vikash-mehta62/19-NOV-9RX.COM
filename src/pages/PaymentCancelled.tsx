import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentCancelled() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-6 w-6 text-yellow-600" />
            Payment Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The secure payment was cancelled before completion. No payment was applied to your order.
          </p>
          <div className="space-y-2">
            <Button onClick={() => navigate(-1)} className="w-full">
              Choose Payment Method Again
            </Button>
            <Button onClick={() => navigate("/admin/orders")} variant="outline" className="w-full">
              Back to Orders
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
