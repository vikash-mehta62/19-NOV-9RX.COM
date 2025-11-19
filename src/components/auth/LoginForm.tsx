import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/supabaseClient";
import { useDispatch } from "react-redux";
import { setUserProfile } from "../../store/actions/userAction";
import { Eye, EyeOff } from "lucide-react";
export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
    const userType = sessionStorage.getItem("userType");

    if (isLoggedIn && userType) {
      const dashboardRoutes = {
        admin: "/admin/dashboard",
        pharmacy: "/pharmacy/products",
        hospital: "/hospital/dashboard",
        group: "/group/dashboard",
      };

      const route = dashboardRoutes[userType as keyof typeof dashboardRoutes];
      if (route) {
        navigate(route, { replace: true });
      }
    }
  }, [navigate]);

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Input validation
      if (!isValidEmail(email)) {
        throw new Error("Please enter a valid email address");
      }

      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      console.log("Starting login process for email:", email);

      // Clear any existing session data
      sessionStorage.clear();

      // Step 1: Authenticate with Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (authError) {
        console.error("Authentication error:", authError);
        throw new Error(authError.message);
      }

      if (!authData.session?.user) {
        console.error("No session or user data returned");
        throw new Error("Authentication failed");
      }

      console.log(
        "Authentication successful, user ID:",
        authData.session.user.id
      );

      // Step 2: Fetch user profile with error handling
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select()
          .eq("id", authData.session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          throw new Error(
            `Failed to fetch user profile: ${profileError.message}`
          );
        }

        if (!profileData) {
          console.error(
            "No profile found for user ID:",
            authData.session.user.id
          );
          throw new Error("User profile not found. Please contact support.");
        }

        console.log("Profile fetched successfully:", profileData);

        if (profileData.status !== "active") {
          console.error(
            "User account is not active. Status:",
            profileData.status
          );
          throw new Error(
            "Your account is not active. Please contact support."
          );
        }

        // Step 3: Set session data
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userType", profileData.type);
        sessionStorage.setItem("shipping", profileData.freeShipping);
        sessionStorage.setItem("taxper", profileData.taxPercantage);
        sessionStorage.setItem("order_pay", profileData.order_pay);
        sessionStorage.setItem("userEmail", email);
        sessionStorage.setItem("lastActivity", Date.now().toString());

        // Step 4: Update Redux store
        dispatch(setUserProfile(profileData));

        // Step 5: Show success message
        toast({
          title: "Login Successful",
          description: `Welcome back! You are now logged in as ${profileData.type}.`,
        });

        // Step 6: Navigate to appropriate dashboard
        const dashboardRoutes = {
          admin: "/admin/dashboard",
          pharmacy: "/pharmacy/products",
          hospital: "/hospital/dashboard",
          group: "/group/dashboard",
        };

        const redirectPath =
          dashboardRoutes[profileData.type as keyof typeof dashboardRoutes];
        if (redirectPath) {
          navigate(redirectPath, { replace: true });
        } else {
          throw new Error(`Invalid user type: ${profileData.type}`);
        }
      } catch (profileError: any) {
        console.error("Profile fetch error:", profileError);
        throw new Error(`Failed to load user profile: ${profileError.message}`);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error.message || "An error occurred during login";
      setError(errorMessage);
      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
    {error && (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}
  
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={isLoading}
      />
    </div>
  
    <div className="space-y-2">
      <Label htmlFor="password">Password</Label>
      <div className="relative">
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          minLength={6}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  
    {/* Reset Password Link */}
    <div className="text-right">
      <Link to="/reset-password-page" className="text-blue-500 hover:underline">
        Forgot Password?
      </Link>
    </div>
  
    <Button type="submit" className="w-full" disabled={isLoading}>
      {isLoading ? "Signing in..." : "Sign In"}
    </Button>
  </form>
  
  );
};
