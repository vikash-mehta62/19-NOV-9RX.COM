import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

const availablePermissions = [
  {
    id: "view_orders",
    label: "View Orders",
    description: "Can view all orders from pharmacies",
  },
  {
    id: "manage_inventory",
    label: "Manage Inventory",
    description: "Can manage inventory levels and products",
  },
  {
    id: "view_reports",
    label: "View Reports",
    description: "Can access and view analytics reports",
  },
  {
    id: "manage_staff",
    label: "Manage Staff",
    description: "Can add and manage other staff members",
  },
];

interface ManagePermissionsModalProps {
  staff: {
    id: number;
    name: string;
    permissions: string[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagePermissionsModal({
  staff,
  open,
  onOpenChange,
}: ManagePermissionsModalProps) {
  const { toast } = useToast();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    staff.permissions
  );

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId]
    );
  };

  const handleSubmit = () => {
    // console.log("Updating permissions:", selectedPermissions);
    toast({
      title: "Permissions Updated",
      description: `Permissions for ${staff.name} have been updated successfully`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Permissions - {staff.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {availablePermissions.map((permission) => (
            <div
              key={permission.id}
              className="flex items-start space-x-3 space-y-0"
            >
              <Checkbox
                id={permission.id}
                checked={selectedPermissions.includes(permission.id)}
                onCheckedChange={() => handlePermissionToggle(permission.id)}
              />
              <div className="space-y-1 leading-none">
                <label
                  htmlFor={permission.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {permission.label}
                </label>
                <p className="text-sm text-muted-foreground">
                  {permission.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Save Permissions</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}