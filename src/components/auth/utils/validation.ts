
import { SignupFormData } from "../types/signup.types";
import { type ToastActionElement, type ToastProps } from "@/components/ui/toast";

export const validateSignupForm = (
  formData: SignupFormData,
  toast: (props: { title?: string; description?: React.ReactNode; variant?: "default" | "destructive" }) => void
): boolean => {
  console.log("Starting form validation with data:", formData);

  if (formData.password !== formData.confirmPassword) {
    console.error("Password validation failed: passwords do not match");
    toast({
      title: "Validation Error",
      description: "Passwords do not match.",
      variant: "destructive",
    });
    return false;
  }

  if (formData.password.length < 8) {
    console.error("Password validation failed: password too short");
    toast({
      title: "Validation Error",
      description: "Password must be at least 8 characters long.",
      variant: "destructive",
    });
    return false;
  }

  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  if (!phoneRegex.test(formData.phone)) {
    console.error("Phone validation failed for value:", formData.phone);
    toast({
      title: "Validation Error",
      description: "Please enter a valid phone number.",
      variant: "destructive",
    });
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    console.error("Email validation failed for value:", formData.email);
    toast({
      title: "Validation Error",
      description: "Please enter a valid email address.",
      variant: "destructive",
    });
    return false;
  }

  console.log("Form validation passed successfully");
  return true;
};
