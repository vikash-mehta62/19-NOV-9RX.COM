import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Loader2, CheckCircle2, Timer, Shield, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "../../../axiosconfig";
import { useDispatch } from "react-redux";
import { setUserProfile } from "../../store/actions/userAction";
import { supabase } from "@/integrations/supabase/client";
import { PasswordResetNotification } from "./PasswordResetNotification";
import { UnverifiedAccountNotification } from "./UnverifiedAccountNotification";

export const OTPLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOTP] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const [showUnverifiedDialog, setShowUnverifiedDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const dispatch = useDispatch();

  // Clear any errors when component mounts
  useEffect(() => {
    setError("");
  }, []);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value.length > 0) {
      setEmailValid(isValidEmail(value));
    } else {
      setEmailValid(null);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSendingOTP(true);

    try {
      if (!isValidEmail(email)) {
        throw new Error("Please enter a valid email address");
      }

      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // FIRST: Check if email is verified by querying email_confirmed_at column directly
      const { data: authData, error: authError } = await supabase.rpc('check_email_verification', {
        user_email: email.trim().toLowerCase()
      });

      console.log("Email verification check:", authData);

      // authData is an array with one object: [{email_confirmed: boolean, confirmed_at: timestamp}]
      // If user exists and email is NOT confirmed, show unverified dialog
      if (authData && authData.length > 0) {
        const verificationStatus = authData[0];
        if (verificationStatus.email_confirmed === false) {
          setShowUnverifiedDialog(true);
          setIsSendingOTP(false);
          return;
        }
      }

      // Check if user requires password reset BEFORE sending OTP
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("requires_password_reset, role, id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (profileError) {
        console.error("Error checking password reset flag:", profileError);
      }

      // If no profile exists at all, let the OTP flow continue - 
      // the auth check will handle invalid credentials
      if (!profileData) {
        console.warn("No profile found for email:", email.trim().toLowerCase());
      }

      // If user requires password reset (exclude admin role), show notification and don't send OTP
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
        
        setIsSendingOTP(false);
        return;
      }

      // Email is verified and no password reset required, proceed with OTP send
      const response = await axios.post("/api/otp/send", {
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (response.data.success) {
        setOtpSent(true);
        setCountdown(60); // 60 seconds cooldown
        toast({
          title: "OTP Sent",
          description: "Please check your email for the OTP code",
        });
      }
    } catch (err: any) {
      // Check if error is due to password reset requirement
      if (err.response?.data?.requiresPasswordReset === true || 
          err.response?.data?.message === "PASSWORD_RESET_REQUIRED") {
        setShowPasswordResetDialog(true);
        
        // Try to log this attempt
        try {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email.trim().toLowerCase())
            .maybeSingle();
          
          if (profileData) {
            await supabase.from("password_reset_requests").insert({
              user_id: profileData.id,
              email: email.trim().toLowerCase(),
              requested_at: new Date().toISOString(),
            });
          }
        } catch (logError) {
          console.error("Failed to log password reset request:", logError);
        }
        
        setIsSendingOTP(false);
        return;
      }
      
      const errorMessage = err.response?.data?.message || "Failed to send OTP";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!otp || otp.length !== 6) {
        throw new Error("Please enter a valid 6-digit OTP");
      }

      const response = await axios.post("/api/otp/verify", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      if (response.data.success) {
        const { user, session } = response.data;

        // Set Supabase session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (sessionError) {
          console.error("Failed to set Supabase session:", sessionError);
          throw new Error("Failed to create session. Please try again.");
        }

        // Password reset check is now done before OTP is sent
        // This section is kept for backward compatibility but should not trigger

        // Store session data
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userType", user.type);
        sessionStorage.setItem("userEmail", user.email);
        sessionStorage.setItem("userId", user.id);
        sessionStorage.setItem("userRole", user.role || "user");
        sessionStorage.setItem("shipping", user.freeShipping || "false");
        sessionStorage.setItem("taxper", user.taxPercantage || "0");
        sessionStorage.setItem("order_pay", user.order_pay || "false");
        sessionStorage.setItem("lastActivity", Date.now().toString());

        // Update Redux store
        dispatch(setUserProfile({
          id: user.id,
          email: user.email,
          first_name: user.firstName,  // Convert from camelCase to snake_case
          last_name: user.lastName,
          type: user.type,
          role: user.role,
          status: user.status,
          display_name: user.displayName,
          company_name: user.companyName,
          group_id: user.groupId,
          portal_access: user.portalAccess,
          freeShipping: user.freeShipping,
          taxPercantage: user.taxPercantage,
          order_pay: user.order_pay,
        }));

        toast({
          title: "Login Successful",
          description: `Welcome back, ${user.firstName}!`,
        });

        // Navigate to appropriate dashboard
        const dashboardRoutes: Record<string, string> = {
          admin: "/admin/dashboard",
          pharmacy: "/pharmacy/products",
          hospital: "/hospital/dashboard",
          group: "/group/dashboard",
        };

        // For group users, validate they have proper setup
        if (user.type === "group") {
          // Check if group has basic configuration
          const { data: groupProfile } = await supabase
            .from("profiles")
            .select("commission_rate, bypass_min_price, can_manage_pricing")
            .eq("id", user.id)
            .maybeSingle();

          if (!groupProfile) {
            toast({
              title: "Setup Required",
              description: "Your group account needs to be configured. Please contact support.",
              variant: "destructive",
            });
            // Still allow login but show warning
          }
        }

        const route = dashboardRoutes[user.type] || "/";
        navigate(route, { replace: true });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Invalid OTP";
      setError(errorMessage);
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setError("");
    setIsSendingOTP(true);

    try {
      const response = await axios.post("/api/otp/resend", {
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (response.data.success) {
        setCountdown(60);
        toast({
          title: "OTP Resent",
          description: "A new OTP has been sent to your email",
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to resend OTP";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handlePasswordResetDialogClose = () => {
    setShowPasswordResetDialog(false);
    // Reset form state
    setOtpSent(false);
    setOTP("");
    setPassword("");
    setError("");
  };

  const handleUnverifiedDialogClose = () => {
    setShowUnverifiedDialog(false);
    // Reset form state
    setPassword("");
    setError("");
  };

  return (
    <div className="space-y-6">
      <PasswordResetNotification
        open={showPasswordResetDialog}
        onClose={handlePasswordResetDialogClose}
      />
      
      <UnverifiedAccountNotification
        open={showUnverifiedDialog}
        onClose={handleUnverifiedDialogClose}
        email={email}
      />
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!otpSent ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={handleEmailChange}
                className="pl-10"
                disabled={isSendingOTP}
                required
              />
              {emailValid !== null && (
                <div className="absolute right-3 top-3">
                  {emailValid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-red-500" />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                disabled={isSendingOTP}
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSendingOTP || !emailValid || password.length < 6}
          >
            {isSendingOTP ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending OTP...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Send OTP
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              We've sent a 6-digit OTP to <strong>{email}</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="otp">Enter OTP</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOTP(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="pl-10 text-center text-2xl tracking-widest"
                maxLength={6}
                disabled={isLoading}
                required
              />
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Timer className="h-3 w-3" />
              OTP expires in 10 minutes
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Login"
            )}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={handleResendOTP}
              disabled={countdown > 0 || isSendingOTP}
              className="text-sm"
            >
              {countdown > 0 ? (
                `Resend OTP in ${countdown}s`
              ) : (
                "Resend OTP"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
