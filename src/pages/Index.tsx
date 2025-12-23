import HeroSection from "@/components/landing/HeroSection";
import ProductCategories from "@/components/landing/ProductCategories";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import TrustSection from "@/components/landing/TrustSection";
import FAQSection from "@/components/landing/FAQSection";
import NewsletterSection from "@/components/landing/NewsletterSection";
import PartnersSection from "@/components/landing/PartnersSection";
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
      
      {/* How It Works */}
      <HowItWorksSection />
      
      {/* Products */}
      <ProductCategories />
      
      {/* Partners & Certifications */}
      <PartnersSection />
      
      {/* Testimonials */}
      <TestimonialsSection />
      
      {/* Trust Section */}
      <TrustSection />
      
      {/* FAQ */}
      <FAQSection />
      
      {/* Newsletter */}
      <NewsletterSection />
      
      {/* Footer */}
      <Footer />

      {/* Fixed Contact Button */}
      <div className="fixed right-0 top-1/3 transform -translate-y-1/2 z-50 flex flex-col gap-6">
        <Button
          asChild
          className="w-5 absolute right-0 lg:w-48 bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg rounded-l-lg rounded-r-none transition-all duration-300 md:flex"
        >
          <a
            href="tel:+18009696295"
            className="flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5 text-emerald-600 animate-pulse" />
            <span className="hidden md:block">+1 800 969 6295</span>
          </a>
        </Button>
        <br />

        {/* Inquiry Form Toggle Button */}
        <Button
          onClick={() => setShowForm(!showForm)}
          className="w-5 lg:w-48 bg-emerald-600 text-white rounded-l-lg rounded-r-none hover:bg-emerald-700 transition-all duration-300 md:block"
        >
          <span className="hidden lg:block">Quick Inquiry</span>
          <span className="block lg:hidden">
            <ShieldQuestion />
          </span>
        </Button>

        {/* Floating Inquiry Form */}
        {showForm && (
          <div className="absolute right-0 top-full mt-2 bg-white shadow-xl rounded-l-lg p-4 w-80 animate-fade-in border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Inquiry</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
                required
              />
              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                required
              />
              <Input
                type="tel"
                placeholder="Phone Number"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full"
              />
              <Textarea
                placeholder="Your Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full"
                rows={3}
                required
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {isLoading ? "Sending..." : "Send Inquiry"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
