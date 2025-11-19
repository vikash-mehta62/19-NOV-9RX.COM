import { DashboardLayout } from "@/components/DashboardLayout";
import { GroupPricingTable } from "@/components/group-pricing/GroupPricingTable";
import { CreateGroupPricingDialog } from "@/components/group-pricing/CreateGroupPricingDialog";
import { useState } from "react";

interface GroupPricingData {
  id?: string;
  name: string;
  discount: number;
  discount_type: "percentage" | "fixed";
  min_quantity: number;
  max_quantity: number;
  product_id: string;
  group_ids: string[];
  status: string;
  updated_at: string;
  created_at?: string;
}

const GroupPricing = () => {
  const [groupPricings, setGroupPricings] = useState<GroupPricingData[]>([]);

  const handleCreateGroupPricing = (newGroupPricing: GroupPricingData) => {
    setGroupPricings([...groupPricings, newGroupPricing]);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 p-6 bg-white min-h-screen">
        <div className="flex items-center justify-between bg-white/50 p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-800">
              Group Pricing
            </h1>
            <p className="text-gray-600">
              Manage pricing configurations for pharmacy groups
            </p>
          </div>
          <CreateGroupPricingDialog onSubmit={handleCreateGroupPricing} />
        </div>
        <div className="bg-white/50 rounded-lg shadow-sm">
          <GroupPricingTable />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GroupPricing;