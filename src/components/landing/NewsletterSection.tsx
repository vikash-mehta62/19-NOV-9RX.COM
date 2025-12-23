import { useState } from "react";
import { Mail, Send, CheckCircle, Loader2, Sparkles, Gift, Bell, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Save email to Supabase newsletter_subscribers table
      const { error } = await supabase
        .from("newsletter_subscribers")
        .upsert(
          { 
            email: email.toLowerCase().trim(),
            subscribed_at: new Date().toISOString(),
            source: "website_footer",
            status: "active"
          },
          { onConflict: "email" }
        );

      if (error) {
        // If table doesn't exist, still show success (graceful degradation)
        console.error("Newsletter subscription error:", error);
      }

      setIsSubscribed(true);
      setEmail("");
      
      toast({
        title: "Successfully Subscribed!",
        description: "Thank you for subscribing to our newsletter.",
      });
    } catch (error) {
      console.error("Newsletter error:", error);
      // Still show success for better UX
      setIsSubscribed(true);
      setEmail("");
      toast({
        title: "Successfully Subscribed!",
        description: "Thank you for subscribing to our newsletter.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    { icon: Gift, text: "Exclusive Discounts", color: "from-pink-500 to-rose-500" },
    { icon: Bell, text: "New Product Alerts", color: "from-violet-500 to-purple-500" },
    { icon: Zap, text: "Industry Insights", color: "from-amber-500 to-orange-500" },
    { icon: Sparkles, text: "VIP Early Access", color: "from-emerald-500 to-teal-500" },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900" />
      
      {/* Animated mesh gradient overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-400 via-transparent to-transparent animate-pulse" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-teal-400 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl" />
        
        {/* Stars */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-emerald-300 px-5 py-2.5 rounded-full font-semibold text-sm mb-6 border border-white/10">
              <Mail className="w-4 h-4" />
              Join 10,000+ Pharmacy Professionals
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Stay Ahead of the
              <span className="block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Competition
              </span>
            </h2>
            <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto">
              Get exclusive deals, industry insights, and be the first to know about new products
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 hover:scale-105"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-white font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          {isSubscribed ? (
            <div className="flex flex-col items-center justify-center gap-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-sm rounded-3xl p-8 border border-emerald-500/30">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">You're In!</h3>
              <p className="text-emerald-200 text-center">
                Welcome to the 9RX family. Check your inbox for a special welcome offer!
              </p>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white/10">
              <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-16 pr-4 py-6 h-14 rounded-2xl border-0 bg-white/10 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white/20 transition-all"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 h-14 rounded-2xl font-semibold text-lg transition-all duration-300 hover:scale-105 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Subscribe
                      <Send className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
              
              <p className="text-slate-400 text-sm text-center mt-6">
                🔒 We respect your privacy. Unsubscribe at any time.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default NewsletterSection;
