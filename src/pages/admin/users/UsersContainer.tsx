import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserFilters } from "@/components/users/filters/UserFilters";
import UsersTable, { User } from "@/components/users/UsersTable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Loader2 } from "lucide-react"; // Import the loading icon

interface UsersContainerProps {
  users: User[];
  selectedUsers: string[];
  searchTerm: string;
  filterType: string;
  filterStatus: string;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSelectionChange: (selectedIds: string[]) => void;
}

export function UsersContainer({
  users,
  selectedUsers,
  searchTerm,
  filterType,
  filterStatus,
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onSelectionChange,
}: UsersContainerProps) {
  const { toast } = useToast();
  const [groupid, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const addGroup = async () => {
    if (!groupid) {
      toast({
        title: "Group Selection",
        description: "Please Select Group to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ group_id: groupid })
        .in("id", selectedUsers);

      if (error) {
        console.error("Error updating profiles:", error.message);
        toast({
          title: "Error",
          description: "Failed to update profiles. Please try again.",
          variant: "destructive",
        });
        return;
      }



      toast({
        title: "Success",
        description: "Users added to group successfully",
      });

      onSelectionChange([])
      console.log("Fetched Location Data:", data);
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Customers List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <UserFilters
            searchTerm={searchTerm}
            filterType={filterType}
            filterStatus={filterStatus}
            onSearchChange={onSearchChange}
            onTypeChange={onTypeChange}
            onStatusChange={onStatusChange}
          />
          {selectedUsers.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 p-4 bg-white shadow-lg rounded-lg">
              <select
                name="profile"
                id="profile"
                className="w-full md:w-72 p-3 border border-gray-300 rounded-lg shadow-sm 
                         focus:ring-2 focus:ring-blue-500 focus:outline-none"
                onChange={(e) => setGroup(e.target.value)}
                disabled={isLoading}
              >
                <option value="" disabled selected>
                  Select a user
                </option>
                {users
                  .filter((user) => user.type.toLowerCase() === "group")
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
              </select>

              <button
                onClick={addGroup}
                disabled={isLoading}
                className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg shadow-md 
                         hover:bg-blue-700 transition duration-300 ease-in-out 
                         active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2 min-w-[150px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "+ Add to Group"
                )}
              </button>
            </div>
          )}

          <div className="rounded-md border">
            <UsersTable
              users={users}
              selectedUsers={selectedUsers}
              onSelectionChange={onSelectionChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}