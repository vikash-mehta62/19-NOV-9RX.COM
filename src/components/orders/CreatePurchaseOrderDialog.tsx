import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Vendor {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  type: string;
  status: string;
}

export function CreatePurchaseOrderDialog() {
  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch vendors when dialog opens
  useEffect(() => {
    if (open) {
      fetchVendors();
    }
  }, [open]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, company_name, email, type, status")
        .eq("type", "vendor")
        .eq("status", "active")
        .order("company_name", { ascending: true });

      if (error) throw error;

      setVendors(data || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePO = () => {
    if (!selectedVendor) {
      toast({
        title: "Vendor Required",
        description: "Please select a vendor to create a purchase order",
        variant: "destructive",
      });
      return;
    }

    // Navigate to PO creation page with selected vendor
    navigate("/admin/po/create", {
      state: {
        vendorId: selectedVendor,
        isPO: true,
      },
    });
    setOpen(false);
  };

  const getSelectedVendorDisplay = () => {
    if (!selectedVendor || vendors.length === 0) return null;
    const vendor = vendors.find(v => v.id === selectedVendor);
    if (!vendor) return null;
    
    return (
      <div className="flex flex-col items-start gap-0.5 w-full">
        <span className="font-semibold text-sm text-gray-900">
          {vendor.company_name || `${vendor.first_name} ${vendor.last_name}`}
        </span>
        {vendor.company_name && (
          <span className="text-xs text-gray-600">
            {vendor.first_name} {vendor.last_name}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {vendor.email}
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md"
        >
          <ShoppingCart className="h-4 w-4" />
          Create PO
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Create Purchase Order
          </DialogTitle>
          <DialogDescription>
            Select a vendor to create a purchase order. You'll be able to add
            products in the next step.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vendor" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Select Vendor
            </Label>
            <Select
              value={selectedVendor}
              onValueChange={setSelectedVendor}
              disabled={loading}
            >
              <SelectTrigger id="vendor" className="h-auto min-h-[50px]">
                <div className="w-full text-left">
                  {selectedVendor ? getSelectedVendorDisplay() : (
                    <span className="text-muted-foreground">Choose a vendor...</span>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {loading ? (
                  <SelectItem value="loading" disabled>
                    Loading vendors...
                  </SelectItem>
                ) : vendors.length === 0 ? (
                  <SelectItem value="no-vendors" disabled>
                    No vendors found
                  </SelectItem>
                ) : (
                  vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      <div className="flex flex-col py-1">
                        <span className="font-semibold text-sm text-gray-900">
                          {vendor.company_name || `${vendor.first_name} ${vendor.last_name}`}
                        </span>
                        {vendor.company_name && (
                          <span className="text-xs text-gray-600">
                            {vendor.first_name} {vendor.last_name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {vendor.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {vendors.length === 0 && !loading && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                No vendors found. Please add a vendor first using the "Add
                Vendor" button.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreatePO}
            disabled={!selectedVendor || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue to Products
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
