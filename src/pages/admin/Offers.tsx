import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
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
import {
  Plus, Pencil, Trash2, Gift, Copy, Percent, DollarSign, Truck, Package,
  Sparkles, Clock, TrendingUp, Users, ShoppingCart, Zap, Calendar,
  RefreshCw, Eye, BarChart3, Tag, CheckCircle2, XCircle, AlertCircle,
  Link, Unlink, Search, Flame, Settings, Power, PowerOff
} from "lucide-react";
import { format } from "date-fns";

// Daily Deals Types
interface DailyDeal {
  id: string;
  product_id: string;
  discount_percent: number;
  badge_type: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  display_order: number;
  products?: {
    id: string;
    name: string;
    base_price: number;
    image_url: string | null;
  };
}

interface DailyDealsSettings {
  id: string;
  is_enabled: boolean;
  section_title: string;
  section_subtitle: string;
  countdown_enabled: boolean;
  max_products: number;
}


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
  applicable_ids: string[] | null;
  user_groups: string[] | null;
  image_url: string | null;
  created_at: string;
  total_discount_given: number;
  total_orders: number;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
  image_url: string | null;
  offer_id: string | null;
}

interface ProductOffer {
  id: string;
  product_id: string;
  offer_id: string;
  offer_price: number | null;
  is_active: boolean;
  products?: { name: string; price: number; sku: string };
}

// Quick offer templates
const offerTemplates = [
  {
    id: "welcome10",
    name: "Welcome 10%",
    icon: Gift,
    color: "bg-green-500",
    description: "10% off for new customers",
    offer_type: "percentage" as const,
    discount_value: 10,
    promo_code: "WELCOME10",
  },
  {
    id: "flash20",
    name: "Flash Sale 20%",
    icon: Zap,
    color: "bg-red-500",
    description: "Limited time 20% discount",
    offer_type: "percentage" as const,
    discount_value: 20,
    promo_code: "FLASH20",
  },
  {
    id: "flat10",
    name: "$10 Off",
    icon: DollarSign,
    color: "bg-blue-500",
    description: "Flat $10 off on orders above $50",
    offer_type: "flat" as const,
    discount_value: 10,
    min_order_amount: 50,
    promo_code: "FLAT10",
  },
  {
    id: "freeship",
    name: "Free Shipping",
    icon: Truck,
    color: "bg-purple-500",
    description: "Free delivery on all orders",
    offer_type: "free_shipping" as const,
    discount_value: 0,
    promo_code: "FREESHIP",
  },
  {
    id: "bulk15",
    name: "Bulk Order 15%",
    icon: Package,
    color: "bg-orange-500",
    description: "15% off on orders above $200",
    offer_type: "percentage" as const,
    discount_value: 15,
    min_order_amount: 200,
    promo_code: "BULK15",
  },
  {
    id: "seasonal",
    name: "Seasonal Sale",
    icon: Calendar,
    color: "bg-pink-500",
    description: "Special seasonal discount",
    offer_type: "percentage" as const,
    discount_value: 25,
    promo_code: "SEASON25",
  },
];

const offerTypeConfig = {
  percentage: { icon: Percent, label: "Percentage Off", color: "text-green-600" },
  flat: { icon: DollarSign, label: "Flat Discount", color: "text-blue-600" },
  buy_get: { icon: Package, label: "Buy X Get Y", color: "text-purple-600" },
  free_shipping: { icon: Truck, label: "Free Shipping", color: "text-orange-600" },
};

const applicableOptions = [
  { value: "all", label: "All Products" },
  { value: "category", label: "Specific Categories" },
  { value: "product", label: "Specific Products" },
  { value: "first_order", label: "First Order Only" },
  { value: "user_group", label: "Specific User Groups" },
];

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
  applicable_ids: [] as string[],
  user_groups: [] as string[],
  image_url: "",
};


