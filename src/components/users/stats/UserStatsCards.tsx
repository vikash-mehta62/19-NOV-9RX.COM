import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Hospital, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserStatsCardsProps {
  totalUsers: number;
  pharmacies: number;
  hospitals: number;
  groups: number;
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export function UserStatsCards({
  totalUsers,
  pharmacies,
  hospitals,
  groups,
  activeFilter = "all",
  onFilterChange,
}: UserStatsCardsProps) {
  const handleCardClick = (filter: string) => {
    if (onFilterChange) {
      // Toggle filter - if already selected, go back to "all"
      onFilterChange(activeFilter === filter ? "all" : filter);
    }
  };

  const isClickable = !!onFilterChange;

  return (
    <>
      <Card 
        className={cn(
          "relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 min-h-[140px]",
          isClickable && "cursor-pointer",
          activeFilter === "all" && "ring-2 ring-blue-500 ring-offset-2"
        )}
        onClick={() => handleCardClick("all")}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={(e) => {
          if (isClickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleCardClick("all");
          }
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
          <div className="h-10 w-10 flex items-center justify-center bg-blue-100 rounded-full">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{totalUsers}</div>
          <p className="text-xs text-gray-500 mt-2">
            {isClickable ? "Click to show all" : "All registered users"}
          </p>
        </CardContent>
      </Card>

      <Card 
        className={cn(
          "relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 min-h-[140px]",
          isClickable && "cursor-pointer",
          activeFilter === "pharmacy" && "ring-2 ring-green-500 ring-offset-2"
        )}
        onClick={() => handleCardClick("pharmacy")}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={(e) => {
          if (isClickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleCardClick("pharmacy");
          }
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Pharmacies</CardTitle>
          <div className="h-10 w-10 flex items-center justify-center bg-green-100 rounded-full">
            <Building2 className="h-5 w-5 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{pharmacies}</div>
          <p className="text-xs text-gray-500 mt-2">
            {isClickable ? "Click to filter" : "Registered pharmacies"}
          </p>
        </CardContent>
      </Card>

      {/* <Card 
        className={cn(
          "relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 min-h-[140px]",
          isClickable && "cursor-pointer",
          activeFilter === "hospital" && "ring-2 ring-red-500 ring-offset-2"
        )}
        onClick={() => handleCardClick("hospital")}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={(e) => {
          if (isClickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleCardClick("hospital");
          }
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Hospitals</CardTitle>
          <div className="h-10 w-10 flex items-center justify-center bg-red-100 rounded-full">
            <Hospital className="h-5 w-5 text-red-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{hospitals}</div>
          <p className="text-xs text-gray-500 mt-2">
            {isClickable ? "Click to filter" : "Registered hospitals"}
          </p>
        </CardContent>
      </Card> */}

      <Card 
        className={cn(
          "relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 min-h-[140px]",
          isClickable && "cursor-pointer",
          activeFilter === "group" && "ring-2 ring-purple-500 ring-offset-2"
        )}
        onClick={() => handleCardClick("group")}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={(e) => {
          if (isClickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleCardClick("group");
          }
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Groups</CardTitle>
          <div className="h-10 w-10 flex items-center justify-center bg-purple-100 rounded-full">
            <UsersRound className="h-5 w-5 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{groups}</div>
          <p className="text-xs text-gray-500 mt-2">
            {isClickable ? "Click to filter" : "Registered groups"}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
