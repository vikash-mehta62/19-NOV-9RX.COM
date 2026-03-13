"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "../../../axiosconfig";
import { Building2, Mail, MapPin, Plus, Receipt, Truck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const trimString = (message?: string) =>
  z.string().trim().min(1, message || "This field is required");

const optionalTrimmedString = z.string().trim().optional().or(z.literal(""));

const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || value.replace(/\D/g, "").length === 10, "Phone number must contain exactly 10 digits")
  .optional()
  .or(z.literal(""));

const optionalWebsiteSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    try {
      const normalizedValue = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      new URL(normalizedValue);
      return true;
    } catch {
      return false;
    }
  }, "Enter a valid website URL")
  .optional()
  .or(z.literal(""));

const zipCodeSchema = z
  .string()
  .trim()
  .min(1, "ZIP code is required")
  .regex(/^[A-Za-z0-9 -]{3,10}$/, "Enter a valid ZIP code");

const addressSchema = z.object({
  attention: optionalTrimmedString,
  countryRegion: trimString("Country is required"),
  street1: trimString("Street address is required"),
  street2: optionalTrimmedString,
  city: trimString("City is required"),
  state: trimString("State is required"),
  zip_code: zipCodeSchema,
  phone: optionalPhoneSchema,
  faxNumber: optionalPhoneSchema,
});

const shippingAddressSchema = addressSchema.partial();

const vendorSchema = z.object({
  firstName: trimString("First name is required"),
  lastName: trimString("Last name is required"),
  email: z.string().trim().email("Valid email is required"),
  alternativeEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  companyName: trimString("Company name is required"),
  displayName: optionalTrimmedString,
  status: z.enum(["active", "inactive", "suspended"]),
  role: z.string().default("user"),
  type: z.literal("vendor"),
  workPhone: optionalPhoneSchema,
  mobilePhone: optionalPhoneSchema,
  contactPerson: optionalTrimmedString,
  department: optionalTrimmedString,
  website: optionalWebsiteSchema,
  taxId: optionalTrimmedString,
  paymentTerms: trimString("Payment terms are required"),
  paymentMethod: optionalTrimmedString,
  preferredContactMethod: z.enum(["email", "phone", "portal"]),
  languagePreference: z.string().default("English"),
  currency: optionalTrimmedString,
  freeShipping: z.boolean(),
  sameAsShipping: z.boolean(),
  email_notifaction: z.boolean(),
  notes: optionalTrimmedString,
  billingAddress: addressSchema,
  shippingAddress: shippingAddressSchema,
}).superRefine((values, ctx) => {
  if (values.sameAsShipping) {
    return;
  }

  const requiredShippingFields: Array<keyof z.infer<typeof shippingAddressSchema>> = [
    "countryRegion",
    "street1",
    "city",
    "state",
    "zip_code",
  ];

  requiredShippingFields.forEach((field) => {
    const value = values.shippingAddress[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      const labels: Record<string, string> = {
        countryRegion: "Country is required",
        street1: "Street address is required",
        city: "City is required",
        state: "State is required",
        zip_code: "ZIP code is required",
      };

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shippingAddress", field],
        message: labels[field],
      });
    }
  });
});

export type VendorFormData = z.infer<typeof vendorSchema>;

interface CreatedVendorResult {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  status: string;
  type: string;
}

interface VendorDialogFormProps {
  vendor?: Partial<VendorFormData>;
  mode?: "add" | "edit";
  onSubmit?: (data: VendorFormData, createdVendor?: CreatedVendorResult) => void;
}

type VendorTab = "contact" | "business" | "address";

const defaultAddress = {
  attention: "",
  countryRegion: "USA",
  street1: "",
  street2: "",
  city: "",
  state: "",
  zip_code: "",
  phone: "",
  faxNumber: "",
};

const defaultValues: VendorFormData = {
  firstName: "",
  lastName: "",
  email: "",
  alternativeEmail: "",
  companyName: "",
  displayName: "",
  status: "active",
  role: "user",
  type: "vendor",
  workPhone: "",
  mobilePhone: "",
  contactPerson: "",
  department: "",
  website: "",
  taxId: "",
  paymentTerms: "Net 30",
  paymentMethod: "manual",
  preferredContactMethod: "email",
  languagePreference: "English",
  currency: "USD",
  freeShipping: false,
  sameAsShipping: false,
  email_notifaction: false,
  notes: "",
  billingAddress: defaultAddress,
  shippingAddress: defaultAddress,
};

