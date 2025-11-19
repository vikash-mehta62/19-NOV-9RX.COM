import { DashboardLayout } from "@/components/DashboardLayout";
import { CreateOrderForm } from "@/components/orders/CreateOrderForm";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function PharmacyOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Verify user is logged in and is a pharmacy
    const userType = sessionStorage.getItem("userType");
    const isLoggedIn = sessionStorage.getItem("isLoggedIn");

    if (!isLoggedIn || userType !== "pharmacy") {
      // console.log('Unauthorized access attempt:', { isLoggedIn, userType });
      toast({
        title: "Unauthorized Access",
        description: "Please log in as a pharmacy to access this page.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
  }, [navigate, toast]);

  // Get customer info from login session with proper type annotation
  const customerInfo = {
    type: "Pharmacy" as const,
    name: sessionStorage.getItem("userName") || "",
    email: sessionStorage.getItem("userEmail") || "",
    phone: sessionStorage.getItem("userPhone") || "",
    address: {
      street: sessionStorage.getItem("userStreet") || "",
      city: sessionStorage.getItem("userCity") || "",
      state: sessionStorage.getItem("userState") || "",
      zip_code: sessionStorage.getItem("userzip_code") || "",
    },
  };

  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Place New Order</h1>
          <p className="text-muted-foreground">
            Order supplies for your pharmacy
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <CreateOrderForm initialData={{ customerInfo }} isEditing={false} />
        </div>
      </div>
    </DashboardLayout>
  );
}
