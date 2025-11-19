import { supabase } from "@/supabaseClient";
import { BaseUserFormData } from "../../schemas/sharedFormSchema";
import { toast } from "@/hooks/use-toast";
import axios from '../../../../../axiosconfig'

export const fetchUserProfile = async (userId: string) => {
  console.log("Fetching user data for ID:", userId);

  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      console.error("Authentication Error: No active session found");
      throw new Error("No active session found");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Database Error - Failed to fetch profile:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      console.error("Data Error: User profile not found for ID:", userId);
      throw new Error("User profile not found");
    }

    console.log("Successfully fetched profile:", data);
    return data;
  } catch (error: any) {
    console.error("Error in fetchUserProfile:", error);
    throw new Error(error.message || "Failed to fetch user profile");
  }
};

export const updateUserProfile = async (
  userId: string,
  values: BaseUserFormData
) => {
  console.log("Starting profile update with values:", values);
  console.log("Updating user ID:", userId);

  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      console.error(
        "Authentication Error: No active session found during update"
      );
      throw new Error("No active session found");
    }

    // Map form values to profile data structure
    const profileData = {
      first_name: values.firstName?.trim(),
      last_name: values.lastName?.trim(),
      email: values.email?.trim(),
      type: values.type,
      status: values.status,
      role: values.role,
      contact_person: values.contactPerson,
      company_name: values.companyName?.trim() || null,
      pharmacy_license: values.pharmacyLicense?.trim() || null,
      display_name: values.displayName?.trim() || null,
      work_phone: values.workPhone?.trim() || null,
      mobile_phone: values.mobilePhone?.trim() || null,
      billing_address: values.billingAddress || {},
      shipping_address: values.shippingAddress || {},
      locations: values.locations || [{}],
      same_as_shipping: values.sameAsShipping || false,
      freeShipping: values.freeShipping || false,
      order_pay: values.order_pay || false,
      tax_preference: values.taxPreference || "Taxable",
      currency: values.currency || "USD",
      payment_terms: values.paymentTerms || "DueOnReceipt",
      enable_portal: values.enablePortal || false,
      portal_language: values.portalLanguage || "English",
      email_notifaction:values.email_notifaction,
      taxPercantage: Number(values.taxPercantage) || 0,
      updated_at: new Date().toISOString(),
    };

    console.log("Prepared profile data for update:", profileData);

    const { data, error } = await supabase
      .from("profiles")
      .update(profileData)
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase update error:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      toast({
        title: "Error",
        description: `Failed to update profile: ${error.message}`,
        variant: "destructive",
      });
      throw new Error(`Database error: ${error.message}`);
    }

console.log(data)
if(profileData.status==="active" && sessionStorage.getItem('userType') === "admin" && !data.active_notification){
  try {

    console.log("enter the aactive")
    // const response = await axios.post("/active", {
    //   name: `${data.first_name} ${data.last_name}`,
    //   email: data.email,
    // });
    
    if(data.email_notifaction){
      const response = await axios.post("/active", {
        name: `${data.first_name} ${data.last_name}`,
        email: data.email,
        admin: true
          });
      }
    const { data: update, error } = await supabase
    .from("profiles")
    .update({ active_notification: true })
    .eq("id", userId); // Corrected eq() usage
  
  if (error) {
    console.error("Error updating profile:", error.message);
 
  } else {
    console.log("Profile updated successfully:", update);
  
  }
 

    // async function sendResetPasswordLink(email) {
    //   const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    //     redirectTo: `http://localhost:3000/reset-password?email=${email}`,
    //   });
    
    //   if (error) {
    //     console.error('Error sending reset password email:', error.message);
    //   } else {
    //     console.log('Password reset email sent successfully!', data);
    //   }
    // }
    // sendResetPasswordLink(data.email)
  } catch (error) {
    console.error("Error in user verification:", error.response?.data || error.message);
  }
}
  
   

    if (!data) {
      console.error("Update Error: No data returned after update");
      throw new Error("Profile update failed - no data returned");
    }

    console.log("Profile updated successfully:", data);
    toast({
      title: "Success",
      description: "Profile updated successfully",
    });
    return data;
  } catch (error: any) {
    console.error("Error in updateUserProfile:", error);
    throw new Error(error.message || "Failed to update profile");
  }
};
