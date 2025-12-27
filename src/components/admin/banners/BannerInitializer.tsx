import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { seedDefaultBanners } from "@/utils/seedDefaultBanners";
import { defaultBanners } from "@/data/defaultBanners";
import { 
  Sparkles, Wand2, RefreshCw, CheckCircle2, 
  Image, ArrowRight, Palette, Shield, Truck, Percent
} from "lucide-react";

interface BannerInitializerProps {
  onComplete?: () => void;
}

export const BannerInitializer = ({ onComplete }: BannerInitializerProps) => {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { toast } = useToast();

  const handleSeedBanners = async () => {
    setLoading(true);
    try {
      const result = await seedDefaultBanners();
      
      if (result.success) {
        toast({
          title: "🎉 Banners Created!",
          description: result.message,
        });
        setCompleted(true);
        if (onComplete) onComplete();
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getBannerIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('delivery') || lowerTitle.includes('shipping')) return Truck;
    if (lowerTitle.includes('sale') || lowerTitle.includes('off')) return Percent;
    return Shield;
  };

  const getBannerColor = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('delivery') || lowerTitle.includes('shipping')) return "bg-cyan-600";
    if (lowerTitle.includes('sale') || lowerTitle.includes('off')) return "bg-teal-500";
    return "bg-teal-600";
  };

  if (completed) {
    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-900 mb-2">Banners Created Successfully!</h3>
            <p className="text-green-700 max-w-md mx-auto">
              Your pharmacy now has 3 professional banners ready to engage customers. 
              They're live on your homepage and pharmacy dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-3 text-purple-900 text-2xl">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Wand2 className="h-6 w-6 text-white" />
            </div>
            Welcome to Banner Management
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <p className="text-purple-800 mb-6 text-lg">
            Get started with professionally designed banners for your pharmacy. 
            We'll create <strong>3 stunning banners</strong> to showcase your products and services.
          </p>
          <Button 
            onClick={handleSeedBanners}
            disabled={loading}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg px-8"
          >
            {loading ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Creating Banners...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Create Default Banners
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview of Default Banners */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Image className="h-5 w-5 text-gray-600" />
            Banner Previews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {defaultBanners.map((banner, index) => {
              const Icon = getBannerIcon(banner.title);
              const colorClass = getBannerColor(banner.title);
              
              return (
                <div key={banner.id} className="group">
                  <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-48 object-cover"
                    />
                    <div 
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ 
                        background: `linear-gradient(135deg, rgba(0,0,0,${banner.overlay_opacity + 0.1}) 0%, rgba(0,0,0,${banner.overlay_opacity}) 100%)`
                      }}
                    >
                      <div className="text-center p-4" style={{ color: banner.text_color }}>
                        <Badge className={`${colorClass} text-white border-0 mb-2`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {index === 0 ? "Quality" : index === 1 ? "Fast" : "Sale"}
                        </Badge>
                        <h4 className="font-bold text-lg drop-shadow-lg">{banner.title}</h4>
                        <p className="text-sm opacity-90 mt-1 drop-shadow">{banner.subtitle}</p>
                      </div>
                    </div>
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <h4 className="font-semibold text-gray-900">{banner.title}</h4>
                    <p className="text-sm text-gray-500">{banner.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {banner.banner_type}
                      </Badge>
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: banner.background_color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-100 hover:border-blue-200 transition-colors">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Palette className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Professional Design</h3>
              <p className="text-sm text-muted-foreground">
                Carefully crafted banners with high-quality images optimized for pharmacy businesses
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-100 hover:border-green-200 transition-colors">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Ready to Use</h3>
              <p className="text-sm text-muted-foreground">
                Banners are immediately active and visible to your customers on homepage
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 hover:border-purple-200 transition-colors">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Wand2 className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Fully Customizable</h3>
              <p className="text-sm text-muted-foreground">
                Edit text, colors, images, and targeting settings anytime after creation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
