import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";

interface UsersHeaderProps {
  onExportCSV: () => void;
  onAddUser: () => void;
}

export function UsersHeader({ onExportCSV, onAddUser }: UsersHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
        <p className="text-muted-foreground">
          Manage and monitor customer accounts across your organization
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={onExportCSV} 
          variant="outline" 
          size="sm"
          className="w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
        <Button 
          onClick={onAddUser}
          size="sm"
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Customer
        </Button>
      </div>
    </div>
  );
}