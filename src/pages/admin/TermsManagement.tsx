import { DashboardLayout } from "@/components/DashboardLayout";
import { TermsManagement } from "@/components/admin/TermsManagement";

const AdminTermsManagement = () => {
  return (
    <DashboardLayout role="admin">
      <div className="min-h-screen bg-background">
        <div className="flex-1 space-y-6 container px-6 py-6">
          <TermsManagement />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminTermsManagement;