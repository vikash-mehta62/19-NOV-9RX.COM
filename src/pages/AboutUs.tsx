import { Navbar } from "@/components/landing/HeroSection";
import Footer from "@/components/landing/Footer";
import { Building2, Users, Award, Truck, Heart, Target, Eye, Shield, Clock, Package, Star, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

const AboutUs = () => {
  useEffect(() => {
    document.title = "About Us - 9RX | Premium Pharmacy Supplies";
  }, []);

  const stats = [
    { icon: Building2, value: "250+", label: "Partner Pharmacies" },
    { icon: Package, value: "500+", label: "Products Available" },
    { icon: Star, value: "98%", label: "Satisfaction Rate" },
    { icon: Clock, value: "14+", label: "Years Experience" },
  ];

  const values = [
    {
      icon: Heart,
      title: "Customer First",
      description: "We prioritize our customers' needs and work tirelessly to exceed their expectations with every order."
    },
    {
      icon: Shield,
      title: "Quality Assured",
      description: "All our products meet standards and undergo rigorous quality checks before reaching you."
    },
    {
      icon: Truck,
      title: "Fast & Reliable",
      description: "Same-day dispatch for orders before 3 PM EST, with real-time tracking for complete peace of mind."
    },
    {
      icon: Award,
      title: "Industry Expertise",
      description: "Over 14 years of experience serving independent pharmacies with specialized knowledge and support."
    },
  ];

  const team = [
    {
      name: "Snehal Patel",
      role: "Founder & CEO",
      description: "With over 14 years in pharmacy supply chain, Snehal founded 9RX to revolutionize how independent pharmacies source their supplies.",
      initials: "SP"
    },
    {
      name: "Rajesh Kumar",
      role: "Operations Director",
      description: "Rajesh ensures seamless operations and timely delivery, managing our nationwide distribution network.",
      initials: "RK"
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-white">
        <Navbar />
        
        {/* Hero Section */}
        <section className="pt-32 pb-20 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px]" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 backdrop-blur-sm text-blue-300 px-5 py-2.5 rounded-full font-semibold text-sm mb-6 border border-blue-500/30">
                <Building2 className="w-4 h-4" />
                About 9RX
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                Your Trusted Partner in
                <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Pharmacy Supplies
                </span>
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Since 2010, we've been dedicated to providing independent pharmacies with premium quality supplies at competitive prices.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white relative -mt-10 z-20">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-1">{stat.value}</div>
                  <div className="text-slate-500 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-20 bg-gradient-to-b from-white to-blue-50/50">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-semibold text-sm mb-6">
                  <Target className="w-4 h-4" />
                  Our Story
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                  Built by Pharmacists, for Pharmacists
                </h2>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p>
                    9RX was founded in 2010 with a simple mission: to provide independent pharmacies with the same quality supplies and competitive pricing that large chains enjoy.
                  </p>
                  <p>
                    Our founder, Snehal Patel, experienced firsthand the challenges of sourcing quality pharmacy supplies at reasonable prices. This inspired him to create 9RX – a company dedicated to serving the unique needs of independent pharmacies.
                  </p>
                  <p>
                    Today, we proudly serve over 250 pharmacies across the United States, offering everything from RX vials and prescription labels to custom-branded paper bags and packaging solutions.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 text-white">
                  <Eye className="w-12 h-12 mb-6 opacity-80" />
                  <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
                  <p className="text-blue-100 leading-relaxed">
                    To be the most trusted and reliable pharmacy supply partner in America, empowering independent pharmacies to thrive through quality products, competitive pricing, and exceptional service.
                  </p>
                </div>
                <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-6 shadow-xl max-w-xs">
                  <Target className="w-8 h-8 text-blue-600 mb-3" />
                  <h4 className="font-bold text-slate-900 mb-2">Our Mission</h4>
                  <p className="text-sm text-slate-600">
                    Deliver premium pharmacy supplies with unmatched service and value.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-semibold text-sm mb-6">
                <Heart className="w-4 h-4" />
                Our Values
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                What Drives Us Every Day
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Our core values guide everything we do, from product selection to customer service.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <div key={index} className="bg-gradient-to-b from-blue-50 to-white rounded-2xl p-6 border border-blue-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/25">
                    <value.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{value.title}</h3>
                  <p className="text-slate-600">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-20 bg-gradient-to-b from-blue-50/50 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Why Pharmacies Choose 9RX
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                "No minimum order requirements",
                "Same-day shipping before 3 PM EST",
                "Free shipping on orders over $500",
                "Custom branding available",
                "Volume discounts up to 25%",
                "Dedicated account managers",
                // "FDA compliant products",
                "Easy online ordering",
                "30-day return policy"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-slate-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Partner with 9RX?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Join 250+ pharmacies that trust us for their supply needs. Get started today with no minimum order requirements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/login" className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg">
                Create Free Account
              </a>
              <a href="/products" className="bg-blue-500/20 text-white border border-white/30 px-8 py-4 rounded-xl font-semibold hover:bg-blue-500/30 transition-colors">
                Browse Products
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default AboutUs;
