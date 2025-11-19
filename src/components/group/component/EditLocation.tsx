"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"

// Define the user data schema
const userFormSchema = z.object({
  // Personal Information
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  mobile_phone: z.string().optional(),
  work_phone: z.string().optional(),

  // Company Information
  company_name: z.string().optional(),
  type: z.enum(["pharmacy", "hospital"]),
  account_status: z.enum(["active", "inactive", "pending"]),

  // Billing Information
  billing_address: z.object({
    street1: z.string().min(1, "Street address is required"),
    street2: z.string().optional(),
    attention: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "Zip code is required"), // Keep as zipCode in the form
    phone: z.string().optional(),
    faxNumber: z.string().optional(),
    countryRegion: z.string().optional(), // Keep as countryRegion in the form
  }),

  // Shipping Information
  same_as_shipping: z.boolean().default(false),
  shipping_address: z.object({
    street1: z.string().min(1, "Street address is required"),
    street2: z.string().optional(),
    attention: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "Zip code is required"), // Keep as zipCode in the form
    phone: z.string().optional(),
    faxNumber: z.string().optional(),
    countryRegion: z.string().optional(), // Keep as countryRegion in the form
  }),

  // Preferences
  currency: z.string().default("USD"),
  payment_terms: z.string().default("DueOnReceipt"),
  tax_preference: z.enum(["Taxable", "Non-taxable"]).default("Taxable"),
  portal_language: z.string().default("English"),
  enable_portal: z.boolean().default(false),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface UserEditModalProps {
  open: boolean
  onOpenChange: () => void
  userData: any
  onSave: (data: UserFormValues) => void
}

