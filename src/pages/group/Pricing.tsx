import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  Percent, 
  Search, 
  Edit2, 
  Save, 
  X, 
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Package,
  TrendingDown,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingProduct {
  product_id: string;
  product_name: string;
  groupLabel: string;
  actual_price: number;
  new_price: string;
}

interface GroupPricingData {
  id: string;
  name: string;
  status: string;
  product_arrayjson: PricingProduct[];
  group_ids: string[];
  created_at: string;
  updated_at: string;
}

interface GroupSettings {
  can_manage_pricing: boolean;
  bypass_min_price: boolean;
  commission_rate: number;
}

const GroupPricing = () => {
  const { toast } = useToast();
  const userProfile = useSelector(selectUserProfile);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricingData, setPricingData] = useState<GroupPricingData | null>(null);
  const [groupSettings, setGroupSettings] = useState<GroupSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [minPrices, setMinPrices] = useState<Record<string, number>>({});
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PricingProduct[]>([]);

  useEffect(() => {
    if (userProfile?.id) {
      fetchData();
    }
  }, [userProfile]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch group settings
      const { data: settings } = await supabase
        .from("profiles")
        .select("can_manage_pricing, bypass_min_price, commission_rate")
        .eq("id", userProfile.id)
        .single();

      setGroupSettings(settings);

      // Fetch pricing data for this group
      const { data: pricings, error } = await supabase
        .from("group_pricing")
        .select("*")
        .contains("group_ids", [userProfile.id])
        .eq("status", "active")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching pricing:", error);
      }

      setPricingData(pricings);

      // Fetch minimum prices from product_sizes if needed
      if (pricings?.product_arrayjson) {
        await fetchMinPrices(pricings.product_arrayjson);
      }
    } catch (err) {
      console.error("Error:", err);
      toast({
        title: "Error",
        description: "Failed to load pricing data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMinPrices = async (products: PricingProduct[]) => {
    try {
      const productIds = products.map(p => p.product_id);
      
      const { data: sizes } = await supabase
        .from("product_sizes")
        .select("id, price, min_price")
        .in("id", productIds);

      const minPriceMap: Record<string, number> = {};
      sizes?.forEach(size => {
        // Use min_price if available, otherwise use 50% of actual price as minimum
        minPriceMap[size.id] = size.min_price || (size.price * 0.5);
      });

      setMinPrices(minPriceMap);
    } catch (err) {
      console.error("Error fetching min prices:", err);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num || 0);
  };

  const calculateDiscount = (actual: number, newPrice: string) => {
    const newPriceNum = parseFloat(newPrice);
    if (!actual || !newPriceNum) return 0;
    return ((actual - newPriceNum) / actual * 100).toFixed(1);
  };

  const filteredProducts = pricingData?.product_arrayjson?.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.groupLabel.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const group = product.groupLabel || "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(product);
    return acc;
  }, {} as Record<string, PricingProduct[]>);

  const handleEditClick = (product: PricingProduct) => {
    if (!groupSettings?.can_manage_pricing) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit pricing. Contact admin.",
        variant: "destructive",
      });
      return;
    }
    setEditingProductId(product.product_id);
    setEditPrice(product.new_price);
  };

  const handleSavePrice = async (product: PricingProduct) => {
    const newPriceNum = parseFloat(editPrice);
    const minPrice = minPrices[product.product_id] || 0;

    // Validate price
    if (isNaN(newPriceNum) || newPriceNum <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Check minimum price (unless bypass is enabled)
    if (!groupSettings?.bypass_min_price && newPriceNum < minPrice) {
      toast({
        title: "Price Too Low",
        description: `Minimum allowed price is ${formatCurrency(minPrice)}`,
        variant: "destructive",
      });
      return;
    }

    // Update local state
    const updatedProducts = pricingData!.product_arrayjson.map(p =>
      p.product_id === product.product_id
        ? { ...p, new_price: editPrice }
        : p
    );

    setPendingChanges(updatedProducts);
    setConfirmDialog(true);
  };

  const confirmSaveChanges = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from("group_pricing")
        .update({
          product_arrayjson: pendingChanges,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pricingData!.id);

      if (error) throw error;

      setPricingData(prev => prev ? { ...prev, product_arrayjson: pendingChanges } : null);
      setEditingProductId(null);
      setEditPrice("");
      setConfirmDialog(false);

      toast({
        title: "Success",
        description: "Price updated successfully",
      });
    } catch (err: any) {
      console.error("Error saving:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save price",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setEditPrice("");
  };

  if (loading) {
    return (
      <DashboardLayout role="group">
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="group">
      <TooltipProvider>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Group Pricing</h1>
                {groupSettings?.can_manage_pricing ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Unlock className="h-3 w-3 mr-1" />
                    Editable
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Lock className="h-3 w-3 mr-1" />
                    View Only
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                {groupSettings?.can_manage_pricing 
                  ? "Manage custom pricing for your pharmacy network"
                  : "View your group's special pricing"}
              </p>
            </div>

            {groupSettings?.bypass_min_price && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertCircle className="h-3 w-3 mr-1" />
                No Minimum Price Cap
              </Badge>
            )}
          </div>

          {/* Info Alert */}
          {!groupSettings?.can_manage_pricing && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>View Only Mode</AlertTitle>
              <AlertDescription>
                Contact your administrator to enable pricing management for your group.
              </AlertDescription>
            </Alert>
          )}

          {/* No Pricing Data */}
          {!pricingData && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Custom Pricing</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Your group doesn't have custom pricing configured yet. 
                  Contact the administrator to set up special pricing for your network.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Pricing Table */}
          {pricingData && (
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {pricingData.name}
                    </CardTitle>
                    <CardDescription>
                      {pricingData.product_arrayjson?.length || 0} products with custom pricing
                    </CardDescription>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {Object.keys(groupedProducts).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No products found matching "{searchTerm}"
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedProducts).map(([groupName, products]) => (
                      <div key={groupName}>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                          {groupName}
                        </h3>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Regular Price</TableHead>
                                <TableHead className="text-right">Your Price</TableHead>
                                <TableHead className="text-right">Discount</TableHead>
                                {groupSettings?.can_manage_pricing && (
                                  <TableHead className="text-right w-[100px]">Action</TableHead>
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {products.map((product) => {
                                const isEditing = editingProductId === product.product_id;
                                const discount = calculateDiscount(product.actual_price, product.new_price);
                                const minPrice = minPrices[product.product_id] || 0;

                                return (
                                  <TableRow key={product.product_id}>
                                    <TableCell className="font-medium">
                                      {product.product_name}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                      {formatCurrency(product.actual_price)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {isEditing ? (
                                        <div className="flex items-center justify-end gap-2">
                                          <span className="text-muted-foreground">$</span>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={editPrice}
                                            onChange={(e) => setEditPrice(e.target.value)}
                                            className="w-24 text-right"
                                            autoFocus
                                          />
                                        </div>
                                      ) : (
                                        <span className="font-semibold text-green-600">
                                          {formatCurrency(product.new_price)}
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-xs",
                                          parseFloat(discount as string) > 0 
                                            ? "text-green-600 border-green-200" 
                                            : "text-red-600 border-red-200"
                                        )}
                                      >
                                        <TrendingDown className="h-3 w-3 mr-1" />
                                        {discount}%
                                      </Badge>
                                    </TableCell>
                                    {groupSettings?.can_manage_pricing && (
                                      <TableCell className="text-right">
                                        {isEditing ? (
                                          <div className="flex items-center justify-end gap-1">
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => handleSavePrice(product)}
                                                  className="h-8 w-8 p-0 text-green-600"
                                                >
                                                  <Save className="h-4 w-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Save</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={cancelEdit}
                                                  className="h-8 w-8 p-0 text-red-600"
                                                >
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Cancel</TooltipContent>
                                            </Tooltip>
                                          </div>
                                        ) : (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEditClick(product)}
                                                className="h-8 w-8 p-0"
                                              >
                                                <Edit2 className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Edit Price
                                              {!groupSettings?.bypass_min_price && minPrice > 0 && (
                                                <span className="block text-xs">
                                                  Min: {formatCurrency(minPrice)}
                                                </span>
                                              )}
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary Card */}
          {pricingData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pricing Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {pricingData.product_arrayjson?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Products</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        pricingData.product_arrayjson?.reduce(
                          (sum, p) => sum + (p.actual_price - parseFloat(p.new_price)),
                          0
                        ) || 0
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Savings</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {(
                        (pricingData.product_arrayjson?.reduce(
                          (sum, p) => sum + ((p.actual_price - parseFloat(p.new_price)) / p.actual_price * 100),
                          0
                        ) || 0) / (pricingData.product_arrayjson?.length || 1)
                      ).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Discount</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {new Date(pricingData.updated_at).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Last Updated</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Confirm Dialog */}
        <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Price Change</DialogTitle>
              <DialogDescription>
                Are you sure you want to update this price? This will affect all pharmacies in your group.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmSaveChanges} disabled={saving}>
                {saving ? "Saving..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default GroupPricing;