export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productOffers, setProductOffers] = useState<ProductOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  // Daily Deals State
  const [dailyDeals, setDailyDeals] = useState<DailyDeal[]>([]);
  const [dealsSettings, setDealsSettings] = useState<DailyDealsSettings | null>(null);
  const [dealsDialogOpen, setDealsDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DailyDeal | null>(null);
  const [dealFormData, setDealFormData] = useState({
    product_id: "",
    discount_percent: 10,
    badge_type: "HOT DEAL",
    is_active: true,
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });
  const [dealProductSearch, setDealProductSearch] = useState("");
  const [mainTab, setMainTab] = useState("offers");

  useEffect(() => {
    fetchOffers();
    fetchCategories();
    fetchProducts();
    fetchDailyDeals();
    fetchDealsSettings();
  }, []);

  // Daily Deals Functions
  const fetchDailyDeals = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_deals")
        .select(`
          *,
          products (id, name, base_price, image_url)
        `)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setDailyDeals(data || []);
    } catch (error: any) {
      console.error("Error fetching daily deals:", error);
    }
  };

  const fetchDealsSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_deals_settings")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setDealsSettings(data);
      } else {
        // Create default settings if none exist
        const { data: newSettings, error: insertError } = await supabase
          .from("daily_deals_settings")
          .insert({
            is_enabled: true,
            section_title: "Deals of the Day",
            section_subtitle: "Limited time offers - Don't miss out!",
            countdown_enabled: true,
            max_products: 6
          })
          .select()
          .single();
        
        if (!insertError && newSettings) {
          setDealsSettings(newSettings);
        }
      }
    } catch (error: any) {
      console.error("Error fetching deals settings:", error);
    }
  };

  const toggleDealsSection = async () => {
    if (!dealsSettings) return;
    try {
      const { error } = await supabase
        .from("daily_deals_settings")
        .update({ is_enabled: !dealsSettings.is_enabled })
        .eq("id", dealsSettings.id);

      if (error) throw error;
      
      setDealsSettings({ ...dealsSettings, is_enabled: !dealsSettings.is_enabled });
      toast({
        title: dealsSettings.is_enabled ? "Deals Section Disabled" : "Deals Section Enabled",
        description: dealsSettings.is_enabled 
          ? "The Deals of the Day section is now hidden from customers" 
          : "The Deals of the Day section is now visible to customers",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateDealsSettings = async (updates: Partial<DailyDealsSettings>) => {
    if (!dealsSettings) return;
    try {
      const { error } = await supabase
        .from("daily_deals_settings")
        .update(updates)
        .eq("id", dealsSettings.id);

      if (error) throw error;
      setDealsSettings({ ...dealsSettings, ...updates });
      toast({ title: "Settings Updated", description: "Deals section settings have been saved" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        product_id: dealFormData.product_id,
        discount_percent: dealFormData.discount_percent,
        badge_type: dealFormData.badge_type,
        is_active: dealFormData.is_active,
        start_date: dealFormData.start_date,
        end_date: dealFormData.end_date,
      };

      if (editingDeal) {
        const { error } = await supabase
          .from("daily_deals")
          .update(payload)
          .eq("id", editingDeal.id);
        if (error) throw error;
        toast({ title: "Success", description: "Deal updated successfully" });
      } else {
        const { error } = await supabase.from("daily_deals").insert([payload]);
        if (error) throw error;
        toast({ title: "Success", description: "Deal added successfully" });
      }

      setDealsDialogOpen(false);
      setEditingDeal(null);
      setDealFormData({
        product_id: "",
        discount_percent: 10,
        badge_type: "HOT DEAL",
        is_active: true,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
      fetchDailyDeals();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditDeal = (deal: DailyDeal) => {
    setEditingDeal(deal);
    setDealFormData({
      product_id: deal.product_id,
      discount_percent: deal.discount_percent,
      badge_type: deal.badge_type,
      is_active: deal.is_active,
      start_date: deal.start_date.split("T")[0],
      end_date: deal.end_date.split("T")[0],
    });
    setDealsDialogOpen(true);
  };

  const handleDeleteDeal = async (id: string) => {
    if (!confirm("Are you sure you want to remove this deal?")) return;
    try {
      const { error } = await supabase.from("daily_deals").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Deal removed successfully" });
      fetchDailyDeals();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleDealActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("daily_deals")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      fetchDailyDeals();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredDealProducts = products.filter(p => 
    dealProductSearch === "" ||
    p.name.toLowerCase().includes(dealProductSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(dealProductSearch.toLowerCase())
  ).filter(p => !dailyDeals.some(d => d.product_id === p.id) || editingDeal?.product_id === p.id)
  .slice(0, 20);

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

  const fetchCategories = async () => {
    try {
      // Use category_configs table instead of categories
      const { data, error } = await supabase
        .from("category_configs")
        .select("id, category_name")
        .order("category_name");
      
      if (error) {
        console.error("Error fetching categories:", error);
        return;
      }
      // Map to expected format
      setCategories((data || []).map(c => ({ id: c.id, name: c.category_name })));
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("id, name, base_price, sku, image_url, offer_id")
        .order("name");
      // Map base_price to price for compatibility
      setProducts((data || []).map(p => ({ ...p, price: p.base_price })));
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchProductOffers = async (offerId: string) => {
    try {
      const { data } = await supabase
        .from("product_offers")
        .select(`
          *,
          products (name, price, sku)
        `)
        .eq("offer_id", offerId);
      setProductOffers(data || []);
    } catch (error) {
      console.error("Error fetching product offers:", error);
    }
  };

  const handleOpenProductDialog = (offer: Offer) => {
    setSelectedOffer(offer);
    setSelectedProducts([]);
    setProductSearch("");
    fetchProductOffers(offer.id);
    setProductDialogOpen(true);
  };

  const handleAssignProducts = async () => {
    if (!selectedOffer || selectedProducts.length === 0) return;

    try {
      const records = selectedProducts.map(productId => ({
        product_id: productId,
        offer_id: selectedOffer.id,
        is_active: true,
      }));

      const { error } = await supabase
        .from("product_offers")
        .upsert(records, { onConflict: "product_id,offer_id" });

      if (error) throw error;

      toast({ title: "Success", description: `${selectedProducts.length} products assigned to offer` });
      fetchProductOffers(selectedOffer.id);
      setSelectedProducts([]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveProductOffer = async (productOfferId: string) => {
    try {
      const { error } = await supabase
        .from("product_offers")
        .delete()
        .eq("id", productOfferId);

      if (error) throw error;

      toast({ title: "Success", description: "Product removed from offer" });
      if (selectedOffer) {
        fetchProductOffers(selectedOffer.id);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 20);

  const generatePromoCode = () => {
    const prefixes = ["SAVE", "DEAL", "OFFER", "PROMO", "DISC"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const code = `${prefix}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setFormData({ ...formData, promo_code: code });
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Promo code copied to clipboard" });
  };

  const handleQuickTemplate = (template: typeof offerTemplates[0]) => {
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    setFormData({
      ...initialFormState,
      title: template.name,
      description: template.description,
      offer_type: template.offer_type,
      discount_value: template.discount_value || 0,
      min_order_amount: template.min_order_amount || 0,
      promo_code: template.promo_code,
      start_date: today.toISOString().split("T")[0],
      end_date: nextMonth.toISOString().split("T")[0],
    });
    setEditingOffer(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        offer_type: formData.offer_type,
        discount_value: formData.discount_value || null,
        min_order_amount: formData.min_order_amount || null,
        max_discount_amount: formData.max_discount_amount || null,
        promo_code: formData.promo_code || null,
        usage_limit: formData.usage_limit || null,
        is_active: formData.is_active,
        start_date: formData.start_date,
        end_date: formData.end_date,
        applicable_to: formData.applicable_to,
        applicable_ids: formData.applicable_ids.length > 0 ? formData.applicable_ids : null,
        user_groups: formData.user_groups.length > 0 ? formData.user_groups : null,
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
      applicable_ids: offer.applicable_ids || [],
      user_groups: offer.user_groups || [],
      image_url: offer.image_url || "",
    });
    setDialogOpen(true);
  };

  const handleDuplicate = async (offer: Offer) => {
    try {
      const { error } = await supabase.from("offers").insert([{
        title: `${offer.title} (Copy)`,
        description: offer.description,
        offer_type: offer.offer_type,
        discount_value: offer.discount_value,
        min_order_amount: offer.min_order_amount,
        max_discount_amount: offer.max_discount_amount,
        promo_code: offer.promo_code ? `${offer.promo_code}_COPY` : null,
        usage_limit: offer.usage_limit,
        is_active: false,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        applicable_to: offer.applicable_to,
        applicable_ids: offer.applicable_ids,
        user_groups: offer.user_groups,
        image_url: offer.image_url,
      }]);
      if (error) throw error;
      toast({ title: "Success", description: "Offer duplicated" });
      fetchOffers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
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
      toast({
        title: currentStatus ? "Offer Deactivated" : "Offer Activated",
        description: currentStatus ? "Offer is now inactive" : "Offer is now live",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isOfferExpired = (endDate: string) => new Date(endDate) < new Date();
  const isOfferUpcoming = (startDate: string) => new Date(startDate) > new Date();

  const getOfferStatus = (offer: Offer) => {
    if (!offer.is_active) return { label: "Inactive", color: "bg-gray-100 text-gray-800", icon: XCircle };
    if (isOfferExpired(offer.end_date)) return { label: "Expired", color: "bg-red-100 text-red-800", icon: AlertCircle };
    if (isOfferUpcoming(offer.start_date)) return { label: "Upcoming", color: "bg-blue-100 text-blue-800", icon: Clock };
    return { label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle2 };
  };

  const getUsagePercentage = (offer: Offer) => {
    if (!offer.usage_limit) return 0;
    return Math.min((offer.used_count / offer.usage_limit) * 100, 100);
  };

  const filteredOffers = offers.filter(o => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return o.is_active && !isOfferExpired(o.end_date) && !isOfferUpcoming(o.start_date);
    if (activeTab === "upcoming") return isOfferUpcoming(o.start_date);
    if (activeTab === "expired") return isOfferExpired(o.end_date);
    return true;
  });

  const stats = {
    total: offers.length,
    active: offers.filter(o => o.is_active && !isOfferExpired(o.end_date) && !isOfferUpcoming(o.start_date)).length,
    upcoming: offers.filter(o => isOfferUpcoming(o.start_date)).length,
    expired: offers.filter(o => isOfferExpired(o.end_date)).length,
    totalUsed: offers.reduce((sum, o) => sum + (o.used_count || 0), 0),
    totalDiscount: offers.reduce((sum, o) => sum + (o.total_discount_given || 0), 0),
  };


  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Offers & Promotions</h1>
            <p className="text-muted-foreground">Manage discounts, promo codes, and daily deals</p>
          </div>
        </div>

        {/* Main Tabs - Offers vs Deals of the Day */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="offers" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Offers & Promos
            </TabsTrigger>
            <TabsTrigger value="deals" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Deals of the Day
            </TabsTrigger>
          </TabsList>

          {/* OFFERS TAB */}
          <TabsContent value="offers" className="space-y-6 mt-6">
            {/* Create Offer Button */}
            <div className="flex justify-end">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingOffer(null); setFormData(initialFormState); }}>
                    <Plus className="mr-2 h-4 w-4" /> Create Offer
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingOffer ? "Edit Offer" : "Create New Offer"}</DialogTitle>
                <DialogDescription>
                  {editingOffer ? "Update your offer details" : "Set up a new discount or promotion"}
                </DialogDescription>
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
                      rows={2}
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
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                      disabled={formData.offer_type === "free_shipping"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_order_amount">Min Order Amount ($)</Label>
                    <Input
                      id="min_order_amount"
                      type="number"
                      step="0.01"
                      value={formData.min_order_amount}
                      onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">0 = No minimum</p>
                  </div>
                  <div>
                    <Label htmlFor="max_discount_amount">Max Discount ($)</Label>
                    <Input
                      id="max_discount_amount"
                      type="number"
                      step="0.01"
                      value={formData.max_discount_amount}
                      onChange={(e) => setFormData({ ...formData, max_discount_amount: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">0 = No cap</p>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="promo_code">Promo Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="promo_code"
                        value={formData.promo_code}
                        onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                        placeholder="SUMMER20"
                        className="font-mono"
                      />
                      <Button type="button" variant="outline" onClick={generatePromoCode}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Generate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Leave empty for auto-apply offers</p>
                  </div>
                  <div>
                    <Label htmlFor="usage_limit">Usage Limit</Label>
                    <Input
                      id="usage_limit"
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">0 = Unlimited</p>
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
                        {applicableOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.applicable_to === "category" && (
                    <div className="col-span-2">
                      <Label>Select Categories</Label>
                      <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
                        {categories.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No categories found. Please add categories first.</p>
                        ) : (
                          categories.map((cat) => (
                            <Badge
                              key={cat.id}
                              variant={formData.applicable_ids.includes(cat.id) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                const ids = formData.applicable_ids.includes(cat.id)
                                  ? formData.applicable_ids.filter(id => id !== cat.id)
                                  : [...formData.applicable_ids, cat.id];
                                setFormData({ ...formData, applicable_ids: ids });
                              }}
                            >
                              {cat.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {formData.applicable_to === "product" && (
                    <div className="col-span-2">
                      <Label>Select Products</Label>
                      <div className="space-y-2 mt-2">
                        <Input
                          placeholder="Search products by name or SKU..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-40 overflow-y-auto">
                          {products.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No products found.</p>
                          ) : (
                            products
                              .filter(p => 
                                productSearch === "" || 
                                p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                                p.sku.toLowerCase().includes(productSearch.toLowerCase())
                              )
                              .slice(0, 30)
                              .map((product) => (
                                <Badge
                                  key={product.id}
                                  variant={formData.applicable_ids.includes(product.id) ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    const ids = formData.applicable_ids.includes(product.id)
                                      ? formData.applicable_ids.filter(id => id !== product.id)
                                      : [...formData.applicable_ids, product.id];
                                    setFormData({ ...formData, applicable_ids: ids });
                                  }}
                                >
                                  {product.name} (${product.price})
                                </Badge>
                              ))
                          )}
                        </div>
                        {formData.applicable_ids.length > 0 && (
                          <p className="text-xs text-muted-foreground">{formData.applicable_ids.length} products selected</p>
                        )}
                      </div>
                    </div>
                  )}

                  {formData.applicable_to === "user_group" && (
                    <div className="col-span-2">
                      <Label>Select User Groups</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {["Pharmacy", "Group", "Hospital", "New Users", "VIP"].map((group) => (
                          <Badge
                            key={group}
                            variant={formData.user_groups.includes(group) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const groups = formData.user_groups.includes(group)
                                ? formData.user_groups.filter(g => g !== group)
                                : [...formData.user_groups, group];
                              setFormData({ ...formData, user_groups: groups });
                            }}
                          >
                            {group}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

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
                    <Label htmlFor="image_url">Offer Banner Image URL</Label>
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
                    <Label htmlFor="is_active">Active immediately</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingOffer ? "Update" : "Create"} Offer</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>


        {/* Quick Templates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Quick Start Templates
            </CardTitle>
            <CardDescription>Create common offers in seconds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {offerTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleQuickTemplate(template)}
                    className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className={`w-10 h-10 rounded-lg ${template.color} flex items-center justify-center mb-3`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-medium text-sm group-hover:text-primary">{template.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Offers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Active Now</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-400">{stats.expired}</div>
              <p className="text-xs text-muted-foreground">Expired</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats.totalUsed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Times Used</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">${stats.totalDiscount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total Discounts</p>
            </CardContent>
          </Card>
        </div>

        {/* Offers Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" /> All Offers
              </CardTitle>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="expired">Expired</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading offers...</p>
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No offers found</h3>
                <p className="text-muted-foreground mt-1">
                  {activeTab === "all" ? "Create your first offer to get started!" : `No ${activeTab} offers`}
                </p>
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Offer
                </Button>
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.map((offer) => {
                    const status = getOfferStatus(offer);
                    const StatusIcon = status.icon;
                    const typeConfig = offerTypeConfig[offer.offer_type];
                    const TypeIcon = typeConfig.icon;
                    const usagePercent = getUsagePercentage(offer);

                    return (
                      <TableRow key={offer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{offer.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {offer.offer_type === "percentage" && `${offer.discount_value}% off`}
                              {offer.offer_type === "flat" && `$${offer.discount_value} off`}
                              {offer.offer_type === "free_shipping" && "Free delivery"}
                              {offer.offer_type === "buy_get" && "Buy X Get Y"}
                              {offer.min_order_amount ? ` (Min $${offer.min_order_amount})` : ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-2 ${typeConfig.color}`}>
                            <TypeIcon className="h-4 w-4" />
                            <span className="text-sm">{typeConfig.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {offer.promo_code ? (
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
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
                            <Badge variant="outline">Auto-apply</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className="text-sm">
                              {offer.used_count}/{offer.usage_limit || "∞"}
                            </span>
                            {offer.usage_limit && (
                              <Progress value={usagePercent} className="h-1 w-16" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(offer.start_date), "MMM d")} - {format(new Date(offer.end_date), "MMM d")}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(offer.end_date), "yyyy")}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <button onClick={() => toggleActive(offer.id, offer.is_active)}>
                            <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${status.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleOpenProductDialog(offer)} 
                              title="Assign to Products"
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDuplicate(offer)} title="Duplicate">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(offer)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(offer.id)} title="Delete">
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
        {/* Product Assignment Dialog */}
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Assign Products to Offer
              </DialogTitle>
              <DialogDescription>
                {selectedOffer && (
                  <span>
                    Assign products to <strong>"{selectedOffer.title}"</strong> - 
                    {selectedOffer.offer_type === "percentage" && ` ${selectedOffer.discount_value}% off`}
                    {selectedOffer.offer_type === "flat" && ` $${selectedOffer.discount_value} off`}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search and Add Products */}
              <div className="space-y-3">
                <Label>Search Products</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button 
                    onClick={handleAssignProducts} 
                    disabled={selectedProducts.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add ({selectedProducts.length})
                  </Button>
                </div>

                {/* Product Selection */}
                {productSearch && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="p-4 text-center text-muted-foreground">No products found</p>
                    ) : (
                      filteredProducts.map((product) => {
                        const isAssigned = productOffers.some(po => po.product_id === product.id);
                        const isSelected = selectedProducts.includes(product.id);
                        
                        return (
                          <div
                            key={product.id}
                            className={`flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                              isSelected ? "bg-primary/10" : ""
                            } ${isAssigned ? "opacity-50" : ""}`}
                            onClick={() => {
                              if (isAssigned) return;
                              setSelectedProducts(prev => 
                                prev.includes(product.id)
                                  ? prev.filter(id => id !== product.id)
                                  : [...prev, product.id]
                              );
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isAssigned}
                                onChange={() => {}}
                                className="h-4 w-4"
                              />
                              <div>
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${product.price.toFixed(2)}</p>
                              {isAssigned && <Badge variant="secondary" className="text-xs">Assigned</Badge>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Currently Assigned Products */}
              <div className="space-y-3">
                <Label>Assigned Products ({productOffers.length})</Label>
                {productOffers.length === 0 ? (
                  <div className="border rounded-lg p-8 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No products assigned to this offer yet</p>
                    <p className="text-sm">Search and add products above</p>
                  </div>
                ) : (
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {productOffers.map((po) => (
                      <div key={po.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-medium text-sm">{po.products?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {po.products?.sku} • Original: ${po.products?.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedOffer && (
                            <Badge variant="outline" className="text-green-600">
                              {selectedOffer.offer_type === "percentage" && 
                                `$${((po.products?.price || 0) * (1 - (selectedOffer.discount_value || 0) / 100)).toFixed(2)}`
                              }
                              {selectedOffer.offer_type === "flat" && 
                                `$${Math.max((po.products?.price || 0) - (selectedOffer.discount_value || 0), 0).toFixed(2)}`
                              }
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProductOffer(po.id)}
                          >
                            <Unlink className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
          </TabsContent>

          {/* DEALS OF THE DAY TAB */}
          <TabsContent value="deals" className="space-y-6 mt-6">
            {/* Deals Settings Card */}
            <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2 rounded-lg">
                      <Flame className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Deals of the Day Section</CardTitle>
                      <CardDescription>
                        {dealsSettings?.is_enabled 
                          ? "This section is visible to customers on the pharmacy page" 
                          : "This section is currently hidden from customers"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {dealsSettings?.is_enabled ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <Power className="h-3 w-3 mr-1" /> Enabled
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                          <PowerOff className="h-3 w-3 mr-1" /> Disabled
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant={dealsSettings?.is_enabled ? "destructive" : "default"}
                      onClick={toggleDealsSection}
                    >
                      {dealsSettings?.is_enabled ? (
                        <>
                          <PowerOff className="h-4 w-4 mr-2" /> Disable Section
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-2" /> Enable Section
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {dealsSettings?.is_enabled && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label htmlFor="section_title">Section Title</Label>
                      <Input
                        id="section_title"
                        value={dealsSettings?.section_title || ""}
                        onChange={(e) => setDealsSettings(prev => prev ? {...prev, section_title: e.target.value} : null)}
                        onBlur={() => dealsSettings && updateDealsSettings({ section_title: dealsSettings.section_title })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="section_subtitle">Subtitle</Label>
                      <Input
                        id="section_subtitle"
                        value={dealsSettings?.section_subtitle || ""}
                        onChange={(e) => setDealsSettings(prev => prev ? {...prev, section_subtitle: e.target.value} : null)}
                        onBlur={() => dealsSettings && updateDealsSettings({ section_subtitle: dealsSettings.section_subtitle })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_products">Max Products to Show</Label>
                      <Input
                        id="max_products"
                        type="number"
                        min={1}
                        max={12}
                        value={dealsSettings?.max_products || 6}
                        onChange={(e) => setDealsSettings(prev => prev ? {...prev, max_products: parseInt(e.target.value) || 6} : null)}
                        onBlur={() => dealsSettings && updateDealsSettings({ max_products: dealsSettings.max_products })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Switch
                      id="countdown_enabled"
                      checked={dealsSettings?.countdown_enabled || false}
                      onCheckedChange={(checked) => {
                        setDealsSettings(prev => prev ? {...prev, countdown_enabled: checked} : null);
                        updateDealsSettings({ countdown_enabled: checked });
                      }}
                    />
                    <Label htmlFor="countdown_enabled">Show countdown timer</Label>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Add Deal Button */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Deal Products ({dailyDeals.length})</h3>
                <p className="text-sm text-muted-foreground">Products currently in the Deals of the Day section</p>
              </div>
              <Dialog open={dealsDialogOpen} onOpenChange={setDealsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { 
                    setEditingDeal(null); 
                    setDealFormData({
                      product_id: "",
                      discount_percent: 10,
                      badge_type: "HOT DEAL",
                      is_active: true,
                      start_date: new Date().toISOString().split("T")[0],
                      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    });
                    setDealProductSearch("");
                  }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Deal Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingDeal ? "Edit Deal" : "Add Product to Deals"}</DialogTitle>
                    <DialogDescription>
                      {editingDeal ? "Update the deal settings" : "Select a product and set the discount"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleDealSubmit} className="space-y-4">
                    {/* Product Selection */}
                    <div>
                      <Label>Select Product *</Label>
                      <Input
                        placeholder="Search products..."
                        value={dealProductSearch}
                        onChange={(e) => setDealProductSearch(e.target.value)}
                        className="mb-2"
                      />
                      {dealProductSearch && (
                        <div className="border rounded-lg max-h-40 overflow-y-auto">
                          {filteredDealProducts.length === 0 ? (
                            <p className="p-3 text-center text-muted-foreground text-sm">No products found</p>
                          ) : (
                            filteredDealProducts.map((product) => (
                              <div
                                key={product.id}
                                className={`flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                                  dealFormData.product_id === product.id ? "bg-primary/10" : ""
                                }`}
                                onClick={() => {
                                  setDealFormData({ ...dealFormData, product_id: product.id });
                                  setDealProductSearch("");
                                }}
                              >
                                <div>
                                  <p className="font-medium text-sm">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                                </div>
                                <p className="font-medium">${product.price.toFixed(2)}</p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                      {dealFormData.product_id && (
                        <div className="mt-2 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">
                            Selected: {products.find(p => p.id === dealFormData.product_id)?.name}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Discount Percent */}
                    <div>
                      <Label htmlFor="discount_percent">Discount Percentage *</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="discount_percent"
                          type="number"
                          min={1}
                          max={90}
                          value={dealFormData.discount_percent}
                          onChange={(e) => setDealFormData({ ...dealFormData, discount_percent: parseInt(e.target.value) || 10 })}
                          required
                        />
                        <span className="text-lg font-bold text-muted-foreground">%</span>
                      </div>
                      {dealFormData.product_id && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Deal Price: ${((products.find(p => p.id === dealFormData.product_id)?.price || 0) * (1 - dealFormData.discount_percent / 100)).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Badge Type */}
                    <div>
                      <Label htmlFor="badge_type">Badge Type</Label>
                      <Select
                        value={dealFormData.badge_type}
                        onValueChange={(value) => setDealFormData({ ...dealFormData, badge_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOT DEAL">🔥 HOT DEAL</SelectItem>
                          <SelectItem value="BEST SELLER">⭐ BEST SELLER</SelectItem>
                          <SelectItem value="LIMITED">⏰ LIMITED</SelectItem>
                          <SelectItem value="FLASH SALE">⚡ FLASH SALE</SelectItem>
                          <SelectItem value="CLEARANCE">🏷️ CLEARANCE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="deal_start_date">Start Date</Label>
                        <Input
                          id="deal_start_date"
                          type="date"
                          value={dealFormData.start_date}
                          onChange={(e) => setDealFormData({ ...dealFormData, start_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="deal_end_date">End Date</Label>
                        <Input
                          id="deal_end_date"
                          type="date"
                          value={dealFormData.end_date}
                          onChange={(e) => setDealFormData({ ...dealFormData, end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center gap-2">
                      <Switch
                        id="deal_is_active"
                        checked={dealFormData.is_active}
                        onCheckedChange={(checked) => setDealFormData({ ...dealFormData, is_active: checked })}
                      />
                      <Label htmlFor="deal_is_active">Active immediately</Label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setDealsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={!dealFormData.product_id}>
                        {editingDeal ? "Update" : "Add"} Deal
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Deals Table */}
            <Card>
              <CardContent className="pt-6">
                {dailyDeals.length === 0 ? (
                  <div className="text-center py-12">
                    <Flame className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No deals added yet</h3>
                    <p className="text-muted-foreground mt-1">Add products to show in the Deals of the Day section</p>
                    <Button className="mt-4" onClick={() => setDealsDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Add First Deal
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Original Price</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Deal Price</TableHead>
                        <TableHead>Badge</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyDeals.map((deal) => {
                        const originalPrice = deal.products?.base_price || 0;
                        const dealPrice = originalPrice * (1 - deal.discount_percent / 100);
                        const isExpired = new Date(deal.end_date) < new Date();
                        const isUpcoming = new Date(deal.start_date) > new Date();

                        return (
                          <TableRow key={deal.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {deal.products?.image_url && (
                                  <img 
                                    src={deal.products.image_url} 
                                    alt={deal.products?.name}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                )}
                                <span className="font-medium">{deal.products?.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>${originalPrice.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">-{deal.discount_percent}%</Badge>
                            </TableCell>
                            <TableCell className="font-bold text-green-600">${dealPrice.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{deal.badge_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{format(new Date(deal.start_date), "MMM d")} - {format(new Date(deal.end_date), "MMM d")}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <button onClick={() => toggleDealActive(deal.id, deal.is_active)}>
                                {!deal.is_active ? (
                                  <Badge variant="secondary">Inactive</Badge>
                                ) : isExpired ? (
                                  <Badge variant="destructive">Expired</Badge>
                                ) : isUpcoming ? (
                                  <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>
                                ) : (
                                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEditDeal(deal)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteDeal(deal.id)}>
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
