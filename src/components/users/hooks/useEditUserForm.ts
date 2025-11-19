import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { BaseUserFormData, baseUserSchema } from "../schemas/sharedFormSchema";
import {
  UseEditUserFormProps,
  EditUserFormState,
} from "./types/editUserForm.types";
import {
  fetchUserProfile,
  updateUserProfile,
} from "./services/userProfileService";
import { useState, useCallback } from "react";

export const useEditUserForm = ({
  userId,
  initialName,
  initialEmail,
  initialType,
  initialStatus,
  onSuccess,
  onClose,
}: UseEditUserFormProps) => {
  const { toast } = useToast();
  const [formState, setFormState] = useState<EditUserFormState>({
    isLoading: true,
    error: null,
    isSaving: false,
  });

  // Initialize form with default values
  const form = useForm<BaseUserFormData>({
    resolver: zodResolver(baseUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: initialEmail || "",
      type: initialType || "pharmacy",
      status: initialStatus || "pending",
      role: "user",
      companyName: "",
      displayName: "",
      workPhone: "",
      mobilePhone: "",
      billingAddress: {
        street1: "",
        city: "",
        state: "",
        zip_code: "",
      },
      shippingAddress: {
        street1: "",
        city: "",
        state: "",
        zip_code: "",
      },
      sameAsShipping: false,
      contactPerson:'',
      freeShipping: false,
      taxPercantage:"",
      taxPreference: "Taxable",
      currency: "USD",
      paymentTerms: "DueOnReceipt",
      enablePortal: false,
      portalLanguage: "English",
      email_notifaction:false
    },
  });

  const fetchUserData = useCallback(async () => {
    try {
      console.log("Fetching user data for ID:", userId);
      setFormState((prev) => ({ ...prev, isLoading: true, error: null }));

      const data = await fetchUserProfile(userId);

      if (data) {
        console.log("Successfully fetched user data:", data);
        // Split the name into first and last name if it exists
        const [firstName = "", lastName = ""] = (initialName || "").split(" ");

        form.reset({
          firstName: data.first_name || firstName,
          lastName: data.last_name || lastName,
          email: data.email || initialEmail || "",
          type: data.type || initialType || "pharmacy",
          status: data.status || initialStatus || "pending",
          role: data.role || "user",
          companyName: data.company_name || "",
          displayName: data.display_name || "",
          workPhone: data.work_phone || "",
          mobilePhone: data.mobile_phone || "",
          contactPerson:data.contact_person || "",
          billingAddress: data.billing_address || {
            street1: "",
            city: "",
            state: "",
            zip_code: "",
          },
          shippingAddress: data.shipping_address || {
            street1: "",
            city: "",
            state: "",
            zip_code: "",
          },
          taxPercantage:data.taxPercantage,
          sameAsShipping: data.same_as_shipping || false,
          freeShipping: data.freeShipping || false,
          order_pay: data.order_pay || false,
          taxPreference: data.tax_preference || "Taxable",
          currency: data.currency || "USD",
          paymentTerms: data.payment_terms || "DueOnReceipt",
          enablePortal: data.enable_portal || false,
          portalLanguage: data.portal_language || "English",
          email_notifaction:data.email_notifaction
        });
      }
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      setFormState((prev) => ({
        ...prev,
        error: error.message || "Failed to load user data",
      }));
      toast({
        title: "Error Loading Data",
        description: error.message || "Failed to load user data",
        variant: "destructive",
      });
    } finally {
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [
    userId,
    initialName,
    initialEmail,
    initialType,
    initialStatus,
    form,
    toast,
  ]);

  const onSubmit = async (values: BaseUserFormData) => {
    try {
      console.log("Starting form submission with values:", values);

      // Validate required fields
      if (!values.firstName?.trim() || !values.lastName?.trim()) {
        throw new Error("First name and last name are required");
      }

      setFormState((prev) => ({ ...prev, isSaving: true, error: null }));


      
      // Ensure all required fields are properly formatted
      const formattedValues = {
        ...values,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        billingAddress: values.billingAddress || {},
        shippingAddress: values.shippingAddress || {},
        email_notifaction:values.email_notifaction
      };

      console.log("Submitting formatted values:", formattedValues);

      await updateUserProfile(userId, formattedValues);

      toast({
        title: "Success",
        description: "User profile has been updated successfully.",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setFormState((prev) => ({
        ...prev,
        error: error.message || "Failed to update profile",
      }));
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
      throw error;
    } finally {
      setFormState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  return {
    form,
    onSubmit,
    fetchUserData,
    formState,
  };
};
