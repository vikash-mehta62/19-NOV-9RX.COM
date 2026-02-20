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

interface UnverifiedAccountNotificationProps {
  open: boolean;
  onClose: () => void;
  email: string;
}

export const UnverifiedAccountNotification = ({
  open,
  onClose,
  email,
}: UnverifiedAccountNotificationProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              Account Not Verified
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="text-base space-y-3 pt-2">
              <p>
                Your account (<strong>{email}</strong>) is not verified yet.
              </p>
              <p>
                Please contact the admin for verification of your account.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Once your account is verified by the admin, you will be able to log in and access all features.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={onClose} className="w-full">
            Okay, I Understand
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
