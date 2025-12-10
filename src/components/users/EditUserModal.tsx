
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TabbedUserForm } from "./forms/TabbedUserForm";
import { useEditUserForm } from "./hooks/useEditUserForm";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import axios from '../../../axiosconfig'
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

        try {
          const response = await axios.post("/update-profile", {
            name: values.displayName,
            email: values.email,
            admin: true
          });
        
          console.log("Verification Successful:", response.data);
      
        
        } catch (error) {
          console.error("Error in user verification:", error.response?.data || error.message);
        }
        console.log(values.email)
        console.log(values.displayName)
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
        className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto"
        aria-describedby="edit-user-description"
      >
        <DialogHeader>
          <DialogTitle>{ self ? "Update Profile" : "Edit Customer Profile"}</DialogTitle>
        </DialogHeader>

        <div id="edit-user-description" className="sr-only">
          Edit customer profile information including personal details, contact information, and preferences
        </div>

        {formState.isLoading && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading user data...</span>
          </div>
        )}

        {formState.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {formState.error}
            </AlertDescription>
          </Alert>
        )}

        {!formState.isLoading && (
          <TabbedUserForm
            form={form}
            onSubmit={handleSubmit}
            submitLabel={formState.isSaving ? "Saving..." : "Save changes"}
            isSubmitting={formState.isSaving}
            self={self}
            isAdmin={isAdmin}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
