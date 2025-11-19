"use client";

import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { useSidebar } from "@/components/ui/sidebar";

export const SidebarHeader = () => {
  const userProfile = useSelector(selectUserProfile);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const userName = `${userProfile?.first_name ?? "User"} ${userProfile?.last_name ?? ""}`.trim();

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center">
      {isCollapsed ? (
        // 👇 Collapsed state: only small logo or icon
        <img
          src="/logolook.png" // Replace with your collapsed version logo or symbol image
          alt="Compact Logo"
          className="h-14 w-16 object-contain"
        />
      ) : (
        // 👇 Expanded state: full logo and username
        <div className="flex items-center gap-3 w-full">
          <img
            src="/final.png"
            alt="Full Logo"
            className="h-16 w object-cover"
          />
          <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
            {userName}
          </p>
        </div>
      )}
    </div>
  );
};
