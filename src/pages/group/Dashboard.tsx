import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LocationsTable } from "@/components/group/LocationsTable";
import { AddPharmacyModal } from "@/components/group/AddPharmacyModal";
import { Location } from "@/components/group/types/location";
import { EnhancedStatsCard } from "@/components/dashboard/EnhancedStatsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Building2, TrendingUp, DollarSign, Users, PlusCircle } from "lucide-react";
import { LocationMap } from "@/components/group/LocationMap";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";


export const fetchCustomerLocation = async (userId) => {
  try {
    console.log(userId)
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("group_id", userId);

    if (error) {
      console.error("Failed to fetch customer information:", error);
      throw new Error("Failed to fetch customer information: " + error.message);
    }
console.log(data)
    if (!data || data.length === 0) {
      throw new Error("No customer information found.");
    }

    console.log("Fetched Data:", data);

    return data; // ✅ FIXED: Ab locations ki jagah data return ho raha hai
  } catch (error) {
    console.error("Error fetching customer info:", error);
    return null;
  }
};


const GroupDashboard = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddPharmacyOpen, setIsAddPharmacyOpen] = useState(false);
  const itemsPerPage = 8;
  const userProfile = useSelector(selectUserProfile);

  const [dbLocations,setDbLocations] = useState([])

 


  



 
  

  const fetchLocations = async () => {
    if (!userProfile?.id) return; // Agar ID nahi hai to return kar do
  
    try {
      const res = await fetchCustomerLocation(userProfile.id);
      if (!res) return;
  console.log(res)
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
  
  const handlePharmacyAdded = () => {
    // console.log("Pharmacy added successfully");
    setIsAddPharmacyOpen(false)
    fetchLocations()
  };

  useEffect(() => {
  
  
    fetchLocations();
  }, [userProfile]);
  

  // Function to get icon component based on type
  const getIconComponent = (iconType: string) => {
    switch (iconType) {
      case "building":
        return <Building2 className="h-4 w-4 text-muted-foreground" />;
      case "users":
        return <Users className="h-4 w-4 text-muted-foreground" />;
      case "dollar":
        return <DollarSign className="h-4 w-4 text-muted-foreground" />;
      case "trending":
        return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout role="group">
      <div className="space-y-8 p-6">
    <div className="flex  justify-between items-center">
    <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Group Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your pharmacy locations and monitor performance
          </p>
        </div>

       <div className="mt-4 md:mt-0 flex space-x-3">
  {/* 
  <Button
    onClick={() => setIsAddPharmacyOpen(true)}
    className="bg-emerald-600 hover:bg-emerald-700 text-white"
  >
    <PlusCircle className="mr-2 h-4 w-4" />
    Add Location
  </Button> 
  */}
  <div className="text-sm text-gray-600 bg-yellow-100 border border-yellow-300 px-4 py-2 rounded">
    To add a new location, please contact the administrator.
  </div>
</div>

    </div>

        {/* <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <EnhancedStatsCard
              key={index}
              {...stat}
              icon={getIconComponent(stat.iconType)}
            />
          ))}
        </div> */}

        <div className="grid gap-6 ">
          {/* <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Location Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <LocationMap locations={locations} />
            </CardContent>
          </Card> */}

          {/* <div className="">
            <QuickActions fetchLocations={fetchLocations} />
          </div> */}
           
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationsTable
              locations={dbLocations}
              currentPage={currentPage}
              fetchLocations={fetchLocations}
              totalPages={Math.ceil(dbLocations.length / itemsPerPage)}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>
      </div>

      <AddPharmacyModal
        open={isAddPharmacyOpen}
        onOpenChange={setIsAddPharmacyOpen}
        onPharmacyAdded={handlePharmacyAdded}
      />
    </DashboardLayout>
  );
};

export default GroupDashboard;