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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { AlertTriangle } from "lucide-react";

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
  const [originalPermissions, setOriginalPermissions] = useState<Permission[]>(defaultPermissions);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(permissions) !== JSON.stringify(originalPermissions);
  }, [permissions, originalPermissions]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

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

  const handleSaveClick = () => {
    setShowSaveDialog(true);
  };

  const handleConfirmSave = () => {
    // In a real app, this would make an API call
    // console.log("Saving permissions:", { groupId, permissions });

    setOriginalPermissions([...permissions]);
    setShowSaveDialog(false);
    
    toast({
      title: "Permissions Updated",
      description: "The permissions have been updated successfully.",
    });
  };

  const handleReset = () => {
    setPermissions([...originalPermissions]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="font-semibold">Advanced Permissions</h3>
          <p className="text-sm text-muted-foreground">Configure role-based access for this group</p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} disabled={!hasUnsavedChanges}>
            Reset
          </Button>
          <Button onClick={handleSaveClick} disabled={!hasUnsavedChanges}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Mobile-friendly card layout */}
      <div className="block sm:hidden space-y-3">
        {permissions.map((permission) => (
          <div key={permission.id} className="border rounded-lg p-4 space-y-3">
            <div>
              <p className="font-medium">{permission.name}</p>
              <p className="text-sm text-muted-foreground">{permission.description}</p>
            </div>
            <div className="flex gap-4">
              {Object.entries(permission.roles).map(([role, checked]) => (
                <label key={role} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(
                        permission.id,
                        role as keyof Permission["roles"],
                        checked as boolean
                      )
                    }
                    disabled={role === "admin"}
                  />
                  <span className="capitalize">{role}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden sm:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Permission</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="text-center">Admin</TableHead>
              <TableHead className="text-center">Manager</TableHead>
              <TableHead className="text-center">Staff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission) => (
              <TableRow key={permission.id}>
                <TableCell className="font-medium">{permission.name}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{permission.description}</TableCell>
                {Object.entries(permission.roles).map(([role, checked]) => (
                  <TableCell key={role} className="text-center">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(checked) =>
                        handlePermissionChange(
                          permission.id,
                          role as keyof Permission["roles"],
                          checked as boolean
                        )
                      }
                      disabled={role === "admin"}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Permission Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these permission changes? This will affect all users in this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}