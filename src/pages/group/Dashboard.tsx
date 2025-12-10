import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LocationsTable } from "@/components/group/LocationsTable";
import { AddPharmacyModal } from "@/components/group/AddPharmacyModal";
import { GroupAnalyticsStats } from "@/components/group/GroupAnalyticsStats";
import { RecentGroupOrders } from "@/components/group/RecentGroupOrders";
import { TopPharmacies } from "@/components/group/TopPharmacies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  PlusCircle, 
  Settings, 
  Mail,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export const fetchCustomerLocation = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("group_id", userId);

    if (error) {
      console.error("Failed to fetch customer information:", error);
      throw new Error("Failed to fetch customer information: " + error.message);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data;
  } catch (error) {
    console.error("Error fetching customer info:", error);
    return [];
  }
};

const GroupDashboard = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddPharmacyOpen, setIsAddPharmacyOpen] = useState(false);
  const [groupSettings, setGroupSettings] = useState<any>(null);
  const itemsPerPage = 8;
  const userProfile = useSelector(selectUserProfile);
  const navigate = useNavigate();

  const [dbLocations, setDbLocations] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState(0);

  const fetchLocations = async () => {
    if (!userProfile?.id) return;

    try {
      const res = await fetchCustomerLocation(userProfile.id);
      if (!res || res.length === 0) {
        setDbLocations([]);
        return;
      }

      const formatLocations = async (data: any[]) => {
        return Promise.all(
          data.map(async (location, index) => {
            const startOfMonth = new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1
            ).toISOString();
            const endOfMonth = new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              0
            ).toISOString();

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
              name: location.display_name?.trim()
                ? location.display_name
                : `Location ${index + 1}`,
              address: `${
                location.billing_address?.street1?.trim()
                  ? location.billing_address.street1
                  : "N/A"
              }, ${
                location.billing_address?.city?.trim()
                  ? location.billing_address.city
                  : "N/A"
              } ${
                location.billing_address?.zip_code?.trim()
                  ? location.billing_address.zip_code
                  : "N/A"
              }`,
              countryRegion: location.countryRegion || "N/A",
              phone: location.phone || "N/A",
              faxNumber: location.faxNumber || "N/A",
              contact_email: location.email || "N/A",
              contact_phone: location.mobile_phone || "N/A",
              created_at: location.created_at
                ? new Date(location.created_at).toISOString()
                : "N/A",
              updated_at: location.updated_at
                ? new Date(location.updated_at).toISOString()
                : "N/A",
              profile_id: location.profile_id || "N/A",
              type: location.type || "N/A",
              status: location.status || "pending",
              manager:
                location?.locations?.find((item: any) => item.manager)
                  ?.manager || "N/A",
              ordersThisMonth: count || 0,
            };
          })
        );
      };

      const formattedLocations = await formatLocations(res);
      setDbLocations(formattedLocations);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const fetchGroupSettings = async () => {
    if (!userProfile?.id) return;

    try {
      const { data } = await supabase
        .from("profiles")
        .select("commission_rate, bypass_min_price, can_manage_pricing, auto_commission")
        .eq("id", userProfile.id)
        .single();

      setGroupSettings(data);
    } catch (err) {
      console.error("Error fetching group settings:", err);
    }
  };

  const fetchPendingInvitations = async () => {
    if (!userProfile?.id) return;

    try {
      const { count } = await supabase
        .from("pharmacy_invitations")
        .select("*", { count: "exact", head: true })
        .eq("group_id", userProfile.id)
        .eq("status", "pending");

      setPendingInvitations(count || 0);
    } catch (err) {
      console.error("Error fetching invitations:", err);
    }
  };

  const handlePharmacyAdded = () => {
    setIsAddPharmacyOpen(false);
    fetchLocations();
  };

  useEffect(() => {
    fetchLocations();
    fetchGroupSettings();
    fetchPendingInvitations();
  }, [userProfile]);

  return (
    <DashboardLayout role="group">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                Group Dashboard
              </h1>
              {groupSettings?.can_manage_pricing && (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Pricing Enabled
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Manage your pharmacy network and monitor performance
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {pendingInvitations > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <Mail className="h-3 w-3 mr-1" />
                {pendingInvitations} pending invitations
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/group/settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Info Alert for Adding Pharmacies */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Adding New Pharmacies</AlertTitle>
          <AlertDescription>
            To add a new pharmacy to your group, please contact the administrator. 
            They will set up the pharmacy and link it to your group.
          </AlertDescription>
        </Alert>

        {/* Analytics Stats - Real Data */}
        {userProfile?.id && (
          <GroupAnalyticsStats groupId={userProfile.id} />
        )}

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Orders */}
          {userProfile?.id && (
            <RecentGroupOrders groupId={userProfile.id} limit={5} />
          )}

          {/* Top Pharmacies */}
          {userProfile?.id && (
            <TopPharmacies groupId={userProfile.id} limit={5} />
          )}
        </div>

        {/* Locations Table */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Your Pharmacies</CardTitle>
                <Badge variant="secondary">{dbLocations.length}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
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
