import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordResetNotification } from "@/components/auth/PasswordResetNotification";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!isValidEmail(email)) {
        throw new Error("Please enter a valid email address");
      }

      // Check if user requires admin password reset BEFORE sending reset email
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("requires_password_reset, role, id")
        .eq("email", email.trim().toLowerCase())
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error("Error checking password reset flag:", profileError);
      }

      // If user requires admin password reset (exclude admin role), show notification and don't send reset email
      if (profileData && profileData.requires_password_reset === true && profileData.role !== "admin") {
        // Show the password reset notification dialog
        setShowPasswordResetDialog(true);
        
        // Log this attempt for admin visibility
        try {
          await supabase.from("password_reset_requests").insert({
            user_id: profileData.id,
            email: email.trim().toLowerCase(),
            requested_at: new Date().toISOString(),
          });
        } catch (logError) {
          console.error("Failed to log password reset request:", logError);
        }
        
        setIsLoading(false);
        return;
      }

      // User doesn't require admin reset or user not found, proceed with normal reset
      // Send password reset email using Supabase Auth
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setEmailSent(true);
      toast({
        title: "Reset Email Sent",
        description: "Please check your email for password reset instructions",
      });
    } catch (err: any) {
      const errorMessage = err.message || "Failed to send reset email";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetDialogClose = () => {
    setShowPasswordResetDialog(false);
    // Reset form state
    setEmail("");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <PasswordResetNotification
        open={showPasswordResetDialog}
        onClose={handlePasswordResetDialogClose}
      />
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {emailSent ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Email sent successfully!</strong>
                  <p className="mt-2">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <p className="mt-2 text-sm">
                    Please check your inbox and click the link to reset your password. 
                    The link will expire in 1 hour.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Didn't receive the email?</p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Wait a few minutes and try again</li>
                </ul>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                  setError("");
                }}
              >
                Try Another Email
              </Button>

              <Button
                variant="default"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                Return to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Enter the email address associated with your account
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isValidEmail(email)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
