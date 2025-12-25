import { Navbar } from "@/components/landing/HeroSection";
import Footer from "@/components/landing/Footer";
import { Phone, Mail, MapPin, Clock, Send, MessageSquare, Headphones, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import axios from "../../axiosconfig";

const Contact = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = "Contact Us - 9RX | Get in Touch";
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await axios.post("/contact", {
        name: formData.name,
        email: formData.email,
        contact: formData.phone,
        message: `Company: ${formData.company}\nSubject: ${formData.subject}\n\n${formData.message}`
      });

      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24 hours.",
      });

      setFormData({ name: "", email: "", phone: "", company: "", subject: "", message: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: Phone,
      title: "Phone",
      value: "+1 800 969 6295",
      description: "Mon-Fri 9AM-6PM EST",
      href: "tel:+18009696295"
    },
    {
      icon: Mail,
      title: "Email",
      value: "info@9rx.com",
      description: "We reply within 24 hours",
      href: "mailto:info@9rx.com"
    },
    {
      icon: MapPin,
      title: "Address",
      value: "936 Broad River Ln",
      description: "Charlotte, NC 28211",
      href: "https://maps.google.com/?q=936+Broad+River+Ln+Charlotte+NC+28211"
    },
    {
      icon: Clock,
      title: "Business Hours",
      value: "Mon - Fri: 9AM - 6PM",
      description: "EST Time Zone",
      href: null
    }
  ];

  const reasons = [
    { icon: Headphones, title: "Sales Inquiry", description: "Get pricing and product information" },
    { icon: MessageSquare, title: "Customer Support", description: "Help with existing orders" },
    { icon: Building2, title: "Partnership", description: "Become a distributor or partner" },
  ];

  return (
    <>
      <div className="min-h-screen bg-white">
        <Navbar />
        
        {/* Hero Section */}
        <section className="pt-32 pb-16 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 backdrop-blur-sm text-blue-300 px-5 py-2.5 rounded-full font-semibold text-sm mb-6 border border-blue-500/30">
                <MessageSquare className="w-4 h-4" />
                Contact Us
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                We'd Love to
                <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Hear From You
                </span>
              </h1>
              <p className="text-lg text-slate-300">
                Have questions about our products or services? Our team is here to help.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-12 bg-white relative -mt-8 z-20">
          <div className="container mx-auto px-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactInfo.map((info, index) => (
                <a
                  key={index}
                  href={info.href || "#"}
                  className={`bg-white rounded-2xl p-6 shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${!info.href ? 'cursor-default' : ''}`}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                    <info.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-500 text-sm mb-1">{info.title}</h3>
                  <p className="font-bold text-slate-900 text-lg mb-1">{info.value}</p>
                  <p className="text-slate-500 text-sm">{info.description}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="py-20 bg-gradient-to-b from-white to-blue-50/50">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16">
              {/* Form */}
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Send Us a Message</h2>
                <p className="text-slate-600 mb-8">Fill out the form below and we'll get back to you within 24 hours.</p>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                      <Input
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                      <Input
                        type="email"
                        placeholder="john@pharmacy.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Company/Pharmacy Name</label>
                      <Input
                        type="text"
                        placeholder="ABC Pharmacy"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Subject *</label>
                    <Input
                      type="text"
                      placeholder="How can we help you?"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="h-12 rounded-xl"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Message *</label>
                    <Textarea
                      placeholder="Tell us more about your inquiry..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="rounded-xl resize-none"
                      rows={5}
                      required
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Send Message
                      </span>
                    )}
                  </Button>
                </form>
              </div>

              {/* Right Side Info */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-6">How Can We Help?</h3>
                  <div className="space-y-4">
                    {reasons.map((reason, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-100 hover:shadow-lg transition-shadow">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <reason.icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{reason.title}</h4>
                          <p className="text-sm text-slate-500">{reason.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Map Placeholder */}
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl h-64 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">936 Broad River Ln</p>
                    <p className="text-slate-500">Charlotte, NC 28211</p>
                  </div>
                </div>

                {/* Quick Contact */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
                  <h4 className="font-bold text-lg mb-2">Need Immediate Help?</h4>
                  <p className="text-blue-100 text-sm mb-4">Our support team is available Monday through Friday.</p>
                  <a
                    href="tel:+18009696295"
                    className="inline-flex items-center gap-2 bg-white text-blue-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call Now
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Contact;
