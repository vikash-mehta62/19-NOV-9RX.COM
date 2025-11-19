import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface UserTableHeaderProps {
  onSelectAll: (checked: boolean) => void;
  isAllSelected: boolean;
}

export function UserTableHeader({ onSelectAll, isAllSelected }: UserTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow className="bg-muted/50">
        <TableHead className="w-[50px] px-2 sm:px-4">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onSelectAll}
            aria-label="Select all"
          />
        </TableHead>
        <TableHead className="min-w-[150px]">Name</TableHead>
        <TableHead className="min-w-[200px] hidden md:table-cell">Email</TableHead>
        <TableHead className="hidden lg:table-cell">Type</TableHead>
        <TableHead className="hidden sm:table-cell">Role</TableHead>
        <TableHead className="hidden xl:table-cell">Locations</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden lg:table-cell">Last Active</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}