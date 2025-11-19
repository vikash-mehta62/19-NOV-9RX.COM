"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, User, Building, MapPin, Truck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

const addressSchema = z.object({
  attention: z.string().optional(),
  countryRegion: z.string().min(1, "Country/Region is required"),
  street1: z.string().min(1, "Street address is required"),
  street2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip_code: z.string().min(1, "ZIP code is required"),
  phone: z.string().optional(),
  faxNumber: z.string().optional(),
})

const vendorSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  type: z.string().min(1, "Type is required"),
  status: z.string().min(1, "Status is required"),
  role: z.string().min(1, "Role is required"),
  companyName: z.string().min(1, "Company name is required"),
  displayName: z.string().optional(),
  workPhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  sameAsShipping: z.boolean(),
  freeShipping: z.boolean(),
  currency: z.string().min(1, "Currency is required"),
})

type VendorFormData = z.infer<typeof vendorSchema>

const defaultValues: VendorFormData = {
  firstName: "",
  lastName: "",
  email: "",
  type: "vendor",
  status: "active",
  role: "user",
  companyName: "",
  displayName: "",
  workPhone: "",
  mobilePhone: "",
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
    attention: "9RX",
    countryRegion: "USA",
    street1: "936 Broad River Ln",
    street2: "",
    city: "Charlotte",
    state: "NC",
    zip_code: "28211",
    phone: "1 800 969 6295",
    faxNumber: "",
  },
  sameAsShipping: false,
  freeShipping: true,
  currency: "USD",
}

interface VendorDialogFormProps {
  vendor?: VendorFormData
  mode?: "add" | "edit"
  onSubmit?: (data: VendorFormData) => void
}

export default function VendorDialogForm({ vendor, mode = "add", onSubmit }: VendorDialogFormProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendor || defaultValues,
  })

  const watchSameAsShipping = form.watch("sameAsShipping")





  // const handleSubmit = (data: VendorFormData) => {
  //   console.log("Form submitted:", data)
  //   onSubmit?.(data)
  //   setOpen(false)
  //   form.reset()
  // }




  const handleSubmit = async (values: VendorFormData) => {
  try {
    setIsSubmitting(true);

    // Create the Supabase auth user
    const response = await fetch(
      "https://cfyqeilfmodrbiamqgme.supabase.co/auth/v1/admin/users",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmeXFlaWxmbW9kcmJpYW1xZ21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjMzNTUzNSwiZXhwIjoyMDUxOTExNTM1fQ.nOqhABs1EMQHOrNtiGdt6uAxWxGnnGRcWr5dkn_BLr0`,
          "Content-Type": "application/json",
          apikey:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmeXFlaWxmbW9kcmJpYW1xZ21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjMzNTUzNSwiZXhwIjoyMDUxOTExNTM1fQ.nOqhABs1EMQHOrNtiGdt6uAxWxGnnGRcWr5dkn_BLr0",
        },
        body: JSON.stringify({
          email: values.email,
          password: "12345678",
          email_confirm: true,
          type: "vendor",
          user_metadata: {
            first_name: values.firstName,
            last_name: values.lastName,
          },
        }),
      }
    );

    const tempUserData = await response.json();
    if (!tempUserData?.id) {
      throw new Error(tempUserData.msg || "Failed to create user");
    }

    // Build clean userData from defaultValues
    const userData: any = {
      id: tempUserData?.id,
      first_name: values.firstName,
      last_name: values.lastName,
      email: values.email.toLowerCase().trim(),
      type: values.type,
      status: values.status,
      role: values.role,
      company_name: values.companyName,
      display_name: values.displayName || `${values.firstName} ${values.lastName}`,
      work_phone: values.workPhone,
      mobile_phone: values.mobilePhone,
      billing_address: values.billingAddress,
      shipping_address: values.sameAsShipping
        ? values.billingAddress
        : values.shippingAddress,
      same_as_shipping: values.sameAsShipping,
      freeShipping: values.freeShipping,
      currency: values.currency,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(userData);

    if (error) throw new Error(error.message);

    toast({
      title: "Success",
      description: `${values.firstName} ${values.lastName} has been created successfully`,
    });

  
    form.reset();
     setOpen(false)
   
  } catch (error: any) {
    toast({
      title: "Error",
      description:
        error.message || "Failed to create vendor. Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsSubmitting(false);
  }
};



  const copyBillingToShipping = () => {
    const billingAddress = form.getValues("billingAddress")
    form.setValue("shippingAddress", billingAddress)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={mode === "edit" ? "outline" : "default"} size="sm">
          {mode === "edit" ? (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Edit Vendor
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {mode === "edit" ? "Edit Vendor" : "Add New Vendor"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update vendor information and addresses."
              : "Fill in the vendor details and address information."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="billing" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </TabsTrigger>
                {/* <TabsTrigger value="shipping" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Shipping
                </TabsTrigger> */}
              
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendor Information</CardTitle>
                    {/* <CardDescription>Basic vendor contact details</CardDescription> */}
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter work phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mobilePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter mobile phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  
                  
               
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendor Address</CardTitle>
                    <CardDescription>Enter the Vendor address information</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billingAddress.attention"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attention</FormLabel>
                          <FormControl>
                            <Input placeholder="Attention to" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billingAddress.countryRegion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country/Region *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter country/region" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billingAddress.street1"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Street Address 1 *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter street address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billingAddress.street2"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Street Address 2</FormLabel>
                          <FormControl>
                            <Input placeholder="Apartment, suite, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billingAddress.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billingAddress.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter state" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billingAddress.zip_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter ZIP code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billingAddress.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billingAddress.faxNumber"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Fax Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter fax number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="shipping" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Address</CardTitle>
                    <CardDescription>Enter the shipping address information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                 

                    {!watchSameAsShipping && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="shippingAddress.attention"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Attention</FormLabel>
                              <FormControl>
                                <Input placeholder="Attention to" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shippingAddress.countryRegion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country/Region *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter country/region" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shippingAddress.street1"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Street Address 1 *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter street address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shippingAddress.street2"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Street Address 2</FormLabel>
                              <FormControl>
                                <Input placeholder="Apartment, suite, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shippingAddress.city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter city" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shippingAddress.state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter state" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shippingAddress.zip_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP Code *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter ZIP code" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shippingAddress.phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shippingAddress.faxNumber"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Fax Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter fax number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{mode === "edit" ? "Update Vendor" : "Add Vendor"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
