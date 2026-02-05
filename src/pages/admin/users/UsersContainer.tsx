import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserFilters } from "@/components/users/filters/UserFilters";
import UsersTable, { User } from "@/components/users/UsersTable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { useState, useEffect } from "react";
import { Loader2, X, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [groupid, setGroup] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<Array<{id: string, name: string}>>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Fetch groups separately to ensure they're available
  useEffect(() => {
    const fetchGroups = async () => {
      setGroupsLoading(true);
      try {
        const { data: groupProfiles, error } = await supabase
          .from("profiles")
          .select("id, display_name, first_name, last_name, company_name")
          .eq("type", "group")
          .eq("status", "active");

        if (error) {
          console.error("Error fetching groups:", error);
          return;
        }

        const groups = (groupProfiles || []).map(profile => ({
          id: profile.id,
          name: profile.display_name || 
                profile.company_name || 
                `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
                'Unnamed Group'
        }));

        setAvailableGroups(groups);
      } catch (error) {
        console.error("Error fetching groups:", error);
      } finally {
        setGroupsLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const addGroup = async () => {
    if (!groupid) {
      toast({
        title: "Group Selection",
        description: "Please select a group to continue.",
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
        description: `${selectedUsers.length} user(s) added to group successfully`,
      });

      onSelectionChange([]);
      setGroup("");
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

  const clearSelection = () => {
    onSelectionChange([]);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-xl font-semibold">Customers List</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {users.length} total
          </Badge>
        </div>
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
          
          {/* Selection Actions Bar */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg animate-in slide-in-from-top-2 duration-200">
              {/* Selection Count */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {selectedUsers.length} customer{selectedUsers.length !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Select a group to add them to
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="ml-2 h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>

              {/* Group Assignment */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Select
                  value={groupid}
                  onValueChange={setGroup}
                  disabled={isLoading || groupsLoading}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder={groupsLoading ? "Loading groups..." : "Select a group"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGroups.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        {groupsLoading ? "Loading groups..." : "No groups available"}
                      </div>
                    ) : (
                      availableGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Button
                  onClick={addGroup}
                  disabled={isLoading || !groupid}
                  className="whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add to Group
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <UsersTable
            users={users}
            selectedUsers={selectedUsers}
            onSelectionChange={onSelectionChange}
            searchTerm={searchTerm}
          />
        </div>
      </CardContent>
    </Card>
  );
}