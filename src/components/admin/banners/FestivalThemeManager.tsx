import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  festivalThemes,
  getCurrentFestival,
  getUpcomingFestivals,
  generateFestivalBanner,
  FestivalTheme
} from "@/data/festivalThemes";
import {
  Sparkles, Calendar, Clock, CheckCircle2, Plus, Eye, Wand2,
  PartyPopper, Gift, Star, Zap, RefreshCw
} from "lucide-react";
import { format, parse } from "date-fns";

interface FestivalThemeManagerProps {
  onBannerCreated?: () => void;
}

export const FestivalThemeManager = ({ onBannerCreated }: FestivalThemeManagerProps) => {
  const [currentFestival, setCurrentFestival] = useState<FestivalTheme | null>(null);
  const [upcomingFestivals, setUpcomingFestivals] = useState<FestivalTheme[]>([]);
  const [selectedFestival, setSelectedFestival] = useState<FestivalTheme | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentFestival(getCurrentFestival());
    setUpcomingFestivals(getUpcomingFestivals(4));
  }, []);

  const createFestivalBanner = async (festival: FestivalTheme) => {
    setCreating(true);
    try {
      const bannerData = generateFestivalBanner(festival);
      
      const { error } = await supabase
        .from("banners")
        .insert([{
          ...bannerData,
          display_order: 0, // Put festival banners first
          view_count: 0,
          click_count: 0
        }]);

      if (error) throw error;

      toast({
        title: "🎉 Festival Banner Created!",
        description: `${festival.name} banner is now live on your homepage.`,
      });

      if (onBannerCreated) onBannerCreated();
      setPreviewOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const openPreview = (festival: FestivalTheme) => {
    setSelectedFestival(festival);
    setPreviewOpen(true);
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = parse(start, 'MM-dd', new Date());
    const endDate = parse(end, 'MM-dd', new Date());
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <PartyPopper className="h-6 w-6 text-amber-500" />
          Festival Themes
        </h2>
        <p className="text-muted-foreground">
          Apply festive themes to your banners manually
        </p>
      </div>

      {/* Current Festival Alert */}
      {currentFestival && (
        <Card className={`border-2 bg-gradient-to-r ${currentFestival.colors.gradient} text-white overflow-hidden relative`}>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
          </div>
          <CardContent className="pt-6 relative">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{currentFestival.icon}</div>
                <div>
                  <Badge className="bg-white/20 text-white border-white/30 mb-2">
                    <Zap className="h-3 w-3 mr-1" />
                    Active Now
                  </Badge>
                  <h3 className="text-2xl font-bold">{currentFestival.name}</h3>
                  {currentFestival.nameHindi && (
                    <p className="text-white/80">{currentFestival.nameHindi}</p>
                  )}
                  <p className="text-sm text-white/70 mt-1">
                    {formatDateRange(currentFestival.startDate, currentFestival.endDate)}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-white text-gray-900 hover:bg-white/90 shadow-lg"
                onClick={() => openPreview(currentFestival)}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Create {currentFestival.name} Banner
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Festival Themes Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Festival Themes
          </CardTitle>
          <CardDescription>
            Click on any festival to preview and create a themed banner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {festivalThemes.map((festival) => {
              const isActive = currentFestival?.id === festival.id;
              const isUpcoming = upcomingFestivals.some(f => f.id === festival.id);
              
              return (
                <button
                  key={festival.id}
                  onClick={() => openPreview(festival)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    isActive 
                      ? 'border-amber-400 bg-amber-50' 
                      : isUpcoming
                        ? 'border-teal-200 bg-teal-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isActive && (
                    <Badge className="absolute -top-2 -right-2 bg-amber-500 text-white">
                      Active
                    </Badge>
                  )}
                  {isUpcoming && !isActive && (
                    <Badge className="absolute -top-2 -right-2 bg-teal-500 text-white text-xs">
                      Upcoming
                    </Badge>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ 
                        background: `linear-gradient(135deg, ${festival.colors.primary}, ${festival.colors.secondary})` 
                      }}
                    >
                      {festival.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900">{festival.name}</h4>
                      {festival.nameHindi && (
                        <p className="text-xs text-gray-500">{festival.nameHindi}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDateRange(festival.startDate, festival.endDate)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Color Preview */}
                  <div className="flex gap-1 mt-3">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow"
                      style={{ backgroundColor: festival.colors.primary }}
                    />
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow"
                      style={{ backgroundColor: festival.colors.secondary }}
                    />
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow"
                      style={{ backgroundColor: festival.colors.accent }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Festivals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-600" />
            Upcoming Festivals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {upcomingFestivals.map((festival) => (
              <div
                key={festival.id}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-full border"
              >
                <span className="text-xl">{festival.icon}</span>
                <div>
                  <span className="font-medium text-sm">{festival.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {formatDateRange(festival.startDate, festival.endDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedFestival?.icon}</span>
              {selectedFestival?.name} Banner Preview
            </DialogTitle>
            <DialogDescription>
              Preview how your festival banner will look
            </DialogDescription>
          </DialogHeader>
          
          {selectedFestival && (
            <div className="space-y-4">
              {/* Banner Preview */}
              <div className="relative rounded-xl overflow-hidden shadow-xl">
                <img
                  src={selectedFestival.stockImages[0] || "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1920&h=600&fit=crop&auto=format"}
                  alt={selectedFestival.name}
                  className="w-full h-64 object-cover"
                />
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${selectedFestival.colors.primary}cc, ${selectedFestival.colors.secondary}99)`
                  }}
                >
                  <div className="text-center p-6 text-white">
                    <Badge className="bg-white/20 text-white border-white/30 mb-3">
                      <Star className="h-3 w-3 mr-1" />
                      {selectedFestival.bannerDefaults.badge}
                    </Badge>
                    <h3 className="text-3xl font-bold mb-2 drop-shadow-lg">
                      {selectedFestival.bannerDefaults.title}
                    </h3>
                    <p className="text-lg opacity-90 mb-4 drop-shadow">
                      {selectedFestival.bannerDefaults.subtitle}
                    </p>
                    <Button className="bg-white text-gray-900 hover:bg-white/90 shadow-lg">
                      {selectedFestival.bannerDefaults.ctaText}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Theme Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-600 mb-2">Color Palette</h4>
                  <div className="flex gap-2">
                    <div className="text-center">
                      <div 
                        className="w-10 h-10 rounded-lg shadow"
                        style={{ backgroundColor: selectedFestival.colors.primary }}
                      />
                      <span className="text-xs text-gray-500">Primary</span>
                    </div>
                    <div className="text-center">
                      <div 
                        className="w-10 h-10 rounded-lg shadow"
                        style={{ backgroundColor: selectedFestival.colors.secondary }}
                      />
                      <span className="text-xs text-gray-500">Secondary</span>
                    </div>
                    <div className="text-center">
                      <div 
                        className="w-10 h-10 rounded-lg shadow"
                        style={{ backgroundColor: selectedFestival.colors.accent }}
                      />
                      <span className="text-xs text-gray-500">Accent</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-600 mb-2">Active Period</h4>
                  <p className="text-lg font-semibold">
                    {formatDateRange(selectedFestival.startDate, selectedFestival.endDate)}
                  </p>
                  {selectedFestival.nameHindi && (
                    <p className="text-sm text-gray-500">{selectedFestival.nameHindi}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createFestivalBanner(selectedFestival)}
                  disabled={creating}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Festival Banner
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
