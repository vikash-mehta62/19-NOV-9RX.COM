import { Phone, Mail, MapPin, Clock, Facebook, Twitter, Linkedin, Instagram, ArrowRight, Heart, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: "Products", href: "/products" },
    { name: "About Us", href: "#about" },
    { name: "Contact", href: "#contact" },
    { name: "Login", href: "/login" },
    { name: "Sign Up", href: "/login" },
  ];

  const productCategories = [
    "RX Vials & Containers",
    "Prescription Labels",
    "Paper Bags",
    "Ointment Jars",
    "Pharmacy Supplies",
    "Custom Products",
  ];

  const supportLinks = [
    { name: "FAQ", href: "/#faq" },
    { name: "Shipping Info", href: "/shipping-info" },
    { name: "Return Policy", href: "/return-policy" },
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms of Service", href: "/terms-of-service" },
  ];

  const socialLinks = [
    { icon: Facebook, href: "https://facebook.com/9rxsupplies", label: "Facebook" },
    { icon: Twitter, href: "https://twitter.com/9rxsupplies", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com/company/9rx", label: "LinkedIn" },
    { icon: Instagram, href: "https://instagram.com/9rxsupplies", label: "Instagram" },
  ];

  return (
    <footer className="relative bg-slate-900 overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      {/* Top wave decoration */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="relative z-10">
        {/* Main Footer */}
        <div className="container mx-auto px-4 py-16 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
            {/* Company Info - Takes more space */}
            <div className="lg:col-span-4 space-y-6">
              <div>
                <img src="/final.png" alt="9RX Logo" className="h-14 mb-6 brightness-0 invert" />
                <p className="text-slate-400 leading-relaxed max-w-sm">
                  Your trusted partner for premium pharmacy supplies. Serving independent pharmacies nationwide with quality products and exceptional service since 2010.
                </p>
              </div>
              
              {/* Social Links */}
              <div className="flex gap-3">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="w-11 h-11 bg-slate-800/80 rounded-xl flex items-center justify-center text-slate-400 hover:bg-emerald-500 hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/25"
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-3 pt-4">
                <span className="px-3 py-1.5 bg-slate-800/50 rounded-lg text-xs text-slate-400 border border-slate-700">
                  🔒 SSL Secured
                </span>
                <span className="px-3 py-1.5 bg-slate-800/50 rounded-lg text-xs text-slate-400 border border-slate-700">
                  ✓ FDA Compliant
                </span>
                <span className="px-3 py-1.5 bg-slate-800/50 rounded-lg text-xs text-slate-400 border border-slate-700">
                  ⭐ Top Rated
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <span className="w-8 h-0.5 bg-emerald-500 rounded-full" />
                Quick Links
              </h3>
              <ul className="space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.href}
                      className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-2 group"
                    >
                      <ArrowRight className="w-4 h-4 opacity-0 -ml-6 group-hover:opacity-100 group-hover:ml-0 transition-all text-emerald-500" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Products */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <span className="w-8 h-0.5 bg-emerald-500 rounded-full" />
                Products
              </h3>
              <ul className="space-y-3">
                {productCategories.map((category, index) => (
                  <li key={index}>
                    <span className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2 group">
                      <ArrowRight className="w-4 h-4 opacity-0 -ml-6 group-hover:opacity-100 group-hover:ml-0 transition-all text-emerald-500" />
                      {category}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-4">
              <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <span className="w-8 h-0.5 bg-emerald-500 rounded-full" />
                Contact Us
              </h3>
              <ul className="space-y-4">
                <li>
                  <a href="tel:+18009696295" className="flex items-start gap-4 group">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:from-emerald-500/30 group-hover:to-teal-500/30 transition-colors">
                      <Phone className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Call Us</p>
                      <p className="text-white font-semibold group-hover:text-emerald-400 transition-colors">
                        +1 800 969 6295
                      </p>
                    </div>
                  </a>
                </li>
                <li>
                  <a href="mailto:info@9rx.com" className="flex items-start gap-4 group">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:from-emerald-500/30 group-hover:to-teal-500/30 transition-colors">
                      <Mail className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Email Us</p>
                      <p className="text-white font-semibold group-hover:text-emerald-400 transition-colors">
                        info@9rx.com
                      </p>
                    </div>
                  </a>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Address</p>
                    <p className="text-white">936 Broad River Ln,<br />Charlotte, NC 28211</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Business Hours</p>
                    <p className="text-white">Mon - Fri: 9AM - 6PM EST</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-slate-500 text-sm flex items-center gap-1">
                © {currentYear} 9RX LLC. Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> in Charlotte, NC
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                {supportLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.href}
                    className="text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
