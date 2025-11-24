import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../schemas/sharedFormSchema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Building2, MapPin, FileText } from "lucide-react";
import { BasicInformationSection } from "./sections/BasicInformationSection";
import { ContactInformationSection } from "./sections/ContactInformationSection";
import { AddressInformationSection } from "./sections/AddressInformationSection";
import { TaxAndDocumentsSection } from "./sections/TaxAndDocumentsSection";
import { CustomerTypeFields } from "./sections/CustomerTypeFields";
import { GroupUserFields } from "./GroupUserFields";
import { useEffect } from "react";

interface TabbedUserFormProps {
  form: UseFormReturn<BaseUserFormData>;
  onSubmit: (values: BaseUserFormData) => Promise<void>;
  submitLabel: string;
  isSubmitting?: boolean;
  self?: boolean;
}

export function TabbedUserForm({
  form,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  self = false,
}: TabbedUserFormProps) {
  const handleSubmit = async (values: BaseUserFormData) => {
    try {
      const validType = (type: string): "pharmacy" | "hospital" | "group" => {
        const validTypes = ["pharmacy", "hospital", "group"] as const;
        const normalizedType = type.toLowerCase();
        return validTypes.includes(normalizedType as any)
          ? (normalizedType as "pharmacy" | "hospital" | "group")
          : "pharmacy";
      };

      const validStatus = (
        status: string
      ): "active" | "inactive" | "pending" => {
        const validStatuses = ["active", "inactive", "pending"] as const;
        const normalizedStatus = status.toLowerCase();
        return validStatuses.includes(normalizedStatus as any)
          ? (normalizedStatus as "active" | "inactive" | "pending")
          : "active";
      };

      const validRole = (
        role: string
      ): "admin" | "manager" | "staff" | "user" => {
        const validRoles = ["admin", "manager", "staff", "user"] as const;
        const normalizedRole = role.toLowerCase();
        return validRoles.includes(normalizedRole as any)
          ? (normalizedRole as "admin" | "manager" | "staff" | "user")
          : "user";
      };

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
        paymentTerms: values.paymentTerms || "prepay",
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

      await onSubmit(formattedValues);
    } catch (error) {
      console.error("TabbedUserForm: Error in form submission:", error);
      throw error;
    }
  };

  const userType = form.watch("type");

  useEffect(() => {
    form.setValue("billingAddress.phone", form.getValues("workPhone"));
    form.setValue("shippingAddress.phone", form.getValues("workPhone"));
  }, [form.watch("workPhone")]);

  useEffect(() => {
    form.setValue("shippingAddress.attention", form.getValues("contactPerson"));
    form.setValue("billingAddress.attention", form.getValues("contactPerson"));
  }, [form.watch("contactPerson")]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          (values) => {
            handleSubmit(values);
          },
          (errors) => {
            console.error("❌ Form validation errors:", errors);
          }
        )}
        className="space-y-4"
      >
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Basic Info</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Contact</span>
            </TabsTrigger>
            <TabsTrigger value="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Address</span>
            </TabsTrigger>
            <TabsTrigger value="tax" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Tax & Docs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <BasicInformationSection form={form} self={self} />
            {userType && <CustomerTypeFields form={form} type={userType as "pharmacy" | "hospital" | "group"} />}
            {userType === "group" && <GroupUserFields form={form as UseFormReturn<any>} />}
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-4">
            <ContactInformationSection form={form} />
          </TabsContent>

          <TabsContent value="address" className="space-y-4 mt-4">
            <AddressInformationSection form={form} self={self} />
          </TabsContent>

          <TabsContent value="tax" className="space-y-4 mt-4">
            <TaxAndDocumentsSection form={form} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            type="submit"
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
