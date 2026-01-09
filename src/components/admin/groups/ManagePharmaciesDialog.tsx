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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { Loader2, Search, UserMinus, Building2, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useScreenSize } from "@/hooks/use-mobile";

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
  const screenSize = useScreenSize();
  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';
  const isCompact = isMobile || isTablet;
  
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
      <DialogContent className={cn(
        "overflow-hidden",
        (isMobile || isTablet || window.innerWidth <= 768)
          ? "w-[95vw] max-w-none h-[85vh] rounded-xl p-0 m-2" 
          : "sm:max-w-[700px] max-h-[80vh]"
      )}>
        <DialogHeader className={cn(
          "border-b bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 flex-shrink-0",
          (isMobile || isTablet || window.innerWidth <= 768) ? "p-3 pb-3" : "p-6 pb-4"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className={cn(
                "flex items-center gap-2 text-gray-900 font-bold",
                (isMobile || isTablet || window.innerWidth <= 768) ? "text-base" : "text-xl"
              )}>
                <Building2 className={cn("text-blue-600", (isMobile || isTablet || window.innerWidth <= 768) ? "w-4 h-4" : "w-6 h-6")} />
                Manage Pharmacies
              </DialogTitle>
              <DialogDescription className={cn(
                "text-blue-700 font-medium",
                (isMobile || isTablet || window.innerWidth <= 768) ? "text-xs mt-0.5" : "text-base mt-1"
              )}>
                {groupName} • {pharmacies.length} {pharmacies.length === 1 ? 'pharmacy' : 'pharmacies'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className={cn("flex flex-col", (isMobile || isTablet || window.innerWidth <= 768) ? "flex-1 min-h-0" : "space-y-4 p-6")}>
          {/* Search Bar */}
          <div className={cn("relative flex-shrink-0", (isMobile || isTablet || window.innerWidth <= 768) ? "p-4 pb-3 bg-white border-b border-gray-100" : "")}>
            <div className="relative">
              <Search className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 text-gray-400",
                (isMobile || isTablet || window.innerWidth <= 768) ? "w-5 h-5" : "w-4 h-4"
              )} />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200",
                  (isMobile || isTablet || window.innerWidth <= 768)
                    ? "pl-12 pr-12 h-14 text-base rounded-2xl bg-gray-50 focus:bg-white placeholder:text-gray-500" 
                    : "pl-9 pr-10"
                )}
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-0 hover:bg-gray-200 rounded-full transition-colors",
                    (isMobile || isTablet || window.innerWidth <= 768) ? "h-10 w-10" : "h-7 w-7"
                  )}
                  onClick={() => setSearchTerm("")}
                >
                  <X className={cn("text-gray-500", (isMobile || isTablet || window.innerWidth <= 768) ? "w-5 h-5" : "w-4 h-4")} />
                </Button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className={cn("flex-1 overflow-hidden", (isMobile || isTablet || window.innerWidth <= 768) ? "min-h-0" : "")}>
            {loading ? (
              <div className={cn("flex items-center justify-center", (isMobile || isTablet || window.innerWidth <= 768) ? "h-full" : "py-12")}>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-100 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="text-center">
                    <p className={cn("font-medium text-gray-900", (isMobile || isTablet || window.innerWidth <= 768) ? "text-base" : "text-lg")}>
                      Loading pharmacies...
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Please wait a moment</p>
                  </div>
                </div>
              </div>
            ) : filteredPharmacies.length === 0 ? (
              <div className={cn("flex flex-col items-center justify-center text-center", (isMobile || isTablet || window.innerWidth <= 768) ? "h-full px-6 py-12" : "py-12")}>
                <div className={cn("rounded-full p-4 mb-4", (isMobile || isTablet || window.innerWidth <= 768) ? "bg-blue-50" : "bg-gray-50")}>
                  <Building2 className={cn("text-gray-400", (isMobile || isTablet || window.innerWidth <= 768) ? "h-8 w-8" : "h-12 w-12")} />
                </div>
                <h3 className={cn("font-semibold text-gray-900 mb-2", (isMobile || isTablet || window.innerWidth <= 768) ? "text-lg" : "text-xl")}>
                  {searchTerm ? "No matches found" : "No pharmacies yet"}
                </h3>
                <p className={cn("text-gray-500 mb-4", (isMobile || isTablet || window.innerWidth <= 768) ? "text-base" : "text-lg")}>
                  {searchTerm 
                    ? "Try adjusting your search terms" 
                    : "This group doesn't have any pharmacies assigned"
                  }
                </p>
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    size={(isMobile || isTablet || window.innerWidth <= 768) ? "default" : "sm"} 
                    onClick={() => setSearchTerm("")} 
                    className={cn("font-medium", (isMobile || isTablet || window.innerWidth <= 768) && "h-11 px-6")}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (isMobile || isTablet || window.innerWidth <= 768) ? (
              /* Mobile/Tablet: Enhanced Card Layout - Force mobile layout for small screens */
              <ScrollArea className="h-full">
                <div className={cn("space-y-3", isMobile ? "p-3" : "p-4")}>
                  {filteredPharmacies.map((pharmacy, index) => (
                    <div 
                      key={pharmacy.id} 
                      className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      {/* Main Content */}
                      <div className="p-4">
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-gray-900 text-base truncate">
                                  {pharmacy.display_name || pharmacy.company_name || "Unknown"}
                                </h3>
                              </div>
                            </div>
                            <p className="text-sm text-gray-500 truncate ml-10">{pharmacy.email}</p>
                          </div>
                          <Badge className={cn(
                            "flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full",
                            getStatusColor(pharmacy.status)
                          )}>
                            {pharmacy.status}
                          </Badge>
                        </div>
                        
                        {/* Info Row */}
                        <div className="ml-10 mb-3">
                          <div className="text-sm text-gray-500">
                            <span className="font-medium text-gray-600">Joined:</span>{" "}
                            <span className="text-gray-800">
                              {format(new Date(pharmacy.created_at), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Footer */}
                      <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromGroup(
                            pharmacy.id, 
                            pharmacy.display_name || pharmacy.company_name || "Pharmacy"
                          )}
                          disabled={removing === pharmacy.id}
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-100 h-11 font-medium transition-colors rounded-lg"
                        >
                          {removing === pharmacy.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Removing...
                            </>
                          ) : (
                            <>
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from Group
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              /* Desktop: Table Layout */
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
                            onClick={() => removeFromGroup(
                              pharmacy.id, 
                              pharmacy.display_name || pharmacy.company_name || "Pharmacy"
                            )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
