import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { AddressFields } from "../users/forms/AddressFields";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { useSelector } from "react-redux";
import { Eye, EyeOff } from "lucide-react";
import axios from '../../../axiosconfig'


const pharmacySchema = z.object({
  name: z.string().optional(),
  firstName: z.string().min(2, "Fisrt Name must be at least 2 characters"),
  lastName: z.string().min(2, "Last Name must be at least 2 characters"),
  license: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  password: z.string().optional().default("12345678"),

  address: z.object({
    attention: z.string().optional(),
    countryRegion: z.string().optional(),
    street1: z.string().min(2, "Street address is required"),
    street2: z.string().optional(),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    zip_code: z.string().min(5, "ZIP code is required"),
    phone: z.string().optional(),
    faxNumber: z.string().optional(),
  }),
  addressAddress: z.object({
    attention: z.string().optional(),
    countryRegion: z.string().optional(),
    street1: z.string().min(2, "Street address is required"),
    street2: z.string().optional(),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    zip_code: z.string().min(5, "ZIP code is required"),
    phone: z.string().optional(),
    faxNumber: z.string().optional(),
  }),
});

type PharmacyFormData = z.infer<typeof pharmacySchema>;

interface AddPharmacyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPharmacyAdded: () => void;
}

export function AddPharmacyModal({
  open,
  onOpenChange,
  onPharmacyAdded,
}: AddPharmacyModalProps) {
  const { toast } = useToast();
  const userProfile = useSelector(selectUserProfile);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<PharmacyFormData>({
    resolver: zodResolver(pharmacySchema),
    defaultValues: {
      name: "",
      firstName: "",
      lastName: "",
      license: "",
      company_name: "",
      email: "",
      phone: "",
      address: {
        attention: "",
        countryRegion: "",
        street1: "",
        street2: "",
        city: "",
        state: "",
        zip_code: "",
        phone: "sadfsdf",
        faxNumber: "",
      },
      addressAddress: {
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
    },
  });


  useEffect(()=>{
    form.setValue("email",userProfile?.email)
  },[userProfile])
  const onSubmit = async () => {
    const values = form.getValues();
  
    if (Object.keys(form.formState.errors).length > 0) {
      toast({
        title: "Error",
        description: "Please fix the form errors before submitting.",
        variant: "destructive",
      });
      return;
    }
  
    setLoading(true);
    try {
      // Generate a unique email if using group's email
      const mainEmail = values.email === userProfile?.email 
        ? `noreply${Date.now()}@9rx.com` 
        : values.email;

      // Call secure backend API to create user
      const response = await axios.post("/api/users/create-pharmacy-user", {
        email: mainEmail,
        password: "12345678",
        firstName: values.firstName,
        lastName: values.lastName,
        companyName: values.company_name,
        phone: values.phone,
        groupId: userProfile?.id,
        billingAddress: values.addressAddress,
      });

      if (!response.data.success) {
        toast({
          title: "Failed to create user",
          description: response.data.message || "Something went wrong.",
          variant: "destructive",
        });
        throw new Error(response.data.message || "Failed to create user");
      }

      toast({
        title: "Pharmacy Added",
        description: `${values.company_name || `${values.firstName} ${values.lastName}`} has been added to your group successfully`,
      });
  
      form.reset();
      onPharmacyAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      // Show error message if not already shown
      if (!error.message?.includes("Failed to create")) {
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to add pharmacy",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };
  

  console.log("hello")
  useEffect(() => {
    console.log(form.getValues());
  }, [form.watch()]); // ✅ This will trigger whenever form values change


  useEffect(() => {
    const addressAddress = form.watch("addressAddress"); // ✅ Efficient way to track changes


    form.setValue("address", addressAddress); // ✅ Replace `address` with `addressAddress`

  }, [form.watch("addressAddress")]); // ✅ Trigger only when `addressAddress` changes

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Pharmacy</DialogTitle>
          <DialogDescription>
            Add a new pharmacy to your group. Fill in the pharmacy details
            below.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] px-6">
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pharmacy Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter Pharmacy name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
         <div className=" grid grid-cols-2">
         <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fisrt Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter first name" />
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
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter last name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
         </div>

              {/* <FormField
                control={form.control}
                name="license"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter license number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}

              {/* <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="Enter phone number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>


                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div> */}

              <AddressFields form={form} type="address" />
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4">
          <Button type="submit" onClick={onSubmit} disabled={loading}>
          {loading ? "Adding..." : "Add Pharmacy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
