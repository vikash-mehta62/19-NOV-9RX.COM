"use client";

import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { useSidebar } from "@/components/ui/sidebar";
import { Sparkles } from "lucide-react";

export const SidebarHeader = () => {
  const userProfile = useSelector(selectUserProfile);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const userName = `${userProfile?.first_name ?? "User"} ${userProfile?.last_name ?? ""}`.trim();

  return (
    <div className="relative p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      {isCollapsed ? (
        // Collapsed state: compact logo with animation
        <div className="relative flex items-center justify-center group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
          <div className="relative bg-white dark:bg-gray-800 p-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <img
              src="/logolook.png"
              alt="Compact Logo"
              className="h-10 w-10 object-contain"
            />
          </div>
        </div>
      ) : (
        // Expanded state: full logo with user info
        <div className="relative flex items-center gap-3 w-full">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300"></div>
            <div className="relative bg-white dark:bg-gray-800 p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <img
                src="/final.png"
                alt="Full Logo"
                className="h-12 w-12 object-cover rounded-lg"
              />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {userName}
              </p>
              <Sparkles className="h-3 w-3 text-yellow-500 animate-pulse" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Welcome back! 👋
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
