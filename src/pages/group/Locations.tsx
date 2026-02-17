import { DashboardLayout } from "@/components/DashboardLayout";
import { LocationMap } from "@/components/group/LocationMap";
import { LocationsTable } from "@/components/group/LocationsTable";
import { useEffect, useState } from "react";
import { Location } from "@/components/group/types/location";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { fetchCustomerLocation } from "./Dashboard";
import { Button } from "@/components/ui/button";
import { PlusCircle, MapPin } from "lucide-react";
import { AddPharmacyModal } from "@/components/group/AddPharmacyModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Sample data for demonstration
const sampleLocations: Location[] = [
  {
    id: 1,
    name: "Main Branch",
    address: "123 Healthcare Ave, Medical District",
    status: "active",
    manager: "John Smith",
    ordersThisMonth: 145,
    lastActive: "2024-01-07",
    phone: "(555) 123-4567",
    email: "mainbranch@healthcare.com"
  },
  {
    id: 2,
    name: "West Side Clinic",
    address: "456 Wellness Blvd, West Side",
    status: "active",
    manager: "Sarah Johnson",
    ordersThisMonth: 89,
    lastActive: "2024-01-06",
    phone: "(555) 234-5678",
    email: "westside@healthcare.com"
  }
];

export default function Locations() {
  const [currentPage, setCurrentPage] = useState(1);
  const userProfile = useSelector(selectUserProfile);
  const [isAddPharmacyOpen, setIsAddPharmacyOpen] = useState(false);
  
  const [dbLocations,setDbLocations] = useState([])
  
  const totalPages = Math.ceil(dbLocations.length / 10);

 
  
  const fetchLocations = async () => {
    if (!userProfile?.id) return; // Return if ID is not available
    try {
      const res = await fetchCustomerLocation(userProfile.id);
      if (!res) return;

      const formatLocations = (data) => {
        return data.map((location, index) => ({
          id: location.id || index + 1,
          name: location.display_name?.trim() ? location.display_name : `Location ${index + 1}`, // Set default if name is undefined or empty
          address: `${
            location.billing_address?.street1?.trim() ? location.billing_address.street1 : "N/A"
          }, ${
            location.billing_address?.city?.trim() ? location.billing_address.city : "N/A"
          } ${
            location.billing_address?.zip_code?.trim() ? location.billing_address.zip_code : "N/A"
          }`,
          countryRegion: location.countryRegion || "N/A",
          phone: location.phone || "N/A",
          faxNumber: location.fax_number || "N/A",
          contact_email: location.email || "N/A",
          contact_phone: location.mobile_phone || "N/A",
          created_at: location.created_at ? new Date(location.created_at).toISOString() : "N/A",
          updated_at: location.updated_at ? new Date(location.updated_at).toISOString() : "N/A",
          profile_id: location.profile_id || "N/A",
          type: location.type || "N/A",
          status: location.status || "pending",
          manager: location.manager || "N/A",
          ordersThisMonth: Math.floor(Math.random() * 100), // Dummy data
        }));
      };
      
      

      const formattedLocations = formatLocations(res);
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
  

  const handlePharmacyAdded = () => {
    // console.log("Pharmacy added successfully");
    setIsAddPharmacyOpen(false)
    fetchLocations()
  };


  return (
    <DashboardLayout role="group">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-screen-2xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
  
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Manage Locations</h1>
                <p className="text-sm text-gray-600 mt-1">View, add, and manage all your pharmacy locations</p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setIsAddPharmacyOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Add Location
          </Button>
        </div>
  
        {/* Table Section */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="text-xl font-semibold text-gray-900">All Locations</CardTitle>
            <CardDescription className="text-gray-600">
              Manage and monitor all your pharmacy locations in one place
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <LocationsTable
              locations={dbLocations}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              fetchLocations={fetchLocations}
            />
          </CardContent>
        </Card>
      </div>
  
      {/* Modal */}
      <AddPharmacyModal
        open={isAddPharmacyOpen}
        onOpenChange={setIsAddPharmacyOpen}
        onPharmacyAdded={handlePharmacyAdded}
      />
    </DashboardLayout>
  );
  
  
}