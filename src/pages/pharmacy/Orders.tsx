import { DashboardLayout } from "@/components/DashboardLayout";
import { OrdersContainer } from "@/components/orders/OrdersContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function PharmacyOrders() {


    const location = useLocation();
    const [poIs, setPoIs] = useState(false);
  
    useEffect(() => {
      if (location.pathname.startsWith('/pharmacy/po')) {
        setPoIs(true);
      } else {
        setPoIs(false);
      }
    }, [location.pathname]);
  
  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{poIs ? "My Purchase Order" : "My Orders"}</h1>
          <p className="text-muted-foreground">View and manage your orders</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orders History</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersContainer userRole={"pharmacy"} poIs={poIs} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}