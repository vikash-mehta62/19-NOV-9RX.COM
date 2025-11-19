import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StaffActions } from "./StaffActions";
import { StaffMember } from "@/types/staff";

interface StaffTableProps {
  staffMembers: StaffMember[];
  onUpdateStaff: (staff: StaffMember) => void;
  onUpdatePermissions: (staffId: number, permissions: string[]) => void;
  onStatusChange: (staffId: number, status: StaffMember["status"]) => void;
}

export function StaffTable({ 
  staffMembers,
  onUpdateStaff,
  onUpdatePermissions,
  onStatusChange
}: StaffTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffMembers.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell className="font-medium">{staff.name}</TableCell>
              <TableCell>{staff.email}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {staff.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={staff.status === "active" ? "success" : "destructive"}
                  className="capitalize"
                >
                  {staff.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {staff.permissions.map((permission) => (
                    <Badge
                      key={permission}
                      variant="outline"
                      className="text-xs capitalize"
                    >
                      {permission.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>{staff.lastActive}</TableCell>
              <TableCell className="text-right">
                <StaffActions
                  staff={staff}
                  onUpdate={onUpdateStaff}
                  onUpdatePermissions={onUpdatePermissions}
                  onStatusChange={onStatusChange}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}