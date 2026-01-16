import { Phone, Mail, MapPin, Clock, Facebook, Twitter, Linkedin, Instagram, ArrowRight, Heart, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../../assests/home/9rx_logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: "Products", href: "/products" },
    { name: "About Us", href: "/about-us" },
    { name: "Contact", href: "/contact" },
    { name: "Blog", href: "/blog" },
    { name: "Login", href: "/login" },
  ];

  const productCategories = [
    { name: "RX Vials & Containers", href: "/products" },
    { name: "Prescription Labels", href: "/products" },
    { name: "Paper Bags", href: "/products" },
    { name: "Ointment Jars", href: "/products" },
    { name: "Pharmacy Supplies", href: "/products" },
    { name: "Custom Products", href: "/products" },
  ];

  const supportLinks = [
    { name: "FAQ", href: "/#faq" },
    { name: "Shipping Info", href: "/shipping-info" },
    { name: "Return Policy", href: "/return-policy" },
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms of Service", href: "/terms-of-service" },
    { name: "Sitemap", href: "/sitemap" },
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
        <div className="absolute top-0 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Top wave decoration */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="relative z-10">
        {/* Main Footer */}
        <div className="container mx-auto px-4 py-10 sm:py-12 lg:py-16 xl:py-20">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8">
            {/* Company Info - Takes more space */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-4 space-y-4 sm:space-y-6">
              <div>
                <img src={logo} alt="9RX Logo" className="h-16 sm:h-12 lg:h-14 mb-4 sm:mb-6 brightness-0 invert" />
                <p className="text-slate-400 leading-relaxed max-w-sm text-sm sm:text-base">
                  Your trusted partner for premium pharmacy supplies. Serving independent pharmacies nationwide with quality products and exceptional service since 2010.
                </p>
              </div>
              
              {/* Social Links */}
              <div className="flex gap-2 sm:gap-3">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="w-9 sm:w-11 h-9 sm:h-11 bg-slate-800/80 rounded-lg sm:rounded-xl flex items-center justify-center text-slate-400 hover:bg-blue-500 hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/25"
                  >
                    <social.icon className="w-4 sm:w-5 h-4 sm:h-5" />
                  </a>
                ))}
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-2 sm:gap-3 pt-2 sm:pt-4">
                <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-800/50 rounded-lg text-[10px] sm:text-xs text-slate-400 border border-slate-700">
                  🔒 SSL Secured
                </span>
                {/* <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-800/50 rounded-lg text-[10px] sm:text-xs text-slate-400 border border-slate-700">
                  ✓ FDA Compliant
                </span> */}
                <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-800/50 rounded-lg text-[10px] sm:text-xs text-slate-400 border border-slate-700">
                  ⭐ Top Rated
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="col-span-1 lg:col-span-2">
              <h3 className="text-white font-bold text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 flex items-center gap-2">
                <span className="w-6 sm:w-8 h-0.5 bg-blue-500 rounded-full" />
                Quick Links
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.href}
                      className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2 group text-sm sm:text-base"
                    >
                      <ArrowRight className="w-3 sm:w-4 h-3 sm:h-4 opacity-0 -ml-5 sm:-ml-6 group-hover:opacity-100 group-hover:ml-0 transition-all text-blue-500" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Products */}
            <div className="col-span-1 lg:col-span-2">
              <h3 className="text-white font-bold text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 flex items-center gap-2">
                <span className="w-6 sm:w-8 h-0.5 bg-blue-500 rounded-full" />
                Products
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                {productCategories.map((category, index) => (
                  <li key={index}>
                    <Link
                      to={category.href}
                      className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2 group text-sm sm:text-base"
                    >
                      <ArrowRight className="w-3 sm:w-4 h-3 sm:h-4 opacity-0 -ml-5 sm:-ml-6 group-hover:opacity-100 group-hover:ml-0 transition-all text-blue-500" />
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div className="col-span-2 lg:col-span-4">
              <h3 className="text-white font-bold text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 flex items-center gap-2">
                <span className="w-6 sm:w-8 h-0.5 bg-blue-500 rounded-full" />
                Contact Us
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
                <li>
                  <a href="tel:+18009696295" className="flex items-start gap-3 sm:gap-4 group">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:from-blue-500/30 group-hover:to-indigo-500/30 transition-colors">
                      <Phone className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs sm:text-sm">Call Us</p>
                      <p className="text-white font-semibold group-hover:text-blue-400 transition-colors text-sm sm:text-base">
                        +1 800 969 6295
                      </p>
                    </div>
                  </a>
                </li>
                <li>
                  <a href="mailto:info@9rx.com" className="flex items-start gap-3 sm:gap-4 group">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:from-blue-500/30 group-hover:to-indigo-500/30 transition-colors">
                      <Mail className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs sm:text-sm">Email Us</p>
                      <p className="text-white font-semibold group-hover:text-blue-400 transition-colors text-sm sm:text-base">
                        info@9rx.com
                      </p>
                    </div>
                  </a>
                </li>
                <li className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs sm:text-sm">Address</p>
                    <p className="text-white text-sm sm:text-base">724 Montana drive,<br />Charlotte, NC 28216</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 sm:gap-4">  
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs sm:text-sm">Business Hours</p>
                    <p className="text-white text-sm sm:text-base">Mon - Fri: 9AM - 6PM EST</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800">
          <div className="container mx-auto px-4 py-4 sm:py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
              <p className="text-slate-500 text-xs sm:text-sm flex items-center gap-1">
                © {currentYear} 9RX LLC. Made with <Heart className="w-3 sm:w-4 h-3 sm:h-4 text-red-500 fill-red-500" /> in Charlotte, NC
              </p>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
                {supportLinks.slice(0, 4).map((link, index) => (
                  <Link
                    key={index}
                    to={link.href}
                    className="text-slate-500 hover:text-blue-400 transition-colors"
                  >
                    {link.name}
                  </Link>
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
