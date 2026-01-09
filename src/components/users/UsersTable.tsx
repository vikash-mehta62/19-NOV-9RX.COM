import {
  Table,
  TableBody,
} from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { useState, useMemo } from "react";
import { UserRole } from "./schemas/userFormSchemas";
import { PendingUserReview } from "./pending/PendingUserReview";
import { UserTableHeader } from "./table/UserTableHeader";
import { UserTableRow } from "./table/UserTableRow";
import { getStatusBadgeColor } from "./utils/userTableUtils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Users } from "lucide-react";

export interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  type: "Pharmacy" | "Hospital" | "Group";
  status: string;
  role: UserRole;
  locations?: number;
  lastActive: string;
  phone?: string;
}

interface UsersTableProps {
  users: User[];
  selectedUsers: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  searchTerm?: string;
}

export type SortField = "name" | "email" | "company" | "type" | "status" | "lastActive";
export type SortDirection = "asc" | "desc";

const UsersTable = ({ users, selectedUsers, onSelectionChange, searchTerm = "" }: UsersTableProps) => {
  const [selectedPendingUser, setSelectedPendingUser] = useState<User | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Sort users
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let aValue = a[sortField] || "";
      let bValue = b[sortField] || "";
      
      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [users, sortField, sortDirection]);

  // Paginate users
  const totalPages = Math.ceil(sortedUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  // Reset to page 1 when users change
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [users.length, pageSize]);

  const handleUserUpdated = () => {
    // Trigger re-render by updating parent state
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all users on current page
      const currentPageIds = paginatedUsers.map(user => user.id);
      const newSelection = [...new Set([...selectedUsers, ...currentPageIds])];
      onSelectionChange(newSelection);
    } else {
      // Deselect all users on current page
      const currentPageIds = new Set(paginatedUsers.map(user => user.id));
      onSelectionChange(selectedUsers.filter(id => !currentPageIds.has(id)));
    }
  };

  const handleSelectOne = (checked: boolean, userId: string) => {
    if (checked) {
      onSelectionChange([...selectedUsers, userId]);
    } else {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleStatusBadgeClick = (user: User) => {
    if (user.status === "pending") {
      setSelectedPendingUser(user);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  // Check if all users on current page are selected
  const isAllCurrentPageSelected = paginatedUsers.length > 0 && 
    paginatedUsers.every(user => selectedUsers.includes(user.id));

  // Check if some users on current page are selected
  const isSomeCurrentPageSelected = paginatedUsers.some(user => selectedUsers.includes(user.id));

  return (
    <div className="space-y-4">
      {/* Empty State */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No customers found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            No customers match your current filters. Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <UserTableHeader 
                onSelectAll={handleSelectAll}
                isAllSelected={isAllCurrentPageSelected}
                isIndeterminate={isSomeCurrentPageSelected && !isAllCurrentPageSelected}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <TableBody>
                {paginatedUsers.map((user) => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    isSelected={selectedUsers.includes(user.id)}
                    onSelectChange={(checked) => handleSelectOne(checked, user.id)}
                    onUserUpdated={handleUserUpdated}
                    getStatusBadgeColor={getStatusBadgeColor}
                    handleStatusBadgeClick={handleStatusBadgeClick}
                    searchTerm={searchTerm}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2 w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center md:justify-start">
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, sortedUsers.length)} of {sortedUsers.length} customers
              </span>
            </div>
            <div className="flex flex-col w-full md:w-auto gap-3 items-center md:items-end">
              {/* Page Size Selector and Navigation: stacked on mobile, row on tablet+ */}
              <div className="flex flex-col w-full items-center gap-2 md:flex-row md:items-center md:gap-4 md:w-auto">
                <div className="flex flex-col items-center gap-1 w-full md:flex-row md:items-center md:gap-2 md:w-auto">
                  <span className="text-sm text-muted-foreground text-center md:text-left">Rows per page:</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-full md:w-[70px] h-10 md:h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Page Navigation */}
                <div className="flex items-center gap-1 justify-center w-full md:justify-end md:w-auto mt-2 md:mt-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 md:h-8 md:w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    aria-label="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 md:h-8 md:w-8"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm flex items-center justify-center text-center md:px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 md:h-8 md:w-8"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 md:h-8 md:w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!selectedPendingUser} onOpenChange={() => setSelectedPendingUser(null)}>
        {selectedPendingUser && (
          <PendingUserReview
            user={selectedPendingUser}
            onClose={() => setSelectedPendingUser(null)}
            onStatusUpdate={() => {
              setSelectedPendingUser(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
};

export default UsersTable;