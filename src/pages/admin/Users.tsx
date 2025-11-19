
import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { AddUserModal } from "@/components/users/AddUserModal";
import { UserStatsCards } from "@/components/users/stats/UserStatsCards";
import { UsersHeader } from "./users/UsersHeader";
import { UsersContainer } from "./users/UsersContainer";
import { useUsers } from "./users/useUsers";
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Users = () => {
  const { toast } = useToast();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const {
    users,
    isLoading,
    error,
    selectedUsers,
    searchTerm,
    filterType,
    filterStatus,
    setSelectedUsers,

    setSearchTerm,
    setFilterType,
    setFilterStatus,
  } = useUsers();

  // Calculate statistics
  const activeUsers = users.filter((user) => user.status === "active").length;
  const pendingUsers = users.filter((user) => user.status === "pending").length;
  const totalUsers = users.length;


  useEffect(() => {
    console.log(selectedUsers)
  }, [selectedUsers])
  const handleAddUser = () => {
    setIsAddUserOpen(true);
  };

  const handleUserAdded = () => {
    toast({
      title: "Success",
      description: "User has been added successfully",
    });
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Type", "Status", "Locations", "Last Active"];
    const csvContent = users.map(user =>
      [user.name, user.email, user.type, user.status, user.locations || "", user.lastActive].join(",")
    );

    const csv = [headers.join(","), ...csvContent].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Users data has been exported to CSV",
    });
  };

  const renderContent = () => {
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load users"}
          </AlertDescription>
        </Alert>
      );
    }

    if (isLoading) {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-[600px]" />
        </div>
      );
    }

    return (
      <>
        <div className="grid gap-4 md:grid-cols-3">
          <UserStatsCards
            totalUsers={totalUsers}
            activeUsers={activeUsers}
            pendingUsers={pendingUsers}
          />
        </div>

        <UsersContainer
          users={users}
          selectedUsers={selectedUsers}
          searchTerm={searchTerm}
          filterType={filterType}
          filterStatus={filterStatus}
          onSearchChange={setSearchTerm}
          onTypeChange={setFilterType}
          onStatusChange={setFilterStatus}
          onSelectionChange={setSelectedUsers}
        />
      </>
    );
  };

  return (
    <DashboardLayout role="admin">
      <div className="min-h-screen bg-background">
        <div className="flex-1 space-y-6 container px-6 py-6">
          <UsersHeader
            onExportCSV={handleExportCSV}
            onAddUser={handleAddUser}
          />

          {renderContent()}
        </div>

        <AddUserModal
          open={isAddUserOpen}
          onOpenChange={setIsAddUserOpen}
          onUserAdded={handleUserAdded}
        />
        <Toaster />
      </div>
    </DashboardLayout>
  );
};

export default Users;
