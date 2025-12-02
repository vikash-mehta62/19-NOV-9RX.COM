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
import { LogOut, User, Settings, ChevronUp } from "lucide-react";
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
    <div className={`mt-auto border-t border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 ${isCollapsed ? "p-2" : "p-4"}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className={`w-full h-auto hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-gray-800 dark:hover:to-gray-700 rounded-xl transition-all duration-300 hover:shadow-lg group ${
              isCollapsed ? "p-2" : "p-3"
            }`}
          >
            <div className="flex items-center gap-3 w-full">
              {isCollapsed ? (
                <div className="relative">
                  <Avatar className="h-10 w-10 ring-2 ring-blue-500/20 group-hover:ring-blue-500/50 transition-all duration-300">
                    <AvatarImage src={userProfile?.profile_picture_url} alt={`${userName}'s profile picture`} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Avatar className="h-11 w-11 ring-2 ring-blue-500/20 group-hover:ring-blue-500/50 transition-all duration-300 group-hover:scale-105">
                      <AvatarImage src={userProfile?.profile_picture_url} alt={`${userName}'s profile picture`} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm">
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300">
                      {userName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {userEmail}
                    </p>
                  </div>
                  <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-all duration-300 group-hover:translate-y-[-2px]" />
                </>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-64 p-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 shadow-2xl rounded-xl"
        >
          <DropdownMenuLabel className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            My Account
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200" />
          <DropdownMenuItem className="rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-gray-800 dark:hover:to-gray-700 cursor-pointer transition-all duration-200">
            <User className="w-4 h-4 mr-2 text-blue-600" />
            <span className="font-medium">Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-gray-800 dark:hover:to-gray-700 cursor-pointer transition-all duration-200">
            <Settings className="w-4 h-4 mr-2 text-purple-600" />
            <span className="font-medium">Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200" />
          <DropdownMenuItem
            className="rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 cursor-pointer transition-all duration-200 font-medium"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};