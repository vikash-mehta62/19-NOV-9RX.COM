import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, KeyRound, Lock, CheckCircle, ArrowLeft, ShieldCheck, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "../assests/home/9rx_logo.png";

interface PasswordResetFormValues {
  password: string;
  confirmPassword: string;
}

export default function LaunchPasswordReset() {
  const [searchParams] = useSearchParams();
  const isLaunch = searchParams.get("launch") === "true";
  const emailFromUrl = searchParams.get("email") || "";
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<"terms" | "password">("terms");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [userEmail, setUserEmail] = useState(emailFromUrl);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PasswordResetFormValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  // Check if user has valid password recovery session
  useEffect(() => {
    const checkSession = async () => {
      try {
        // First, check if there's a hash in the URL (Supabase auth callback)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log("🔍 Checking URL hash params:", { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken,
          type 
        });

        // If we have tokens in the URL, Supabase should handle them automatically
        if (accessToken && type === 'recovery') {
          console.log("✅ Recovery tokens found in URL, waiting for Supabase to process...");
          // Wait a bit for Supabase to process the tokens
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Now check the session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log("🔍 Session check result:", { 
          hasSession: !!session, 
          userEmail: session?.user?.email,
          error: error?.message 
        });
        
        if (session?.user) {
          setHasValidSession(true);
          setUserEmail(session.user.email || emailFromUrl);
          console.log("✅ Valid recovery session found for:", session.user.email);
        } else {
          console.log("❌ No valid session found");
          toast({
            title: "Invalid or Expired Link",
            description: "This password reset link is invalid or has expired. Please request a new one.",
            variant: "destructive",
          });
          setTimeout(() => {
            navigate("/reset-password-request");
          }, 3000);
        }
      } catch (error) {
        console.error("❌ Error checking session:", error);
        toast({
          title: "Error",
          description: "Failed to verify reset link. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsCheckingSession(false);
      }
    };
    
    checkSession();
  }, [emailFromUrl, navigate, toast]);

  // Password strength checker
  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[a-z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-400", "bg-blue-600"];

  const handleAcceptTerms = () => {
    if (!termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms & Conditions to continue.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep("password");
  };

  const onSubmit = async (data: PasswordResetFormValues) => {
    if (!hasValidSession) {
      toast({
        title: "Invalid Session",
        description: "Please use a valid password reset link.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get current user session to verify and get email
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email || userEmail;

      if (!email || !session?.user) {
        toast({
          title: "Error",
          description: "Unable to identify user. Please try again with a fresh reset link.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log("🔐 Resetting password for user:", email);

      // Update the password for the currently authenticated user (from recovery token)
      const { data: userData, error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw error;
      }

      console.log("✅ Password updated successfully for:", email);

      // Mark both password reset and terms accepted as completed
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://9rx.mahitechnocrafts.in";
        
        console.log("🔄 Marking completion - API Base URL:", apiBaseUrl);
        console.log("🔄 User Email:", email);
        
        const response = await fetch(`${apiBaseUrl}/api/launch/mark-completed`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            action: "both", // Mark both password reset and terms accepted
          }),
        });

        const responseText = await response.text();
        console.log("📝 Response status:", response.status);
        console.log("📝 Response body:", responseText);

        if (response.ok) {
          console.log("✅ Password reset and terms acceptance marked successfully");
        } else {
          console.error("❌ Failed to mark completion:", responseText);
          // Don't fail the whole operation if tracking fails
          toast({
            title: "Warning",
            description: "Password changed but tracking may have failed. Please contact admin if needed.",
            variant: "destructive",
          });
        }
      } catch (updateError) {
        console.error("Error updating launch reset status:", updateError);
        // Don't fail the whole operation if tracking fails
      }

      setIsSuccess(true);
      toast({
        title: "Success!",
        description: "Password reset and Terms accepted successfully!",
      });

      // Sign out to clear the recovery session
      await supabase.auth.signOut();

      setTimeout(() => {
        navigate("/login", { state: { defaultTab: "login" } });
      }, 2000);
    } catch (error: any) {
      console.error("❌ Password reset error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Force navbar to always show with white background */}
      <div className="fixed w-full top-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <a href="/" aria-label="9RX Home" className="flex-shrink-0">
              <img
                src={logo}
                alt="9RX Logo"
                className="h-12 w-auto"
              />
            </a>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                onClick={() => navigate("/login", { state: { defaultTab: "signup" } })}
                variant="ghost"
                className="hidden sm:inline-flex font-semibold rounded-xl min-h-[40px] sm:min-h-[44px] text-sm sm:text-base text-slate-700 hover:text-blue-600"
              >
                Sign Up
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 sm:px-6 rounded-xl shadow-lg shadow-blue-500/25 min-h-[40px] sm:min-h-[44px] text-sm sm:text-base"
                onClick={() => navigate("/login")}
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add padding-top to account for fixed navbar */}
      <div className="pt-24 flex items-center justify-center min-h-screen px-4 py-12">
        {isCheckingSession ? (
          <div className="w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Reset Link...</h2>
              <p className="text-gray-600">Please wait while we verify your password reset link.</p>
            </div>
          </div>
        ) : (
        <div className="w-full max-w-2xl">
          {/* Progress Steps - Always show for launch flow */}
          {!isSuccess && (
            <div className="mb-8">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg leading-none ${
                    currentStep === "terms" 
                      ? "bg-blue-600 text-white" 
                      : "bg-green-600 text-white"
                  }`}>
                    {currentStep === "password" ? <Check className="w-6 h-6" /> : "1"}
                  </div>
                  <span className={`font-medium ${
                    currentStep === "terms" ? "text-blue-600" : "text-green-600"
                  }`}>
                    Review Terms
                  </span>
                </div>
                <div className={`h-1 w-16 rounded ${
                  currentStep === "password" ? "bg-green-600" : "bg-gray-300"
                }`} />
                <div className="flex items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg leading-none ${
                    currentStep === "password" 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-300 text-gray-600"
                  }`}>
                    2
                  </div>
                  <span className={`font-medium ${
                    currentStep === "password" ? "text-blue-600" : "text-gray-600"
                  }`}>
                    Reset Password
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-10 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                {isSuccess ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : currentStep === "terms" ? (
                  <FileText className="w-8 h-8 text-white" />
                ) : (
                  <Lock className="w-8 h-8 text-white" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-white">
                {isSuccess 
                  ? "All Set!" 
                  : currentStep === "terms" 
                  ? "Terms & Conditions" 
                  : "Create New Password"}
              </h1>
              <p className="text-blue-100 mt-2 text-sm">
                {isSuccess
                  ? "You're ready to use the new platform"
                  : currentStep === "terms"
                  ? "Please review and accept our updated terms"
                  : "Choose a strong password for your account"}
              </p>
            </div>

            {/* Content */}
            <div className="px-8 py-8">
              {isSuccess ? (
                <div className="text-center py-4">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-10 h-10 text-blue-600" />
                  </div>
                  <p className="text-gray-600 mb-2 font-medium">
                    Password reset and Terms accepted successfully!
                  </p>
                  <p className="text-gray-500 text-sm mb-6">
                    Redirecting you to login page...
                  </p>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Go to Login
                  </Link>
                </div>
              ) : currentStep === "terms" ? (
                <div className="space-y-6">
                  {/* Terms Content */}
                  <div className="border border-gray-200 rounded-xl p-6 max-h-96 overflow-y-auto bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Terms & Conditions</h2>
                    <div className="space-y-4 text-sm text-gray-700">
                      <p className="font-semibold">Last Updated: February 10, 2026</p>
                      
                      <h3 className="font-bold text-base mt-6">1. Acceptance of Terms</h3>
                      <p>
                        By accessing and using the 9RX platform, you accept and agree to be bound by the terms 
                        and provision of this agreement. If you do not agree to these terms, please do not use our service.
                      </p>

                      <h3 className="font-bold text-base mt-6">2. Use of Service</h3>
                      <p>
                        You agree to use our service only for lawful purposes and in accordance with these Terms. 
                        You agree not to use the service in any way that could damage, disable, overburden, or impair our servers.
                      </p>

                      <h3 className="font-bold text-base mt-6">3. Account Security</h3>
                      <p>
                        You are responsible for maintaining the confidentiality of your account and password. 
                        You agree to accept responsibility for all activities that occur under your account.
                      </p>

                      <h3 className="font-bold text-base mt-6">4. Privacy Policy</h3>
                      <p>
                        Your privacy is important to us. We collect and use your personal information in accordance 
                        with our Privacy Policy. By using our service, you consent to our collection and use of your data.
                      </p>

                      <h3 className="font-bold text-base mt-6">5. Prescription Medications</h3>
                      <p>
                        All prescription medications require a valid prescription from a licensed healthcare provider. 
                        We reserve the right to verify prescriptions and refuse service if necessary.
                      </p>

                      <h3 className="font-bold text-base mt-6">6. Payment Terms</h3>
                      <p>
                        You agree to pay all fees and charges associated with your purchases. All prices are subject 
                        to change without notice. Payment must be made at the time of purchase.
                      </p>

                      <h3 className="font-bold text-base mt-6">7. Refund Policy</h3>
                      <p>
                        Refunds are subject to our refund policy. Prescription medications may not be eligible for 
                        refund once dispensed. Please contact customer service for refund requests.
                      </p>

                      <h3 className="font-bold text-base mt-6">8. Limitation of Liability</h3>
                      <p>
                        9RX shall not be liable for any indirect, incidental, special, consequential, or punitive 
                        damages resulting from your use of or inability to use the service.
                      </p>

                      <h3 className="font-bold text-base mt-6">9. Changes to Terms</h3>
                      <p>
                        We reserve the right to modify these terms at any time. We will notify users of any material 
                        changes. Your continued use of the service constitutes acceptance of the modified terms.
                      </p>

                      <h3 className="font-bold text-base mt-6">10. Contact Information</h3>
                      <p>
                        For questions about these Terms, please contact us at support@9rx.com or call 1-800-9RX-HELP.
                      </p>
                    </div>
                  </div>

                  {/* Accept Checkbox */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                      className="mt-1"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                      I have read and agree to the Terms & Conditions. I understand that by accepting these terms, 
                      I am entering into a legally binding agreement with 9RX.
                    </label>
                  </div>

                  {/* Continue Button */}
                  <Button
                    onClick={handleAcceptTerms}
                    disabled={!termsAccepted}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold text-base transition-all duration-200 shadow-lg shadow-blue-500/25"
                  >
                    <span className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Accept & Continue to Password Reset
                    </span>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        {...register("password", {
                          required: "Password is required",
                          minLength: {
                            value: 8,
                            message: "Password must be at least 8 characters",
                          },
                        })}
                        className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                    )}

                    {/* Password Strength */}
                    {password && (
                      <div className="mt-3">
                        <div className="flex gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">
                          Password strength:{" "}
                          <span
                            className={`font-medium ${
                              passwordStrength <= 2
                                ? "text-red-500"
                                : passwordStrength <= 3
                                ? "text-yellow-500"
                                : "text-blue-500"
                            }`}
                          >
                            {strengthLabels[passwordStrength - 1] || "Too weak"}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        {...register("confirmPassword", {
                          required: "Please confirm your password",
                          validate: (value) =>
                            value === password || "Passwords do not match",
                        })}
                        className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold text-base transition-all duration-200 shadow-lg shadow-blue-500/25"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Resetting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5" />
                        Complete Setup
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {/* Back to Login */}
              {!isSuccess && currentStep === "password" && (
                <div className="mt-8 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-6 flex items-start gap-3 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600">
              {currentStep === "terms" 
                ? "Please read the Terms & Conditions carefully before accepting. These terms govern your use of our platform."
                : "For your security, choose a strong password that you haven't used before. A good password includes uppercase, lowercase, numbers, and special characters."}
            </p>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
