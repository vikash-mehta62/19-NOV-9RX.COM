import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreVertical, UserCheck, UserMinus, UserPen, X, Eye, Loader2, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { EditUserModal } from "./EditUserModal";
import { ViewProfileModal } from "./ViewProfileModal";
import { activateUser } from "./actions/activateUser";
import { deactivateUser } from "./actions/deactivateUser";
import { deleteUser } from "./actions/deleteUser";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAction = async (action: string) => {
    try {
      console.log('Starting action:', action, 'for user:', userId);
      
      // Validate user ID
      if (!userId || userId.trim() === '') {
        throw new Error('Invalid user ID. Please try again.');
      }

      let success = false;
      setIsLoading(action);
      
      switch (action) {
        case "view":
          setViewModalOpen(true);
          setIsLoading(null);
          return;
        case "edit":
          setEditModalOpen(true);
          setIsLoading(null);
          return;
        case "activate":
          success = await activateUser(userId, userName);
          break;
        case "deactivate":
          success = await deactivateUser(userId, userName);
          if (success) {
            // Show toast with undo option
            const { dismiss } = toast({
              title: `${userName} deactivated`,
              description: "Click undo to reactivate this user.",
              action: (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    dismiss();
                    if (undoTimeoutRef.current) {
                      clearTimeout(undoTimeoutRef.current);
                    }
                    const reactivated = await activateUser(userId, userName);
                    if (reactivated) {
                      onUserUpdated();
                    }
                  }}
                >
                  Undo
                </Button>
              ),
              duration: 5000,
            });
            
            // Clear undo option after 5 seconds
            undoTimeoutRef.current = setTimeout(() => {
              dismiss();
            }, 5000);
          }
          break;
        case "delete":
          setDeleteDialogOpen(true);
          setIsLoading(null);
          return;
        default:
          throw new Error('Invalid action requested');
      }

      if (success) {
        onUserUpdated();
      }
    } catch (error) {
      console.error('Action error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleConfirmDelete = async () => {
    setIsLoading("delete");
    const success = await deleteUser(userId, userName);
    if (success) {
      onUserUpdated();
    }
    setIsLoading(null);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu for {userName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleAction("view")}>
            <Eye className="mr-2 h-4 w-4" />
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction("edit")}>
            <UserPen className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {userStatus === "inactive" || userStatus === "pending" ? (
            <DropdownMenuItem 
              onClick={() => handleAction("activate")}
              disabled={isLoading === "activate"}
            >
              {isLoading === "activate" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              Activate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem 
              onClick={() => handleAction("deactivate")}
              disabled={isLoading === "deactivate"}
            >
              {isLoading === "deactivate" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Deactivate
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleAction("delete")}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold">{userName}</span> ({userEmail}). 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading === "delete"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isLoading === "delete"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading === "delete" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ViewProfileModal
        userId={userId}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
      />

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
