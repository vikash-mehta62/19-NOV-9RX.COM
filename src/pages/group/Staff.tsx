import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StaffTable } from "@/components/group/staff/StaffTable";
import { AddStaffModal } from "@/components/group/staff/AddStaffModal";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { StaffMember, StaffPermission } from "@/types/staff";

export function Staff() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      role: "manager",
      status: "active",
      permissions: ["view_orders", "manage_inventory", "view_reports"] as StaffPermission[],
      lastActive: "2024-03-15",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      role: "staff",
      status: "active",
      permissions: ["view_orders", "view_reports"] as StaffPermission[],
      lastActive: "2024-03-14",
    },
  ]);

  const handleAddStaff = (newStaff: Omit<StaffMember, "id" | "status" | "lastActive" | "permissions">) => {
    const staffMember: StaffMember = {
      id: staffMembers.length + 1,
      ...newStaff,
      status: "pending",
      lastActive: new Date().toISOString().split('T')[0],
      permissions: [],
    };

    setStaffMembers([...staffMembers, staffMember]);
    toast({
      title: "Staff Member Added",
      description: `${newStaff.name} has been added to the team.`,
    });
  };

  const handleUpdateStaff = (updatedStaff: StaffMember) => {
    setStaffMembers(staffMembers.map(staff => 
      staff.id === updatedStaff.id ? updatedStaff : staff
    ));
    toast({
      title: "Staff Member Updated",
      description: `${updatedStaff.name}'s information has been updated.`,
    });
  };

  const handleUpdatePermissions = (staffId: number, permissions: StaffPermission[]) => {
    setStaffMembers(staffMembers.map(staff => 
      staff.id === staffId ? { ...staff, permissions } : staff
    ));
    toast({
      title: "Permissions Updated",
      description: "Staff member permissions have been updated.",
    });
  };

  const handleStatusChange = (staffId: number, newStatus: StaffMember["status"]) => {
    setStaffMembers(staffMembers.map(staff => 
      staff.id === staffId ? { ...staff, status: newStatus } : staff
    ));
    toast({
      title: "Status Updated",
      description: `Staff member status has been changed to ${newStatus}.`,
    });
  };

  return (
    <DashboardLayout role="group">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Staff Member
          </Button>
        </div>
        
        <StaffTable 
          staffMembers={staffMembers}
          onUpdateStaff={handleUpdateStaff}
          onUpdatePermissions={handleUpdatePermissions}
          onStatusChange={handleStatusChange}
        />
        
        <AddStaffModal 
          open={isAddModalOpen} 
          onOpenChange={setIsAddModalOpen}
          onSubmit={handleAddStaff}
        />
      </div>
    </DashboardLayout>
  );
}

export default Staff;