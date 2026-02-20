import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { baseUserSchema, BaseUserFormData } from "./schemas/sharedFormSchema";
import { TabbedUserForm } from "./forms/TabbedUserForm";
import { supabase } from "@/supabaseClient";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import axios from "../../../axiosconfig"
interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: () => void;
}

export function AddUserModal({
  open,
  onOpenChange,
  onUserAdded,
}: AddUserModalProps) {
  const queryClient = useQueryClient(); // ✅ Query Client

  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setIsAdmin(profile?.role === "admin" || profile?.role === "superadmin");
      }
    };
    if (open) checkAdminRole();
  }, [open]);

  const form = useForm<BaseUserFormData>({
    resolver: zodResolver(baseUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      type: "pharmacy",
      status: "active",
      role: "user",
      companyName: "",
      displayName: "",
      workPhone: "",
      mobilePhone: "",
      pharmacyLicense: "",
      groupStation: "",
      taxId: "",
      // documents: [],
      billingAddress: {
        attention: "",
        countryRegion: "USA",
        street1: "",
        street2: "",
        city: "",
        state: "",
        zip_code: "",
        phone: "",
        faxNumber: "",
      },
      shippingAddress: {
        attention: "",
        countryRegion: "USA",
        street1: "",
        street2: "",
        city: "",
        state: "",
        zip_code: "",
        phone: "",
        faxNumber: "",
      },
      sameAsShipping: false,
      freeShipping: false,
      order_pay: false,
      taxPreference: "Taxable",
      currency: "USD",
      paymentTerms: "prepay",
      enablePortal: false,
      portalLanguage: "English",
      taxPercantage: "0",
      locations: [], // Start with empty locations array - users can add locations later
    },
  });

  const onSubmit = async (values: BaseUserFormData) => {
    try {
      setIsSubmitting(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      console.log(session)

      // Format the profile data for Supabase
      const profileData = {
        first_name: values.firstName,
        last_name: values.lastName,
        type: values.type.toLowerCase(),
        status: values.status.toLowerCase(),
        role: values.role.toLowerCase(),
        company_name: values.companyName,
        display_name:
          values.displayName || `${values.firstName} ${values.lastName}`,
        work_phone: values.workPhone,
        mobile_phone: values.mobilePhone,
        pharmacy_license: values.pharmacyLicense,
        group_station: values.groupStation,
        tax_id: values.taxId,
        documents: Array.isArray(values.documents) ? values.documents : [],
        billing_address: values.billingAddress || {},
        shipping_address: values.sameAsShipping
          ? values.billingAddress
          : values.shippingAddress,
        same_as_shipping: values.sameAsShipping,
        freeShipping: values.freeShipping,
        order_pay: values.order_pay,
        tax_preference: values.taxPreference,
        currency: values.currency,
        payment_terms: values.paymentTerms,
        enable_portal: Boolean(values.enablePortal),
        portal_language: values.portalLanguage,
        taxPercantage: values.taxPercantage,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        alternative_email: values.alternativeEmail || null,
        website: values.website || null,
        fax_number: values.faxNumber || null,
        contact_person: values.contactPerson || null,
        department: values.department || null,
        notes: values.notes || null,
        preferred_contact_method: values.preferredContactMethod || "email",
        language_preference: values.languagePreference || "English",
        credit_limit: values.creditLimit || 0,
        payment_method: values.paymentMethod || null,
        account_status: "active",
        email_notifaction: values.email_notifaction || false,
        referral_name: values.referralName || null, // Admin-only field
        state_id: values.stateId || null, // State ID field
      };

      // Generate a random secure password
      const generatePassword = () => {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
          password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
      };

      const temporaryPassword = generatePassword();

      // Call secure backend API to create user AND profile in one call (bypasses RLS)
      const response = await axios.post("/api/users/create-user", {
        email: values.email,
        password: temporaryPassword,
        firstName: values.firstName,
        lastName: values.lastName,
        userMetadata: {
          first_name: values.firstName,
          last_name: values.lastName,
        },
        profileData: profileData,
      });

      if (!response.data?.success || !response.data?.userId) {
        throw new Error(response.data?.message || "Failed to create user");
      }

      const tempUserData = { id: response.data.userId };
      const insertedProfile = response.data.profile?.data || null;

      // Check if profile creation failed on server
      if (response.data.profile && !response.data.profile.success) {
        console.error('Server profile creation error:', response.data.profile.error);
        throw new Error(response.data.profile.error || 'Failed to create profile');
      }

      console.log('Attempting to insert user with data:', profileData);
      console.log('Profile created successfully via server:', insertedProfile);

      // Always send welcome email with credentials to newly created users
      try {
        // Generate terms acceptance token
        let termsAcceptanceLink = null;
        try {
          const tokenResponse = await axios.post("/api/terms/generate-token", {
            userId: tempUserData.id,
            email: values.email.toLowerCase().trim()
          });
          
          if (tokenResponse.data.success) {
            termsAcceptanceLink = tokenResponse.data.actionLink;
            console.log("Terms acceptance link generated:", termsAcceptanceLink);
          }
        } catch (tokenError) {
          console.error("Error generating terms link:", tokenError);
          // Continue without link - email will still be sent
        }

        const notifResponse = await axios.post("/active-admin", {
          name: `${profileData.first_name} ${profileData.last_name}`,
          email: values.email.toLowerCase().trim(),
          admin: true,
          password: temporaryPassword,
          termsAcceptanceLink: termsAcceptanceLink
        });

        console.log("Welcome email sent successfully:", notifResponse.data);

        // Update profile to mark that email notification was sent
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ email_notifaction: true })
          .eq("id", tempUserData?.id);
        
        if (updateError) {
          console.error("Error updating email notification flag:", updateError.message);
        }

        toast({
          title: "Success",
          description: `${values.firstName} ${values.lastName} has been created and welcome email sent with login credentials`,
        });
      } catch (error) {
        console.error("Error sending welcome email:", error);
        
        // Check if it's a network error or server error
        if (error.response) {
          // Server responded with error status
          console.error("Server error response:", error.response.data);
          toast({
            title: "User Created",
            description: `${values.firstName} ${values.lastName} has been created, but email failed: ${error.response.data?.message || error.response.data?.error || 'Server error'}`,
            variant: "destructive",
          });
        } else if (error.request) {
          // Network error
          console.error("Network error:", error.request);
          toast({
            title: "User Created",
            description: `${values.firstName} ${values.lastName} has been created, but email failed due to network error. Please check server connection.`,
            variant: "destructive",
          });
        } else {
          // Other error
          console.error("Email error:", error.message);
          toast({
            title: "User Created",
            description: `${values.firstName} ${values.lastName} has been created, but email failed: ${error.message}`,
            variant: "destructive",
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["users"] });

      form.reset();
      onUserAdded();
      onOpenChange(false);
    } catch (error: any) {
      // console.error('Detailed error creating customer:', error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to create customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Create a new customer account with the following details.
          </DialogDescription>
        </DialogHeader>
        <TabbedUserForm
          form={form}
          onSubmit={onSubmit}
          submitLabel="Create Customer"
          isSubmitting={isSubmitting}
          isAdmin={isAdmin}
        />
      </DialogContent>
    </Dialog>
  );
}
