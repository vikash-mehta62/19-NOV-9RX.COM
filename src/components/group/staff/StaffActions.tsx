import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, UserCheck, UserMinus, UserPen, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { EditStaffModal } from "./EditStaffModal";
import { ManagePermissionsModal } from "./ManagePermissionsModal";
import { StaffMember } from "@/types/staff";

interface StaffActionsProps {
  staff: StaffMember;
  onUpdate: (staff: StaffMember) => void;
  onUpdatePermissions: (staffId: number, permissions: string[]) => void;
  onStatusChange: (staffId: number, status: StaffMember["status"]) => void;
}

export function StaffActions({ 
  staff, 
  onUpdate,
  onUpdatePermissions,
  onStatusChange 
}: StaffActionsProps) {
  const { toast } = useToast();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);

  const handleAction = (action: string) => {
    switch (action) {
      case "edit":
        setEditModalOpen(true);
        break;
      case "permissions":
        setPermissionsModalOpen(true);
        break;
      case "activate":
        onStatusChange(staff.id, "active");
        toast({
          title: "Staff Member Activated",
          description: `${staff.name} has been activated`,
        });
        break;
      case "deactivate":
        onStatusChange(staff.id, "inactive");
        toast({
          title: "Staff Member Deactivated",
          description: `${staff.name} has been deactivated`,
        });
        break;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleAction("edit")}>
            <UserPen className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction("permissions")}>
            <Shield className="mr-2 h-4 w-4" />
            Permissions
          </DropdownMenuItem>
          {staff.status === "inactive" ? (
            <DropdownMenuItem onClick={() => handleAction("activate")}>
              <UserCheck className="mr-2 h-4 w-4" />
              Activate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleAction("deactivate")}>
              <UserMinus className="mr-2 h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditStaffModal
        staff={staff}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
      <ManagePermissionsModal
        staff={staff}
        open={permissionsModalOpen}
        onOpenChange={setPermissionsModalOpen}
      />
    </>
  );
}