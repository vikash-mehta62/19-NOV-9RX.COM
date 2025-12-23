import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Info, AlertTriangle, CheckCircle, XCircle, Gift, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Announcement {
  id: string;
  title: string;
  message: string;
  announcement_type: "info" | "warning" | "success" | "error" | "promo";
  display_type: "banner" | "popup" | "toast";
  target_audience: string;
  link_url: string | null;
  link_text: string | null;
  is_dismissible: boolean;
  priority: number;
}

const typeStyles = {
  info: {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
    icon: <Info className="h-5 w-5 text-blue-500" />,
  },
  warning: {
    bg: "bg-yellow-50 border-yellow-200",
    text: "text-yellow-800",
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  },
  success: {
    bg: "bg-green-50 border-green-200",
    text: "text-green-800",
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
  },
  error: {
    bg: "bg-red-50 border-red-200",
    text: "text-red-800",
    icon: <XCircle className="h-5 w-5 text-red-500" />,
  },
  promo: {
    bg: "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200",
    text: "text-purple-800",
    icon: <Gift className="h-5 w-5 text-purple-500" />,
  },
};

interface AnnouncementDisplayProps {
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
}

export function AnnouncementDisplay({ userRole = "pharmacy" }: AnnouncementDisplayProps) {
  const { toast } = useToast();
  const [bannerAnnouncements, setBannerAnnouncements] = useState<Announcement[]>([]);
  const [popupAnnouncement, setPopupAnnouncement] = useState<Announcement | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // Load dismissed announcements from localStorage
    const dismissed = JSON.parse(localStorage.getItem("dismissedAnnouncements") || "[]");
    setDismissedIds(dismissed);
    
    fetchAnnouncements();
  }, [userRole]);

  const fetchAnnouncements = async () => {
    try {
      const now = new Date().toISOString();
      const dismissed = JSON.parse(localStorage.getItem("dismissedAnnouncements") || "[]");

      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .or(`target_audience.eq.all,target_audience.eq.${userRole}`)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order("priority", { ascending: false });

      if (error) throw error;

      const activeAnnouncements = (data || []).filter(
        (a) => !dismissed.includes(a.id)
      );

      // Separate by display type
      const banners = activeAnnouncements.filter((a) => a.display_type === "banner");
      const popups = activeAnnouncements.filter((a) => a.display_type === "popup");
      const toasts = activeAnnouncements.filter((a) => a.display_type === "toast");

      setBannerAnnouncements(banners);

      // Show first popup if any
      if (popups.length > 0) {
        setPopupAnnouncement(popups[0]);
        setShowPopup(true);
      }

      // Show toasts
      toasts.forEach((announcement, index) => {
        setTimeout(() => {
          toast({
            title: announcement.title,
            description: announcement.message,
            variant: announcement.announcement_type === "error" ? "destructive" : "default",
          });
          // Auto-dismiss toast announcements
          if (announcement.is_dismissible) {
            dismissAnnouncement(announcement.id);
          }
        }, index * 1000); // Stagger toasts
      });
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  };

  const dismissAnnouncement = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem("dismissedAnnouncements", JSON.stringify(newDismissed));
    
    // Remove from banners
    setBannerAnnouncements((prev) => prev.filter((a) => a.id !== id));
    
    // Close popup if it's the dismissed one
    if (popupAnnouncement?.id === id) {
      setShowPopup(false);
      setPopupAnnouncement(null);
    }
  };

  if (bannerAnnouncements.length === 0 && !popupAnnouncement) {
    return null;
  }

  return (
    <>
      {/* Banner Announcements */}
      {bannerAnnouncements.length > 0 && (
        <div className="space-y-2 mb-4">
          {bannerAnnouncements.map((announcement) => {
            const style = typeStyles[announcement.announcement_type];
            return (
              <div
                key={announcement.id}
                className={`${style.bg} border rounded-lg p-3 flex items-center justify-between gap-4`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {style.icon}
                  <div className="flex-1">
                    <p className={`font-medium ${style.text}`}>{announcement.title}</p>
                    <p className={`text-sm ${style.text} opacity-80`}>{announcement.message}</p>
                  </div>
                  {announcement.link_url && (
                    <a
                      href={announcement.link_url}
                      className={`text-sm font-medium ${style.text} hover:underline flex items-center gap-1`}
                      target={announcement.link_url.startsWith("http") ? "_blank" : undefined}
                      rel={announcement.link_url.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {announcement.link_text || "Learn More"}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {announcement.is_dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => dismissAnnouncement(announcement.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Popup Announcement */}
      {popupAnnouncement && (
        <Dialog open={showPopup} onOpenChange={(open) => {
          if (!open && popupAnnouncement.is_dismissible) {
            dismissAnnouncement(popupAnnouncement.id);
          }
          setShowPopup(open);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {typeStyles[popupAnnouncement.announcement_type].icon}
                <DialogTitle>{popupAnnouncement.title}</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                {popupAnnouncement.message}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              {popupAnnouncement.link_url && (
                <Button asChild variant="outline">
                  <a
                    href={popupAnnouncement.link_url}
                    target={popupAnnouncement.link_url.startsWith("http") ? "_blank" : undefined}
                    rel={popupAnnouncement.link_url.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {popupAnnouncement.link_text || "Learn More"}
                  </a>
                </Button>
              )}
              {popupAnnouncement.is_dismissible && (
                <Button onClick={() => dismissAnnouncement(popupAnnouncement.id)}>
                  Got it
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default AnnouncementDisplay;
