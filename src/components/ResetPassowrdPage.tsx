import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Navbar } from "./landing/HeroSection";
import { Link, useSearchParams } from "react-router-dom";

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const userEmail = searchParams.get("email");
  const [email, setEmail] = useState(userEmail ||"");
  const [status, setStatus] = useState({ message: "", type: "" });
  const [loading, setLoading] = useState(false);

  const sendResetPasswordLink = async (email: string) => {
    setStatus({ message: "", type: "" });
    setLoading(true);

    // Check if the user exists in Supabase
   

    // Send reset password link if user exists
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

    if (resetError) {
      setStatus({ message: "Something went wrong. Please try again.", type: "error" });
    } else {
      setStatus({ message: "Password reset email sent successfully! Check your inbox.", type: "success" });
    }

    setLoading(false);
  };

  return (

<div>
  <Navbar />
  <div className="h-screen flex items-center justify-center">
    <div className="max-w-md w-full p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-semibold text-center mb-4">Reset Your Password</h2>

      {status.message && (
        <Alert variant={status.type === "error" ? "destructive" : "default"} className="mb-4">
          <AlertTitle>{status.type === "error" ? "Error" : "Success"}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        autoComplete="email"
        onChange={(e) => setEmail(e.target.value)}
        className="mb-4"
      />

      <Button onClick={() => sendResetPasswordLink(email)} className="w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : "Send Reset Link"}
      </Button>

      {/* Properly aligned login link */}
      <div className="text-center mt-4">
        <Link to="/login" state={{ defaultTab: "login" }} className="text-blue-500 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  </div>
</div>

  );
}
