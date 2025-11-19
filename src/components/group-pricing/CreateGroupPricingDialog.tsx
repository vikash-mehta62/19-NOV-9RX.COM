import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { any, z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BasicInfoFields } from "./form/BasicInfoFields";
import { ProductSelection } from "./form/ProductSelection";
import { DiscountFields } from "./form/DiscountFields";
import { QuantityFields } from "./form/QuantityFields";
import { GroupPharmacyFields } from "./form/GroupPharmacyFields";
import { supabase } from "@/supabaseClient";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { min } from "date-fns";

interface GroupPricingData {
  id?: string;
  name: string;
  discount: number;
  discount_type: "percentage" | "fixed";
  min_quantity: number;
  max_quantity: number;
 
  product_arrayjson?:  {
    product_id?: string
    product_name?: string
    groupLabel?: string
    actual_price?: number
    new_price?: string
  }[];
  product_id_array?: string[];
  group_ids: string[];
  status: string;
  updated_at: string;
  created_at?: string;
}

const createFormSchema = (products: any[]) =>
  z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.coerce.number().min(0, "Discount must be at least 0"),
    minQuantity: z.coerce.number().min(1, "Minimum quantity must be at least 1"),
    maxQuantity: z.coerce.number().min(1, "Maximum quantity must be at least 1"),

    // ✅ Change product from `z.string()` to `z.array(z.string())`
    product: z.array(z.string()).optional(),
    product_arrayjson: z.array(
      z.object({
        product_id: z.string(),
        product_name: z.string(),
        groupLabel: z.string(),
        actual_price: z.number(),
        new_price: z.string(),
      })
    ).min(1, "At least one product must be selected"),
    
    group: z.array(z.string()).min(1, "At least one group  must be selected"),
  })
    .refine(
      (data) => {
        if (data.discountType === "percentage") {
          return data.discountValue <= 100;
        }
        return true;
      },
      {
        message: "Percentage discount cannot exceed 100%.",
        path: ["discountValue"],
      }
    )
    .refine(
      (data) => {
        if (data.discountType === "fixed" && data.product.length > 0) {
          return data.product.every((productId) => {
            const selectedProduct = products.find((p) => p.id === productId);
            if (!selectedProduct || !selectedProduct.product_sizes.length) {
              return false;
            }
    
            // सबसे कम price निकालें
            const minPrice = Math.min(...selectedProduct.product_sizes.map(size => size.price));
    
            return data.discountValue <= minPrice;
          });
        }
        return true;
      },
      {
        message: "Flat discount cannot exceed the minimum product size price.",
        path: ["discountValue"],
      }
    );
    


export type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

interface CreateGroupPricingDialogProps {
  onSubmit: (groupPricing: GroupPricingData) => void;
  initialData?: GroupPricingData;
}