const generatePassword = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const createProfileData = (values: VendorFormData) => ({
  first_name: values.firstName.trim(),
  last_name: values.lastName.trim(),
  email: values.email.toLowerCase().trim(),
  type: "vendor",
  status: values.status,
  role: values.role,
  company_name: values.companyName.trim(),
  display_name: values.displayName?.trim() || values.companyName.trim() || `${values.firstName} ${values.lastName}`.trim(),
  work_phone: values.workPhone?.trim() || null,
  mobile_phone: values.mobilePhone?.trim() || null,
  contact_person: values.contactPerson?.trim() || `${values.firstName} ${values.lastName}`.trim(),
  department: values.department?.trim() || null,
  billing_address: values.billingAddress,
  shipping_address: values.sameAsShipping ? values.billingAddress : values.shippingAddress,
  same_as_shipping: values.sameAsShipping,
  freeShipping: values.freeShipping,
  currency: "USD",
  payment_terms: values.paymentTerms,
  payment_method: "manual",
  tax_id: values.taxId?.trim() || null,
  alternative_email: values.alternativeEmail?.trim() || null,
  website: values.website?.trim() || null,
  fax_number: values.billingAddress.faxNumber?.trim() || values.shippingAddress.faxNumber?.trim() || null,
  preferred_contact_method: values.preferredContactMethod,
  language_preference: values.languagePreference,
  notes: values.notes?.trim() || null,
  email_notifaction: values.email_notifaction,
  active_notification: true,
  updated_at: new Date().toISOString(),
});

const RequiredMark = () => <span className="ml-1 text-red-500">*</span>;

const requiredLabel = (label: string) => (
  <span>
    {label}
    <RequiredMark />
  </span>
);

const normalizePhoneDigits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

