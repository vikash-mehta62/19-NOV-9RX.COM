import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { CreateOrderForm } from "@/components/orders/CreateOrderForm";
import { useEffect, useState } from "react";
import { OrderFormValues } from "@/components/orders/schemas/orderSchema";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { fetchCustomerLocation } from "./Dashboard";
import { supabase } from "@/integrations/supabase/client";

export default function GroupOrder() {
  const [orderData, setOrderData] = useState<Partial<OrderFormValues>>({});
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const userProfile = useSelector(selectUserProfile);
  const [dbLocations,setDbLocations] = useState([])



 const fetchLocations = async () => {
    if (!userProfile?.id) return; // Agar ID nahi hai to return kar do
  
    try {
      const res = await fetchCustomerLocation(userProfile.id);
      if (!res) return;
  
      // Map ko async function banana padega
      const formatLocations = async (data) => {
        return Promise.all(data.map(async (location, index) => {
          const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
          const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();
  
          // ✅ Supabase se orders count fetch karo
          const { count, error } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", location.id)
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth);
  
          if (error) {
            console.error("Error fetching count:", error);
          }
  
          return {
            id: location.id || index + 1,
            name: location.display_name?.trim() ? location.display_name : `Location ${index + 1}`,
            address: `${location.billing_address?.street1?.trim() ? location.billing_address.street1 : "N/A"}, 
                      ${location.billing_address?.city?.trim() ? location.billing_address.city : "N/A"} 
                      ${location.billing_address?.zip_code?.trim() ? location.billing_address.zip_code : "N/A"}`,
            countryRegion: location.countryRegion || "N/A",
            phone: location.phone || "N/A",
            faxNumber: location.faxNumber || "N/A",
            contact_email: location.email || "N/A",
            contact_phone: location.mobile_phone || "N/A",
            created_at: location.created_at ? new Date(location.created_at).toISOString() : "N/A",
            updated_at: location.updated_at ? new Date(location.updated_at).toISOString() : "N/A",
            profile_id: location.profile_id || "N/A",
            type: location.type || "N/A",
            status: location.status || "pending",
            manager: location?.locations?.find(item => item.manager)?.manager || "N/A",
            ordersThisMonth: count || 0 // Agar count undefined ho to 0 set karna
          };
        }));
      };
  
      const formattedLocations = await formatLocations(res);
      console.log("Formatted Locations:", formattedLocations);
  
      setDbLocations(formattedLocations);
      console.log("User Profile:", userProfile);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };
  
  
    useEffect(() => {
    
    
      fetchLocations();
    }, [userProfile]);


  // Get group info from session storage
  const groupInfo = {
    name: sessionStorage.getItem("groupName") || "",
    id: sessionStorage.getItem("groupId") || "",
    pharmacies: dbLocations
  };

  // Simulate loading state
  useState(() => {
    const timer = setTimeout(() => {
      if (!groupInfo.name) {
       
      }
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  });

  const handlePharmacyChange = async (pharmacyId: string) => {
    setSelectedPharmacy(pharmacyId);
    setOrderData({})
  console.log("pharmacyId",pharmacyId)
    const selectedPharmacyData = groupInfo.pharmacies.find(
      (p) => p.id === pharmacyId
    );
  
    sessionStorage.setItem("groupId" ,pharmacyId )
    if (!selectedPharmacyData) {
      console.error("Pharmacy not found for ID:", pharmacyId);
      return;
    }
  
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", selectedPharmacyData.id)
        .maybeSingle();
  
      if (error) {
        console.error("Database Error - Failed to fetch profile:", error);
        throw new Error(`Database error: ${error.message}`);
      }
  
      if (!data) {
        console.error("User profile not found for ID:", selectedPharmacyData.id);
        return;
      }
  
      console.log("Successfully fetched profile:", data);
  
      // Billing address को सुरक्षित तरीके से एक्सेस करें
      const billingAddress = (data.billing_address || {}) as any;
  

      const finalEmail = data.email.includes('noreply') ? userProfile?.email : data.email;

      setOrderData((prevState) => ({
 
        customerInfo: {
          cusid:data.id || "test",
          type:  data?.type || "Pharmacy",
          name: data.first_name,
          email: finalEmail  || "",
          phone: data.mobile_phone || "",
          address: {
            street: billingAddress.street || "",
            city: billingAddress.city || "",
            state: billingAddress.state || "",
            zip_code: billingAddress.zip_code || "",
          },
        },
      }));
      console.log(orderData)
    } catch (err) {
      console.error("Error in handlePharmacyChange:", err);
    }
  };
  
  // ✅ UseEffect to log updated orderData
  useEffect(() => {
    console.log("Updated order data:", orderData);
  }, [orderData]); // Jab bhi orderData update hoga, tab yeh effect chalega
  


  const handleFormChange = (data: Partial<OrderFormValues>) => {
    setOrderData(data);
  };

  if (isLoading) {
    return (
      <DashboardLayout role="group">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="group">
      <div className="space-y-6 p-6 bg-white rounded-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Create Group Order
            </h1>
            <p className="text-muted-foreground">
              {groupInfo.name
                ? `Place a new order for ${groupInfo.name}`
                : "Place a new order"}
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <Label htmlFor="pharmacy-select">Select Pharmacy</Label>
            <Select
              value={selectedPharmacy}
              onValueChange={handlePharmacyChange}
            >
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select a pharmacy" />
              </SelectTrigger>
              <SelectContent>
                {groupInfo.pharmacies.map((pharmacy) => (
                  <SelectItem key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name} - {pharmacy.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {orderData.customerInfo  && selectedPharmacy &&   (
            <CreateOrderForm
              initialData={orderData}
              onFormChange={handleFormChange}
              locationId={selectedPharmacy}
              use="group"
            />
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
