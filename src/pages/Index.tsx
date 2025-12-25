import HeroSection from "@/components/landing/HeroSection";
import ProductCategories from "@/components/landing/ProductCategories";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import TrustSection from "@/components/landing/TrustSection";
import FAQSection from "@/components/landing/FAQSection";
import NewsletterSection from "@/components/landing/NewsletterSection";
import PartnersSection from "@/components/landing/PartnersSection";
import RewardsSection from "@/components/landing/RewardsSection";
import FeaturedProducts from "@/components/landing/FeaturedProducts";
import StatsBar from "@/components/landing/StatsBar";
import Footer from "@/components/landing/Footer";
// FestivalBanner removed from landing page for cleaner hero design
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Phone, ShieldQuestion } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import axios from "../../axiosconfig";

const Index = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    toast({
      title: "Submitting...",
      description: "Please wait while we send your inquiry.",
    });

    try {
      const response = await axios.post("/contact", {
        name,
        email,
        contact,
        message,
      });

      console.log("Successful:", response.data);

      toast({
        title: "Inquiry Sent",
        description: "We'll get back to you soon!",
        variant: "default",
      });

      setName("");
      setEmail("");
      setContact("");
      setMessage("");
      setShowForm(false);
    } catch (error: any) {
      console.error("Error:", error.response?.data || error.message);

      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Stats Bar - Social Proof */}
      <StatsBar />
      
      {/* Featured Products */}
      <FeaturedProducts />
      
      {/* How It Works */}
      <HowItWorksSection />
      
      {/* Rewards Program */}
      <RewardsSection />
      
      {/* Partners & Testimonials */}
      <PartnersSection />
      
      {/* Trust Section */}
      <TrustSection />
      
      {/* FAQ */}
      <FAQSection />
      
      {/* Newsletter */}
      <NewsletterSection />
      
      {/* Footer */}
      <Footer />

      {/* Fixed Contact Buttons - Always Visible */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[9999] flex flex-col gap-2 sm:gap-3">
        {/* Phone Button */}
        <a
          href="tel:+18009696295"
          className="group flex items-center bg-white shadow-xl sm:shadow-2xl rounded-l-xl sm:rounded-l-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 border border-slate-200"
        >
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 pr-3 sm:pr-5">
            <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <Phone className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
            </div>
            <div className="hidden md:block">
              <p className="text-xs text-slate-500 font-medium">Call Us Now</p>
              <p className="text-sm font-bold text-slate-800">+1 800 969 6295</p>
            </div>
          </div>
        </a>

        {/* Quick Inquiry Button */}
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="group flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl sm:shadow-2xl rounded-l-xl sm:rounded-l-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 cursor-pointer"
        >
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 pr-3 sm:pr-5">
            <div className="w-8 sm:w-10 h-8 sm:h-10 bg-white/20 backdrop-blur rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldQuestion className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs text-blue-200 font-medium">Need Help?</p>
              <p className="text-sm font-bold text-white">Quick Inquiry</p>
            </div>
          </div>
        </button>

        {/* Floating Inquiry Form */}
        {showForm && (
          <div className="fixed sm:absolute right-2 sm:right-0 top-auto sm:top-full bottom-20 sm:bottom-auto mt-0 sm:mt-3 bg-white shadow-2xl rounded-xl sm:rounded-l-2xl sm:rounded-br-2xl p-4 sm:p-5 w-[calc(100vw-1rem)] sm:w-80 border border-slate-200 z-[10000] max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Quick Inquiry</h3>
                <p className="text-xs text-slate-500">We'll respond within 2 hours</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="text-slate-500 text-lg leading-none">×</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
              <Input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 sm:h-11 rounded-lg sm:rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
                required
              />
              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 sm:h-11 rounded-lg sm:rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
                required
              />
              <Input
                type="tel"
                placeholder="Phone Number"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full h-10 sm:h-11 rounded-lg sm:rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
              <Textarea
                placeholder="How can we help you?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg sm:rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 resize-none text-sm"
                rows={3}
                required
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 sm:h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg sm:rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all text-sm"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send Inquiry"
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
