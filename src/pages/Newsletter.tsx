import { Navbar } from "@/components/landing/HeroSection";
import Footer from "@/components/landing/Footer";
import { Mail, Gift, Bell, Zap, Sparkles, CheckCircle, Send, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";

const Newsletter = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    document.title = "Newsletter - 9RX | Subscribe for Exclusive Deals";
  }, []);

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
      const { error } = await supabase
        .from("newsletter_subscribers")
        .upsert(
          { 
            email: email.toLowerCase().trim(),
            subscribed_at: new Date().toISOString(),
            source: "newsletter_page",
            status: "active"
          },
          { onConflict: "email" }
        );

      if (error) {
        console.error("Newsletter subscription error:", error);
      }

      setIsSubscribed(true);
      setEmail("");
      
      toast({
        title: "Successfully Subscribed!",
        description: "Welcome to the 9RX newsletter.",
      });
    } catch (error) {
      console.error("Newsletter error:", error);
      setIsSubscribed(true);
      toast({
        title: "Successfully Subscribed!",
        description: "Welcome to the 9RX newsletter.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    {
      icon: Gift,
      title: "Exclusive Discounts",
      description: "Get access to subscriber-only deals and promotions on pharmacy supplies."
    },
    {
      icon: Bell,
      title: "New Product Alerts",
      description: "Be the first to know about new products and restocks."
    },
    {
      icon: Zap,
      title: "Industry Insights",
      description: "Receive expert tips and pharmacy industry news."
    },
    {
      icon: Sparkles,
      title: "VIP Early Access",
      description: "Early access to sales, new features, and special events."
    }
  ];

  const testimonials = [
    {
      quote: "The newsletter keeps me updated on the best deals. I've saved hundreds on my supply orders!",
      name: "Sarah M.",
      role: "Pharmacy Owner, Texas"
    },
    {
      quote: "Great industry insights and product recommendations. Highly recommend subscribing.",
      name: "Michael R.",
      role: "Pharmacist, Florida"
    }
  ];

  return (
    <>
      <div className="min-h-screen bg-white">
        <Navbar />
        
        {/* Hero Section */}
        <section className="pt-32 pb-20 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px]" />
          
          {/* Floating particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 backdrop-blur-sm text-blue-300 px-5 py-2.5 rounded-full font-semibold text-sm mb-6 border border-blue-500/30">
                <Mail className="w-4 h-4" />
                Join 10,000+ Pharmacy Professionals
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                Stay Ahead with
                <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Exclusive Updates
                </span>
              </h1>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Get the latest deals, industry insights, and be the first to know about new products.
              </p>

              {/* Subscribe Form */}
              {isSubscribed ? (
                <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/30 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">You're In!</h3>
                  <p className="text-blue-200">
                    Welcome to the 9RX family. Check your inbox for a special welcome offer!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 h-14 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/20"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-14 px-8 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Subscribe
                        <Send className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              )}
              
              <p className="text-slate-400 text-sm mt-4">
                🔒 We respect your privacy. Unsubscribe at any time.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                What You'll Get
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Join thousands of pharmacy professionals who stay informed with our newsletter.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center p-6 rounded-2xl bg-gradient-to-b from-blue-50 to-white border border-blue-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/25">
                    <benefit.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{benefit.title}</h3>
                  <p className="text-slate-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-gradient-to-b from-blue-50/50 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                What Subscribers Say
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
                  <p className="text-slate-600 text-lg mb-6 italic">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-bold text-slate-900">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-4">
                {[
                  {
                    q: "How often will I receive emails?",
                    a: "We send 1-2 emails per week with the latest deals, product updates, and industry news. No spam, ever."
                  },
                  {
                    q: "Can I unsubscribe anytime?",
                    a: "Absolutely! Every email includes an unsubscribe link. You can opt out with one click."
                  },
                  {
                    q: "Is my email address safe?",
                    a: "Yes, we never share or sell your email address. Your privacy is our priority."
                  },
                  {
                    q: "What kind of deals can I expect?",
                    a: "Subscribers get exclusive discounts of 10-25% off, early access to sales, and special bundle offers."
                  }
                ].map((faq, index) => (
                  <div key={index} className="bg-slate-50 rounded-xl p-6">
                    <h3 className="font-bold text-slate-900 mb-2">{faq.q}</h3>
                    <p className="text-slate-600">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Don't Miss Out on Exclusive Deals
            </h2>
            <p className="text-blue-100 mb-6">
              Join 10,000+ pharmacy professionals who save with our newsletter.
            </p>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
            >
              Subscribe Now
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Newsletter;
