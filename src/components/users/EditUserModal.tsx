
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TabbedUserForm } from "./forms/TabbedUserForm";
import { SteppedUserForm } from "./forms/SteppedUserForm";
import { useEditUserForm } from "./hooks/useEditUserForm";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { supabase } from "@/supabaseClient";


interface EditUserModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    type: "pharmacy" | "hospital" | "group";
    status: "active" | "inactive" | "pending";
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
  self?:boolean
}

export function EditUserModal({
  user,
  open,
  onOpenChange,
  onUserUpdated,
  self
}: EditUserModalProps) {
  const queryClient = useQueryClient(); // ✅ Query Client
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUser.id)
          .single();
        setIsAdmin(profile?.role === "admin" || profile?.role === "superadmin");
      }
    };
    if (open) checkAdminRole();
  }, [open]);

  const { form, onSubmit, fetchUserData, formState } = useEditUserForm({
    userId: user.id,
    initialName: user.name,
    initialEmail: user.email,
    initialType: user.type,
    initialStatus: user.status,
    self: self,
    onSuccess: () => {
      console.log('EditUserModal: onSuccess callback triggered');
      onUserUpdated();
      queryClient.invalidateQueries({ queryKey: ["users"] });

      onOpenChange(false);
    },
    onClose: () => {
      console.log('EditUserModal: onClose callback triggered');
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      console.log('Modal opened, fetching user data...');
      fetchUserData();
    }
  }, [open, fetchUserData]);

  const handleSubmit = async (values: any) => {
    try {
      console.log('EditUserModal: Starting form submission with values:', values);

      await onSubmit(values);

      if(self){
        // Email is now sent from server in /update-user-profile endpoint
        Swal.fire({
          title: "Profile Updated",
          text: "Thank you for submitting your information. Your account will be active once we review and approve your information. Thank you once again for choosing 9RX.",
          icon: "success",
          confirmButtonText: "OK",
        });
      }
      console.log('EditUserModal: Form submission successful');
    } catch (error) {
      console.error('EditUserModal: Error submitting form:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={self 
          ? "w-[95vw] sm:max-w-[550px] h-[90vh] sm:h-[85vh] p-0 flex flex-col rounded-xl" 
          : "sm:max-w-[900px] max-h-[90vh] overflow-y-auto"
        }
        aria-describedby="edit-user-description"
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
          <DialogTitle className="text-sm sm:text-base">{ self ? "Update Profile" : "Edit Customer Profile"}</DialogTitle>
        </DialogHeader>

        <div id="edit-user-description" className="sr-only">
          Edit customer profile information including personal details, contact information, and preferences
        </div>

        {formState.isLoading && (
          <div className="flex items-center justify-center p-4 flex-1">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-xs sm:text-sm">Loading...</span>
          </div>
        )}

        {formState.error && (
          <Alert variant="destructive" className="mx-4 sm:mx-6 mb-2">
            <AlertCircle className="h-3 w-3" />
            <AlertDescription className="text-[10px] sm:text-xs">{formState.error}</AlertDescription>
          </Alert>
        )}

        {!formState.isLoading && (
          <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-4 sm:pb-6">
            {self ? (
              <SteppedUserForm
                form={form}
                onSubmit={handleSubmit}
                submitLabel={formState.isSaving ? "Saving..." : "Update Profile"}
                isSubmitting={formState.isSaving}
                hideSteps={true}
                userId={user.id}
              />
            ) : (
              <TabbedUserForm
                form={form}
                onSubmit={handleSubmit}
                submitLabel={formState.isSaving ? "Saving..." : "Save changes"}
                isSubmitting={formState.isSaving}
                self={self}
                isAdmin={isAdmin}
                userId={user.id}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
