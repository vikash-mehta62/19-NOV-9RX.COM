import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Check, ChevronsUpDown,
  Plus, Pencil, Trash2, Gift, Copy, Percent, DollarSign, Truck, Package,
  Sparkles, Clock, TrendingUp, Users, ShoppingCart, Zap, Calendar,
  RefreshCw, Eye, BarChart3, Tag, CheckCircle2, XCircle, AlertCircle,
  Link, Unlink, Search, Flame, Settings, Power, PowerOff, X
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
  offer_id?: string | null; // Link to auto-created offer
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
  category?: string | null;
  subcategory?: string | null;
  sku: string | null;
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

interface ProductPriceSize {
  price: number | null;
}

interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  base_price: number | null;
  sku: string | null;
  image_url: string | null;
  offer_id: string | null;
  product_sizes?: ProductPriceSize[] | null;
}

interface ProductSizeOption {
  id: string;
  product_id: string;
  size_name: string | null;
  size_value: string | null;
  size_unit: string | null;
  sku: string | null;
  price: number | null;
  is_active?: boolean | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    unitToggle?: boolean | null;
  } | null;
}

interface DailyDealProductRow {
  id: string;
  name: string;
  base_price: number | null;
  image_url: string | null;
  product_sizes?: ProductPriceSize[] | null;
}

interface DailyDealRow extends Omit<DailyDeal, "products"> {
  products?: DailyDealProductRow | null;
}

interface ProductOfferRow extends Omit<ProductOffer, "products"> {
  products?: {
    name: string;
    base_price: number | null;
    sku: string | null;
    product_sizes?: ProductPriceSize[] | null;
  } | null;
}

const getDisplayPrice = (
  basePrice?: number | null,
  sizes?: ProductPriceSize[] | null
) => {
  const sizePrices = (sizes || [])
    .map((size) => Number(size.price) || 0)
    .filter((price) => price > 0);

  if (sizePrices.length > 0) {
    return Math.min(...sizePrices);
  }

  return Number(basePrice) || 0;
};

const getProductImageUrl = (image?: string | null) => {
  const basePath = "https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/";

  if (!image) {
    return "/placeholder.svg";
  }

  if (image.startsWith("http")) {
    return image;
  }

  return `${basePath}${image}`;
};

const matchesProductSearch = (
  product: Pick<Product, "name" | "sku">,
  searchTerm: string
) => {
  const query = searchTerm.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return (
    product.name.toLowerCase().includes(query) ||
    (product.sku || "").toLowerCase().includes(query)
  );
};

const matchesSizeSearch = (
  size: ProductSizeOption,
  searchTerm: string
) => {
  const query = searchTerm.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const haystack = [
    size.size_name,
    size.size_value,
    size.product?.unitToggle ? size.size_unit : null,
    size.sku,
    size.product?.sku,
    size.product?.name,
    getSizeOptionLabel(size),
  ]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
};

const getSizeOptionLabel = (size: ProductSizeOption) => {
  const parts = [
    size.size_name,
    size.size_value,
    size.product?.unitToggle ? size.size_unit : null,
  ]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .map((part) => part!.trim());

  return parts.join(" ").trim() || "Unnamed Size";
};

const getSizeOptionDisplay = (size: ProductSizeOption) => {
  const sizeName = size.size_name?.trim() || "";
  const sizeValue = [size.size_value, size.product?.unitToggle ? size.size_unit : null]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .map((part) => part!.trim())
    .join(" ")
    .trim();

  return {
    sizeName,
    sizeValue,
    shouldStack: Boolean(sizeName && sizeValue),
  };
};

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
  { value: "product", label: "Specific Subcategories" },
  { value: "specific_product", label: "Specific Products" },
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

// Available user types - will be fetched from database
const USER_TYPES = [
  { value: "pharmacy", label: "Pharmacy" },
  { value: "group", label: "Group" },
  { value: "hospital", label: "Hospital" },
  { value: "vendor", label: "Vendor" },
];


