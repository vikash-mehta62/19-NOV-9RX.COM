import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface Permission {
  id: string;
  name: string;
  description: string;
  roles: {
    admin: boolean;
    manager: boolean;
    staff: boolean;
  };
}

const defaultPermissions: Permission[] = [
  {
    id: "1",
    name: "Manage Locations",
    description: "Add, edit, or remove locations",
    roles: { admin: true, manager: true, staff: false },
  },
  {
    id: "2",
    name: "View Analytics",
    description: "Access to analytics and reports",
    roles: { admin: true, manager: true, staff: true },
  },
  {
    id: "3",
    name: "Manage Users",
    description: "Add, edit, or remove users",
    roles: { admin: true, manager: false, staff: false },
  },
  {
    id: "4",
    name: "Share Documents",
    description: "Upload and share documents",
    roles: { admin: true, manager: true, staff: true },
  },
];

export function AdvancedPermissions({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Permission[]>(defaultPermissions);

  const handlePermissionChange = (
    permissionId: string,
    role: keyof Permission["roles"],
    checked: boolean
  ) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.id === permissionId
          ? { ...p, roles: { ...p.roles, [role]: checked } }
          : p
      )
    );
  };

  const handleSave = () => {
    // In a real app, this would make an API call
    // console.log("Saving permissions:", { groupId, permissions });

    toast({
      title: "Permissions Updated",
      description: "The permissions have been updated successfully.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Advanced Permissions</h3>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Permission</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Staff</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {permissions.map((permission) => (
            <TableRow key={permission.id}>
              <TableCell>{permission.name}</TableCell>
              <TableCell>{permission.description}</TableCell>
              {Object.entries(permission.roles).map(([role, checked]) => (
                <TableCell key={role}>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(
                        permission.id,
                        role as keyof Permission["roles"],
                        checked as boolean
                      )
                    }
                    disabled={role === "admin"} // Admin always has all permissions
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}