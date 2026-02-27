import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Plus, Pencil, Trash2, Image, Eye, EyeOff, GripVertical, Copy,
  Sparkles, Monitor, Smartphone, Layout, PanelTop, Square, Tag,
  RefreshCw, ArrowUp, ArrowDown,
  ExternalLink, Calendar, CheckCircle2, XCircle, Clock, Upload, X, Loader2,
  PartyPopper
} from "lucide-react";
import { format } from "date-fns";

import { BannerDesignStudio } from "@/components/admin/banners/BannerDesignStudio";
import { BannerInitializer } from "@/components/admin/banners/BannerInitializer";
import { FestivalThemeManager } from "@/components/admin/banners/FestivalThemeManager";
import { useScreenSize } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  mobile_image_url: string | null;
  link_url: string | null;
  link_text: string | null;
  display_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  banner_type: string;
  background_color: string | null;
  text_color: string | null;
  overlay_opacity: number | null;
  target_page: string | null;
  click_count: number;
  view_count: number;
  created_at: string;
  // A/B testing fields
  ab_test_group: string;
  ab_test_id: string | null;
  ab_test_traffic_split: number;
}

interface Category {
  id: string;
  name: string;
}

// Banner templates
const bannerTemplates = [
  {
    id: "hero_sale",
    name: "Hero Sale",
    icon: Layout,
    color: "bg-red-500",
    description: "Full-width sale banner",
    banner_type: "hero",
    title: "Big Sale - Up to 50% Off!",
    subtitle: "Limited time offer on all products",
    link_text: "Shop Now",
  },
  {
    id: "new_arrival",
    name: "New Arrivals",
    icon: Sparkles,
    color: "bg-blue-500",
    description: "Showcase new products",
    banner_type: "hero",
    title: "New Arrivals",
    subtitle: "Check out our latest products",
    link_text: "Explore",
  },
  {
    id: "promo_strip",
    name: "Promo Strip",
    icon: PanelTop,
    color: "bg-green-500",
    description: "Top announcement bar",
    banner_type: "strip",
    title: "Free Shipping on Orders $50+",
    subtitle: "",
    link_text: "Learn More",
  },
  {
    id: "category_banner",
    name: "Category",
    icon: Tag,
    color: "bg-purple-500",
    description: "Category page banner",
    banner_type: "category",
    title: "Shop by Category",
    subtitle: "Find what you need",
    link_text: "Browse",
  },
  {
    id: "sidebar_ad",
    name: "Sidebar Ad",
    icon: Square,
    color: "bg-orange-500",
    description: "Sidebar promotional",
    banner_type: "sidebar",
    title: "Special Offer",
    subtitle: "Don't miss out!",
    link_text: "Get Deal",
  },
  {
    id: "popup_promo",
    name: "Popup",
    icon: Monitor,
    color: "bg-pink-500",
    description: "Popup promotion",
    banner_type: "popup",
    title: "Subscribe & Save 10%",
    subtitle: "Get exclusive deals",
    link_text: "Subscribe",
  },
];

const bannerTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  hero: { label: "Hero Banner", icon: Layout, color: "text-blue-600" },
  sidebar: { label: "Sidebar", icon: Square, color: "text-purple-600" },
  popup: { label: "Popup", icon: Monitor, color: "text-pink-600" },
  strip: { label: "Promo Strip", icon: PanelTop, color: "text-green-600" },
  category: { label: "Category", icon: Tag, color: "text-orange-600" },
  product: { label: "Product Page", icon: Sparkles, color: "text-red-600" },
};

// Banner size presets
const bannerSizePresets = [
  { id: "hero_large", name: "Hero Large", width: 1920, height: 600, description: "Full-width hero banner" },
  { id: "hero_medium", name: "Hero Medium", width: 1920, height: 400, description: "Medium hero banner" },
  { id: "hero_small", name: "Hero Small", width: 1920, height: 300, description: "Compact hero banner" },
  { id: "sidebar", name: "Sidebar", width: 300, height: 600, description: "Vertical sidebar ad" },
  { id: "sidebar_square", name: "Sidebar Square", width: 300, height: 300, description: "Square sidebar ad" },
  { id: "strip", name: "Promo Strip", width: 1920, height: 80, description: "Top announcement bar" },
  { id: "popup", name: "Popup", width: 600, height: 400, description: "Modal popup banner" },
  { id: "mobile", name: "Mobile Banner", width: 768, height: 400, description: "Mobile optimized" },
  { id: "category", name: "Category Header", width: 1200, height: 300, description: "Category page header" },
  { id: "custom", name: "Custom Size", width: 0, height: 0, description: "Enter custom dimensions" },
];

