import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../schemas/sharedFormSchema";
import { BaseUserFields } from "./BaseUserFields";
import { GroupUserFields } from "./GroupUserFields";
import { Loader2 } from "lucide-react";

interface SharedUserFormProps {
  form: UseFormReturn<BaseUserFormData>;
  onSubmit: (values: BaseUserFormData) => Promise<void>;
  submitLabel: string;
  isSubmitting?: boolean;
  self?: boolean;
}

export function SharedUserForm({
  form,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  self=false
}: SharedUserFormProps) {

  console.log(form.getValues())
  const handleSubmit = async (values: BaseUserFormData) => {
    console.log(
      "SharedUserForm: Starting form submission with values:",
      values
    );

    
    try {
      console.log(
        "SharedUserForm: Starting form submission with values:",
        values
      );

      // Ensure type is one of the allowed values
      const validType = (type: string): "pharmacy" | "hospital" | "group" => {
        const validTypes = ["pharmacy", "hospital", "group"] as const;
        const normalizedType = type.toLowerCase();
        return validTypes.includes(normalizedType as any)
          ? (normalizedType as "pharmacy" | "hospital" | "group")
          : "pharmacy";
      };

      // Ensure status is one of the allowed values
      const validStatus = (
        status: string
      ): "active" | "inactive" | "pending" => {
        const validStatuses = ["active", "inactive", "pending"] as const;
        const normalizedStatus = status.toLowerCase();
        return validStatuses.includes(normalizedStatus as any)
          ? (normalizedStatus as "active" | "inactive" | "pending")
          : "active";
      };

      // Ensure role is one of the allowed values
      const validRole = (
        role: string
      ): "admin" | "manager" | "staff" | "user" => {
        const validRoles = ["admin", "manager", "staff", "user"] as const;
        const normalizedRole = role.toLowerCase();
        return validRoles.includes(normalizedRole as any)
          ? (normalizedRole as "admin" | "manager" | "staff" | "user")
          : "user";
      };

      // Format the data to match the profile schema with proper type validation
      const formattedValues: BaseUserFormData = {
        ...values,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email.toLowerCase().trim(),
        type: validType(values.type),
        status: validStatus(values.status),
        role: validRole(values.role),
        companyName: values.companyName,
        displayName:
          values.displayName || `${values.firstName} ${values.lastName}`,
        workPhone: values.workPhone,
        mobilePhone: values.mobilePhone,
        pharmacyLicense: values.pharmacyLicense,
        groupStation: values.groupStation,
        taxId: values.taxId,
        documents: Array.isArray(values.documents) ? values.documents : [],
        billingAddress: values.billingAddress || {},
        shippingAddress: values.shippingAddress || {},
        sameAsShipping: values.sameAsShipping || false,
        freeShipping: values.freeShipping || false,
        order_pay: values.order_pay || false,
        taxPreference: values.taxPreference || "Taxable",
        currency: values.currency || "USD",
        paymentTerms: values.paymentTerms || "DueOnReceipt",
        enablePortal: values.enablePortal || false,
        portalLanguage: values.portalLanguage || "English",
        alternativeEmail: values.alternativeEmail,
        website: values.website,
        faxNumber: values.faxNumber,
        contactPerson: values.contactPerson,
        department: values.department,
        notes: values.notes,
        taxPercantage: values.taxPercantage,
        preferredContactMethod: values.preferredContactMethod || "email",
        languagePreference: values.languagePreference || "English",
        creditLimit: values.creditLimit,
        paymentMethod: values.paymentMethod,
        email_notifaction: values.email_notifaction,
      };

      console.log("SharedUserForm: Formatted values:", formattedValues);
      await onSubmit(formattedValues);
      console.log("SharedUserForm: Form submission passed to parent");
    } catch (error) {
      console.error("SharedUserForm: Error in form submission:", error);
      throw error;
    }
  };

  const userType = form.watch("type");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          (values) => {
            // console.log("✅ Valid form submission:", values);
            handleSubmit(values);
          },
          (errors) => {
            console.error("❌ Form validation errors:", errors);
          }
        )}
        className="space-y-6"
      >
        <BaseUserFields form={form} self={self} />

        {userType === "group" && (
          <GroupUserFields form={form as UseFormReturn<any>} />
        )}

        <DialogFooter>
          <Button
            type="submit"
            // disabled={isSubmitting}
            className="w-full md:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
