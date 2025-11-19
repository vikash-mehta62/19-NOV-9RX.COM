
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, UserCheck, UserMinus, UserPen, X } from "lucide-react";
import { useState } from "react";
import { EditUserModal } from "./EditUserModal";
import { activateUser } from "./actions/activateUser";
import { deactivateUser } from "./actions/deactivateUser";
import { deleteUser } from "./actions/deleteUser";

interface UserActionsProps {
  userId: string;
  userStatus: string;
  userName: string;
  userEmail: string;
  userType: "pharmacy" | "hospital" | "group";
  onUserUpdated: () => void;
}

const UserActions = ({
  userId,
  userStatus,
  userName,
  userEmail,
  userType,
  onUserUpdated,
}: UserActionsProps) => {
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleAction = async (action: string) => {
    try {
      console.log('Starting action:', action, 'for user:', userId);
      
      // Validate user ID
      if (!userId || userId.trim() === '') {
        throw new Error('Invalid user ID. Please try again.');
      }

      let success = false;
      
      switch (action) {
        case "edit":
          setEditModalOpen(true);
          return;
        case "activate":
          success = await activateUser(userId, userName);
          break;
        case "deactivate":
          success = await deactivateUser(userId, userName);
          break;
        case "delete":
          success = await deleteUser(userId, userName);
          break;
        default:
          throw new Error('Invalid action requested');
      }

      if (success) {
        onUserUpdated();
      }
    } catch (error) {
      console.error('Action error:', error);
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
          {userStatus === "inactive" ? (
            <DropdownMenuItem onClick={() => handleAction("activate")}>
              <UserCheck className="mr-2 h-4 w-4" />
              Activate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleAction("deactivate")}>
              <X className="mr-2 h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => handleAction("delete")}
            className="text-destructive"
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserModal
        user={{
          id: userId,
          name: userName,
          email: userEmail,
          type: userType,
          status: userStatus as "active" | "inactive" | "pending",
        }}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onUserUpdated={onUserUpdated}
      />
    </>
  );
};

export default UserActions;
