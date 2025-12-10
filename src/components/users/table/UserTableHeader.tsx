import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { SortField, SortDirection } from "../UsersTable";
import { cn } from "@/lib/utils";

interface UserTableHeaderProps {
  onSelectAll: (checked: boolean) => void;
  isAllSelected: boolean;
  isIndeterminate?: boolean;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
}

export function UserTableHeader({ 
  onSelectAll, 
  isAllSelected,
  isIndeterminate = false,
  sortField,
  sortDirection,
  onSort
}: UserTableHeaderProps) {
  
  const SortableHeader = ({ 
    field, 
    children, 
    className 
  }: { 
    field: SortField; 
    children: React.ReactNode;
    className?: string;
  }) => {
    const isActive = sortField === field;
    
    return (
      <TableHead 
        className={cn(
          "cursor-pointer select-none hover:bg-muted/80 transition-colors",
          className
        )}
        onClick={() => onSort?.(field)}
        role="columnheader"
        aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUp className="h-4 w-4 text-primary" />
            ) : (
              <ArrowDown className="h-4 w-4 text-primary" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <TableHeader>
      <TableRow className="bg-muted/50">
        <TableHead className="w-[50px] px-2 sm:px-4">
          <Checkbox
            checked={isIndeterminate ? "indeterminate" : isAllSelected}
            onCheckedChange={onSelectAll}
            aria-label="Select all on this page"
          />
        </TableHead>
        <SortableHeader field="name" className="min-w-[150px]">
          Name
        </SortableHeader>
        <SortableHeader field="email" className="min-w-[200px] hidden md:table-cell">
          Email
        </SortableHeader>
        <SortableHeader field="company" className="hidden lg:table-cell">
          Company
        </SortableHeader>
        <SortableHeader field="type" className="hidden sm:table-cell">
          Type
        </SortableHeader>
        <SortableHeader field="status">
          Status
        </SortableHeader>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}