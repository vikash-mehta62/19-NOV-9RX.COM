import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Shield } from "lucide-react";

interface TermsAcceptanceDialogProps {
  open: boolean;
  onAccept: () => void;
}

export const TermsAcceptanceDialog = ({ open, onAccept }: TermsAcceptanceDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mx-auto mb-4">
            <FileText className="h-6 w-6 text-amber-600" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Terms & Privacy Policy Required
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3">
            <p>
              To continue using 9RX, you need to accept our Terms & Conditions and Privacy Policy.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p className="text-left">
                  You'll be redirected to your profile page where you can review and accept the terms.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onAccept}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Continue to Profile
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
