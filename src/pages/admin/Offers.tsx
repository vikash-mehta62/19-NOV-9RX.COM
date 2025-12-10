import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Gift, Copy, Percent, DollarSign, Truck, Package } from "lucide-react";
import { format } from "date-fns";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  offer_type: "percentage" | "flat" | "buy_get" | "free_shipping";
  discount_value: number | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  promo_code: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  applicable_to: string;
  image_url: string | null;
  created_at: string;
}

const initialFormState = {
  title: "",
  description: "",
  offer_type: "percentage" as const,
  discount_value: 0,
  min_order_amount: 0,
  max_discount_amount: 0,
  promo_code: "",
  usage_limit: 0,
  is_active: true,
  start_date: "",
  end_date: "",
  applicable_to: "all",
  image_url: "",
};

const offerTypeIcons = {
  percentage: <Percent className="h-4 w-4" />,
  flat: <DollarSign className="h-4 w-4" />,
  buy_get: <Package className="h-4 w-4" />,
  free_shipping: <Truck className="h-4 w-4" />,
};

const offerTypeLabels = {
  percentage: "Percentage Off",
  flat: "Flat Discount",
  buy_get: "Buy X Get Y",
  free_shipping: "Free Shipping",
};

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const { toast } = useToast();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generatePromoCode = () => {
    const code = `PROMO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setFormData({ ...formData, promo_code: code });
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Promo code copied to clipboard" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        discount_value: formData.discount_value || null,
        min_order_amount: formData.min_order_amount || null,
        max_discount_amount: formData.max_discount_amount || null,
        usage_limit: formData.usage_limit || null,
        promo_code: formData.promo_code || null,
        image_url: formData.image_url || null,
      };

      if (editingOffer) {
        const { error } = await supabase
          .from("offers")
          .update(payload)
          .eq("id", editingOffer.id);
        if (error) throw error;
        toast({ title: "Success", description: "Offer updated successfully" });
      } else {
        const { error } = await supabase.from("offers").insert([payload]);
        if (error) throw error;
        toast({ title: "Success", description: "Offer created successfully" });
      }

      setDialogOpen(false);
      setEditingOffer(null);
      setFormData(initialFormState);
      fetchOffers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description || "",
      offer_type: offer.offer_type,
      discount_value: offer.discount_value || 0,
      min_order_amount: offer.min_order_amount || 0,
      max_discount_amount: offer.max_discount_amount || 0,
      promo_code: offer.promo_code || "",
      usage_limit: offer.usage_limit || 0,
      is_active: offer.is_active,
      start_date: offer.start_date.split("T")[0],
      end_date: offer.end_date.split("T")[0],
      applicable_to: offer.applicable_to,
      image_url: offer.image_url || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    try {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Offer deleted successfully" });
      fetchOffers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("offers")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      fetchOffers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isOfferExpired = (endDate: string) => new Date(endDate) < new Date();
  const isOfferUpcoming = (startDate: string) => new Date(startDate) > new Date();

  const getOfferStatus = (offer: Offer) => {
    if (!offer.is_active) return { label: "Inactive", variant: "secondary" as const };
    if (isOfferExpired(offer.end_date)) return { label: "Expired", variant: "destructive" as const };
    if (isOfferUpcoming(offer.start_date)) return { label: "Upcoming", variant: "outline" as const };
    return { label: "Active", variant: "default" as const };
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Offers & Promotions</h1>
            <p className="text-muted-foreground">Manage discounts, promo codes, and special offers</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingOffer(null); setFormData(initialFormState); }}>
                <Plus className="mr-2 h-4 w-4" /> Create Offer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingOffer ? "Edit Offer" : "Create New Offer"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="title">Offer Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Summer Sale - 20% Off"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Get 20% off on all pharmacy supplies..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="offer_type">Offer Type *</Label>
                    <Select
                      value={formData.offer_type}
                      onValueChange={(value: any) => setFormData({ ...formData, offer_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage Off (%)</SelectItem>
                        <SelectItem value="flat">Flat Discount ($)</SelectItem>
                        <SelectItem value="buy_get">Buy X Get Y</SelectItem>
                        <SelectItem value="free_shipping">Free Shipping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="discount_value">
                      {formData.offer_type === "percentage" ? "Discount %" : "Discount Amount ($)"}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_order_amount">Min Order Amount ($)</Label>
                    <Input
                      id="min_order_amount"
                      type="number"
                      value={formData.min_order_amount}
                      onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_discount_amount">Max Discount ($)</Label>
                    <Input
                      id="max_discount_amount"
                      type="number"
                      value={formData.max_discount_amount}
                      onChange={(e) => setFormData({ ...formData, max_discount_amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="promo_code">Promo Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="promo_code"
                        value={formData.promo_code}
                        onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                        placeholder="SUMMER20"
                      />
                      <Button type="button" variant="outline" onClick={generatePromoCode}>
                        Generate
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="usage_limit">Usage Limit (0 = unlimited)</Label>
                    <Input
                      id="usage_limit"
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="applicable_to">Applicable To</Label>
                    <Select
                      value={formData.applicable_to}
                      onValueChange={(value) => setFormData({ ...formData, applicable_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="category">Specific Category</SelectItem>
                        <SelectItem value="product">Specific Products</SelectItem>
                        <SelectItem value="user_group">User Groups</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="image_url">Offer Image URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/offer-banner.jpg"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingOffer ? "Update" : "Create"} Offer</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{offers.length}</div>
              <p className="text-muted-foreground">Total Offers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {offers.filter(o => o.is_active && !isOfferExpired(o.end_date) && !isOfferUpcoming(o.start_date)).length}
              </div>
              <p className="text-muted-foreground">Active Now</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {offers.filter(o => isOfferUpcoming(o.start_date)).length}
              </div>
              <p className="text-muted-foreground">Upcoming</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-400">
                {offers.filter(o => isOfferExpired(o.end_date)).length}
              </div>
              <p className="text-muted-foreground">Expired</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" /> All Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : offers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No offers found. Create your first offer!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Promo Code</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => {
                    const status = getOfferStatus(offer);
                    return (
                      <TableRow key={offer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{offer.title}</p>
                            {offer.discount_value && (
                              <p className="text-sm text-muted-foreground">
                                {offer.offer_type === "percentage"
                                  ? `${offer.discount_value}% off`
                                  : `$${offer.discount_value} off`}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {offerTypeIcons[offer.offer_type]}
                            <span className="text-sm">{offerTypeLabels[offer.offer_type]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {offer.promo_code ? (
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded text-sm">
                                {offer.promo_code}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyPromoCode(offer.promo_code!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {offer.usage_limit ? (
                            <span>{offer.used_count}/{offer.usage_limit}</span>
                          ) : (
                            <span>{offer.used_count}/∞</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(offer.start_date), "MMM d")} -{" "}
                            {format(new Date(offer.end_date), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(offer)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(offer.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