export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSizes, setProductSizes] = useState<ProductSizeOption[]>([]);
  const [productOffers, setProductOffers] = useState<ProductOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [productSearch, setProductSearch] = useState("");
  const [sizeSearch, setSizeSearch] = useState("");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [subcategoryPickerOpen, setSubcategoryPickerOpen] = useState(false);
  const [specificProductPickerOpen, setSpecificProductPickerOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'offer' | 'deal' } | null>(null);
  const [removeProductDialogOpen, setRemoveProductDialogOpen] = useState(false);
  const [productToRemove, setProductToRemove] = useState<{ id: string; name: string } | null>(null);
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
  const [dealApplicableTo, setDealApplicableTo] = useState<"all" | "category" | "product" | "specific_product">("all");
  const [dealApplicableIds, setDealApplicableIds] = useState<string[]>([]);
  const [dealCategoryPickerOpen, setDealCategoryPickerOpen] = useState(false);
  const [dealSubcategoryPickerOpen, setDealSubcategoryPickerOpen] = useState(false);
  const [dealProductPickerOpen, setDealProductPickerOpen] = useState(false);
  const [dealFinalProductPickerOpen, setDealFinalProductPickerOpen] = useState(false);
  const [dealSpecificSizePickerOpen, setDealSpecificSizePickerOpen] = useState(false);
  const [dealSizeSearch, setDealSizeSearch] = useState("");
  const [mainTab, setMainTab] = useState("offers");

  useEffect(() => {
    fetchOffers();
    fetchCategories();
    fetchProducts();
    fetchProductSizes();
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
          products (id, name, base_price, image_url, product_sizes(price))
        `)
        .order("display_order", { ascending: true });

      if (error) throw error;
      const mappedDeals = ((data || []) as DailyDealRow[]).map((deal) => ({
        ...deal,
        products: deal.products
          ? {
              ...deal.products,
              base_price: getDisplayPrice(
                deal.products.base_price,
                deal.products.product_sizes
              ),
            }
          : undefined,
      }));

      setDailyDeals(mappedDeals);
    } catch (error: any) {
      console.error("Error fetching daily deals:", error);
    }
  };

  const fetchDealsSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_deals_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      
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

    if (dealApplicableTo === "specific_product" && dealApplicableIds.length === 0) {
      toast({
        title: "Select at least one size",
        description: "Specific Products deals must target one or more product sizes.",
        variant: "destructive",
      });
      return;
    }

    // Validate product has a valid price
    const selectedProduct = products.find(p => p.id === dealFormData.product_id);
    if (selectedProduct && selectedProduct.price === 0) {
      toast({ 
        title: "Warning: Zero Price Product", 
        description: "This product has a base price of $0. The deal may not display correctly. Please update the product price first or ensure it has valid size prices.",
        variant: "destructive"
      });
      // Allow to continue but warn the user
    }
    
    try {
      const productName = products.find(p => p.id === dealFormData.product_id)?.name || "Product";
      const dealOfferScope = getDealOfferScope();
      const offerPayload = {
        title: `Daily Deal: ${dealFormData.badge_type} - ${productName}`,
        description: `Auto-created offer for daily deal. Discount: ${dealFormData.discount_percent}%`,
        offer_type: "percentage",
        discount_value: dealFormData.discount_percent,
        is_active: dealFormData.is_active,
        start_date: dealFormData.start_date,
        end_date: dealFormData.end_date,
        applicable_to: dealOfferScope.applicable_to,
        applicable_ids: dealOfferScope.applicable_ids,
        min_order_amount: 0,
        max_discount_amount: 0,
        usage_limit: 0,
        promo_code: null,
      };

      if (editingDeal) {
        const dealPayload = {
          product_id: dealFormData.product_id,
          discount_percent: dealFormData.discount_percent,
          badge_type: dealFormData.badge_type,
          is_active: dealFormData.is_active,
          start_date: dealFormData.start_date,
          end_date: dealFormData.end_date,
        };

        const { error: dealError } = await supabase
          .from("daily_deals")
          .update(dealPayload)
          .eq("id", editingDeal.id);
        
        if (dealError) throw dealError;

        // Update linked offer if it exists
        if (editingDeal.offer_id) {
          const { error: offerError } = await supabase
            .from("offers")
            .update({
              ...offerPayload,
            })
            .eq("id", editingDeal.offer_id);
          
          if (offerError) {
            console.error("Error updating linked offer:", offerError);
            // Don't throw - deal update succeeded
          } else {
            await syncDealOfferProductLink(
              editingDeal.offer_id,
              dealFormData.product_id,
              dealOfferScope.applicable_to
            );
          }
        }

        toast({ title: "Success", description: "Deal updated successfully" });
      } else {
        // CREATE NEW DEAL
        const dealPayload = {
          product_id: dealFormData.product_id,
          discount_percent: dealFormData.discount_percent,
          badge_type: dealFormData.badge_type,
          is_active: dealFormData.is_active,
          start_date: dealFormData.start_date,
          end_date: dealFormData.end_date,
        };

        // Step 1: Create the daily deal (without offer_id first)
        const { data: deal, error: dealError } = await supabase
          .from("daily_deals")
          .insert([dealPayload])
          .select()
          .single();
        
        if (dealError) throw dealError;

        // Step 2: Create corresponding offer for checkout integration
        const { data: offer, error: offerError } = await supabase
          .from("offers")
          .insert([offerPayload])
          .select()
          .single();
        
        if (offerError) {
          console.error("Error creating offer:", offerError);
          // Don't throw - deal was created successfully
          toast({ 
            title: "Partial Success", 
            description: "Deal created but checkout integration failed. Contact support.",
            variant: "destructive"
          });
        } else {
          // Step 3: Link offer to product via product_offers
          await syncDealOfferProductLink(
            offer.id,
            dealFormData.product_id,
            dealOfferScope.applicable_to
          );

          // Step 4: Update daily_deal with offer_id reference
          const { error: updateError } = await supabase
            .from("daily_deals")
            .update({ offer_id: offer.id })
            .eq("id", deal.id);
          
          if (updateError) {
            console.error("Error updating deal with offer_id:", updateError);
          }

          toast({ 
            title: "Success", 
            description: "Deal created and discount will apply at checkout!" 
          });
        }
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
      setDealApplicableTo("all");
      setDealApplicableIds([]);
      setDealProductSearch("");
      fetchDailyDeals();
      fetchOffers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditDeal = (deal: DailyDeal) => {
    const linkedOffer = deal.offer_id
      ? offers.find((offer) => offer.id === deal.offer_id)
      : null;
    const isSizeScopedDeal =
      linkedOffer?.applicable_to === "specific_product" &&
      Array.isArray(linkedOffer.applicable_ids) &&
      linkedOffer.applicable_ids.length > 0;

    setEditingDeal(deal);
    setDealFormData({
      product_id: deal.product_id,
      discount_percent: deal.discount_percent,
      badge_type: deal.badge_type,
      is_active: deal.is_active,
      start_date: deal.start_date.split("T")[0],
      end_date: deal.end_date.split("T")[0],
    });
    setDealApplicableTo(isSizeScopedDeal ? "specific_product" : "all");
    setDealApplicableIds(isSizeScopedDeal ? linkedOffer.applicable_ids || [] : []);
    setDealProductSearch("");
    setDealsDialogOpen(true);
  };

  const handleDeleteDeal = async (id: string) => {
    setItemToDelete({ id, type: 'deal' });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'deal') {
        // Find the deal to get its offer_id
        const deal = dailyDeals.find(d => d.id === itemToDelete.id);
        
        // Delete the daily deal (CASCADE will delete product_offer link)
        const { error } = await supabase.from("daily_deals").delete().eq("id", itemToDelete.id);
        if (error) throw error;

        // Delete the linked offer if it exists (CASCADE will handle product_offers)
        if (deal?.offer_id) {
          const { error: offerError } = await supabase
            .from("offers")
            .delete()
            .eq("id", deal.offer_id);
          
          if (offerError) {
            console.error("Error deleting linked offer:", offerError);
            // Don't throw - deal deletion succeeded
          }
        }

        toast({ title: "Success", description: "Deal and discount removed successfully" });
        fetchDailyDeals();
        fetchOffers();
      } else {
        const { error } = await supabase.from("offers").delete().eq("id", itemToDelete.id);
        if (error) throw error;
        toast({ title: "Success", description: "Offer deleted successfully" });
        fetchOffers();
        fetchDailyDeals();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
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
      fetchOffers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const availableDealProducts = products.filter((p) =>
    !dailyDeals.some(d => d.product_id === p.id) || editingDeal?.product_id === p.id
  );

  const filteredDealProducts = availableDealProducts.filter((p) =>
    matchesProductSearch(p, dealProductSearch)
  )
  .slice(0, 20);

  const dealSubcategories = Array.from(
    new Set(
      products
        .map((product) => product.subcategory?.trim())
        .filter((subcategory): subcategory is string => Boolean(subcategory))
    )
  ).sort((a, b) => a.localeCompare(b));

  const selectedDealCategories = categories.filter((category) =>
    dealApplicableIds.includes(category.name)
  );
  const selectedDealSubcategories = dealSubcategories.filter((subcategory) =>
    dealApplicableIds.includes(subcategory)
  );
  const selectedDealProducts = products.filter((product) =>
    dealApplicableIds.includes(product.id)
  );
  const selectedDealSizes = productSizes.filter((size) =>
    dealApplicableIds.includes(size.id)
  );
  const selectedDealSizeProducts = products.filter((product) =>
    selectedDealSizes.some((size) => size.product_id === product.id)
  );
  const scopedDealProducts = availableDealProducts.filter((product) => {
    if (dealApplicableTo === "category" && dealApplicableIds.length > 0) {
      return dealApplicableIds.includes(product.category || "");
    }

    if (dealApplicableTo === "product" && dealApplicableIds.length > 0) {
      return dealApplicableIds.includes(product.subcategory || "");
    }

    if (dealApplicableTo === "specific_product" && dealApplicableIds.length > 0) {
      return productSizes.some(
        (size) => size.product_id === product.id && dealApplicableIds.includes(size.id)
      );
    }

    return true;
  });

  useEffect(() => {
    if (!dealsDialogOpen) return;

    if (dealApplicableTo === "all") {
      return;
    }

    const nextProductId = scopedDealProducts[0]?.id || "";

    setDealFormData((current) =>
      current.product_id === nextProductId
        ? current
        : { ...current, product_id: nextProductId }
    );
  }, [dealsDialogOpen, dealApplicableTo, dealApplicableIds, scopedDealProducts]);
  const dealFilteredProducts = filteredDealProducts.filter((product) => {
    if (dealApplicableTo === "category" && dealApplicableIds.length > 0) {
      return dealApplicableIds.includes(product.category || "");
    }

    if (dealApplicableTo === "product" && dealApplicableIds.length > 0) {
      return dealApplicableIds.includes(product.subcategory || "");
    }

    if (dealApplicableTo === "specific_product" && dealApplicableIds.length > 0) {
      return productSizes.some(
        (size) => size.product_id === product.id && dealApplicableIds.includes(size.id)
      );
    }

    return true;
  });
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
        .select("id, name, category, subcategory, base_price, sku, image_url, offer_id, product_sizes(price)")
        .order("name");
      setProducts(
        ((data || []) as ProductRow[]).map((product) => ({
          ...product,
          price: getDisplayPrice(product.base_price, product.product_sizes),
        }))
      );
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchProductSizes = async () => {
    try {
      const { data, error } = await supabase
        .from("product_sizes")
        .select(`
          id,
          product_id,
          size_name,
          size_value,
          size_unit,
          sku,
          price,
          is_active,
          product:products!inner(id, name, sku, unitToggle)
        `)
        .order("product_id")
        .order("size_name")
        .order("size_value");

      if (error) throw error;

      setProductSizes((data || []) as ProductSizeOption[]);
    } catch (error) {
      console.error("Error fetching product sizes:", error);
    }
  };

  const fetchProductOffers = async (offerId: string) => {
    try {
      const { data, error } = await supabase
        .from("product_offers")
        .select(`
          *,
          products (name, base_price, sku, product_sizes(price))
        `)
        .eq("offer_id", offerId);
      
      if (error) {
        console.error("Error fetching product offers:", error);
        throw error;
      }
      
      // Map base_price to price for compatibility
      const mappedData = ((data || []) as ProductOfferRow[]).map((po) => ({
        ...po,
        products: po.products ? {
          ...po.products,
          price: getDisplayPrice(po.products.base_price, po.products.product_sizes)
        } : null
      }));
      
      setProductOffers(mappedData);
      console.log("✅ Fetched product offers:", mappedData);
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

  const handleRemoveProductOffer = async (productOfferId: string, productName: string) => {
    setProductToRemove({ id: productOfferId, name: productName });
    setRemoveProductDialogOpen(true);
  };

  const confirmRemoveProduct = async () => {
    if (!productToRemove) return;

    try {
      const { error } = await supabase
        .from("product_offers")
        .delete()
        .eq("id", productToRemove.id);

      if (error) throw error;

      toast({ title: "Success", description: "Product removed from offer" });
      if (selectedOffer) {
        fetchProductOffers(selectedOffer.id);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setRemoveProductDialogOpen(false);
      setProductToRemove(null);
    }
  };

  const filteredProducts = products.filter((p) =>
    matchesProductSearch(p, productSearch)
  ).slice(0, 20);

  const selectedApplicableCategories = categories.filter((category) =>
    formData.applicable_ids.includes(category.name)
  );
  const selectedApplicableProducts = products.filter((product) =>
    formData.applicable_ids.includes(product.id)
  );
  const selectedApplicableSizes = productSizes.filter((size) =>
    formData.applicable_ids.includes(size.id)
  );
  const orderedProductSizes = [...productSizes].sort((a, b) => {
    const productCompare = (a.product?.name || "").localeCompare(b.product?.name || "");
    if (productCompare !== 0) return productCompare;

    return getSizeOptionLabel(a).localeCompare(getSizeOptionLabel(b));
  });
  const filteredDealProductSizes = orderedProductSizes.filter((size) =>
    matchesSizeSearch(size, dealSizeSearch)
  );
  const filteredProductSizes = orderedProductSizes.filter((size) =>
    matchesSizeSearch(size, sizeSearch)
  );

  const toggleApplicableProduct = (id: string) => {
    const ids = formData.applicable_ids.includes(id)
      ? formData.applicable_ids.filter((itemId) => itemId !== id)
      : [...formData.applicable_ids, id];

    setFormData({ ...formData, applicable_ids: ids });
  };

  const toggleApplicableCategory = (name: string) => {
    const ids = formData.applicable_ids.includes(name)
      ? formData.applicable_ids.filter((itemId) => itemId !== name)
      : [...formData.applicable_ids, name];

    setFormData({ ...formData, applicable_ids: ids });
  };

  const toggleDealApplicableId = (id: string) => {
    setDealApplicableIds((currentIds) => {
      if (currentIds.includes(id)) {
        return currentIds.filter((itemId) => itemId !== id);
      }

      if (
        (dealApplicableTo === "category" || dealApplicableTo === "product") &&
        currentIds.length > 0
      ) {
        toast({
          title: "Single selection only",
          description:
            dealApplicableTo === "category"
              ? "Per deal only one category can be applied."
              : "Per deal only one subcategory can be applied.",
          variant: "destructive",
        });
        return currentIds;
      }

      return [...currentIds, id];
    });
  };

  const toggleDealApplicableSize = (size: ProductSizeOption) => {
    const selectedSizeIdsForProduct = selectedDealSizes
      .filter((selectedSize) => selectedSize.product_id === size.product_id)
      .map((selectedSize) => selectedSize.id);

    const isCurrentlySelected = dealApplicableIds.includes(size.id);

    if (isCurrentlySelected) {
      const nextIds = dealApplicableIds.filter((itemId) => itemId !== size.id);
      setDealApplicableIds(nextIds);

      if (nextIds.length === 0) {
        setDealFormData((current) => ({ ...current, product_id: "" }));
      }
      return;
    }

    const nextIds =
      selectedSizeIdsForProduct.length > 0
        ? [...selectedSizeIdsForProduct, size.id]
        : [size.id];

    if (dealApplicableIds.length > 0 && selectedSizeIdsForProduct.length === 0) {
      toast({
        title: "Single product only",
        description: "Per deal only one subcategory's products can be applied.",
        variant: "destructive",
      });
      return;
    }

    setDealApplicableIds(nextIds);
    setDealFormData((current) => ({ ...current, product_id: size.product_id }));
  };

  const getDealOfferScope = () => {
    if (dealApplicableTo === "specific_product" && dealApplicableIds.length > 0) {
      return {
        applicable_to: "specific_product",
        applicable_ids: dealApplicableIds,
      };
    }

    return {
      applicable_to: "product",
      applicable_ids: dealFormData.product_id ? [dealFormData.product_id] : [],
    };
  };

  const syncDealOfferProductLink = async (
    offerId: string,
    productId: string,
    applicableTo: string
  ) => {
    const { error: deleteLinkError } = await supabase
      .from("product_offers")
      .delete()
      .eq("offer_id", offerId);

    if (deleteLinkError) {
      console.error("Error clearing existing deal product links:", deleteLinkError);
    }

    if (applicableTo === "specific_product") {
      return;
    }

    const { error: linkError } = await supabase
      .from("product_offers")
      .insert([
        {
          product_id: productId,
          offer_id: offerId,
          is_active: true,
        },
      ]);

    if (linkError) {
      console.error("Error linking offer to product:", linkError);
    }
  };

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
      fetchDailyDeals();
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
    setItemToDelete({ id, type: 'offer' });
    setDeleteDialogOpen(true);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("offers")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      fetchOffers();
      fetchDailyDeals();
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
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          applicable_to: value,
                          applicable_ids: value === formData.applicable_to ? formData.applicable_ids : [],
                          user_groups: value === "user_group" ? formData.user_groups : [],
                        })
                      }
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
                      <div className="space-y-3 mt-2">
                        <Popover open={categoryPickerOpen} onOpenChange={setCategoryPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={categoryPickerOpen}
                              className="w-full justify-between font-normal"
                            >
                              <span className="truncate">
                                {selectedApplicableCategories.length === 0
                                  ? "Select categories..."
                                  : `${selectedApplicableCategories.length} categor${selectedApplicableCategories.length > 1 ? "ies" : "y"} selected`}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search categories..."
                                className="focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                              <CommandList
                                className="max-h-80 overscroll-contain"
                                onWheelCapture={(event) => event.stopPropagation()}
                              >
                                <CommandEmpty>No categories found.</CommandEmpty>
                                <CommandGroup className="p-2">
                                  {categories.map((cat) => (
                                    <CommandItem
                                      key={cat.id}
                                      value={cat.name}
                                      onSelect={() => toggleApplicableCategory(cat.name)}
                                      className="mb-1 rounded-md border border-transparent px-3 py-3 aria-selected:bg-slate-50 data-[selected=true]:border-blue-200 data-[selected=true]:bg-blue-50"
                                    >
                                      <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <div className={cn(
                                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border",
                                          formData.applicable_ids.includes(cat.name)
                                            ? "border-blue-600 bg-blue-600 text-white"
                                            : "border-slate-300 bg-white text-transparent"
                                        )}>
                                          <Check className="h-3.5 w-3.5" />
                                        </div>
                                        <p className="truncate text-sm font-semibold text-slate-900">
                                          {cat.name}
                                        </p>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {!categoryPickerOpen && selectedApplicableCategories.length > 0 && (
                          <div className="rounded-lg border p-3 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-medium text-muted-foreground">
                                Selected categories ({selectedApplicableCategories.length})
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setFormData({ ...formData, applicable_ids: [] })}
                              >
                                Clear all
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedApplicableCategories.map((cat) => (
                                <Badge key={cat.id} variant="secondary" className="gap-1 pr-1">
                                  <span className="max-w-[260px] truncate">{cat.name}</span>
                                  <button
                                    type="button"
                                    className="rounded-sm p-0.5 hover:bg-muted"
                                    onClick={() => toggleApplicableCategory(cat.name)}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Search and select categories.
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.applicable_to === "product" && (
                    <div className="col-span-2">
                      <Label>Select Subcategories</Label>
                      <div className="space-y-3 mt-2">
                        <Popover open={subcategoryPickerOpen} onOpenChange={setSubcategoryPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={subcategoryPickerOpen}
                              className="w-full justify-between font-normal"
                            >
                              <span className="truncate">
                                {selectedApplicableProducts.length === 0
                                  ? "Select subcategories..."
                                  : `${selectedApplicableProducts.length} subcategor${selectedApplicableProducts.length > 1 ? "ies" : "y"} selected`}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search subcategories by product name or SKU..."
                                className="focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                              <CommandList
                                className="max-h-80 overscroll-contain"
                                onWheelCapture={(event) => event.stopPropagation()}
                              >
                                <CommandEmpty>No subcategories found.</CommandEmpty>
                                <CommandGroup className="p-2">
                                  {products.map((product) => (
                                    <CommandItem
                                      key={product.id}
                                      value={[
                                        product.name,
                                        product.sku,
                                        String(product.price),
                                      ].filter(Boolean).join(" ")}
                                      onSelect={() => toggleApplicableProduct(product.id)}
                                      className="mb-1 rounded-md border border-transparent px-3 py-3 aria-selected:bg-slate-50 data-[selected=true]:border-blue-200 data-[selected=true]:bg-blue-50"
                                    >
                                      <div className="flex min-w-0 flex-1 items-start gap-3">
                                        <div className={cn(
                                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border",
                                          formData.applicable_ids.includes(product.id)
                                            ? "border-blue-600 bg-blue-600 text-white"
                                            : "border-slate-300 bg-white text-transparent"
                                        )}>
                                          <Check className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="truncate text-sm font-semibold text-slate-900">
                                                {product.name}
                                              </p>
                                            </div>
                                            <span className="shrink-0 text-sm font-semibold text-slate-700">
                                              ${Number(product.price || 0).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {!subcategoryPickerOpen && selectedApplicableProducts.length > 0 && (
                          <div className="rounded-lg border p-3 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-medium text-muted-foreground">
                                Selected subcategories ({selectedApplicableProducts.length})
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setFormData({ ...formData, applicable_ids: [] })}
                              >
                                Clear all
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedApplicableProducts.map((product) => (
                                <Badge key={product.id} variant="secondary" className="gap-1 pr-1">
                                  <span className="max-w-[260px] truncate">
                                    {product.name} (${Number(product.price || 0).toFixed(2)})
                                  </span>
                                  <button
                                    type="button"
                                    className="rounded-sm p-0.5 hover:bg-muted"
                                    onClick={() => toggleApplicableProduct(product.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Search by product name or SKU.
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.applicable_to === "specific_product" && (
                    <div className="col-span-2">
                      <Label>Select Products</Label>
                      <div className="space-y-3 mt-2">
                        <Popover
                          open={specificProductPickerOpen}
                          onOpenChange={(open) => {
                            setSpecificProductPickerOpen(open);
                            if (!open) {
                              setSizeSearch("");
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={specificProductPickerOpen}
                              className="w-full justify-between font-normal"
                            >
                              <span className="truncate">
                                {selectedApplicableSizes.length === 0
                                  ? "Select product sizes..."
                                  : `${selectedApplicableSizes.length} size${selectedApplicableSizes.length > 1 ? "s" : ""} selected`}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Search by size name, product, or SKU..."
                                value={sizeSearch}
                                onValueChange={setSizeSearch}
                                className="focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                              <CommandList
                                className="max-h-80 overscroll-contain"
                                onWheelCapture={(event) => event.stopPropagation()}
                              >
                                <CommandEmpty>No sizes found.</CommandEmpty>
                                <CommandGroup className="p-2">
                                  {filteredProductSizes.map((size) => (
                                    <CommandItem
                                      key={size.id}
                                      value={[
                                        size.product?.name,
                                        size.product?.sku,
                                        size.sku,
                                        getSizeOptionLabel(size),
                                      ].filter(Boolean).join(" ")}
                                      onSelect={() => toggleApplicableProduct(size.id)}
                                      className="mb-1 rounded-md border border-transparent px-3 py-3 aria-selected:bg-slate-50 data-[selected=true]:border-blue-200 data-[selected=true]:bg-blue-50"
                                    >
                                      <div className="flex min-w-0 flex-1 items-start gap-3">
                                        <div className={cn(
                                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border",
                                          formData.applicable_ids.includes(size.id)
                                            ? "border-blue-600 bg-blue-600 text-white"
                                            : "border-slate-300 bg-white text-transparent"
                                        )}>
                                          <Check className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              {(() => {
                                                const sizeDisplay = getSizeOptionDisplay(size);

                                                if (sizeDisplay.shouldStack) {
                                                  return (
                                                    <div className="flex min-w-0 flex-col">
                                                      <p className="truncate text-sm font-semibold text-slate-900">
                                                        {sizeDisplay.sizeName}
                                                      </p>
                                                      <p className="truncate text-sm font-semibold text-slate-900">
                                                        {sizeDisplay.sizeValue}
                                                      </p>
                                                    </div>
                                                  );
                                                }

                                                return (
                                                  <p className="truncate text-sm font-semibold text-slate-900">
                                                    {getSizeOptionLabel(size)}
                                                  </p>
                                                );
                                              })()}
                                              <p className="truncate text-xs text-muted-foreground">
                                                {size.product?.name || "Unknown Product"}
                                              </p>
                                            </div>
                                            <span className="shrink-0 text-sm font-semibold text-slate-700">
                                              ${Number(size.price || 0).toFixed(2)}
                                            </span>
                                          </div>
                                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                            <span>{size.sku ? `Size SKU: ${size.sku}` : "No size SKU"}</span>
                                            {size.product?.sku && <span>Product SKU: {size.product.sku}</span>}
                                          </div>
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {!specificProductPickerOpen && selectedApplicableSizes.length > 0 && (
                          <div className="rounded-lg border p-3 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-medium text-muted-foreground">
                                Selected sizes ({selectedApplicableSizes.length})
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setFormData({ ...formData, applicable_ids: [] })}
                              >
                                Clear all
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedApplicableSizes.map((size) => (
                                <Badge key={size.id} variant="secondary" className="gap-1 pr-1">
                                  {(() => {
                                    const sizeDisplay = getSizeOptionDisplay(size);

                                    if (sizeDisplay.shouldStack) {
                                      return (
                                        <span className="flex max-w-[260px] flex-col leading-tight">
                                          <span className="truncate">{sizeDisplay.sizeName}</span>
                                          <span className="truncate">{sizeDisplay.sizeValue}</span>
                                        </span>
                                      );
                                    }

                                    return (
                                      <span className="max-w-[260px] truncate">
                                        {getSizeOptionLabel(size)}
                                      </span>
                                    );
                                  })()}
                                  <button
                                    type="button"
                                    className="rounded-sm p-0.5 hover:bg-muted"
                                    onClick={() => toggleApplicableProduct(size.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Search by size, product, or SKU.
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.applicable_to === "user_group" && (
                    <div className="col-span-2">
                      <Label>Select User Groups</Label>
                      <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-lg">
                        {USER_TYPES.map((userType) => (
                          <Badge
                            key={userType.value}
                            variant={formData.user_groups.includes(userType.value) ? "default" : "outline"}
                            className="cursor-pointer hover:bg-primary/10 transition-colors"
                            onClick={() => {
                              const groups = formData.user_groups.includes(userType.value)
                                ? formData.user_groups.filter(g => g !== userType.value)
                                : [...formData.user_groups, userType.value];
                              setFormData({ ...formData, user_groups: groups });
                            }}
                          >
                            {userType.label}
                          </Badge>
                        ))}
                      </div>
                      {formData.user_groups.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {formData.user_groups.length} groups selected: {formData.user_groups.map(g => 
                            USER_TYPES.find(ut => ut.value === g)?.label || g
                          ).join(", ")}
                        </p>
                      )}
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
                            onClick={() => handleRemoveProductOffer(po.id, po.products?.name || 'this product')}
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
                    setDealApplicableTo("all");
                    setDealApplicableIds([]);
                    setDealProductSearch("");
                  }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Deal Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingDeal ? "Edit Deal" : "Add Product to Deals"}</DialogTitle>
                    <DialogDescription>
                      {editingDeal ? "Update the deal settings" : "Select a product and set the discount"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleDealSubmit} className="space-y-4">
                    {/* Product Selection */}
                    <div className="space-y-4">
                      <div>
                        <Label>Applicable To</Label>
                        <Select
                          value={dealApplicableTo}
                          onValueChange={(value: "all" | "category" | "product" | "specific_product") => {
                            setDealApplicableTo(value);
                            setDealApplicableIds([]);
                            setDealProductSearch("");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Products</SelectItem>
                            <SelectItem value="category">Specific Categories</SelectItem>
                            <SelectItem value="product">Specific Subcategories</SelectItem>
                            <SelectItem value="specific_product">Specific Products</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {dealApplicableTo === "category" && (
                        <div className="space-y-3">
                          <Label>Select Categories</Label>
                          <Popover open={dealCategoryPickerOpen} onOpenChange={setDealCategoryPickerOpen}>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" className="w-full justify-between font-normal">
                                <span className="truncate">
                                  {selectedDealCategories.length === 0
                                    ? "Select categories..."
                                    : `${selectedDealCategories.length} categor${selectedDealCategories.length > 1 ? "ies" : "y"} selected`}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search categories..." className="focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" />
                                <CommandList className="max-h-80 overscroll-contain" onWheelCapture={(event) => event.stopPropagation()}>
                                  <CommandEmpty>No categories found.</CommandEmpty>
                                  <CommandGroup className="p-2">
                                    {categories.map((category) => (
                                      <CommandItem
                                        key={category.id}
                                        value={category.name}
                                        onSelect={() => toggleDealApplicableId(category.name)}
                                        className="mb-1 rounded-md border border-transparent px-3 py-3 aria-selected:bg-slate-50 data-[selected=true]:border-blue-200 data-[selected=true]:bg-blue-50"
                                      >
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                          <div className={cn(
                                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border",
                                            dealApplicableIds.includes(category.name)
                                              ? "border-blue-600 bg-blue-600 text-white"
                                              : "border-slate-300 bg-white text-transparent"
                                          )}>
                                            <Check className="h-3.5 w-3.5" />
                                          </div>
                                          <p className="truncate text-sm font-semibold text-slate-900">{category.name}</p>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {!dealCategoryPickerOpen && selectedDealCategories.length > 0 && (
                            <div className="rounded-lg border p-3 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-medium text-muted-foreground">Selected categories ({selectedDealCategories.length})</p>
                                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setDealApplicableIds([])}>Clear all</Button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedDealCategories.map((category) => (
                                  <Badge key={category.id} variant="secondary" className="gap-1 pr-1">
                                    <span className="max-w-[240px] truncate">{category.name}</span>
                                    <button type="button" className="rounded-sm p-0.5 hover:bg-muted" onClick={() => toggleDealApplicableId(category.name)}>
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {dealApplicableTo === "product" && (
                        <div className="space-y-3">
                          <Label>Select Subcategories</Label>
                          <Popover open={dealSubcategoryPickerOpen} onOpenChange={setDealSubcategoryPickerOpen}>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" className="w-full justify-between font-normal">
                                <span className="truncate">
                                  {selectedDealSubcategories.length === 0
                                    ? "Select subcategories..."
                                    : `${selectedDealSubcategories.length} subcategor${selectedDealSubcategories.length > 1 ? "ies" : "y"} selected`}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search subcategories..." className="focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" />
                                <CommandList className="max-h-80 overscroll-contain" onWheelCapture={(event) => event.stopPropagation()}>
                                  <CommandEmpty>No subcategories found.</CommandEmpty>
                                  <CommandGroup className="p-2">
                                    {dealSubcategories.map((subcategory) => (
                                      <CommandItem
                                        key={subcategory}
                                        value={subcategory}
                                        onSelect={() => toggleDealApplicableId(subcategory)}
                                        className="mb-1 rounded-md border border-transparent px-3 py-3 aria-selected:bg-slate-50 data-[selected=true]:border-blue-200 data-[selected=true]:bg-blue-50"
                                      >
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                          <div className={cn(
                                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border",
                                            dealApplicableIds.includes(subcategory)
                                              ? "border-blue-600 bg-blue-600 text-white"
                                              : "border-slate-300 bg-white text-transparent"
                                          )}>
                                            <Check className="h-3.5 w-3.5" />
                                          </div>
                                          <p className="truncate text-sm font-semibold text-slate-900">{subcategory}</p>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {!dealSubcategoryPickerOpen && selectedDealSubcategories.length > 0 && (
                            <div className="rounded-lg border p-3 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-medium text-muted-foreground">Selected subcategories ({selectedDealSubcategories.length})</p>
                                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setDealApplicableIds([])}>Clear all</Button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedDealSubcategories.map((subcategory) => (
                                  <Badge key={subcategory} variant="secondary" className="gap-1 pr-1">
                                    <span className="max-w-[240px] truncate">{subcategory}</span>
                                    <button type="button" className="rounded-sm p-0.5 hover:bg-muted" onClick={() => toggleDealApplicableId(subcategory)}>
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {dealApplicableTo === "specific_product" && (
                        <div className="space-y-3">
                          <Label>Select Products</Label>
                          <Popover
                            open={dealSpecificSizePickerOpen}
                            onOpenChange={(open) => {
                              setDealSpecificSizePickerOpen(open);
                              if (!open) {
                                setDealSizeSearch("");
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" className="w-full justify-between font-normal">
                                <span className="truncate">
                                  {selectedDealSizes.length === 0
                                    ? "Select product sizes..."
                                    : `${selectedDealSizes.length} size${selectedDealSizes.length > 1 ? "s" : ""} selected`}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="Search by size name, product, or SKU..."
                                  value={dealSizeSearch}
                                  onValueChange={setDealSizeSearch}
                                  className="focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                />
                                <CommandList className="max-h-80 overscroll-contain" onWheelCapture={(event) => event.stopPropagation()}>
                                  <CommandEmpty>No sizes found.</CommandEmpty>
                                  <CommandGroup className="p-2">
                                    {filteredDealProductSizes.map((size) => (
                                      <CommandItem
                                        key={size.id}
                                        value={[
                                          size.product?.name,
                                          size.product?.sku,
                                          size.sku,
                                          getSizeOptionLabel(size),
                                        ].filter(Boolean).join(" ")}
                                        onSelect={() => toggleDealApplicableSize(size)}
                                        className="mb-1 rounded-md border border-transparent px-3 py-3 aria-selected:bg-slate-50 data-[selected=true]:border-blue-200 data-[selected=true]:bg-blue-50"
                                      >
                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                          <div className={cn(
                                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border",
                                            dealApplicableIds.includes(size.id)
                                              ? "border-blue-600 bg-blue-600 text-white"
                                              : "border-slate-300 bg-white text-transparent"
                                          )}>
                                            <Check className="h-3.5 w-3.5" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="min-w-0">
                                                {(() => {
                                                  const sizeDisplay = getSizeOptionDisplay(size);

                                                  if (sizeDisplay.shouldStack) {
                                                    return (
                                                      <div className="flex min-w-0 flex-col">
                                                        <p className="truncate text-sm font-semibold text-slate-900">
                                                          {sizeDisplay.sizeName}
                                                        </p>
                                                        <p className="truncate text-sm font-semibold text-slate-900">
                                                          {sizeDisplay.sizeValue}
                                                        </p>
                                                      </div>
                                                    );
                                                  }

                                                  return (
                                                    <p className="truncate text-sm font-semibold text-slate-900">
                                                      {getSizeOptionLabel(size)}
                                                    </p>
                                                  );
                                                })()}
                                                <p className="truncate text-xs text-muted-foreground">
                                                  {size.product?.name || "Unknown Product"}
                                                </p>
                                              </div>
                                              <span className="shrink-0 text-sm font-semibold text-slate-700">
                                                ${Number(size.price || 0).toFixed(2)}
                                              </span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                              <span>{size.sku ? `Size SKU: ${size.sku}` : "No size SKU"}</span>
                                              {size.product?.sku && <span>Product SKU: {size.product.sku}</span>}
                                            </div>
                                          </div>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {!dealSpecificSizePickerOpen && selectedDealSizes.length > 0 && (
                            <div className="rounded-lg border p-3 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-medium text-muted-foreground">Selected sizes ({selectedDealSizes.length})</p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => {
                                    setDealApplicableIds([]);
                                    setDealFormData((current) => ({ ...current, product_id: "" }));
                                  }}
                                >
                                  Clear all
                                </Button>
                              </div>
                              <div className="max-h-36 overflow-y-auto pr-1">
                                <div className="flex flex-wrap gap-2">
                                {selectedDealSizes.map((size) => (
                                  <Badge key={size.id} variant="secondary" className="gap-1 pr-1">
                                    {(() => {
                                      const sizeDisplay = getSizeOptionDisplay(size);

                                      if (sizeDisplay.shouldStack) {
                                        return (
                                          <span className="flex max-w-[260px] flex-col leading-tight">
                                            <span className="truncate">{sizeDisplay.sizeName}</span>
                                            <span className="truncate">{sizeDisplay.sizeValue}</span>
                                          </span>
                                        );
                                      }

                                      return (
                                        <span className="max-w-[260px] truncate">
                                          {getSizeOptionLabel(size)}
                                        </span>
                                      );
                                    })()}
                                    <button type="button" className="rounded-sm p-0.5 hover:bg-muted" onClick={() => toggleDealApplicableSize(size)}>
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {dealApplicableTo !== "all" && dealFormData.product_id && (
                        <div className="rounded-lg border p-3 bg-muted/30">
                          <p className="text-sm font-medium">
                            Deal product: {products.find((product) => product.id === dealFormData.product_id)?.name}
                          </p>
                          {products.find((product) => product.id === dealFormData.product_id)?.price === 0 && (
                            <p className="text-xs text-amber-600 font-medium mt-1">
                              Warning: This product has a zero base price and may not display correctly in the deals section.
                            </p>
                          )}
                        </div>
                      )}

                      {dealApplicableTo === "all" && (
                        <div className="space-y-3">
                          <Label>Select Product *</Label>
                          <Popover open={dealFinalProductPickerOpen} onOpenChange={setDealFinalProductPickerOpen}>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" className="w-full justify-between font-normal">
                                <span className="truncate">
                                  {dealFormData.product_id
                                    ? (products.find((product) => product.id === dealFormData.product_id)?.name || "Select product...")
                                    : "Select product..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder="Search products by name or SKU..."
                                  value={dealProductSearch}
                                  onValueChange={setDealProductSearch}
                                  className="focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                />
                                <CommandList className="max-h-80 overscroll-contain" onWheelCapture={(event) => event.stopPropagation()}>
                                  <CommandEmpty>No products found.</CommandEmpty>
                                  <CommandGroup className="p-2">
                                    {dealFilteredProducts.map((product) => (
                                      <CommandItem
                                        key={product.id}
                                        value={[product.name, product.sku, String(product.price)].filter(Boolean).join(" ")}
                                        onSelect={() => {
                                          setDealFormData({ ...dealFormData, product_id: product.id });
                                          setDealFinalProductPickerOpen(false);
                                        }}
                                        className="mb-1 rounded-md border border-transparent px-3 py-3 aria-selected:bg-slate-50 data-[selected=true]:border-blue-200 data-[selected=true]:bg-blue-50"
                                      >
                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                          <div className={cn(
                                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border",
                                            dealFormData.product_id === product.id
                                              ? "border-blue-600 bg-blue-600 text-white"
                                              : "border-slate-300 bg-white text-transparent"
                                          )}>
                                            <Check className="h-3.5 w-3.5" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                                                {product.price === 0 && <p className="text-xs text-amber-600 font-medium">Zero price - may not display correctly</p>}
                                              </div>
                                              <span className={cn(
                                                "shrink-0 text-sm font-semibold",
                                                product.price === 0 ? "text-amber-600" : "text-slate-700"
                                              )}>
                                                ${Number(product.price || 0).toFixed(2)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {dealFormData.product_id && (
                            <div className="rounded-lg border p-3 bg-muted/30">
                              <p className="text-sm font-medium">Selected: {products.find((product) => product.id === dealFormData.product_id)?.name}</p>
                              {products.find((product) => product.id === dealFormData.product_id)?.price === 0 && (
                                <p className="text-xs text-amber-600 font-medium mt-1">
                                  Warning: This product has a zero base price and may not display correctly in the deals section.
                                </p>
                              )}
                            </div>
                          )}
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
                        <TableHead>Checkout</TableHead>
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
                                <img
                                  src={getProductImageUrl(deal.products?.image_url)}
                                  alt={deal.products?.name}
                                  className="w-10 h-10 rounded object-contain bg-muted p-1"
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg";
                                  }}
                                />
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
                            <TableCell>
                              {deal.offer_id ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Integrated
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  <AlertCircle className="h-3 w-3 mr-1" /> Display Only
                                </Badge>
                              )}
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

        {/* Confirm Delete Dialog */}
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          title={itemToDelete?.type === 'deal' ? "Delete Daily Deal?" : "Delete Offer?"}
          description={
            itemToDelete?.type === 'deal'
              ? "Are you sure you want to remove this daily deal? This action cannot be undone."
              : "Are you sure you want to delete this offer? This will also remove all product assignments. This action cannot be undone."
          }
        />

        {/* Confirm Remove Product Dialog */}
        <ConfirmDeleteDialog
          open={removeProductDialogOpen}
          onOpenChange={setRemoveProductDialogOpen}
          onConfirm={confirmRemoveProduct}
          title="Remove Product from Offer?"
          description={
            productToRemove
              ? `Are you sure you want to remove "${productToRemove.name}" from this offer? The product will no longer receive the discount.`
              : "Are you sure you want to remove this product from the offer?"
          }
        />
      </div>
    </DashboardLayout>
  );
}

