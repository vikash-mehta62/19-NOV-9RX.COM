import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bug, Lightbulb, Loader2, MessageSquare, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type FeedbackType = "bug" | "suggestion" | "other";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_APP_BASE_URL ||
  "https://9rx.mahitechnocrafts.in";

export function PharmacyFeedbackWidget() {
  const location = useLocation();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const pageUrl = useMemo(
    () => `${location.pathname}${location.search || ""}`,
    [location.pathname, location.search]
  );

  const resetForm = () => {
    setFeedbackType("bug");
    setMessage("");
    setImages([]);
  };

  if (isHidden) {
    return null;
  }

  const submitFeedback = async () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 10) {
      toast({
        title: "Feedback too short",
        description: "Please enter at least 10 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        toast({
          title: "Session expired",
          description: "Please login again and submit feedback.",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append("feedbackType", feedbackType);
      formData.append("message", trimmedMessage);
      formData.append("pageUrl", pageUrl);
      images.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Unable to submit feedback");
      }

      toast({
        title: "Feedback sent",
        description: "Thanks. We have received your report.",
      });
      resetForm();
      setOpen(false);
    } catch (error) {
      toast({
        title: "Submission failed",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && !isSubmitting) {
          resetForm();
        }
      }}
    >
      <div className="fixed bottom-24 right-4 z-50 sm:bottom-6">
        <div
          className="absolute -top-11 right-0 w-[170px] rounded-md bg-white/95 px-2 py-1 text-center text-[11px] font-medium leading-tight text-slate-700 shadow-sm"
          style={{ animation: "feedbackTextFade 3.4s ease-in-out infinite" }}
        >
          Found an issue? Send feedback
        </div>

        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute -top-14 -right-2 h-5 w-5 rounded-full border border-slate-200 bg-white p-0 shadow-sm hover:bg-slate-100"
          aria-label="Hide feedback button"
          onClick={() => setIsHidden(true)}
        >
          <X className="h-3 w-3" />
        </Button>

        <DialogTrigger asChild>
          <Button
            className="relative h-12 w-12 rounded-full bg-blue-600 p-0 shadow-lg hover:bg-blue-700"
            aria-label="Send feedback"
          >
            <MessageSquare className="h-5 w-5 text-white" />
          </Button>
        </DialogTrigger>
      </div>

      <style>{`
        @keyframes feedbackTextFade {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
      `}</style>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
          Help us improve. Describe the issue or share your ideas for new features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={feedbackType === "bug" ? "default" : "outline"}
              onClick={() => setFeedbackType("bug")}
              className="gap-1"
            >
              <Bug className="h-4 w-4" />
              Bug
            </Button>
            <Button
              type="button"
              variant={feedbackType === "suggestion" ? "default" : "outline"}
              onClick={() => setFeedbackType("suggestion")}
              className="gap-1"
            >
              <Lightbulb className="h-4 w-4" />
              Idea
            </Button>
            <Button
              type="button"
              variant={feedbackType === "other" ? "default" : "outline"}
              onClick={() => setFeedbackType("other")}
            >
              Other
            </Button>
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={5}
            maxLength={2000}
            disabled={isSubmitting}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">Attach images (optional)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={isSubmitting}
              onChange={(e) => {
                const selected = Array.from(e.target.files || []);
                const validFiles = selected.slice(0, 5);
                setImages(validFiles);
              }}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            {images.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {images.length} image{images.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>
          
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={submitFeedback}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PharmacyFeedbackWidget;
