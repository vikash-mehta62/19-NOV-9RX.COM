import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";

interface UsersHeaderProps {
  onExportCSV: () => void;
  onAddUser: () => void;
  filterType?: string;
}

const getUserPageCopy = (filterType: string) => {
  switch (filterType.toLowerCase()) {
    case "pharmacy":
      return {
        title: "Pharmacy Management",
        description: "Manage and monitor pharmacy customer accounts.",
        addLabel: "Add Office",
      };
    case "group":
      return {
        title: "Group Management",
        description: "Manage and monitor group accounts.",
        addLabel: "Add Group",
      };
    case "vendor":
      return {
        title: "Vendor Management",
        description: "Manage and monitor vendor accounts.",
        addLabel: "Add Vendor",
      };
    case "hospital":
      return {
        title: "Hospital Management",
        description: "Manage and monitor hospital accounts.",
        addLabel: "Add Hospital",
      };
    case "admin":
      return {
        title: "Internal Admin Management",
        description: "Manage and monitor internal admin accounts.",
        addLabel: "Add Internal Admin",
      };
    default:
      return {
        title: "Customer Management",
        description: "Manage and monitor customer accounts across your organization",
        addLabel: "Add Customer",
      };
  }
};

export function UsersHeader({ onExportCSV, onAddUser, filterType = "all" }: UsersHeaderProps) {
  const copy = getUserPageCopy(filterType);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="text-muted-foreground">{copy.description}</p>
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
          <Plus className="mr-2 h-4 w-4" /> {copy.addLabel}
        </Button>
      </div>
    </div>
  );
}
