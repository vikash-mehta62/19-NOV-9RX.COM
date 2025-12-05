import { User } from "../UsersTable";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Building2 } from "lucide-react";
import UserActions from "../UserActions";
import { UserRole } from "../schemas/userFormSchemas";

interface UserTableRowProps {
  user: User;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  onUserUpdated: () => void;
  getStatusBadgeColor: (status: string) => string;
  handleStatusBadgeClick: (user: User) => void;
}

export function UserTableRow({
  user,
  isSelected,
  onSelectChange,
  onUserUpdated,
  getStatusBadgeColor,
  handleStatusBadgeClick,
}: UserTableRowProps) {
  // Convert type to lowercase for comparison
  const userType = user.type.toLowerCase() as "pharmacy" | "hospital" | "group";


console.log(user,"user")
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="px-2 sm:px-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelectChange}
          aria-label={`Select ${user.name}`}
        />
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
          <span>{user.name}</span>
          <span className="text-xs text-muted-foreground md:hidden">
            {user.email}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center space-x-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{user.email}</span>
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{user.company || "-"}</span>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="outline" className="capitalize">
          {user.type}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge 
          className={`${getStatusBadgeColor(user.status)} cursor-pointer whitespace-nowrap`}
          onClick={() => handleStatusBadgeClick(user)}
        >
          {user.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <UserActions
          userId={user.id}
          userStatus={user.status}
          userName={user.name}
          userEmail={user.email}
          userType={userType}
          onUserUpdated={onUserUpdated}
        />
      </TableCell>
    </TableRow>
  );
}