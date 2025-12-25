import { Navbar } from "@/components/landing/HeroSection";
import Footer from "@/components/landing/Footer";
import { Map, FileText, Package, HelpCircle, Building2, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";

const Sitemap = () => {
  useEffect(() => {
    document.title = "Sitemap - 9RX | Navigate Our Website";
  }, []);

  const siteLinks = [
    {
      category: "Main Pages",
      icon: Building2,
      links: [
        { name: "Home", href: "/" },
        { name: "About Us", href: "/about-us" },
        { name: "Contact Us", href: "/contact" },
        { name: "Products", href: "/products" },
        { name: "Blog", href: "/blog" },
        { name: "Newsletter", href: "/newsletter" },
      ]
    },
    {
      category: "Products",
      icon: Package,
      links: [
        { name: "All Products", href: "/products" },
        { name: "RX Vials & Containers", href: "/products" },
        { name: "Prescription Labels", href: "/products" },
        { name: "Paper Bags", href: "/products" },
        { name: "Ointment Jars", href: "/products" },
        { name: "Pharmacy Supplies", href: "/products" },
        { name: "Custom Products", href: "/products" },
      ]
    },
    {
      category: "Legal & Policies",
      icon: FileText,
      links: [
        { name: "Privacy Policy", href: "/privacy-policy" },
        { name: "Terms of Service", href: "/terms-of-service" },
        { name: "Shipping Information", href: "/shipping-info" },
        { name: "Return Policy", href: "/return-policy" },
      ]
    },
    {
      category: "Support",
      icon: HelpCircle,
      links: [
        { name: "FAQ", href: "/#faq" },
        { name: "Contact Us", href: "/contact" },
        { name: "Newsletter", href: "/newsletter" },
      ]
    },
    {
      category: "Account",
      icon: Mail,
      links: [
        { name: "Login", href: "/login" },
        { name: "Sign Up", href: "/login" },
      ]
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-white">
        <Navbar />
        
        {/* Hero Section */}
        <section className="pt-32 pb-12 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 backdrop-blur-sm text-blue-300 px-5 py-2.5 rounded-full font-semibold text-sm mb-6 border border-blue-500/30">
                <Map className="w-4 h-4" />
                Sitemap
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Website Sitemap
              </h1>
              <p className="text-lg text-slate-300">
                Find all pages and resources on our website.
              </p>
            </div>
          </div>
        </section>

        {/* Sitemap Content */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {siteLinks.map((section, index) => (
                <div key={index} className="bg-slate-50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <section.icon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{section.category}</h2>
                  </div>
                  <ul className="space-y-3">
                    {section.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <Link
                          to={link.href}
                          className="text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Sitemap;
