import { User } from "../UsersTable";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Mail, Building2, Shield, MapPin } from "lucide-react";
import UserActions from "../UserActions";
import { UserRole } from "../schemas/userFormSchemas";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface UserTableRowProps {
  user: User;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  onUserUpdated: () => void;
  getStatusBadgeColor: (status: string) => string;
  getRoleBadgeColor: (role: UserRole) => string;
  getLocationDetails: (userId: string) => Array<{
    name: string;
    type: string;
    address: string;
  }>;
  getLocationTypeIcon: (type: string) => string;
  handleStatusBadgeClick: (user: User) => void;
}

export function UserTableRow({
  user,
  isSelected,
  onSelectChange,
  onUserUpdated,
  getStatusBadgeColor,
  getRoleBadgeColor,
  getLocationDetails,
  getLocationTypeIcon,
  handleStatusBadgeClick,
}: UserTableRowProps) {
  // Convert type to lowercase for comparison
  const userType = user.type.toLowerCase() as "pharmacy" | "hospital" | "group";

  
const[location,setLocations] = useState(0)




  const [locationDetails, setLocationDetails] = useState<
  { name: string; type: string; address: string }[]
>([]);

useEffect(() => {
  const fetchData = async () => {
    if (userType === "group") {
      const details = await getLocationDetails(user.id);
      setLocations(details.length)
      setLocationDetails(details || []);
    }
  };

  fetchData();
}, [user.id, userType, getLocationDetails]);



  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="px-2 sm:px-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelectChange}
          aria-label={`Select ${user.name}`}
        />
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
          <span>{user.name}</span>
          <span className="text-xs text-muted-foreground md:hidden">
            {user.email}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center space-x-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{user.email}</span>
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{user.type}</span>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <Badge className={getRoleBadgeColor(user.role)}>
            {user.role}
          </Badge>
        </div>
      </TableCell>

  <TableCell className="hidden xl:table-cell">
  {userType === "group" ? (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center space-x-2 hover:bg-muted"
        >
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline">{location || 0}</Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 h-[250px] overflow-hidden overflow-y-scroll">
        <div className="space-y-2">
          <h4 className="font-medium">Location Details</h4>
          <div className="divide-y">
            {locationDetails.length > 0 ? (
              locationDetails.map((location, index) => (
                <div key={index} className="py-2">
                  <div className="flex items-center space-x-2">
                    <span>{getLocationTypeIcon(location.type)}</span>
                    <span className="font-medium">{location.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    {location.address}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No locations found</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ) : (
    "-"
  )}
</TableCell>


      <TableCell>
        <Badge 
          className={`${getStatusBadgeColor(user.status)} cursor-pointer whitespace-nowrap`}
          onClick={() => handleStatusBadgeClick(user)}
        >
          {user.status}
        </Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{user.lastActive}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <UserActions
          userId={user.id}
          userStatus={user.status}
          userName={user.name}
          userEmail={user.email}
          userType={userType}
          onUserUpdated={onUserUpdated}
        />
      </TableCell>
    </TableRow>
  );
}