export function CreateGroupPricingDialog({ onSubmit, initialData }: CreateGroupPricingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productsSizes, setProductsSizes] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(products)),
    defaultValues: {
      name: initialData?.name || "",
      discountType: initialData?.discount_type || "percentage",
      discountValue: initialData?.discount || 0,
      minQuantity: initialData?.min_quantity || 1,
      maxQuantity: initialData?.max_quantity || 100,

      product:initialData?.product_id_array || [] ,
      product_arrayjson:initialData?.product_arrayjson,

      group:  initialData?.group_ids || [] ,

    },

  });
  useEffect(()=>{
  console.log(form.getValues())

},[initialData])

  const fetchData = async () => {
    console.log("Starting fetchData in CreateGroupPricingDialog");
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session found");
        toast({
          title: "Authentication Error",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        return;
      }

      console.log("Fetching data for group pricing...");
      const [productsResponse, groupsResponse, pharmaciesResponse] = await Promise.all([
        supabase.from("products").select("id, name, base_price, product_sizes(*)"),
        supabase.from("profiles").select("id, first_name, last_name"),
        supabase.from("profiles").select("id, first_name, last_name").eq("type", "pharmacy")
      ]);

      console.log("API Responses:", {
        products: productsResponse,
        groups: groupsResponse,
        pharmacies: pharmaciesResponse
      });

      if (productsResponse.error) throw new Error(`Products fetch error: ${productsResponse.error.message}`);
      if (groupsResponse.error) throw new Error(`Groups fetch error: ${groupsResponse.error.message}`);
      if (pharmaciesResponse.error) throw new Error(`Pharmacies fetch error: ${pharmaciesResponse.error.message}`);

      const formattedGroups = groupsResponse.data?.map((group: any) => ({
        ...group,
        name: `${group.first_name} ${group.last_name}`,
      })) || [];

      const formattedPharmacies = pharmaciesResponse.data?.map((pharmacy: any) => ({
        ...pharmacy,
        name: `${pharmacy.first_name} ${pharmacy.last_name}`,
      })) || [];

      const groupedProductSizes = productsResponse.data.map(product => ({
        label: product.name, // प्रोडक्ट का नाम हेडिंग के रूप में
        options: product.product_sizes.map(size => ({
          value: size.id,
          label: `${size.size_value} ${size.size_unit}`,
          actual_price: size.price,
          groupLabel: product.name // सर्च में ग्रुप नाम भी दिखाने के लिए
        }))
      }));
      
      console.log(groupedProductSizes);
      setProductsSizes(groupedProductSizes);
      

      setProducts(productsResponse.data);
      
      setGroups(formattedGroups);
      setPharmacies(formattedPharmacies);
      console.log("Data fetched successfully:", {
        products: productsResponse.data?.length,
        groups: formattedGroups.length,
        pharmacies: formattedPharmacies.length
      });
    } catch (error: any) {
      console.error("Error in fetchData:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (values: FormValues) => {
    console.log("Starting handleSubmit with values:", values);
    setLoading(true);

    try {
     

      const groupPricingData: GroupPricingData = {
        name: values.name,
        discount: values.discountValue,
        product_id_array: values.product,
        discount_type: values.discountType,
        min_quantity: values.minQuantity,
        max_quantity: values.maxQuantity,
        product_arrayjson:values.product_arrayjson,
        group_ids: values.group,
        status: "active",
        updated_at: new Date().toISOString(),
      };

      console.log("Saving group pricing data:", groupPricingData);

      if (!initialData) {
        groupPricingData.created_at = new Date().toISOString();
        const { error } = await supabase
          .from("group_pricing")
          .insert(groupPricingData);

        console.log("Insert response error:", error);
        if (error) throw new Error(`Failed to create group pricing: ${error.message}`);
      } else {
        const { error } = await supabase
          .from("group_pricing")
          .update(groupPricingData)
          .eq("id", initialData.id);

        console.log("Update response error:", error);
        if (error) throw new Error(`Failed to update group pricing: ${error.message}`);
      }

      toast({
        title: "Success",
        description: initialData 
          ? "Group pricing updated successfully" 
          : "Group pricing created successfully",
      });
      
      onSubmit(groupPricingData);
      form.reset();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save group pricing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={setIsOpen} >
        <DialogTrigger asChild>
          <Button
            className="bg-gradient-to-r from-[#e6b980] to-[#eacda3] hover:opacity-90 text-gray-800"
            size="sm"
          >
            <Plus className="h-4 w-4" /> Add Group Pricing
          </Button>
        </DialogTrigger>
        <div className=" ">
          <DialogContent className="bg-white max-h-50">
            <DialogHeader>
              <DialogTitle className="text-gray-800">
                {initialData ? "Edit" : "Create"} Group Pricing
              </DialogTitle>
              <DialogDescription>
                Configure pricing rules for specific groups and products
              </DialogDescription>
            </DialogHeader>
            {loading && !form.formState.isSubmitting ? (
              <div className="flex items-center justify-center py-8 ">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="h-[70vh] overscroll-y overflow-y-scroll">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 ">
                    <BasicInfoFields form={form} />
                    <ProductSelection form={form} products={productsSizes} />
                    {/* <DiscountFields form={form} /> */}
                    {/* <QuantityFields form={form} /> */}
                    <GroupPharmacyFields
                      form={form}
                      groups={groups}
                      pharmacies={pharmacies}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#e6b980] to-[#eacda3] hover:opacity-90 text-gray-800"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                          <span>Submitting...</span>
                        </div>
                      ) : (
                        <span>{initialData ? "Update" : "Create"} Group Pricing</span>
                      )}
                    </Button>
                  </form>
                </Form></div>
            )}
          </DialogContent>
        </div>
      </Dialog>
    </div>
  );
}
