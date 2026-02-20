import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, Loader2, PenTool } from "lucide-react";
import { supabase } from "@/supabaseClient";
import axios from "../../axiosconfig";

export const AcceptTerms = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [achAccepted, setAchAccepted] = useState(false);
  const [termsSignature, setTermsSignature] = useState("");
  const [privacySignature, setPrivacySignature] = useState("");
  const [achSignature, setAchSignature] = useState("");
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if there's a hash in the URL (Supabase auth callback)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        console.log("🔍 Checking URL hash params:", { 
          hasAccessToken: !!accessToken, 
          type 
        });

        // If we have recovery tokens in the URL, wait for Supabase to process them
        if (accessToken && type === 'recovery') {
          console.log("✅ Recovery tokens found in URL, waiting for Supabase to process...");
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
          setSession(session);
          
          // Verify session with backend and get user info
          const response = await axios.get("/api/terms/verify-session", {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
          
          if (response.data.success) {
            setUserInfo(response.data.user);
            console.log("✅ Valid recovery session found for:", response.data.user.email);
          } else {
            throw new Error(response.data.message || "Failed to verify session");
          }
        } else {
          console.log("❌ No valid session found");
          setError("Invalid or expired link. This terms acceptance link is invalid or has expired.");
        }
      } catch (err: any) {
        console.error("❌ Error checking session:", err);
        setError(err.response?.data?.message || err.message || "Failed to verify session");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async () => {
    if (!termsAccepted || !privacyAccepted) {
      toast({
        title: "Error",
        description: "You must accept both Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }

    // Validate signatures for accepted terms
    if (termsAccepted && !termsSignature.trim()) {
      toast({
        title: "Error",
        description: "Please provide your digital signature for Terms of Service.",
        variant: "destructive",
      });
      return;
    }

    if (privacyAccepted && !privacySignature.trim()) {
      toast({
        title: "Error",
        description: "Please provide your digital signature for Privacy Policy.",
        variant: "destructive",
      });
      return;
    }

    if (achAccepted && !achSignature.trim()) {
      toast({
        title: "Error",
        description: "Please provide your digital signature for ACH Authorization.",
        variant: "destructive",
      });
      return;
    }

    if (!session) {
      toast({
        title: "Error",
        description: "No valid session found. Please try clicking the link from your email again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post("/api/terms/accept", {
        termsAccepted: true,
        privacyAccepted: true,
        achAccepted: achAccepted,
        termsSignature: termsSignature.trim(),
        privacySignature: privacySignature.trim(),
        achSignature: achAccepted ? achSignature.trim() : null,
        acceptedAt: new Date().toISOString(),
      }, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.data.success) {
        setSuccess(true);
        toast({
          title: "Success",
          description: achAccepted 
            ? "Terms, Privacy Policy, and ACH Authorization accepted successfully!"
            : "Terms and Privacy Policy accepted successfully!",
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        throw new Error(response.data.message || "Failed to accept terms");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to accept terms",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2">Verifying token...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate("/login")} 
              className="w-full mt-4"
              variant="outline"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Success!
            </CardTitle>
            <CardDescription>
              Terms and Privacy Policy accepted successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Thank you for accepting our Terms of Service and Privacy Policy. 
                You will be redirected to the login page shortly.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate("/login")} 
              className="w-full mt-4"
            >
              Go to Login Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Accept Terms of Service & Privacy Policy</CardTitle>
          <CardDescription>
            Hello {userInfo?.name}, please review and accept our terms to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Terms of Service Section */}
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-3 mb-3">
                <Checkbox
                  id="termsAccepted"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none flex-1">
                  <label
                    htmlFor="termsAccepted"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <span className="text-blue-700 font-semibold">Terms of Service:</span>{" "}
                    I have read and agree to the{" "}
                    <a
                      href="/terms-of-service"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Terms of Service
                    </a>
                  </label>
                </div>
              </div>
              
              {/* Digital Signature Input for Terms */}
              {termsAccepted && (
                <div className="mt-4 space-y-2 border-t border-blue-200 pt-4">
                  <Label htmlFor="termsSignature" className="text-sm font-medium text-blue-700 flex items-center gap-2">
                    <PenTool className="h-4 w-4" />
                    Digital Signature (Required)
                  </Label>
                  <Input
                    id="termsSignature"
                    type="text"
                    placeholder="Type your full legal name as your digital signature"
                    value={termsSignature}
                    onChange={(e) => setTermsSignature(e.target.value)}
                    className="border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-blue-600">
                    By typing your name above, you are providing your digital signature and consent to the Terms of Service.
                  </p>
                </div>
              )}
            </div>

            {/* Privacy Policy Section */}
            <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
              <div className="flex items-start space-x-3 mb-3">
                <Checkbox
                  id="privacyAccepted"
                  checked={privacyAccepted}
                  onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none flex-1">
                  <label
                    htmlFor="privacyAccepted"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <span className="text-purple-700 font-semibold">Privacy Policy:</span>{" "}
                    I have read and agree to the{" "}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-800 underline"
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>
              </div>
              
              {/* Digital Signature Input for Privacy Policy */}
              {privacyAccepted && (
                <div className="mt-4 space-y-2 border-t border-purple-200 pt-4">
                  <Label htmlFor="privacySignature" className="text-sm font-medium text-purple-700 flex items-center gap-2">
                    <PenTool className="h-4 w-4" />
                    Digital Signature (Required)
                  </Label>
                  <Input
                    id="privacySignature"
                    type="text"
                    placeholder="Type your full legal name as your digital signature"
                    value={privacySignature}
                    onChange={(e) => setPrivacySignature(e.target.value)}
                    className="border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <p className="text-xs text-purple-600">
                    By typing your name above, you are providing your digital signature and consent to the Privacy Policy.
                  </p>
                </div>
              )}
            </div>

            {/* ACH Authorization Section */}
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <div className="flex items-start space-x-3 mb-3">
                <Checkbox
                  id="achAccepted"
                  checked={achAccepted}
                  onCheckedChange={(checked) => setAchAccepted(checked === true)}
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none flex-1">
                  <label
                    htmlFor="achAccepted"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <span className="text-green-700 font-semibold">ACH Authorization (Optional):</span>{" "}
                    I authorize 9RX to electronically debit my bank account for payments via ACH (Automated Clearing House). 
                    I understand that this authorization will remain in effect until I revoke it in writing. 
                    I agree that ACH transactions comply with U.S. law and that I have the authority to authorize 
                    debits from the specified bank account.
                  </label>
                </div>
              </div>
              
              {/* Digital Signature Input for ACH */}
              {achAccepted && (
                <div className="mt-4 space-y-2 border-t border-green-200 pt-4">
                  <Label htmlFor="achSignature" className="text-sm font-medium text-green-700 flex items-center gap-2">
                    <PenTool className="h-4 w-4" />
                    Digital Signature (Required)
                  </Label>
                  <Input
                    id="achSignature"
                    type="text"
                    placeholder="Type your full legal name as your digital signature"
                    value={achSignature}
                    onChange={(e) => setAchSignature(e.target.value)}
                    className="border-green-300 focus:border-green-500 focus:ring-green-500"
                  />
                  <p className="text-xs text-green-600">
                    By typing your name above, you are providing your digital signature and consent to ACH authorization.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Account Information:</strong><br />
              Name: {userInfo?.name}<br />
              Email: {userInfo?.email}
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!termsAccepted || !privacyAccepted || isSubmitting || 
                     (termsAccepted && !termsSignature.trim()) || 
                     (privacyAccepted && !privacySignature.trim()) || 
                     (achAccepted && !achSignature.trim())}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting Terms...
              </>
            ) : (
              achAccepted ? "Accept All & Continue to Password Reset" : "Accept Terms & Privacy Policy"
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            By accepting these terms, you acknowledge that you have read, understood, 
            and agree to be bound by our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptTerms;