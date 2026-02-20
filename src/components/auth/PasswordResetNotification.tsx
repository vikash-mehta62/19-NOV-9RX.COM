import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface PasswordResetNotificationProps {
  open: boolean;
  onClose: () => void;
}

export const PasswordResetNotification = ({
  open,
  onClose,
}: PasswordResetNotificationProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              Password Reset Required
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base text-gray-700 space-y-3">
            <p>
              Due to recent system updates, your account requires a password reset for security purposes.
            </p>
            <p className="font-medium text-gray-900">
              Please contact the administrator to reset your password.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
