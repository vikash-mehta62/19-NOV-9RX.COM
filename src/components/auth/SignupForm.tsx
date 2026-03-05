import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { SignupFormFields } from "./components/SignupFormFields";
import { validateSignupForm } from "./utils/validation";
import { SignupFormData } from "./types/signup.types";
import { applyReferralCode } from "@/services/referralService";
import axios from '../../../axiosconfig'


export const SignupForm = () => {
  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    referralCode: "",
    termsAccepted: false,
  } as SignupFormData);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    // console.log(`Input changed - Field: ${id}, Value: ${value}`);
    setFormData((prev) => ({ 
      ...prev, 
      [id]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    // console.log("Starting signup process with data:", formData);

    if (!validateSignupForm(formData, toast)) {
      // console.log("Form validation failed");
      return;
    }

    setIsLoading(true);

    try {
      // Step 0: Check if email already exists in profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", formData.email)
        .maybeSingle();

      if (existingProfile) {
        throw new Error("An account with this email already exists. Please sign in instead.");
      }

      const acceptanceTimestamp = new Date().toISOString();

      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            terms_accepted: formData.termsAccepted,
            terms_accepted_at: acceptanceTimestamp,
            terms_version: "1.0",
            signup_source: "login_signup",
          },
        },
      });

      if (authError) {
        console.error("Auth error during signup:", authError);
        throw authError;
      }

      if (!authData.user) {
        console.error("No user data returned from auth signup");
        throw new Error("No user data returned from auth signup");
      }

      console.log("Auth user created successfully:", authData.user.id);

      // Step 2: Create or update profile via authenticated server endpoint
      const sessionToken = authData.session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;

      if (sessionToken) {
        console.log("Creating/updating profile entry via server...");
        console.log("Sending data:", {
          userId: authData.user.id,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          termsAccepted: formData.termsAccepted,
          termsAcceptedAt: acceptanceTimestamp,
          termsVersion: "1.0",
        });
        
        const profileResponse = await axios.post("/create-signup-profile", {
          userId: authData.user.id,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          termsAccepted: formData.termsAccepted,
          termsAcceptedAt: acceptanceTimestamp,
          termsVersion: "1.0",
        }, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (!profileResponse.data?.success) {
          console.error("Profile creation error:", profileResponse.data);
          throw new Error(profileResponse.data?.message || "Failed to create profile");
        }

        console.log("Profile created successfully");
      } else {
        // If signup flow returns no immediate session, avoid unauthenticated profile writes.
        console.warn("No active session after signup; skipping create-signup-profile call.");
      }

      // Apply referral code if provided
      if (formData.referralCode && formData.referralCode.trim()) {
        try {
          const referralResult = await applyReferralCode(authData.user.id, formData.referralCode.trim());
          if (referralResult.success) {
            console.log("Referral code applied:", referralResult.message);
          }
        } catch (refError) {
          console.log("Referral code application skipped:", refError);
        }
      }


      try {
        const response = await axios.post("/user-verification", {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          userId: authData.user.id,
        });
      
        console.log("Verification Successful:", response.data);
      } catch (error) {
        console.error("Error in user verification:", error.response?.data || error.message);
      }
      
      console.log("User signup completed successfully");
      toast({
        title: "Account Created",
        description:
          "Your account has been created successfully. Please check your email to verify your account.",
      });

      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        phone: "",
        referralCode: "",
        termsAccepted: false,
      });

      navigate("/login", { state: { defaultTab: "login" } });
      
      window.location.reload();
    } catch (error: unknown) {
      const err = error as { message?: string; stack?: string };
      // console.error("Detailed signup error:", error);
      // console.error("Error stack trace:", error.stack);
      toast({
        title: "Error",
        description:
          err.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <SignupFormFields
        formData={formData}
        onChange={handleInputChange}
        isLoading={isLoading}
      />
      <Button 
        type="submit" 
        className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all duration-300 min-h-[48px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" 
        disabled={isLoading || !formData.termsAccepted}
      >
        {isLoading ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Creating Account...
          </>
        ) : !formData.termsAccepted ? (
          "Please accept Terms & Conditions"
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
};
