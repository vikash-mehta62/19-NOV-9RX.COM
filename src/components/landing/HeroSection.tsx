import {
  Truck,
  Shield,
  Users,
  ArrowRight,
  Play,
  Package,
  Star,
  CheckCircle2,
  Sparkles,
  Award,
  Clock,
  ChevronRight,
  Headphones,
  BadgePercent,
  ShoppingBag,
  Menu,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import image1 from "../../assests/home/1.png";
import image2 from "../../assests/home/2.png";
import image3 from "../../assests/home/3.png";

const useCounter = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - progress, 3)) * end));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  return count;
};

export const Navbar = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navLinks = [
    { name: "Products", href: "/products" },
    { name: "About", href: "/about-us" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav 
      className={`fixed w-full top-0 z-50 transition-all duration-500 ${
        scrolled || mobileMenuOpen ? "bg-white/95 backdrop-blur-xl shadow-lg" : "bg-transparent"
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          <a href="/" aria-label="9RX Home" className="flex-shrink-0">
            <img
              src="/final.png"
              alt="9RX Logo"
              className={`h-8 sm:h-10 md:h-12 transition-all duration-500 ${scrolled || mobileMenuOpen ? "" : "brightness-0 invert"}`}
            />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={`font-medium transition-colors ${
                  scrolled ? "text-slate-600 hover:text-blue-600" : "text-white/80 hover:text-white"
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              onClick={() => navigate("/login", { state: { defaultTab: "signup" } })}
              variant="ghost"
              className={`hidden sm:inline-flex font-semibold rounded-xl min-h-[40px] sm:min-h-[44px] text-sm sm:text-base focus-visible:ring-2 focus-visible:ring-blue-500 ${
                scrolled || mobileMenuOpen ? "text-slate-700 hover:text-blue-600" : "text-white/90 hover:bg-white/10"
              }`}
            >
              Sign Up
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 sm:px-6 rounded-xl shadow-lg shadow-blue-500/25 min-h-[40px] sm:min-h-[44px] text-sm sm:text-base focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-xl transition-colors ${
                scrolled || mobileMenuOpen ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-slate-200 pt-4">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="font-medium text-slate-700 hover:text-blue-600 py-3 px-4 rounded-xl hover:bg-slate-50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <button
                onClick={() => {
                  navigate("/login", { state: { defaultTab: "signup" } });
                  setMobileMenuOpen(false);
                }}
                className="sm:hidden font-semibold text-blue-600 py-3 px-4 rounded-xl hover:bg-blue-50 transition-colors text-left"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

const HeroSection = () => {
  const navigate = useNavigate();
  const pharmacyCount = useCounter(250, 2000);
  const [activeSlide, setActiveSlide] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const slides = [
    { title: "Premium RX Vials", subtitle: "Child-resistant & compliant", color: "from-blue-500 to-indigo-600" },
    { title: "Custom Paper Bags", subtitle: "Branded packaging solutions", color: "from-indigo-500 to-blue-600" },
    { title: "Prescription Labels", subtitle: "High-quality thermal labels", color: "from-blue-600 to-indigo-500" },
  ];

  useEffect(() => {
    const interval = setInterval(() => setActiveSlide((prev) => (prev + 1) % slides.length), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth >= 1024) {
        setMousePosition({ x: (e.clientX / window.innerWidth - 0.5) * 20, y: (e.clientY / window.innerHeight - 0.5) * 20 });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const features = [
    { icon: Truck, label: "Same-Day Shipping", value: "Orders before 3PM" },
    { icon: BadgePercent, label: "Volume Discounts", value: "Save on bulk orders" },
    { icon: Award, label: "Quality Assured", value: "Premium products" },
    { icon: Headphones, label: "24/7 Support", value: "Always here to help" },
  ];

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Animated Background - Blue Theme */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950" />
          <div 
            className="absolute inset-0 opacity-50 hidden md:block"
            style={{
              background: `radial-gradient(ellipse 80% 50% at 20% 40%, rgba(59, 130, 246, 0.2) 0%, transparent 50%),
                radial-gradient(ellipse 60% 40% at 80% 60%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
                radial-gradient(ellipse 50% 30% at 50% 80%, rgba(79, 70, 229, 0.1) 0%, transparent 50%)`,
              transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
              transition: 'transform 0.3s ease-out',
            }}
          />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:40px_40px] sm:bg-[size:60px_60px]" />
          
          {/* Glowing orbs - smaller on mobile */}
          <div className="absolute top-1/4 left-1/4 w-[300px] sm:w-[400px] lg:w-[600px] h-[300px] sm:h-[400px] lg:h-[600px] bg-blue-500/10 rounded-full blur-[100px] sm:blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[250px] sm:w-[350px] lg:w-[500px] h-[250px] sm:h-[350px] lg:h-[500px] bg-indigo-500/10 rounded-full blur-[80px] sm:blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          
          {/* Floating particles - fewer on mobile */}
          {[...Array(15)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-blue-400/30 rounded-full hidden sm:block" style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`, animationDelay: `${Math.random() * 2}s`,
            }} />
          ))}
          
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10 pt-24 sm:pt-28 pb-16 sm:pb-20">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-8 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 sm:gap-3 flex-wrap justify-center lg:justify-start">
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-xl border border-blue-500/30 rounded-full pl-1.5 pr-3 sm:pr-4 py-1.5">
                  <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Sparkles className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
                  </div>
                  <span className="text-blue-300 text-xs sm:text-sm font-medium">#1 Pharmacy Supplier</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-sm">
                  <div className="flex -space-x-1.5">
                    {[image1, image2, image3].map((img, i) => (
                      <img key={i} src={img} alt="" className="w-5 sm:w-6 h-5 sm:h-6 rounded-full border-2 border-slate-900 object-cover" />
                    ))}
                  </div>
                  <span>{pharmacyCount}+ pharmacies trust us</span>
                </div>
              </div>

              {/* Main Heading */}
              <div className="space-y-2 sm:space-y-4">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] sm:leading-[1.05] tracking-tight">
                  <span className="text-white">Premium</span>
                  <br />
                  <span className="text-white">Pharmacy</span>
                  <br />
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">Supplies</span>
                    <svg className="absolute -bottom-1 sm:-bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                      <path d="M2 10C50 2 150 2 198 10" stroke="url(#underline-blue)" strokeWidth="3" strokeLinecap="round"/>
                      <defs><linearGradient id="underline-blue" x1="0" y1="0" x2="200" y2="0">
                        <stop stopColor="#60a5fa" /><stop offset="0.5" stopColor="#818cf8" /><stop offset="1" stopColor="#38bdf8" />
                      </linearGradient></defs>
                    </svg>
                  </span>
                </h1>
              </div>

              {/* Description */}
              <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed px-2 sm:px-0">
                Quality pharmacy packaging and supplies at competitive prices. 
                Join <span className="text-blue-400 font-semibold">{pharmacyCount}+</span> independent pharmacies 
                that trust us for their daily operations.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 justify-center lg:justify-start px-2 sm:px-0">
                <Button onClick={() => navigate("/login", { state: { defaultTab: "signup" } })}
                  className="group relative bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold rounded-xl sm:rounded-2xl shadow-2xl shadow-blue-500/30 overflow-hidden min-h-[48px] sm:min-h-[56px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 w-full sm:w-auto">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Get Started Free
                    <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </span>
                </Button>
                <Button onClick={() => navigate("/products")}
                  className="group bg-white/5 border border-white/10 text-white hover:bg-white/10 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold rounded-xl sm:rounded-2xl backdrop-blur-sm min-h-[48px] sm:min-h-[56px] focus-visible:ring-2 focus-visible:ring-white w-full sm:w-auto">
                  <ShoppingBag className="w-4 sm:w-5 h-4 sm:h-5 mr-2 text-blue-400" aria-hidden="true" />
                  Browse Products
                </Button>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2 sm:gap-3 pt-2 sm:pt-4 justify-center lg:justify-start px-2 sm:px-0" role="list" aria-label="Key features">
                {["No Minimum Order", "Free Shipping $500+", "Custom Branding", "Fast Delivery"].map((feature, i) => (
                  <div key={i} className="flex items-center gap-1.5 sm:gap-2 bg-white/5 border border-white/10 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-white/10 transition-colors" role="listitem">
                    <CheckCircle2 className="w-3 sm:w-4 h-3 sm:h-4 text-blue-400" aria-hidden="true" />
                    <span className="text-xs sm:text-sm text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Product Card */}
            <div className="lg:col-span-5 relative hidden lg:block">
              <div style={{ transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`, transition: 'transform 0.3s ease-out' }}>
                {/* Glow effect */}
                <div className={`absolute -inset-4 bg-gradient-to-br ${slides[activeSlide].color} opacity-20 rounded-[40px] blur-2xl`} />
                
                {/* Main card */}
                <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${slides[activeSlide].color}`} />
                      <span className="text-white/60 text-sm font-medium">Featured Product</span>
                    </div>
                    <div className="flex gap-1">
                      {slides.map((_, i) => (
                        <button key={i} onClick={() => setActiveSlide(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === activeSlide ? `w-6 bg-gradient-to-r ${slides[i].color}` : 'bg-white/20 hover:bg-white/30'}`} />
                      ))}
                    </div>
                  </div>

                  {/* Product image area */}
                  <div className="relative h-52 mb-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${slides[activeSlide].color} opacity-10`} />
                    <Package className="w-28 h-28 text-white/30" />
                    <div className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                      POPULAR
                    </div>
                  </div>

                  {/* Product info */}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white">{slides[activeSlide].title}</h3>
                    <p className="text-slate-400">{slides[activeSlide].subtitle}</p>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                      </div>
                      <span className="text-slate-400 text-sm">4.9 (2.4k reviews)</span>
                    </div>

                    {/* CTA */}
                    <button 
                      onClick={() => navigate("/products")}
                      className={`w-full mt-2 bg-gradient-to-r ${slides[activeSlide].color} text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg`}
                    >
                      View Products
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Floating stat cards */}
                <div className="absolute -left-16 top-1/4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 animate-float shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{pharmacyCount}+</div>
                      <div className="text-xs text-slate-400">Happy Customers</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-12 bottom-1/4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 animate-float shadow-xl" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">98%</div>
                      <div className="text-xs text-slate-400">Satisfaction</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Features Bar */}
          <div className="mt-12 sm:mt-16 lg:mt-20 pt-8 sm:pt-12 border-t border-white/10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6" role="list" aria-label="Service features">
              {features.map((feature, i) => (
                <div key={i} className="group flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-white/5 transition-all cursor-pointer text-center sm:text-left" role="listitem">
                  <div className="w-10 sm:w-12 lg:w-14 h-10 sm:h-12 lg:h-14 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-indigo-500/30 transition-colors shadow-lg flex-shrink-0">
                    <feature.icon className="w-5 sm:w-6 lg:w-7 h-5 sm:h-6 lg:h-7 text-blue-400" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs sm:text-sm lg:text-base">{feature.label}</div>
                    <div className="text-xs sm:text-sm text-slate-500 hidden sm:block">{feature.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator - hidden on mobile */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 hidden sm:flex">
          <span className="text-slate-500 text-xs uppercase tracking-[0.2em]">Explore</span>
          <div className="w-6 h-10 border-2 border-slate-600 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-blue-400 rounded-full animate-scroll" />
          </div>
        </div>
      </section>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes scroll { 0%, 100% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(8px); opacity: 0.3; } }
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.3); } }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-scroll { animation: scroll 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default HeroSection;
