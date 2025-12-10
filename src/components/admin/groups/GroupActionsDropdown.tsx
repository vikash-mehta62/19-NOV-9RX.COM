import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import {
  MoreHorizontal,
  Eye,
  Settings2,
  Users,
  DollarSign,
  Power,
  PowerOff,
  Mail,
} from "lucide-react";

interface GroupActionsDropdownProps {
  groupId: string;
  groupName: string;
  status: string;
  onViewDetails: () => void;
  onEditSettings: () => void;
  onManagePharmacies: () => void;
  onRefresh: () => void;
}

export function GroupActionsDropdown({
  groupId,
  groupName,
  status,
  onViewDetails,
  onEditSettings,
  onManagePharmacies,
  onRefresh,
}: GroupActionsDropdownProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const toggleStatus = async () => {
    try {
      setLoading(true);
      const newStatus = status === "active" ? "inactive" : "active";
      
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${groupName} has been ${newStatus === "active" ? "activated" : "deactivated"}`,
      });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onViewDetails}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEditSettings}>
          <Settings2 className="h-4 w-4 mr-2" />
          Edit Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onManagePharmacies}>
          <Users className="h-4 w-4 mr-2" />
          Manage Pharmacies
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(`/admin/group-pricing?group=${groupId}`, '_self')}>
          <DollarSign className="h-4 w-4 mr-2" />
          Group Pricing
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleStatus} disabled={loading}>
          {status === "active" ? (
            <>
              <PowerOff className="h-4 w-4 mr-2 text-red-500" />
              <span className="text-red-500">Deactivate</span>
            </>
          ) : (
            <>
              <Power className="h-4 w-4 mr-2 text-green-500" />
              <span className="text-green-500">Activate</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