export function EditLocationPopup({ open, onOpenChange, userData, onSave }: UserEditModalProps) {
  const [activeTab, setActiveTab] = useState("personal")
  const [loading, setLoading] = useState(false)

  // Initialize form with user data
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      first_name: userData?.first_name || "",
      last_name: userData?.last_name || "",
      email: userData?.email || "",
      mobile_phone: userData?.mobile_phone || "",
      work_phone: userData?.work_phone || "",
      company_name: userData?.company_name || "",
      type: userData?.type || "pharmacy",
      account_status: userData?.account_status || "pending",
      billing_address: {
        street1: userData?.billing_address?.street1 || "",
        street2: userData?.billing_address?.street2 || "",
        attention: userData?.billing_address?.attention || "",
        city: userData?.billing_address?.city || "",
        state: userData?.billing_address?.state || "",
        zipCode: userData?.billing_address?.zip_code || "", // Changed from zipCode to zip_code
        phone: userData?.billing_address?.phone || "",
        faxNumber: userData?.billing_address?.faxNumber || "",
        countryRegion: userData?.billing_address?.country || "", // Changed from countryRegion to country
      },
      same_as_shipping: userData?.same_as_shipping || false,
      shipping_address: {
        street1: userData?.shipping_address?.street1 || "",
        street2: userData?.shipping_address?.street2 || "",
        attention: userData?.shipping_address?.attention || "",
        city: userData?.shipping_address?.city || "",
        state: userData?.shipping_address?.state || "",
        zipCode: userData?.shipping_address?.zip_code || "", // Changed from zipCode to zip_code
        phone: userData?.shipping_address?.phone || "",
        faxNumber: userData?.shipping_address?.faxNumber || "",
        countryRegion: userData?.shipping_address?.country || "", // Changed from countryRegion to country
      },

      currency: userData?.currency || "USD",
      payment_terms: userData?.payment_terms || "DueOnReceipt",
      tax_preference: userData?.tax_preference || "Taxable",
      portal_language: userData?.portal_language || "English",
      enable_portal: userData?.enable_portal || false,
    },
  })

  console.log(userData.shipping_address)
  const onSubmit = async (data: UserFormValues) => {
    setLoading(true)
    try {
      console.log(data)

      const profileData = {
        first_name: data.first_name?.trim(),
        last_name: data.last_name?.trim(),
        email: data.email?.trim(),
        type: data.type,
        account_status: data.account_status,
        company_name: data.company_name?.trim() || null,
        display_name:
          data.first_name?.trim() && data.last_name?.trim()
            ? `${data.first_name.trim()} ${data.last_name.trim()}`
            : null,
        work_phone: data.work_phone?.trim() || null,
        mobile_phone: data.mobile_phone?.trim() || null,
        billing_address: {
          street1: data.billing_address.street1,
          street2: data.billing_address.street2 || "",
          attention: data.billing_address.attention || "",
          city: data.billing_address.city,
          state: data.billing_address.state,
          zip_code: data.billing_address.zipCode, // Changed to zip_code to match the database field
          phone: data.billing_address.phone || "",
          faxNumber: data.billing_address.faxNumber || "",
          country: data.billing_address.countryRegion || "IN", // Changed to country to match the database field
        },
        shipping_address: data.same_as_shipping
          ? {
              street1: data.billing_address.street1,
              street2: data.billing_address.street2 || "",
              attention: data.billing_address.attention || "",
              city: data.billing_address.city,
              state: data.billing_address.state,
              zip_code: data.billing_address.zipCode, // Changed to zip_code to match the database field
              phone: data.billing_address.phone || "",
              faxNumber: data.billing_address.faxNumber || "",
              country: data.billing_address.countryRegion || "IN", // Changed to country to match the database field
            }
          : {
              street1: data.shipping_address.street1,
              street2: data.shipping_address.street2 || "",
              attention: data.shipping_address.attention || "",
              city: data.shipping_address.city,
              state: data.shipping_address.state,
              zip_code: data.shipping_address.zipCode, // Changed to zip_code to match the database field
              phone: data.shipping_address.phone || "",
              faxNumber: data.shipping_address.faxNumber || "",
              country: data.shipping_address.countryRegion || "IN", // Changed to country to match the database field
            },
        same_as_shipping: data.same_as_shipping || false,
        tax_preference: data.tax_preference || "Taxable",
        currency: data.currency || "USD",
        payment_terms: data.payment_terms || "DueOnReceipt",
        enable_portal: data.enable_portal || false,
        portal_language: data.portal_language || "English",
        updated_at: new Date().toISOString(),
      }

      const { data: userDataDb, error } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", userData.id)
        .select()
        .maybeSingle()

      if (error) {
        console.error("Supabase update error:", error)
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })

        toast({
          title: "Error",
          description: `Failed to update profile: ${error.message}`,
          variant: "destructive",
        })
        throw new Error(`Database error: ${error.message}`)
      }

      toast({
        title: "User updated successfully",
        description: "The user information has been updated.",
      })
      onOpenChange()
    } catch (error) {
      toast({
        title: "Error updating user",
        description: "There was an error updating the user information.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  // Update shipping address when same_as_shipping changes
  const watchSameAsShipping = form.watch("same_as_shipping")
  const watchBillingAddress = form.watch("billing_address")

  // Update shipping address when same_as_shipping is checked
  useEffect(() => {
    if (watchSameAsShipping) {
      form.setValue("shipping_address", {
        street1: watchBillingAddress.street1,
        street2: watchBillingAddress.street2 || "",
        attention: watchBillingAddress.attention || "",
        city: watchBillingAddress.city,
        state: watchBillingAddress.state,
        zipCode: watchBillingAddress.zipCode,
        phone: watchBillingAddress.phone || "",
        faxNumber: watchBillingAddress.faxNumber || "",
        countryRegion: watchBillingAddress.countryRegion || "",
      })
    }
  }, [watchSameAsShipping, watchBillingAddress, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
          <DialogDescription>Update locations information. Click save when you're done.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="company">Pharmacy</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                {/* <TabsTrigger value="preferences">Preferences</TabsTrigger> */}
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mobile_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Mobile phone" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="work_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Work phone" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Company Information Tab */}
              <TabsContent value="company" className="space-y-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pharmacy Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Pharmacy name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* <div className="grid grid-cols-2 gap-4">

                                    <FormField
                                        control={form.control}
                                        name="account_status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Account Status</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="active">Active</SelectItem>
                                                        <SelectItem value="inactive">Inactive</SelectItem>

                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div> */}
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Shipping Address</h3>
                  <FormField
                    control={form.control}
                    name="billing_address.street1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address1</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billing_address.street2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address 2</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billing_address.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billing_address.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billing_address.zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Zip code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billing_address.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="same_as_shipping"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Same as shipping address</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {!watchSameAsShipping && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Billing Address</h3>
                    <FormField
                      control={form.control}
                      name="shipping_address.street1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address1</FormLabel>
                          <FormControl>
                            <Input placeholder="Street address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_address.street2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address2</FormLabel>
                          <FormControl>
                            <Input placeholder="Street address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="shipping_address.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="shipping_address.state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="State" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="shipping_address.zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Zip code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </TabsContent>

              {/* Preferences Tab */}
              {/* <TabsContent value="preferences" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="currency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Currency</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select currency" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="USD">USD</SelectItem>
                                                        <SelectItem value="EUR">EUR</SelectItem>
                                                        <SelectItem value="GBP">GBP</SelectItem>
                                                        <SelectItem value="CAD">CAD</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="payment_terms"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Payment Terms</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select payment terms" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="DueOnReceipt">Due on Receipt</SelectItem>
                                                        <SelectItem value="Net15">Net 15</SelectItem>
                                                        <SelectItem value="Net30">Net 30</SelectItem>
                                                        <SelectItem value="Net45">Net 45</SelectItem>
                                                        <SelectItem value="Net60">Net 60</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="tax_preference"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tax Preference</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select tax preference" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Taxable">Taxable</SelectItem>
                                                        <SelectItem value="Non-taxable">Non-taxable</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="portal_language"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Portal Language</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select language" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="English">English</SelectItem>
                                                        <SelectItem value="Spanish">Spanish</SelectItem>
                                                        <SelectItem value="French">French</SelectItem>
                                                        <SelectItem value="German">German</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="enable_portal"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Enable Portal Access</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </TabsContent> */}
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange()}
                disabled={loading}
                className={loading ? "opacity-50 cursor-not-allowed" : ""}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={loading} className={loading ? "opacity-50 cursor-not-allowed" : ""}>
                {loading ? "Saving Changes..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
