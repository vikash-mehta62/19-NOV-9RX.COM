import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  Users,
  Mail,
  User,
  Phone,
  Lock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { format, isPast } from "date-fns";

interface InvitationData {
  id: string;
  email: string;
  pharmacy_name: string;
  contact_person: string;
  phone: string;
  message: string;
  status: string;
  expires_at: string;
  group_id: string;
  group_name?: string;
}

const JoinGroup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"loading" | "invalid" | "expired" | "form" | "success">("loading");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
    company_name: "",
    phone: "",
  });

  useEffect(() => {
    if (token) {
      validateInvitation();
    } else {
      setStep("invalid");
      setError("No invitation token provided");
      setLoading(false);
    }
  }, [token]);

  const validateInvitation = async () => {
    try {
      setLoading(true);

      // Fetch invitation
      const { data: inviteData, error: inviteError } = await supabase
        .from("pharmacy_invitations")
        .select("*")
        .eq("token", token)
        .single();

      if (inviteError || !inviteData) {
        setStep("invalid");
        setError("Invalid or expired invitation link");
        return;
      }

      // Check if already accepted
      if (inviteData.status === "accepted") {
        setStep("invalid");
        setError("This invitation has already been used");
        return;
      }

      // Check if cancelled
      if (inviteData.status === "cancelled") {
        setStep("invalid");
        setError("This invitation has been cancelled");
        return;
      }

      // Check if expired
      if (isPast(new Date(inviteData.expires_at))) {
        setStep("expired");
        setError("This invitation has expired");
        return;
      }

      // Fetch group name
      const { data: groupData } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("id", inviteData.group_id)
        .single();

      const groupName = groupData?.display_name || 
        `${groupData?.first_name || ""} ${groupData?.last_name || ""}`.trim() ||
        "Unknown Group";

      setInvitation({
        ...inviteData,
        group_name: groupName,
      });

      // Pre-fill form with invitation data
      setForm((prev) => ({
        ...prev,
        email: inviteData.email,
        company_name: inviteData.pharmacy_name || "",
        phone: inviteData.phone || "",
        first_name: inviteData.contact_person?.split(" ")[0] || "",
        last_name: inviteData.contact_person?.split(" ").slice(1).join(" ") || "",
      }));

      setStep("form");
    } catch (err) {
      console.error("Error validating invitation:", err);
      setStep("invalid");
      setError("Failed to validate invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.first_name || !form.last_name) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    if (!form.password || form.password.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    if (form.password !== form.confirm_password) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.first_name,
            last_name: form.last_name,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // Update profile with group_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          display_name: `${form.first_name} ${form.last_name}`,
          company_name: form.company_name,
          mobile_phone: form.phone,
          group_id: invitation!.group_id,
          type: "pharmacy",
          status: "pending", // Admin will need to approve
          role: "user",
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // Mark invitation as accepted
      await supabase
        .from("pharmacy_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: authData.user.id,
        })
        .eq("id", invitation!.id);

      setStep("success");

      toast({
        title: "Account Created!",
        description: "Your account has been created. Please wait for admin approval.",
      });
    } catch (err: any) {
      console.error("Error creating account:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Validating invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "invalid" || step === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {step === "expired" ? (
                <AlertCircle className="h-16 w-16 text-amber-500" />
              ) : (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            <CardTitle>
              {step === "expired" ? "Invitation Expired" : "Invalid Invitation"}
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate("/login")}>Go to Login</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle>Welcome to {invitation?.group_name}!</CardTitle>
            <CardDescription>
              Your account has been created successfully. An administrator will
              review and activate your account shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Pending Approval</AlertTitle>
              <AlertDescription>
                You will receive an email once your account is activated.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate("/login")}>
              Go to Login
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Join {invitation?.group_name}</CardTitle>
              <CardDescription>
                You've been invited to join as a pharmacy
              </CardDescription>
            </div>
          </div>

          {invitation?.message && (
            <Alert className="mt-4">
              <Mail className="h-4 w-4" />
              <AlertDescription className="italic">
                "{invitation.message}"
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Pre-filled info */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{invitation?.email}</span>
              <Badge variant="secondary" className="ml-auto">Invited</Badge>
            </div>
            {invitation?.pharmacy_name && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{invitation.pharmacy_name}</span>
              </div>
            )}
          </div>

          {/* Registration Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name">Pharmacy Name</Label>
            <Input
              id="company_name"
              value={form.company_name}
              onChange={(e) => handleChange("company_name", e.target.value)}
              placeholder="ABC Pharmacy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm Password *</Label>
            <Input
              id="confirm_password"
              type="password"
              value={form.confirm_password}
              onChange={(e) => handleChange("confirm_password", e.target.value)}
              placeholder="Confirm your password"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Create Account & Join Group
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{" "}
            <a href="/terms-of-service" target="_blank" className="text-blue-600 hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default JoinGroup;
