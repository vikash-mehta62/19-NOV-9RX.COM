import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, KeyRound, Lock, CheckCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import axios from "../../axiosconfig";
import { Navbar } from "./landing/HeroSection";

interface PasswordResetFormValues {
  password: string;
  confirmPassword: string;
}

export default function PasswordReset() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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

  const onSubmit = async (data: PasswordResetFormValues) => {
    setIsLoading(true);
    try {
      const { data: userData, error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw error;
      }

      if (userData?.user?.user_metadata) {
        const userMeta = userData.user.user_metadata;
        try {
          await axios.post("/update-profile", {
            name: `${userMeta.first_name || ""} ${userMeta.last_name || ""}`.trim(),
            email: userMeta.email,
          });
        } catch (err) {
          console.error("Profile update error:", err);
        }
      }

      setIsSuccess(true);
      toast({
        title: "Password reset successful",
        description: "Your password has been reset successfully.",
      });

      setTimeout(() => {
        navigate("/login", { state: { defaultTab: "login" } });
      }, 2000);
    } catch (error: any) {
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
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-10 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                {isSuccess ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : (
                  <Lock className="w-8 h-8 text-white" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-white">
                {isSuccess ? "Password Changed!" : "Create New Password"}
              </h1>
              <p className="text-blue-100 mt-2 text-sm">
                {isSuccess
                  ? "Your password has been updated successfully"
                  : "Your new password must be different from previous passwords"}
              </p>
            </div>

            {/* Form */}
            <div className="px-8 py-8">
              {isSuccess ? (
                <div className="text-center py-4">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-10 h-10 text-blue-600" />
                  </div>
                  <p className="text-gray-600 mb-6">
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
                        Reset Password
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {/* Back to Login */}
              {!isSuccess && (
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
              For your security, choose a strong password that you haven't used before. 
              A good password includes uppercase, lowercase, numbers, and special characters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
