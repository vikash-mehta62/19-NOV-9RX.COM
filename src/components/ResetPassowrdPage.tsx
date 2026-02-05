import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import logo from "../assests/home/9rx_logo.png";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const userEmail = searchParams.get("email");
  const [email, setEmail] = useState(userEmail || "");
  const [status, setStatus] = useState<{ message: string; type: string }>({ message: "", type: "" });
  const [loading, setLoading] = useState(false);

  const sendResetPasswordLink = async (email: string) => {
    if (!email) {
      setStatus({ message: "Please enter your email address", type: "error" });
      return;
    }

    setStatus({ message: "", type: "" });
    setLoading(true);

    // Use full URL with hash mode for better compatibility
    const siteUrl = window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (resetError) {
      setStatus({ message: "Something went wrong. Please try again.", type: "error" });
    } else {
      setStatus({ message: "Password reset email sent successfully! Check your inbox.", type: "success" });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Navbar - with scrolled state forced for light background */}
      <nav 
        className="fixed w-full top-0 z-50 bg-white/95 backdrop-blur-xl shadow-lg"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <a href="/" aria-label="9RX Home" className="flex-shrink-0">
              <img
                src={logo}
                alt="9RX Logo"
                className="h-16 sm:h-16 w-auto"
              />
            </a>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 sm:px-6 rounded-xl shadow-lg shadow-blue-500/25 min-h-[40px] sm:min-h-[44px] text-sm sm:text-base"
              onClick={() => window.location.href = '/login'}
            >
              Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen px-4 py-12 pt-24 sm:pt-28">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-10 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Forgot Password?</h1>
              <p className="text-blue-100 mt-2 text-sm">
                No worries, we'll send you reset instructions
              </p>
            </div>

            {/* Form */}
            <div className="px-8 py-8">
              {/* Status Message */}
              {status.message && (
                <div
                  className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                    status.type === "error"
                      ? "bg-red-50 border border-red-200"
                      : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  {status.type === "error" ? (
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  )}
                  <p
                    className={`text-sm ${
                      status.type === "error" ? "text-red-700" : "text-blue-700"
                    }`}
                  >
                    {status.message}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <Button
                  onClick={() => sendResetPasswordLink(email)}
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold text-base transition-all duration-200 shadow-lg shadow-blue-500/25"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </div>

              {/* Back to Login */}
              <div className="mt-8 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