const initialFormState = {
  title: "",
  subtitle: "",
  image_url: "",
  mobile_image_url: "",
  link_url: "",
  link_text: "",
  display_order: 0,
  is_active: true,
  start_date: "",
  end_date: "",
  banner_type: "hero",
  background_color: "#000000",
  text_color: "#FFFFFF",
  overlay_opacity: 0.3,
  target_page: "",
};

export default function Banners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [previewBanner, setPreviewBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [activeTab, setActiveTab] = useState("all");
  const [mainTab, setMainTab] = useState("banners");
  const [uploading, setUploading] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [selectedSize, setSelectedSize] = useState(bannerSizePresets[0]);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(600);
  const { toast } = useToast();
  const screenSize = useScreenSize();
  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';
  const isCompact = isMobile || isTablet;

  useEffect(() => {
    fetchBanners();
    fetchCategories();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Use category_configs table instead of categories
      const { data } = await supabase.from("category_configs").select("id, category_name").order("category_name");
      // Map to expected format
      setCategories((data || []).map(c => ({ id: c.id, name: c.category_name })));
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: "image_url" | "mobile_image_url"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image size must be less than 5MB", variant: "destructive" });
      return;
    }

    const setUploadingState = field === "image_url" ? setUploading : setUploadingMobile;
    setUploadingState(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `banners/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setFormData({ ...formData, [field]: urlData.publicUrl });
      toast({ title: "Success", description: "Image uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to upload image", variant: "destructive" });
    } finally {
      setUploadingState(false);
    }
  };

  const removeImage = (field: "image_url" | "mobile_image_url") => {
    setFormData({ ...formData, [field]: "" });
  };

  const handleSizePresetChange = (presetId: string) => {
    const preset = bannerSizePresets.find(p => p.id === presetId);
    if (preset) {
      setSelectedSize(preset);
      if (preset.id !== "custom") {
        setCustomWidth(preset.width);
        setCustomHeight(preset.height);
      }
    }
  };

  const handleQuickTemplate = (template: typeof bannerTemplates[0]) => {
    setFormData({
      ...initialFormState,
      title: template.title,
      subtitle: template.subtitle,
      banner_type: template.banner_type,
      link_text: template.link_text,
    });
    setEditingBanner(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        subtitle: formData.subtitle || null,
        image_url: formData.image_url,
        mobile_image_url: formData.mobile_image_url || null,
        link_url: formData.link_url || null,
        link_text: formData.link_text || null,
        display_order: formData.display_order,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        banner_type: formData.banner_type,
        background_color: formData.background_color,
        text_color: formData.text_color,
        overlay_opacity: formData.overlay_opacity,
        target_page: formData.target_page || null,
      };

      if (editingBanner) {
        const { error } = await supabase
          .from("banners")
          .update(payload)
          .eq("id", editingBanner.id);
        if (error) throw error;
        toast({ title: "Success", description: "Banner updated successfully" });
      } else {
        const { error } = await supabase.from("banners").insert([payload]);
        if (error) throw error;
        toast({ title: "Success", description: "Banner created successfully" });
      }

      setDialogOpen(false);
      setEditingBanner(null);
      setFormData(initialFormState);
      fetchBanners();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || "",
      image_url: banner.image_url,
      mobile_image_url: banner.mobile_image_url || "",
      link_url: banner.link_url || "",
      link_text: banner.link_text || "",
      display_order: banner.display_order,
      is_active: banner.is_active,
      start_date: banner.start_date ? banner.start_date.split("T")[0] : "",
      end_date: banner.end_date ? banner.end_date.split("T")[0] : "",
      banner_type: banner.banner_type || "hero",
      background_color: banner.background_color || "#000000",
      text_color: banner.text_color || "#FFFFFF",
      overlay_opacity: banner.overlay_opacity || 0.3,
      target_page: banner.target_page || "",
    });
    setDialogOpen(true);
  };

  const handleDuplicate = async (banner: Banner) => {
    try {
      const { error } = await supabase.from("banners").insert([{
        title: `${banner.title} (Copy)`,
        subtitle: banner.subtitle,
        image_url: banner.image_url,
        mobile_image_url: banner.mobile_image_url,
        link_url: banner.link_url,
        link_text: banner.link_text,
        display_order: banner.display_order + 1,
        is_active: false,
        start_date: banner.start_date,
        end_date: banner.end_date,
        banner_type: banner.banner_type,
        background_color: banner.background_color,
        text_color: banner.text_color,
        overlay_opacity: banner.overlay_opacity,
        target_page: banner.target_page,
      }]);
      if (error) throw error;
      toast({ title: "Success", description: "Banner duplicated" });
      fetchBanners();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    setBannerToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!bannerToDelete) return;
    
    try {
      const { error } = await supabase.from("banners").delete().eq("id", bannerToDelete);
      if (error) throw error;
      toast({ title: "Success", description: "Banner deleted successfully" });
      fetchBanners();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setBannerToDelete(null);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("banners")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      fetchBanners();
      toast({
        title: currentStatus ? "Banner Deactivated" : "Banner Activated",
        description: currentStatus ? "Banner is now hidden" : "Banner is now live",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const moveOrder = async (id: string, direction: "up" | "down") => {
    const index = banners.findIndex(b => b.id === id);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= banners.length) return;

    try {
      const currentOrder = banners[index].display_order;
      const swapOrder = banners[newIndex].display_order;

      await supabase.from("banners").update({ display_order: swapOrder }).eq("id", banners[index].id);
      await supabase.from("banners").update({ display_order: currentOrder }).eq("id", banners[newIndex].id);
      
      fetchBanners();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openNewDialog = () => {
    setEditingBanner(null);
    setFormData(initialFormState);
    setDialogOpen(true);
  };

  const isBannerExpired = (endDate: string | null) => endDate && new Date(endDate) < new Date();
  const isBannerUpcoming = (startDate: string | null) => startDate && new Date(startDate) > new Date();

  const getBannerStatus = (banner: Banner) => {
    if (!banner.is_active) return { label: "Inactive", color: "bg-gray-100 text-gray-800", icon: XCircle };
    if (isBannerExpired(banner.end_date)) return { label: "Expired", color: "bg-red-100 text-red-800", icon: XCircle };
    if (isBannerUpcoming(banner.start_date)) return { label: "Scheduled", color: "bg-blue-100 text-blue-800", icon: Clock };
    return { label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle2 };
  };

  const filteredBanners = banners.filter(b => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return b.is_active && !isBannerExpired(b.end_date);
    if (activeTab === "scheduled") return isBannerUpcoming(b.start_date);
    if (activeTab === "inactive") return !b.is_active || isBannerExpired(b.end_date);
    return b.banner_type === activeTab;
  });

  const stats = {
    total: banners.length,
    active: banners.filter(b => b.is_active && !isBannerExpired(b.end_date)).length,
    scheduled: banners.filter(b => isBannerUpcoming(b.start_date)).length,
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Banner Management</h1>
            <p className="text-muted-foreground">Manage homepage banners, analytics, and A/B testing</p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4">
          <div className={cn(
            "relative",
            isCompact && "overflow-hidden"
          )}>
            <TabsList className={cn(
              "grid w-full",
              isCompact 
                ? "grid-cols-none flex overflow-x-auto scrollbar-hide gap-1 p-1 bg-muted rounded-lg" 
                : "grid-cols-3"
            )}>
              <TabsTrigger 
                value="banners" 
                className={cn(
                  "flex items-center gap-2",
                  isCompact && "flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap"
                )}
              >
                <Image className="h-4 w-4" />
                {isCompact ? "Banners" : "Banners"}
              </TabsTrigger>
              <TabsTrigger 
                value="festivals" 
                className={cn(
                  "flex items-center gap-2",
                  isCompact && "flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap"
                )}
              >
                <PartyPopper className="h-4 w-4" />
                {isCompact ? "Festivals" : "Festivals"}
              </TabsTrigger>
              <TabsTrigger 
                value="design" 
                className={cn(
                  "flex items-center gap-2",
                  isCompact && "flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap"
                )}
              >
                <Sparkles className="h-4 w-4" />
                {isCompact ? "Design" : "Design Studio"}
              </TabsTrigger>
            </TabsList>
            {/* Scroll indicator for mobile */}
            {isCompact && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            )}
          </div>

          <TabsContent value="banners" className="space-y-6">
            {/* Show initializer if no banners exist */}
            {!loading && banners.length === 0 ? (
              <BannerInitializer onComplete={fetchBanners} />
            ) : (
              <>
                {/* Banner Management Content */}
                <div className="flex justify-end">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={openNewDialog}>
                        <Plus className="mr-2 h-4 w-4" /> Add Banner
                      </Button>
                    </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingBanner ? "Edit Banner" : "Add New Banner"}</DialogTitle>
                    <DialogDescription>
                      {editingBanner ? "Update your banner details" : "Create a new banner for your website"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="design">Design & Media</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="basic" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                              id="title"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              placeholder="Summer Sale - 50% Off"
                              required
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="subtitle">Subtitle</Label>
                            <Textarea
                              id="subtitle"
                              value={formData.subtitle}
                              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                              placeholder="Limited time offer on all products"
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label htmlFor="banner_type">Banner Type *</Label>
                            <Select
                              value={formData.banner_type}
                              onValueChange={(value) => setFormData({ ...formData, banner_type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hero">Hero Banner (Homepage)</SelectItem>
                                <SelectItem value="strip">Promo Strip (Top Bar)</SelectItem>
                                <SelectItem value="sidebar">Sidebar Banner</SelectItem>
                                <SelectItem value="popup">Popup Banner</SelectItem>
                                <SelectItem value="category">Category Page</SelectItem>
                                <SelectItem value="product">Product Page</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="display_order">Display Order</Label>
                            <Input
                              id="display_order"
                              type="number"
                              value={formData.display_order}
                              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="link_url">Link URL</Label>
                            <Input
                              id="link_url"
                              value={formData.link_url}
                              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                              placeholder="/products or https://..."
                            />
                          </div>
                          <div>
                            <Label htmlFor="link_text">Button Text</Label>
                            <Input
                              id="link_text"
                              value={formData.link_text}
                              onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                              placeholder="Shop Now"
                            />
                          </div>
                          <div>
                            <Label htmlFor="start_date">Start Date</Label>
                            <Input
                              id="start_date"
                              type="date"
                              value={formData.start_date}
                              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="end_date">End Date</Label>
                            <Input
                              id="end_date"
                              type="date"
                              value={formData.end_date}
                              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-6">
                            <Switch
                              id="is_active"
                              checked={formData.is_active}
                              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                            <Label htmlFor="is_active">Active immediately</Label>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="design" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Banner Size Selection */}
                          <div className="col-span-2">
                            <Label>Recommended Banner Size</Label>
                            <Select
                              value={selectedSize.id}
                              onValueChange={handleSizePresetChange}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {bannerSizePresets.map((preset) => (
                                  <SelectItem key={preset.id} value={preset.id}>
                                    {preset.name} {preset.width > 0 && `(${preset.width}×${preset.height}px)`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                              {selectedSize.description} - Recommended: {selectedSize.id === "custom" ? `${customWidth}×${customHeight}px` : `${selectedSize.width}×${selectedSize.height}px`}
                            </p>
                          </div>

                          {selectedSize.id === "custom" && (
                            <>
                              <div>
                                <Label htmlFor="custom_width">Custom Width (px)</Label>
                                <Input
                                  id="custom_width"
                                  type="number"
                                  value={customWidth}
                                  onChange={(e) => setCustomWidth(parseInt(e.target.value) || 0)}
                                  placeholder="1920"
                                />
                              </div>
                              <div>
                                <Label htmlFor="custom_height">Custom Height (px)</Label>
                                <Input
                                  id="custom_height"
                                  type="number"
                                  value={customHeight}
                                  onChange={(e) => setCustomHeight(parseInt(e.target.value) || 0)}
                                  placeholder="600"
                                />
                              </div>
                            </>
                          )}

                          {/* Desktop Image Upload */}
                          <div className="col-span-2">
                            <Label>Desktop Banner Image *</Label>
                            <div className="mt-2 space-y-3">
                              {formData.image_url ? (
                                <div className="relative">
                                  <img
                                    src={formData.image_url}
                                    alt="Desktop Preview"
                                    className="w-full h-40 object-cover rounded-lg border"
                                    onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                                  />
                                  <div 
                                    className="absolute inset-0 flex items-center justify-center rounded-lg"
                                    style={{ backgroundColor: `rgba(0,0,0,${formData.overlay_opacity})` }}
                                  >
                                    <div className="text-center p-4" style={{ color: formData.text_color }}>
                                      <h3 className="font-bold text-lg">{formData.title || "Banner Title"}</h3>
                                      {formData.subtitle && <p className="text-sm opacity-90">{formData.subtitle}</p>}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => removeImage("image_url")}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {uploading ? (
                                      <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                                    ) : (
                                      <>
                                        <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                          <span className="font-semibold">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          PNG, JPG, WebP (Max 5MB) - {selectedSize.id === "custom" ? `${customWidth}×${customHeight}px` : `${selectedSize.width}×${selectedSize.height}px`}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, "image_url")}
                                    disabled={uploading}
                                  />
                                </label>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Or enter URL:</span>
                                <Input
                                  value={formData.image_url}
                                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                  placeholder="https://example.com/banner.jpg"
                                  className="flex-1 h-8 text-sm"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Mobile Image Upload */}
                          <div className="col-span-2 p-4 border rounded-lg bg-muted/30">
                            <Label className="flex items-center gap-2 text-base font-semibold">
                              <Smartphone className="h-5 w-5" /> Mobile Banner Image (Optional)
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1 mb-3">
                              Upload a separate image optimized for mobile devices for better user experience
                            </p>
                            
                            {/* Mobile Size Recommendations */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge variant="outline" className="text-xs">
                                📱 Portrait: 768×1024px
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                📱 Square: 768×768px
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                📱 Wide: 768×400px
                              </Badge>
                            </div>

                            <div className="flex gap-4">
                              {/* Upload Area */}
                              <div className="flex-1">
                                {formData.mobile_image_url ? (
                                  <div className="relative">
                                    <img
                                      src={formData.mobile_image_url}
                                      alt="Mobile Preview"
                                      className="w-full max-w-xs h-40 object-cover rounded-lg border"
                                      onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="absolute top-2 right-2"
                                      onClick={() => removeImage("mobile_image_url")}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                    <p className="text-xs text-green-600 mt-2">✓ Mobile image uploaded</p>
                                  </div>
                                ) : (
                                  <label className="flex flex-col items-center justify-center w-full max-w-xs h-40 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50/50 transition-colors bg-blue-50/20">
                                    <div className="flex flex-col items-center justify-center p-4">
                                      {uploadingMobile ? (
                                        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                                      ) : (
                                        <>
                                          <Smartphone className="h-10 w-10 text-blue-500 mb-2" />
                                          <p className="text-sm font-medium text-blue-700">Upload Mobile Image</p>
                                          <p className="text-xs text-muted-foreground mt-1 text-center">
                                            PNG, JPG, WebP (Max 5MB)<br />
                                            Recommended: 768×400px
                                          </p>
                                        </>
                                      )}
                                    </div>
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="image/*"
                                      onChange={(e) => handleImageUpload(e, "mobile_image_url")}
                                      disabled={uploadingMobile}
                                    />
                                  </label>
                                )}
                              </div>

                              {/* Preview Mockup */}
                              <div className="hidden md:block">
                                <div className="w-24 h-40 bg-gray-900 rounded-xl p-1 shadow-lg">
                                  <div className="w-full h-full bg-white rounded-lg overflow-hidden flex items-center justify-center">
                                    {formData.mobile_image_url ? (
                                      <img
                                        src={formData.mobile_image_url}
                                        alt="Phone Preview"
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="text-center p-2">
                                        <Smartphone className="h-6 w-6 text-gray-300 mx-auto" />
                                        <p className="text-[8px] text-gray-400 mt-1">Preview</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-3">
                              <span className="text-xs text-muted-foreground">Or enter URL:</span>
                              <Input
                                value={formData.mobile_image_url}
                                onChange={(e) => setFormData({ ...formData, mobile_image_url: e.target.value })}
                                placeholder="https://example.com/banner-mobile.jpg"
                                className="flex-1 h-8 text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="text_color">Text Color</Label>
                            <div className="flex gap-2">
                              <Input
                                id="text_color"
                                type="color"
                                value={formData.text_color}
                                onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                                className="w-14 h-10 p-1"
                              />
                              <Input
                                value={formData.text_color}
                                onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                                className="flex-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="overlay_opacity">Overlay Opacity</Label>
                            <Input
                              id="overlay_opacity"
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={formData.overlay_opacity}
                              onChange={(e) => setFormData({ ...formData, overlay_opacity: parseFloat(e.target.value) })}
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">{Math.round(formData.overlay_opacity * 100)}% dark overlay</p>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">{editingBanner ? "Update" : "Create"} Banner</Button>
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
                <CardDescription>Create common banners in seconds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {bannerTemplates.map((template) => {
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
                        <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className={cn(
              "grid gap-4",
              isCompact 
                ? "grid-cols-3" 
                : "grid-cols-3"
            )}>
              <Card>
                <CardContent className={cn("pt-6", isCompact && "pt-4 pb-4")}>
                  <div className={cn(
                    "font-bold text-gray-900",
                    isCompact ? "text-xl" : "text-2xl"
                  )}>
                    {stats.total}
                  </div>
                  <p className={cn(
                    "text-muted-foreground",
                    isCompact ? "text-xs" : "text-xs"
                  )}>
                    Total Banners
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className={cn("pt-6", isCompact && "pt-4 pb-4")}>
                  <div className={cn(
                    "font-bold text-green-600",
                    isCompact ? "text-xl" : "text-2xl"
                  )}>
                    {stats.active}
                  </div>
                  <p className={cn(
                    "text-muted-foreground",
                    isCompact ? "text-xs" : "text-xs"
                  )}>
                    Active Now
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className={cn("pt-6", isCompact && "pt-4 pb-4")}>
                  <div className={cn(
                    "font-bold text-blue-600",
                    isCompact ? "text-xl" : "text-2xl"
                  )}>
                    {stats.scheduled}
                  </div>
                  <p className={cn(
                    "text-muted-foreground",
                    isCompact ? "text-xs" : "text-xs"
                  )}>
                    Scheduled
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Banners Table */}
            <Card>
              <CardHeader>
                <div className={cn(
                  "flex items-center justify-between",
                  isCompact && "flex-col gap-4 items-start"
                )}>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" /> All Banners
                  </CardTitle>
                  <div className={cn(
                    "relative",
                    isCompact && "w-full overflow-hidden"
                  )}>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className={cn(
                        isCompact 
                          ? "flex overflow-x-auto scrollbar-hide gap-1 p-1 bg-muted rounded-lg w-full" 
                          : ""
                      )}>
                        <TabsTrigger 
                          value="all"
                          className={cn(
                            isCompact && "flex-shrink-0 px-3 py-2 text-sm whitespace-nowrap"
                          )}
                        >
                          All
                        </TabsTrigger>
                        <TabsTrigger 
                          value="active"
                          className={cn(
                            isCompact && "flex-shrink-0 px-3 py-2 text-sm whitespace-nowrap"
                          )}
                        >
                          Active
                        </TabsTrigger>
                        <TabsTrigger 
                          value="scheduled"
                          className={cn(
                            isCompact && "flex-shrink-0 px-3 py-2 text-sm whitespace-nowrap"
                          )}
                        >
                          Scheduled
                        </TabsTrigger>
                        <TabsTrigger 
                          value="hero"
                          className={cn(
                            isCompact && "flex-shrink-0 px-3 py-2 text-sm whitespace-nowrap"
                          )}
                        >
                          Hero
                        </TabsTrigger>
                        <TabsTrigger 
                          value="strip"
                          className={cn(
                            isCompact && "flex-shrink-0 px-3 py-2 text-sm whitespace-nowrap"
                          )}
                        >
                          Strip
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    {/* Scroll indicator for mobile */}
                    {isCompact && (
                      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Loading banners...</p>
                  </div>
                ) : filteredBanners.length === 0 ? (
                  <div className="text-center py-12">
                    <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No banners found</h3>
                    <p className="text-muted-foreground mt-1">
                      {activeTab === "all" ? "Create your first banner to get started!" : `No ${activeTab} banners`}
                    </p>
                    <Button className="mt-4" onClick={openNewDialog}>
                      <Plus className="mr-2 h-4 w-4" /> Create Banner
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Order</TableHead>
                        <TableHead>Preview</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBanners.map((banner, index) => {
                        const status = getBannerStatus(banner);
                        const StatusIcon = status.icon;
                        const typeConfig = bannerTypeConfig[banner.banner_type] || bannerTypeConfig.hero;
                        const TypeIcon = typeConfig.icon;

                        return (
                          <TableRow key={banner.id}>
                            <TableCell>
                              <div className="flex flex-col items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveOrder(banner.id, "up")}
                                  disabled={index === 0}
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium">{banner.display_order}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveOrder(banner.id, "down")}
                                  disabled={index === filteredBanners.length - 1}
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div 
                                className="relative h-16 w-28 rounded overflow-hidden cursor-pointer group"
                                onClick={() => { setPreviewBanner(banner); setPreviewOpen(true); }}
                              >
                                <img
                                  src={banner.image_url}
                                  alt={banner.title}
                                  className="h-full w-full object-cover"
                                  onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="h-5 w-5 text-white" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{banner.title}</p>
                                {banner.subtitle && (
                                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                    {banner.subtitle}
                                  </p>
                                )}
                                {banner.link_url && (
                                  <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                                    <ExternalLink className="h-3 w-3" />
                                    <span className="truncate max-w-[150px]">{banner.link_url}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-2 ${typeConfig.color}`}>
                                <TypeIcon className="h-4 w-4" />
                                <span className="text-sm">{typeConfig.label}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {banner.start_date || banner.end_date ? (
                                <div className="text-sm">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    {banner.start_date ? format(new Date(banner.start_date), "MMM d") : "Now"} - 
                                    {banner.end_date ? format(new Date(banner.end_date), "MMM d") : "∞"}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Always</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <button onClick={() => toggleActive(banner.id, banner.is_active)}>
                                <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${status.color}`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {status.label}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleDuplicate(banner)} title="Duplicate">
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(banner)} title="Edit">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(banner.id)} title="Delete">
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
              </>
            )}
          </TabsContent>

          <TabsContent value="festivals">
            <FestivalThemeManager onBannerCreated={fetchBanners} />
          </TabsContent>

          <TabsContent value="design">
            <BannerDesignStudio onSave={() => fetchBanners()} />
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Banner Preview</DialogTitle>
            </DialogHeader>
            {previewBanner && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="flex items-center gap-2 mb-2">
                      <Monitor className="h-4 w-4" /> Desktop View
                    </Label>
                    <div className="relative rounded-lg overflow-hidden border">
                      <img
                        src={previewBanner.image_url}
                        alt={previewBanner.title}
                        className="w-full h-48 object-cover"
                      />
                      <div 
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: `rgba(0,0,0,${previewBanner.overlay_opacity || 0.3})` }}
                      >
                        <div className="text-center p-6" style={{ color: previewBanner.text_color || "#FFFFFF" }}>
                          <h2 className="text-2xl font-bold">{previewBanner.title}</h2>
                          {previewBanner.subtitle && <p className="mt-2 opacity-90">{previewBanner.subtitle}</p>}
                          {previewBanner.link_text && (
                            <Button className="mt-4" variant="secondary">
                              {previewBanner.link_text}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {previewBanner.mobile_image_url && (
                    <div className="w-48">
                      <Label className="flex items-center gap-2 mb-2">
                        <Smartphone className="h-4 w-4" /> Mobile View
                      </Label>
                      <div className="relative rounded-lg overflow-hidden border">
                        <img
                          src={previewBanner.mobile_image_url}
                          alt={previewBanner.title}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-medium">{bannerTypeConfig[previewBanner.banner_type]?.label || "Hero"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Views:</span>
                    <span className="ml-2 font-medium">{(previewBanner.view_count || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Clicks:</span>
                    <span className="ml-2 font-medium">{(previewBanner.click_count || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Delete Banner
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Are you sure you want to delete this banner?</p>
                <p className="text-sm font-medium text-destructive">
                  This action cannot be undone. The banner will be permanently removed from your system.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Banner
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
