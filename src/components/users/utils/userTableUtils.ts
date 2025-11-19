import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "../schemas/userFormSchemas";

export const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-success text-success-foreground hover:bg-success/80";
    case "inactive":
      return "bg-destructive text-destructive-foreground hover:bg-destructive/80";
    case "pending":
      return "bg-warning text-warning-foreground hover:bg-warning/80";
    default:
      return "bg-secondary hover:bg-secondary/80";
  }
};

export const getRoleBadgeColor = (role: UserRole) => {
  switch (role) {
    case "admin":
      return "bg-purple-500 text-purple-50 hover:bg-purple-600";
    case "manager":
      return "bg-blue-500 text-blue-50 hover:bg-blue-600";
    case "staff":
      return "bg-green-500 text-green-50 hover:bg-green-600";
    case "user":
      return "bg-gray-500 text-gray-50 hover:bg-gray-600";
    default:
      return "bg-secondary hover:bg-secondary/80";
  }
};

export const getLocationDetails = async (userId: string) => {
  const { data: groupProfiles, error } = await supabase
    .from("profiles")
    .select("display_name, billing_address")
    .eq("group_id", userId);

  if (error) throw new Error("Failed to fetch customer information");

  if (!groupProfiles || groupProfiles.length === 0) {
    return [];
  }

  // Convert and map billing_address to expected structure
  const locationDetails = groupProfiles
    .filter(profile => profile.billing_address) // Ensure address exists
    .map(profile => {
      const addr = profile.billing_address;
      return {
        name: profile.display_name || "Unnamed Location",
        type: addr.type || "branch", // Defaulting to 'branch' if type is missing
        address: formatAddress(addr),
      };
    });

  return locationDetails;
};

// Helper function to format the address object to string
const formatAddress = (addr: any) => {
  const parts = [
    addr.attention,
    addr.street1,
    addr.street2,
    addr.city,
    addr.state,
    addr.zip_code,
    addr.countryRegion,
  ].filter(Boolean); // Remove undefined or empty values

  return parts.join(", ");
};


export const getLocationTypeIcon = (type: string) => {
  switch (type) {
    case "headquarters":
      return "🏢";
    case "branch":
      return "🏪";
    case "warehouse":
      return "🏭";
    default:
      return "📍";
  }
};