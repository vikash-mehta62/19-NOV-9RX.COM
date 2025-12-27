import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Palette, Wand2, Image, Type, Layout, Save, Eye,
  Download, Upload, Sparkles, RefreshCw, Copy, Trash2
} from "lucide-react";
import { defaultBanners, bannerDesignTemplates, pharmacyStockImages } from "@/data/defaultBanners";

interface BannerDesign {
  title: string;
  subtitle: string;
  image_url: string;
  mobile_image_url: string;
  background_color: string;
  text_color: string;
  overlay_opacity: number;
  link_url: string;
  link_text: string;
  banner_type: string;
}

interface BannerDesignStudioProps {
  onSave?: (banner: any) => void;
  editingBanner?: any;
}

export const BannerDesignStudio = ({ onSave, editingBanner }: BannerDesignStudioProps) => {
  const [design, setDesign] = useState<BannerDesign>({
    title: "Your Banner Title",
    subtitle: "Compelling subtitle that drives action",
    image_url: pharmacyStockImages[0].images[0].url,
    mobile_image_url: pharmacyStockImages[0].images[0].mobile,
    background_color: "#1e40af",
    text_color: "#ffffff",
    overlay_opacity: 0.4,
    link_url: "/products",
    link_text: "Shop Now",
    banner_type: "hero"
  });

  const [selectedTemplate, setSelectedTemplate] = useState(bannerDesignTemplates[0]);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (editingBanner) {
      setDesign({
        title: editingBanner.title || "Your Banner Title",
        subtitle: editingBanner.subtitle || "Compelling subtitle that drives action",
        image_url: editingBanner.image_url || pharmacyStockImages[0].images[0].url,
        mobile_image_url: editingBanner.mobile_image_url || pharmacyStockImages[0].images[0].mobile,
        background_color: editingBanner.background_color || "#1e40af",
        text_color: editingBanner.text_color || "#ffffff",
        overlay_opacity: editingBanner.overlay_opacity || 0.4,
        link_url: editingBanner.link_url || "/products",
        link_text: editingBanner.link_text || "Shop Now",
        banner_type: editingBanner.banner_type || "hero"
      });
    }
  }, [editingBanner]);

  const applyTemplate = (template: typeof bannerDesignTemplates[0]) => {
    setSelectedTemplate(template);
    setDesign(prev => ({
      ...prev,
      background_color: template.colors.primary,
      text_color: template.colors.text,
      overlay_opacity: template.overlay
    }));
  };

  const applyStockImage = (imageData: any) => {
    setDesign(prev => ({
      ...prev,
      image_url: imageData.url,
      mobile_image_url: imageData.mobile
    }));
  };

  const loadDefaultBanner = (banner: typeof defaultBanners[0]) => {
    setDesign({
      title: banner.title,
      subtitle: banner.subtitle,
      image_url: banner.image_url,
      mobile_image_url: banner.mobile_image_url,
      background_color: banner.background_color,
      text_color: banner.text_color,
      overlay_opacity: banner.overlay_opacity,
      link_url: banner.link_url,
      link_text: banner.link_text,
      banner_type: banner.banner_type
    });
  };

  const saveBanner = async () => {
    setSaving(true);
    try {
      const bannerData = {
        ...design,
        display_order: editingBanner?.display_order || 1,
        is_active: editingBanner?.is_active ?? true,
        target_user_types: editingBanner?.target_user_types || ["all"],
        target_devices: editingBanner?.target_devices || ["all"],
        target_locations: editingBanner?.target_locations || [],
      };

      if (editingBanner) {
        const { error } = await supabase
          .from("banners")
          .update(bannerData)
          .eq("id", editingBanner.id);
        if (error) throw error;
        toast({ title: "Success", description: "Banner updated successfully" });
      } else {
        const { error } = await supabase.from("banners").insert([bannerData]);
        if (error) throw error;
        toast({ title: "Success", description: "Banner created successfully" });
      }

      if (onSave) onSave(bannerData);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const BannerPreview = ({ isMobile = false }) => {
    const imageUrl = isMobile ? design.mobile_image_url : design.image_url;
    const containerClass = isMobile 
      ? "w-full max-w-sm mx-auto h-64" 
      : "w-full h-80";

    return (
      <div className={`relative rounded-xl overflow-hidden shadow-2xl ${containerClass}`}>
        <img
          src={imageUrl}
          alt="Banner Preview"
          className="w-full h-full object-cover"
          onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1920&h=600&fit=crop&auto=format")}
        />
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            background: `linear-gradient(135deg, rgba(0,0,0,${design.overlay_opacity + 0.1}) 0%, rgba(0,0,0,${design.overlay_opacity}) 100%)`
          }}
        >
          <div className="text-center p-6" style={{ color: design.text_color }}>
            <h2 className={`font-bold mb-3 drop-shadow-lg ${isMobile ? 'text-xl' : 'text-3xl md:text-4xl'}`}>
              {design.title}
            </h2>
            {design.subtitle && (
              <p className={`opacity-90 mb-5 drop-shadow ${isMobile ? 'text-sm' : 'text-lg'}`}>
                {design.subtitle}
              </p>
            )}
            {design.link_text && (
              <Button 
                className="bg-white text-gray-900 hover:bg-white/90 shadow-lg font-semibold"
                size={isMobile ? "sm" : "lg"}
              >
                {design.link_text}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-purple-600" />
            Banner Design Studio
          </h2>
          <p className="text-muted-foreground">Create stunning pharmacy banners with professional templates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(previewMode === "desktop" ? "mobile" : "desktop")}>
            {previewMode === "desktop" ? "📱 Mobile" : "🖥️ Desktop"} Preview
          </Button>
          <Button onClick={saveBanner} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {editingBanner ? "Update" : "Save"} Banner
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Design Controls */}
        <div className="space-y-6">
          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="presets">Presets</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-5 w-5" />
                    Design Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    {bannerDesignTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedTemplate.id === template.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={template.preview}
                            alt={template.name}
                            className="w-16 h-10 object-cover rounded"
                          />
                          <div>
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-muted-foreground">{template.category}</p>
                            <div className="flex gap-1 mt-1">
                              <div 
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: template.colors.primary }}
                              />
                              <div 
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: template.colors.secondary }}
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Stock Images
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pharmacyStockImages.map((category) => (
                      <div key={category.category}>
                        <h4 className="font-medium mb-2">{category.category}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {category.images.map((image, index) => (
                            <button
                              key={index}
                              onClick={() => applyStockImage(image)}
                              className="relative group rounded-lg overflow-hidden border hover:border-purple-500 transition-colors"
                            >
                              <img
                                src={image.url}
                                alt={image.description}
                                className="w-full h-20 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="h-4 w-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="h-5 w-5" />
                    Banner Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={design.title}
                      onChange={(e) => setDesign({ ...design, title: e.target.value })}
                      placeholder="Enter banner title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subtitle">Subtitle</Label>
                    <Textarea
                      id="subtitle"
                      value={design.subtitle}
                      onChange={(e) => setDesign({ ...design, subtitle: e.target.value })}
                      placeholder="Enter banner subtitle"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="link_text">Button Text</Label>
                    <Input
                      id="link_text"
                      value={design.link_text}
                      onChange={(e) => setDesign({ ...design, link_text: e.target.value })}
                      placeholder="Call to action text"
                    />
                  </div>
                  <div>
                    <Label htmlFor="link_url">Link URL</Label>
                    <Input
                      id="link_url"
                      value={design.link_url}
                      onChange={(e) => setDesign({ ...design, link_url: e.target.value })}
                      placeholder="/products or https://..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="design" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Visual Design
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="background_color">Background Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="background_color"
                        type="color"
                        value={design.background_color}
                        onChange={(e) => setDesign({ ...design, background_color: e.target.value })}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={design.background_color}
                        onChange={(e) => setDesign({ ...design, background_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="text_color">Text Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="text_color"
                        type="color"
                        value={design.text_color}
                        onChange={(e) => setDesign({ ...design, text_color: e.target.value })}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={design.text_color}
                        onChange={(e) => setDesign({ ...design, text_color: e.target.value })}
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
                      value={design.overlay_opacity}
                      onChange={(e) => setDesign({ ...design, overlay_opacity: parseFloat(e.target.value) })}
                      className="w-full mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round(design.overlay_opacity * 100)}% dark overlay
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="banner_type">Banner Type</Label>
                    <Select
                      value={design.banner_type}
                      onValueChange={(value) => setDesign({ ...design, banner_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hero">Hero Banner</SelectItem>
                        <SelectItem value="strip">Promo Strip</SelectItem>
                        <SelectItem value="sidebar">Sidebar</SelectItem>
                        <SelectItem value="popup">Popup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="presets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Default Banners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {defaultBanners.map((banner, index) => (
                      <button
                        key={banner.id}
                        onClick={() => loadDefaultBanner(banner)}
                        className="w-full p-3 rounded-lg border hover:border-purple-500 text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={banner.image_url}
                            alt={banner.title}
                            className="w-16 h-10 object-cover rounded"
                          />
                          <div>
                            <h4 className="font-medium">{banner.title}</h4>
                            <p className="text-sm text-muted-foreground">{banner.subtitle}</p>
                            <Badge variant="outline" className="mt-1">
                              {banner.description}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
                <Badge variant="outline">{previewMode}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BannerPreview isMobile={previewMode === "mobile"} />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Export Design
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Banner
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                Upload Custom Image
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};