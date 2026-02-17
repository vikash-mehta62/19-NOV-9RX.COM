import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { Mail, User, Phone, Building2, Send, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { addDays, format } from "date-fns";
import axios from "../../../axiosconfig";

interface InvitePharmacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent?: () => void;
}

export function InvitePharmacyDialog({
  open,
  onOpenChange,
  onInviteSent,
}: InvitePharmacyDialogProps) {
  const { toast } = useToast();
  const userProfile = useSelector(selectUserProfile);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    pharmacy_name: "",
    contact_person: "",
    phone: "",
    message: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.email) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(form.email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!form.pharmacy_name) {
      toast({
        title: "Error",
        description: "Pharmacy name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Check if invitation already exists
      const { data: existingInvite } = await supabase
        .from("pharmacy_invitations")
        .select("id, status")
        .eq("group_id", userProfile.id)
        .eq("email", form.email.toLowerCase())
        .eq("status", "pending")
        .single();

      if (existingInvite) {
        toast({
          title: "Invitation Exists",
          description: "A pending invitation already exists for this email",
          variant: "destructive",
        });
        return;
      }

      // Check if pharmacy with this email already exists in the group
      const { data: existingPharmacy } = await supabase
        .from("profiles")
        .select("id")
        .eq("group_id", userProfile.id)
        .eq("email", form.email.toLowerCase())
        .single();

      if (existingPharmacy) {
        toast({
          title: "Already in Group",
          description: "A pharmacy with this email is already in your group",
          variant: "destructive",
        });
        return;
      }

      // Generate cryptographically secure token
      const tokenArray = new Uint8Array(32);
      crypto.getRandomValues(tokenArray);
      const token = Array.from(tokenArray, byte => byte.toString(16).padStart(2, '0')).join('');
      const expiresAt = addDays(new Date(), 7); // 7 days expiry

      // Create invitation
      const { error } = await supabase.from("pharmacy_invitations").insert({
        group_id: userProfile.id,
        email: form.email.toLowerCase(),
        pharmacy_name: form.pharmacy_name,
        contact_person: form.contact_person || null,
        phone: form.phone || null,
        message: form.message || null,
        token,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      // Send invitation email
      const inviteLink = `${window.location.origin}/join-group?token=${token}`;
      
      try {
        await axios.post("/group-invitation", {
          email: form.email.toLowerCase(),
          pharmacyName: form.pharmacy_name,
          contactPerson: form.contact_person || null,
          groupName: userProfile?.company_name || userProfile?.display_name || "Your Group",
          inviterName: userProfile?.display_name || `${userProfile?.first_name} ${userProfile?.last_name}`,
          inviteLink,
          expiresAt: expiresAt.toISOString(),
          personalMessage: form.message || null,
        });
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);
        // Don't fail the whole operation if email fails
      }

      toast({
        title: "Invitation Sent!",
        description: (
          <div className="space-y-2">
            <p>Invitation email sent to {form.email}</p>
            <p className="text-xs text-muted-foreground">
              Expires: {format(expiresAt, "MMM d, yyyy")}
            </p>
          </div>
        ),
      });

      // Reset form and close
      setForm({
        email: "",
        pharmacy_name: "",
        contact_person: "",
        phone: "",
        message: "",
      });
      onOpenChange(false);
      onInviteSent?.();
    } catch (err: any) {
      console.error("Error sending invitation:", err.message);      toast({
        title: "Error",
        description: err.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Pharmacy to Group
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a pharmacy to join your group. They will
            receive an email with instructions to register.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="pharmacy@example.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          {/* Pharmacy Name */}
          <div className="space-y-2">
            <Label htmlFor="pharmacy_name" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Pharmacy Name *
            </Label>
            <Input
              id="pharmacy_name"
              placeholder="ABC Pharmacy"
              value={form.pharmacy_name}
              onChange={(e) => handleChange("pharmacy_name", e.target.value)}
            />
          </div>

          {/* Contact Person */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Person
              </Label>
              <Input
                id="contact_person"
                placeholder="John Doe"
                value={form.contact_person}
                onChange={(e) => handleChange("contact_person", e.target.value)}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to include in the invitation email..."
              value={form.message}
              onChange={(e) => handleChange("message", e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This message will be included in the invitation email
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
