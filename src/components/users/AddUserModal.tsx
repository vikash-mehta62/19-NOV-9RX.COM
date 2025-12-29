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
        countryRegion: "",
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
        countryRegion: "",
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
      locations: [
        // ✅ Fix: Change from object `{}` to an array `[]`
        {
          name: "",
          type: "headquarters", // Provide a valid default type
          status: "active", // Provide a valid default status
          address: {
            attention: "",
            countryRegion: "",
            street1: "",
            street2: "",
            city: "",
            state: "",
            zip_code: "",
            phone: "",
            faxNumber: "",
          },
          manager: "",
          contactEmail: "",
          contactPhone: "",
        },
      ],
    },
  });

  const onSubmit = async (values: BaseUserFormData) => {
    try {
      setIsSubmitting(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      console.log(session)

      // Call secure backend API to create user
      const response = await axios.post("/api/users/create-user", {
        email: values.email,
        password: "12345678",
        firstName: values.firstName,
        lastName: values.lastName,
        userMetadata: {
          first_name: values.firstName,
          last_name: values.lastName,
        },
      });

      if (!response.data?.success || !response.data?.userId) {
        throw new Error(response.data?.message || "Failed to create user");
      }

      const tempUserData = { id: response.data.userId };

      // Generate a new UUID for the user
      // const userId = uuidv4();

      // Format the data for Supabase
      const userData = {
        id: tempUserData?.id,
        first_name: values.firstName,
        last_name: values.lastName,
        // display_name:values.firstName + " " + values.lastName,
        email: values.email.toLowerCase().trim(),
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
        email_notifaction:values.email_notifaction || false,
        referral_name: values.referralName || null, // Admin-only field
        state_id: values.stateId || null, // State ID field

      };

      // console.log('Attempting to insert user with data:', userData);

      const { error } = await supabase.from("profiles").upsert(userData);


      if(userData.status==="active" && userData.email_notifaction){
        try {
          const response = await axios.post("/active-admin", {
            name: `${userData.first_name} ${userData.last_name}`,
            email: userData.email,
            admin: true
          });

          const { data: update, error } = await supabase
          .from("profiles")
          .update({ email_notifaction: true })
          .eq("id", tempUserData?.id); // Corrected eq() usage
        
        if (error) {
          console.error("Error updating profile:", error.message);
       
        } else {
          console.log("Profile updated successfully:", update);
        
        }
        
          console.log("Verification Successful:", response.data);
      
          async function sendResetPasswordLink(email) {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email);
          
            if (error) {
              console.error('Error sending reset password email:', error.message);
            } else {
              console.log('Password reset email sent successfully!', data);
            }
          }
          // sendResetPasswordLink(userData.email)
        } catch (error) {
          console.error("Error in user verification:", error.response?.data || error.message);
        }
      }
        
      // const { data, error } = await supabase
      //   .from('profiles')
      //   .insert([userData])
      //   .select();

      if (error) {
        // console.error('Supabase error creating user:', error);
        throw new Error(error.message);
      }

      // console.log('User created successfully:', data);

      toast({
        title: "Success",
        description: `${values.firstName} ${values.lastName} has been created successfully`,
      });
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
