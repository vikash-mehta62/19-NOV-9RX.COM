import {
  Table,
  TableBody,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog } from "@/components/ui/dialog";
import { useState } from "react";
import { UserRole } from "./schemas/userFormSchemas";
import { PendingUserReview } from "./pending/PendingUserReview";
import { UserTableHeader } from "./table/UserTableHeader";
import { UserTableRow } from "./table/UserTableRow";
import { getStatusBadgeColor, getRoleBadgeColor, getLocationDetails, getLocationTypeIcon } from "./utils/userTableUtils";

export interface User {
  id: string;
  name: string;
  email: string;
  type: "Pharmacy" | "Hospital" | "Group";
  status: string;
  role: UserRole;
  locations?: number;
  lastActive: string;
  phone?: string;
}

interface UsersTableProps {
  users: User[];
  selectedUsers: string[];  // Changed from number[] to string[]
  onSelectionChange: (selectedIds: string[]) => void;  // Changed parameter type
}

const UsersTable = ({ users, selectedUsers, onSelectionChange }: UsersTableProps) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPendingUser, setSelectedPendingUser] = useState<User | null>(null);

  const handleUserUpdated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleSelectAll = (checked: boolean) => {
    onSelectionChange(checked ? users.map(user => user.id) : []);
  };

  const handleSelectOne = (checked: boolean, userId: string) => {
    if (checked) {
      onSelectionChange([...selectedUsers, userId]);
    } else {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleStatusBadgeClick = (user: User) => {
    if (user.status === "pending") {
      setSelectedPendingUser(user);
    }
  };

  
  return (
    <>
      <ScrollArea className="h-[600px]">
        <Table>
          <UserTableHeader 
            onSelectAll={handleSelectAll}
            isAllSelected={users.length > 0 && selectedUsers.length === users.length}
          />
          <TableBody>
            {users.map((user) => (
              <UserTableRow
                key={user.id}
                user={user}
                isSelected={selectedUsers.includes(user.id)}
                onSelectChange={(checked) => handleSelectOne(checked, user.id)}
                onUserUpdated={handleUserUpdated}
                getStatusBadgeColor={getStatusBadgeColor}
                getRoleBadgeColor={getRoleBadgeColor}
                getLocationDetails={getLocationDetails}
                getLocationTypeIcon={getLocationTypeIcon}
                handleStatusBadgeClick={handleStatusBadgeClick}
              />
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      <Dialog open={!!selectedPendingUser} onOpenChange={() => setSelectedPendingUser(null)}>
       
        {selectedPendingUser && (
          <PendingUserReview
            user={selectedPendingUser}
            onClose={() => setSelectedPendingUser(null)}
            onStatusUpdate={() => {
              setRefreshKey(prev => prev + 1);
              setSelectedPendingUser(null);
            }}
          />
        )}
      </Dialog>
    </>
  );
};

export default UsersTable;