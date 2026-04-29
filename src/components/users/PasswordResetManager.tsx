import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  const [isSending, setIsSending] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const { toast } = useToast();

  const handleSendResetPasswordEmail = async () => {
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Please log in");
      }

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://9rx.mahitechnocrafts.in";
      const response = await fetch(`${apiBaseUrl}/api/launch/send-reset-emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          testMode: false,
          testEmail: null,
          selectedUserIds: [userId],
          sendToAll: false,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to send reset password email");
      }

      toast({
        title: "Success",
        description: `Reset password email sent to ${userEmail}.`,
      });

      if (onResetCleared) {
        onResetCleared();
      }

      setShowSendDialog(false);
    } catch (error: any) {
      console.error("Error sending reset password email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reset password email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
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
        onClick={() => setShowSendDialog(true)}
        disabled={isSending}
        className="text-amber-600 border-amber-600 hover:bg-amber-50"
      >
        {isSending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          "Send Reset Password Email"
        )}
      </Button>

      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Reset Password Email</DialogTitle>
            {/* <DialogDescription>
              This will use the existing Launch Reset Password functionality to send the email.
            </DialogDescription> */}
          </DialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>This Reset Password email include this below two points:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Accepted Terms & Conditions</li>
              <li>Reset password</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-password-email">Email Address</Label>
            <Input
              id="reset-password-email"
              type="email"
              value={userEmail}
              disabled
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSendDialog(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendResetPasswordEmail}
              disabled={isSending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reset Password Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
