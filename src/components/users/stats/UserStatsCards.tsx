import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, UserCheck, Clock } from "lucide-react";

interface UserStatsCardsProps {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
}

export function UserStatsCards({
  totalUsers,
  activeUsers,
  pendingUsers,
}: UserStatsCardsProps) {
  return (
    <div className="hidden">
      <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 min-h-[160px]">
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
            All registered accounts
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 min-h-[160px]">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
          <div className="h-10 w-10 flex items-center justify-center bg-green-100 rounded-full">
            <UserCheck className="h-5 w-5 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{activeUsers}</div>
          <p className="text-xs text-gray-500 mt-2">
            Currently active accounts
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 min-h-[160px]">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/50 to-transparent" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
          <div className="h-10 w-10 flex items-center justify-center bg-yellow-100 rounded-full">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{pendingUsers}</div>
          <p className="text-xs text-gray-500 mt-2">
            Awaiting admin review
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 min-h-[160px]">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">New Signups</CardTitle>
          <div className="h-10 w-10 flex items-center justify-center bg-purple-100 rounded-full">
            <UserPlus className="h-5 w-5 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{pendingUsers}</div>
          <p className="text-xs text-gray-500 mt-2">
            Recent registration requests
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
