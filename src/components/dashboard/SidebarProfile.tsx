import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { selectUserProfile } from "../../store/selectors/userSelectors";
import { useToast } from "@/hooks/use-toast";
import { useSidebar } from "../ui/sidebar";

export const SidebarProfile = () => {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  // Access profile data from Redux
  const userProfile = useSelector(selectUserProfile);

  const userName = `${userProfile?.first_name ?? "User"} ${userProfile?.last_name ?? ""}`.trim();
  const userEmail = userProfile?.email ?? "No email available";
  const { toast } = useToast();

  // Function to get initials for the avatar fallback
  const getInitials = (name) => {
    if (!name) return "";
    const nameParts = name.split(" ");
    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    return (nameParts[0]?.[0] || "" + nameParts[1]?.[0] || "").toUpperCase();
  };

  const handleLogout = () => {
    // Clear all session storage data
    sessionStorage.clear();

    // Show success toast
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of your account.",
    });

    // Navigate to login page
    navigate("/login");
  };

  return (
    <div className={`mt-auto border-t ${isCollapsed ? "p-1" : "p-4"}`}>
      <div className="flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
              <div className="flex items-center gap-2">
                {isCollapsed ? (
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userProfile?.profile_picture_url} alt={`${userName}'s profile picture`} />
                    <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={userProfile?.profile_picture_url} alt={`${userName}'s profile picture`} />
                      <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-medium">{userName}</p>
                      <p className="text-xs text-muted-foreground">{userEmail}</p>
                    </div>
                  </>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};