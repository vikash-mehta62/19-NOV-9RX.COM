import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2 } from "lucide-react";
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

interface PasswordResetManagerProps {
  userId: string;
  userEmail: string;
  requiresReset: boolean;
  onResetCleared?: () => void;
}

export const PasswordResetManager = ({
  userId,
  userEmail,
  requiresReset,
  onResetCleared,
}: PasswordResetManagerProps) => {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const handleClearPasswordResetFlag = async () => {
    setIsClearing(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ requires_password_reset: false })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Password reset flag cleared for ${userEmail}. User can now login normally.`,
      });

      // Call the callback to refresh the parent component
      if (onResetCleared) {
        onResetCleared();
      }

      setShowConfirmDialog(false);
    } catch (error: any) {
      console.error("Error clearing password reset flag:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to clear password reset flag",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (!requiresReset) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>Can login normally</span>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirmDialog(true)}
        disabled={isClearing}
        className="text-amber-600 border-amber-600 hover:bg-amber-50"
      >
        {isClearing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Clearing...
          </>
        ) : (
          "Clear Reset Flag"
        )}
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Password Reset Flag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow <strong>{userEmail}</strong> to login normally without seeing the password reset popup.
              <br /><br />
              <strong>Important:</strong> Only do this after you have reset their password!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearPasswordResetFlag}
              disabled={isClearing}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isClearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                "Yes, Clear Flag"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
