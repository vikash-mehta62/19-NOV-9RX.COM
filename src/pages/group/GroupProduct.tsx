import { DashboardLayout } from "@/components/DashboardLayout";
import { PharmacyProductsFullPage } from "@/components/pharmacy/PharmacyProductsFullPage";

const GroupProducts = () => {
  return (
    <DashboardLayout role="group">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products Catalog</h1>
          <p className="text-muted-foreground">
            Browse our complete catalog of high-quality pharmacy supplies
          </p>
        </div>

        {/* Use the same PharmacyProductsFullPage component */}
        <PharmacyProductsFullPage />
      </div>
    </DashboardLayout>
  );
};

export default GroupProducts;