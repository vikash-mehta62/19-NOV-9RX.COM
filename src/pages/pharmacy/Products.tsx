import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import ProductShowcase from "@/components/pharmacy/ProductShowcase";

const PharmacyProducts = () => {
  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products Catalog</h1>
          <p className="text-muted-foreground">
            Browse our complete catalog of high-quality pharmacies supply
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <ProductShowcase />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PharmacyProducts;