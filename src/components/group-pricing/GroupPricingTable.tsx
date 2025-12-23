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
import { GroupPricingPagination } from "./components/GroupPricingPagination";
import { GroupPricing, GroupPricingTableProps } from "./types/groupPricing.types";
import { Tag } from "lucide-react";

interface TableProps extends GroupPricingTableProps {
  searchTerm?: string;
  statusFilter?: "all" | "active" | "inactive";
}

export function GroupPricingTable({ searchTerm = "", statusFilter = "all" }: TableProps) {
  const [groupPricings, setGroupPricings] = useState<GroupPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingPricing, setEditingPricing] = useState<GroupPricing | null>(null);
  const rowsPerPage = 10;
  const { toast } = useToast();

  const fetchGroupPricings = async () => {
    if (!loading) setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        return;
      }

      const start = (page - 1) * rowsPerPage;
      const end = start + rowsPerPage - 1;

      const { data, error, count } = await supabase
        .from("group_pricing")
        .select("*, products(name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) throw new Error(`Failed to fetch pricing rules: ${error.message}`);

      setGroupPricings(data || []);
      setTotalPages(Math.ceil((count || 0) / rowsPerPage));
    } catch (error: any) {
      console.error("Error fetching pricing rules:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch pricing rules",
        variant: "destructive",
      });
      setGroupPricings([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("group_pricing")
        .delete()
        .eq("id", id);

      if (error) throw new Error(`Failed to delete: ${error.message}`);

      toast({
        title: "Success",
        description: "Special pricing deleted successfully",
      });
      fetchGroupPricings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("group_pricing")
        .update({ status: "inactive" })
        .eq("id", id);

      if (error) throw new Error(`Failed to deactivate: ${error.message}`);

      toast({
        title: "Success",
        description: "Special pricing deactivated successfully",
      });
      fetchGroupPricings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  useEffect(() => {
    fetchGroupPricings();
  }, [page]);

  // Filter data based on search and status
  const filteredPricings = groupPricings.filter(pricing => {
    const matchesSearch = pricing.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || pricing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="rounded-md">
      {filteredPricings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>
            {searchTerm || statusFilter !== "all" 
              ? "No pricing rules match your filters"
              : "No special pricing configurations found"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Products</TableHead>
                <TableHead className="text-center">Groups</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPricings.map((pricing) => (
                <TableRow key={pricing.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{pricing.name}</TableCell>
                  <TableCell className="text-center">{pricing.product_arrayjson?.length || 0}</TableCell>
                  <TableCell className="text-center">{pricing.group_ids?.length || 0}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={pricing.status === "active" 
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"}
                    >
                      {pricing.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(pricing.created_at)}</TableCell>
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
            </TableBody>
          </Table>
        </div>
      )}

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
              <DialogTitle className="text-gray-800">Edit Special Pricing</DialogTitle>
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
