import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/supabaseClient";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateGroupPricingDialog } from "./CreateGroupPricingDialog";
import { GroupPricingActions } from "./components/GroupPricingActions";
import { GroupPricingHeader } from "./components/GroupPricingHeader";
import { GroupPricingPagination } from "./components/GroupPricingPagination";
import { GroupPricing, GroupPricingTableProps } from "./types/groupPricing.types";

export function GroupPricingTable({}: GroupPricingTableProps) {
  const [groupPricings, setGroupPricings] = useState<GroupPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingPricing, setEditingPricing] = useState<GroupPricing | null>(null);
  const rowsPerPage = 10;
  const { toast } = useToast();

  const fetchGroupPricings = async () => {
    console.log("Starting fetchGroupPricings");
    if (!loading) setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session found in GroupPricingTable");
        toast({
          title: "Authentication Error",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        return;
      }

      const start = (page - 1) * rowsPerPage;
      const end = start + rowsPerPage - 1;

      console.log("Fetching group pricings with range:", { start, end });
      const { data, error, count } = await supabase
        .from("group_pricing")
        .select("*, products(name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(start, end);

      console.log("Fetch response:", { data, error, count });

      if (error) throw new Error(`Failed to fetch group pricings: ${error.message}`);
console.log(data)
      setGroupPricings(data || []);
      setTotalPages(Math.ceil((count || 0) / rowsPerPage));
      
      console.log("Successfully updated state with:", {
        pricingsCount: data?.length,
        totalPages: Math.ceil((count || 0) / rowsPerPage)
      });
    } catch (error: any) {
      console.error("Error in fetchGroupPricings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch group pricings",
        variant: "destructive",
      });
      setGroupPricings([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    console.log("Starting handleDelete for id:", id);
    try {
      const { error } = await supabase
        .from("group_pricing")
        .delete()
        .eq("id", id);

      if (error) throw new Error(`Failed to delete group pricing: ${error.message}`);

      toast({
        title: "Success",
        description: "Group pricing configuration deleted successfully",
      });
      fetchGroupPricings();
    } catch (error: any) {
      console.error("Error in handleDelete:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete group pricing configuration",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async (id: string) => {
    console.log("Starting handleDeactivate for id:", id);
    try {
      const { error } = await supabase
        .from("group_pricing")
        .update({ status: "inactive" })
        .eq("id", id);

      if (error) throw new Error(`Failed to deactivate group pricing: ${error.message}`);

      toast({
        title: "Success",
        description: "Group pricing configuration deactivated successfully",
      });
      fetchGroupPricings();
    } catch (error: any) {
      console.error("Error in handleDeactivate:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate group pricing configuration",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  useEffect(() => {
    fetchGroupPricings();
  }, [page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
console.log(groupPricings)
  return (
    <div className="rounded-md p-4">
      <GroupPricingHeader loading={loading} onRefresh={fetchGroupPricings} />

      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead className="text-gray-700">Name</TableHead>
            {/* <TableHead className="text-gray-700">Discount</TableHead>
            <TableHead className="text-gray-700">Quantity Range</TableHead> */}
            <TableHead className="text-gray-700">Groups</TableHead>
            <TableHead className="text-gray-700">Status</TableHead>
            <TableHead className="text-gray-700">Created</TableHead>
            <TableHead className="text-right text-gray-700">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupPricings.map((pricing) => (
            <TableRow key={pricing.id} className="hover:bg-gray-50/50">
              <TableCell className="font-medium text-gray-800">{pricing.name}</TableCell>
              {/* <TableCell className="text-gray-700">{pricing.discount}{pricing.discount_type === "fixed" ? '$' : "%" }</TableCell>
              <TableCell className="text-gray-700">
                {pricing.min_quantity} - {pricing.max_quantity}
              </TableCell> */}
              <TableCell className="text-gray-700">{pricing.group_ids?.length || 0} groups</TableCell>
              <TableCell>
                <Badge
                  variant={pricing.status === "active" ? "default" : "secondary"}
                  className={pricing.status === "active" 
                    ? "bg-gradient-to-r from-[#accbee] to-[#e7f0fd] text-gray-800"
                    : "bg-gray-200 text-gray-600"}
                >
                  {pricing.status}
                </Badge>
              </TableCell>
              <TableCell className="text-gray-700">{formatDate(pricing.created_at)}</TableCell>
              <TableCell className="text-right">
                <GroupPricingActions
                  pricing={pricing}
                  onEdit={setEditingPricing}
                  onDeactivate={handleDeactivate}
                  onDelete={handleDelete}
                />
              </TableCell>
            </TableRow>
          ))}
          {groupPricings.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-gray-500 py-8"
              >
                No group pricing configurations found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <GroupPricingPagination
        page={page}
        totalPages={totalPages}
        loading={loading}
        onPageChange={setPage}
      />

      {editingPricing && (
        <Dialog open={!!editingPricing} onOpenChange={() => setEditingPricing(null)}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-800">Edit Group Pricing</DialogTitle>
            </DialogHeader>
            <CreateGroupPricingDialog
              initialData={editingPricing}
              onSubmit={() => {
                setEditingPricing(null);
                fetchGroupPricings();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}