import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { SignupFormFields } from "./components/SignupFormFields";
import { validateSignupForm } from "./utils/validation";
import { SignupFormData } from "./types/signup.types";
import axios from '../../../axiosconfig'


export const SignupForm = () => {
  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    // console.log(`Input changed - Field: ${id}, Value: ${value}`);
    setFormData((prev) => ({ ...prev, [id]: value }));
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
      // Step 1: Create auth user
      // console.log("Attempting to create auth user...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
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

      // Step 2: Create profile
      const profileData = {
        id: authData.user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        display_name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        mobile_phone: formData.phone,
        work_phone: formData.phone,
        status: "pending",
        type: "pharmacy", // Set type as pharmacy by default
        role: "user", // Default role
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // console.log("Attempting to create profile with data:", profileData);

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert([profileData]);

      if (profileError) {
        // console.error("Profile creation error:", profileError);
        // If profile creation fails, we should clean up the auth user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(
          authData.user.id
        );
        if (deleteError) {
          console.error(
            "Failed to clean up auth user after profile creation failed:",
            deleteError
          );
        }
        throw profileError;
      }


      try {
        const response = await axios.post("/user-verification", {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
        });
      
        console.log("Verification Successful:", response.data);
      } catch (error) {
        console.error("Error in user verification:", error.response?.data || error.message);
      }
      
      console.log("Profile created successfully");
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
      });

      navigate("/login", { state: { defaultTab: "login" } });
      
      window.location.reload();
    } catch (error: any) {
      // console.error("Detailed signup error:", error);
      // console.error("Error stack trace:", error.stack);
      toast({
        title: "Error",
        description:
          error.message || "Failed to create account. Please try again.",
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
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating Account..." : "Create Account"}
      </Button>
    </form>
  );
};
