import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { Loader2, Search, UserMinus, Building2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ManagePharmaciesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  onUpdated: () => void;
}

interface Pharmacy {
  id: string;
  display_name: string;
  company_name: string;
  email: string;
  status: string;
  created_at: string;
}

export function ManagePharmaciesDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  onUpdated,
}: ManagePharmaciesDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (open && groupId) {
      fetchPharmacies();
    }
  }, [open, groupId]);

  const fetchPharmacies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, company_name, email, status, created_at")
        .eq("group_id", groupId)
        .eq("type", "pharmacy")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPharmacies(data || []);
    } catch (err) {
      console.error("Error fetching pharmacies:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromGroup = async (pharmacyId: string, pharmacyName: string) => {
    try {
      setRemoving(pharmacyId);
      const { error } = await supabase
        .from("profiles")
        .update({ group_id: null, updated_at: new Date().toISOString() })
        .eq("id", pharmacyId);

      if (error) throw error;

      toast({ title: "Success", description: `${pharmacyName} removed from group` });
      fetchPharmacies();
      onUpdated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  };

  const filteredPharmacies = pharmacies.filter(
    (p) =>
      p.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Pharmacies</DialogTitle>
          <DialogDescription>
            {groupName} - {pharmacies.length} pharmacies
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pharmacies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredPharmacies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{searchTerm ? "No pharmacies match your search" : "No pharmacies in this group"}</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pharmacy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPharmacies.map((pharmacy) => (
                    <TableRow key={pharmacy.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {pharmacy.display_name || pharmacy.company_name || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">{pharmacy.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(getStatusColor(pharmacy.status))}>
                          {pharmacy.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(pharmacy.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromGroup(pharmacy.id, pharmacy.display_name || pharmacy.company_name || "Pharmacy")}
                          disabled={removing === pharmacy.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {removing === pharmacy.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserMinus className="h-4 w-4 mr-1" />
                              Remove
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