export default function VendorDialogForm({ vendor, mode = "add", onSubmit }: VendorDialogFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<VendorTab>("contact");
  const { toast } = useToast();

  const mergedDefaults = useMemo(() => ({
    ...defaultValues,
    ...vendor,
    billingAddress: { ...defaultValues.billingAddress, ...(vendor?.billingAddress || {}) },
    shippingAddress: { ...defaultValues.shippingAddress, ...(vendor?.shippingAddress || {}) },
  }), [vendor]);

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: mergedDefaults,
  });

  const sameAsShipping = form.watch("sameAsShipping");

  const closeDialog = () => {
    setOpen(false);
    setActiveTab("contact");
    form.reset(mergedDefaults);
  };

  const getFirstErrorTab = (errors: FieldErrors<VendorFormData>): VendorTab => {
    const errorKeys = Object.keys(errors);

    if (errorKeys.some((key) => ["billingAddress", "shippingAddress", "sameAsShipping"].includes(key))) {
      return "address";
    }

    if (errorKeys.some((key) => ["status", "paymentTerms", "preferredContactMethod", "languagePreference", "taxId", "notes", "freeShipping", "email_notifaction"].includes(key))) {
      return "business";
    }

    return "contact";
  };

  const handleInvalidSubmit = (errors: FieldErrors<VendorFormData>) => {
    const nextTab = getFirstErrorTab(errors);
    setActiveTab(nextTab);

    toast({
      title: "Complete required fields",
      description: `The form has missing or invalid fields in the ${nextTab} section.`,
      variant: "destructive",
    });
  };

  const handleSubmit = async (values: VendorFormData) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post("/api/users/create-user", {
        email: values.email,
        password: generatePassword(),
        firstName: values.firstName,
        lastName: values.lastName,
        userMetadata: { first_name: values.firstName, last_name: values.lastName },
        profileData: createProfileData(values),
      });

      if (!response.data?.success || !response.data?.userId) {
        throw new Error(response.data?.message || "Failed to create vendor");
      }
      if (response.data.profile && !response.data.profile.success) {
        throw new Error(response.data.profile.error || "Failed to save vendor profile");
      }

      const createdVendor: CreatedVendorResult = {
        id: response.data.userId,
        first_name: values.firstName,
        last_name: values.lastName,
        company_name: values.companyName,
        email: values.email.toLowerCase().trim(),
        status: values.status,
        type: "vendor",
      };

      onSubmit?.(values, createdVendor);
      toast({
        title: "Vendor created",
        description: `${values.companyName || `${values.firstName} ${values.lastName}`} is ready for purchase orders.`,
      });
      form.reset(defaultValues);
      setOpen(false);
    } catch (error: unknown) {
      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : error instanceof Error
            ? error.message
            : "Failed to create vendor.";
      const isDuplicateEmailError = errorMessage.toLowerCase().includes("email already exists");

      toast({
        title: isDuplicateEmailError ? "Email already exists" : "Vendor create failed",
        description: isDuplicateEmailError ? "Use a different email address for this vendor." : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
      <DialogTrigger asChild>
        <Button variant={mode === "edit" ? "outline" : "default"} size="sm" className={mode === "add" ? "gap-2 bg-blue-600 hover:bg-blue-700" : "gap-2"}>
          <Plus className="h-4 w-4" />
          {mode === "edit" ? "Edit Vendor" : "Add Vendor"}
        </Button>
      </DialogTrigger>
      <DialogContent className="z-[100001] flex max-h-[92vh] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 px-6 pt-6">
            <Building2 className="h-5 w-5" />
            {mode === "edit" ? "Edit Vendor" : "Add New Vendor"}
          </DialogTitle>
          <DialogDescription className="px-6 pb-2">
            Create a complete vendor profile with contact, purchasing, billing, and shipping information for PO workflow.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-6">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as VendorTab)} className="w-full space-y-6 pb-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="contact" className="gap-2"><User className="h-4 w-4" />Contact</TabsTrigger>
                <TabsTrigger value="business" className="gap-2"><Receipt className="h-4 w-4" />Business</TabsTrigger>
                <TabsTrigger value="address" className="gap-2"><MapPin className="h-4 w-4" />Address</TabsTrigger>
              </TabsList>
              <TabsContent value="contact" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendor Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="firstName" render={({ field }) => <FormItem><FormLabel>{requiredLabel("First Name")}</FormLabel><FormControl><Input {...field} placeholder="First name" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="lastName" render={({ field }) => <FormItem><FormLabel>{requiredLabel("Last Name")}</FormLabel><FormControl><Input {...field} placeholder="Last name" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="companyName" render={({ field }) => <FormItem><FormLabel>{requiredLabel("Company Name")}</FormLabel><FormControl><Input {...field} placeholder="Vendor company" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="displayName" render={({ field }) => <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input {...field} placeholder="Used in PO lists and selectors" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>{requiredLabel("Email")}</FormLabel><FormControl><Input type="email" {...field} placeholder="Primary vendor email" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="alternativeEmail" render={({ field }) => <FormItem><FormLabel>Alternative Email</FormLabel><FormControl><Input type="email" {...field} placeholder="AP or backup email" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="contactPerson" render={({ field }) => <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} placeholder="Sales rep or account contact" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="department" render={({ field }) => <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} placeholder="Sales, AP, logistics" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="workPhone" render={({ field }) => <FormItem><FormLabel>Work Phone</FormLabel><FormControl><Input {...field} inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="Office phone" onChange={(event) => field.onChange(normalizePhoneDigits(event.target.value))} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="mobilePhone" render={({ field }) => <FormItem><FormLabel>Mobile Phone</FormLabel><FormControl><Input {...field} inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="Mobile phone" onChange={(event) => field.onChange(normalizePhoneDigits(event.target.value))} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="website" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Website</FormLabel><FormControl><Input {...field} placeholder="https://vendor-site.com" /></FormControl><FormMessage /></FormItem>} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="business" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Business and Purchasing Defaults</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className="z-[100002]">
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="paymentTerms" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{requiredLabel("Payment Terms")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className="z-[100002]">
                            <SelectItem value="Prepaid">Prepaid</SelectItem>
                            <SelectItem value="COD">COD</SelectItem>
                            <SelectItem value="Net 15">Net 15</SelectItem>
                            <SelectItem value="Net 30">Net 30</SelectItem>
                            <SelectItem value="Net 45">Net 45</SelectItem>
                            <SelectItem value="Net 60">Net 60</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="preferredContactMethod" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Contact Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className="z-[100002]">
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="portal">Portal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="languagePreference" render={({ field }) => <FormItem><FormLabel>Language</FormLabel><FormControl><Input {...field} placeholder="English" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="taxId" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Tax ID</FormLabel><FormControl><Input {...field} placeholder="Tax ID or supplier reference" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="notes" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Purchasing Notes</FormLabel><FormControl><Textarea {...field} className="min-h-[120px]" placeholder="Lead times, ordering rules, AP notes, account references, or delivery instructions." /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="freeShipping" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 rounded-xl border p-4">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1"><FormLabel>Free Shipping Vendor</FormLabel><p className="text-sm text-slate-500">Use this vendor as free-freight by default for purchase orders.</p></div>
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="address" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing Address</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="billingAddress.attention" render={({ field }) => <FormItem><FormLabel>Attention</FormLabel><FormControl><Input {...field} placeholder="Attention / department" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="billingAddress.countryRegion" render={({ field }) => <FormItem><FormLabel>{requiredLabel("Country")}</FormLabel><FormControl><Input {...field} placeholder="Country" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="billingAddress.street1" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>{requiredLabel("Street 1")}</FormLabel><FormControl><Input {...field} placeholder="Street address" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="billingAddress.street2" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Street 2</FormLabel><FormControl><Input {...field} placeholder="Suite, unit, building" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="billingAddress.city" render={({ field }) => <FormItem><FormLabel>{requiredLabel("City")}</FormLabel><FormControl><Input {...field} placeholder="City" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="billingAddress.state" render={({ field }) => <FormItem><FormLabel>{requiredLabel("State")}</FormLabel><FormControl><Input {...field} placeholder="State" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="billingAddress.zip_code" render={({ field }) => <FormItem><FormLabel>{requiredLabel("ZIP Code")}</FormLabel><FormControl><Input {...field} placeholder="ZIP code" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="billingAddress.phone" render={({ field }) => <FormItem><FormLabel>Billing Phone</FormLabel><FormControl><Input {...field} inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="Billing phone" onChange={(event) => field.onChange(normalizePhoneDigits(event.target.value))} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="billingAddress.faxNumber" render={({ field }) => <FormItem><FormLabel>Fax</FormLabel><FormControl><Input {...field} inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="Fax number" onChange={(event) => field.onChange(normalizePhoneDigits(event.target.value))} /></FormControl><FormMessage /></FormItem>} />
                  </CardContent>
                </Card>

                <FormField control={form.control} name="sameAsShipping" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 rounded-xl border bg-slate-50 p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked) {
                        const billing = form.getValues("billingAddress");
                        form.setValue("shippingAddress", { ...billing }, { shouldValidate: true });
                      }
                    }} /></FormControl>
                    <div className="space-y-1"><FormLabel>Shipping address same as billing</FormLabel><p className="text-sm text-slate-500">Use the billing address as the vendor warehouse / shipping address.</p></div>
                  </FormItem>
                )} />

                {!sameAsShipping && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Shipping Address</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField control={form.control} name="shippingAddress.attention" render={({ field }) => <FormItem><FormLabel>Attention</FormLabel><FormControl><Input {...field} placeholder="Dock / warehouse contact" /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="shippingAddress.countryRegion" render={({ field }) => <FormItem><FormLabel>{requiredLabel("Country")}</FormLabel><FormControl><Input {...field} placeholder="Country" /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="shippingAddress.street1" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>{requiredLabel("Street 1")}</FormLabel><FormControl><Input {...field} placeholder="Street address" /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="shippingAddress.street2" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Street 2</FormLabel><FormControl><Input {...field} placeholder="Suite, unit, building" /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="shippingAddress.city" render={({ field }) => <FormItem><FormLabel>{requiredLabel("City")}</FormLabel><FormControl><Input {...field} placeholder="City" /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="shippingAddress.state" render={({ field }) => <FormItem><FormLabel>{requiredLabel("State")}</FormLabel><FormControl><Input {...field} placeholder="State" /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="shippingAddress.zip_code" render={({ field }) => <FormItem><FormLabel>{requiredLabel("ZIP Code")}</FormLabel><FormControl><Input {...field} placeholder="ZIP code" /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="shippingAddress.phone" render={({ field }) => <FormItem><FormLabel>Shipping Phone</FormLabel><FormControl><Input {...field} inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="Shipping phone" onChange={(event) => field.onChange(normalizePhoneDigits(event.target.value))} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="shippingAddress.faxNumber" render={({ field }) => <FormItem><FormLabel>Fax</FormLabel><FormControl><Input {...field} inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="Fax number" onChange={(event) => field.onChange(normalizePhoneDigits(event.target.value))} /></FormControl><FormMessage /></FormItem>} />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
            </div>
            <DialogFooter className="sticky bottom-0 gap-2 border-t bg-white px-6 py-4">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Mail className="h-4 w-4" />
                {isSubmitting ? "Saving Vendor..." : "Create Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
