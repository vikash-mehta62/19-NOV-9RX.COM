import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Eye, EyeOff, Mail, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/supabaseClient";
import { useDispatch } from "react-redux";
import { setUserProfile } from "../../store/actions/userAction";

export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const dispatch = useDispatch();

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
    const userType = sessionStorage.getItem("userType");

    if (isLoggedIn && userType) {
      const dashboardRoutes: Record<string, string> = {
        admin: "/admin/dashboard",
        pharmacy: "/pharmacy/products",
        hospital: "/hospital/dashboard",
        group: "/group/dashboard",
      };

      const route = dashboardRoutes[userType];
      if (route) {
        navigate(route, { replace: true });
      }
    }
  }, [navigate]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!isValidEmail(email)) {
        throw new Error("Please enter a valid email address");
      }

      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // Clear any existing session data
      sessionStorage.clear();

      // Authenticate with Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.session?.user) {
        throw new Error("Authentication failed");
      }

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select()
        .eq("id", authData.session.user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(`Failed to fetch user profile: ${profileError.message}`);
      }

      if (!profileData) {
        throw new Error("User profile not found. Please contact support.");
      }

      if (profileData.status !== "active") {
        throw new Error("Your account is not active. Please contact support.");
      }

      // Check portal access for non-admin users
      if (profileData.type !== "admin" && profileData.portal_access === false) {
        // Sign out the user since they shouldn't have access
        await supabase.auth.signOut();
        throw new Error("Your portal access has been disabled. Please contact support.");
      }

      // Set session data
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("userType", profileData.type);
      sessionStorage.setItem("shipping", profileData.freeShipping);
      sessionStorage.setItem("taxper", profileData.taxPercantage);
      sessionStorage.setItem("order_pay", profileData.order_pay);
      sessionStorage.setItem("userEmail", email);
      sessionStorage.setItem("lastActivity", Date.now().toString());

      // Update Redux store
      dispatch(setUserProfile(profileData));

      // Show success message
      toast({
        title: "Welcome back! 👋",
        description: `Successfully logged in as ${profileData.type}.`,
      });

      // Navigate to appropriate dashboard
      const dashboardRoutes: Record<string, string> = {
        admin: "/admin/dashboard",
        pharmacy: "/pharmacy/products",
        hospital: "/hospital/dashboard",
        group: "/group/dashboard",
      };

      const redirectPath = dashboardRoutes[profileData.type];
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      } else {
        throw new Error(`Invalid user type: ${profileData.type}`);
      }
    } catch (error: any) {
      const errorMessage = error.message || "An error occurred during login";
      setError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {error && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="you@pharmacy.com"
            value={email}
            onChange={handleEmailChange}
            required
            disabled={isLoading}
            className={`pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all ${
              emailValid === false ? "border-red-300 focus:border-red-500" : ""
            } ${emailValid === true ? "border-green-300" : ""}`}
          />
          {emailValid === true && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
        </div>
        {emailValid === false && (
          <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength={6}
            className="pl-10 pr-12 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            className="border-gray-300 data-[state=checked]:bg-blue-600"
          />
          <Label
            htmlFor="remember"
            className="text-sm text-gray-600 cursor-pointer select-none"
          >
            Remember me
          </Label>
        </div>
        <Link
          to="/reset-password-page"
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all duration-300"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>

      {/* Demo Login Hint */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          New to 9RX?{" "}
          <span className="text-blue-600 font-medium">
            Create an account to get started
          </span>
        </p>
      </div>
    </form>
  );
};
