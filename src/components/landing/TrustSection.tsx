import { Building2, Clock, Users, Shield, Award, Truck, HeartHandshake, Package, TrendingUp, Globe, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";

// Animated counter hook
const useCounter = (end: number, duration: number = 2000, shouldStart: boolean = false) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!shouldStart) return;
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, shouldStart]);
  
  return count;
};

const TrustSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const pharmacies = useCounter(250, 2000, isVisible);
  const products = useCounter(500, 2500, isVisible);
  const satisfaction = useCounter(98, 1500, isVisible);
  const years = useCounter(14, 1000, isVisible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const stats = [
    {
      icon: Building2,
      value: pharmacies,
      suffix: "+",
      label: "Partner Pharmacies",
      description: "Trusted nationwide",
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: Package,
      value: products,
      suffix: "+",
      label: "Products Available",
      description: "Complete catalog",
      color: "from-indigo-500 to-blue-600",
      bgColor: "bg-indigo-50"
    },
    {
      icon: HeartHandshake,
      value: satisfaction,
      suffix: "%",
      label: "Satisfaction Rate",
      description: "Happy customers",
      color: "from-blue-600 to-indigo-500",
      bgColor: "bg-blue-50"
    },
    {
      icon: Truck,
      value: "Fast Shipping",
      suffix: "",
      label: "",
      description: "Same-day dispatch for orders before 3 PM EST",
      color: "from-indigo-600 to-blue-500",
      bgColor: "bg-indigo-50"
    }
  ];

  const features = [
    {
      icon: Shield,
      title: "Quality Guaranteed",
      description: "All products meet FDA standards and quality certifications",
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      icon: Users,
      title: "Expert Support",
      description: "Dedicated account managers for personalized service",
      gradient: "from-indigo-500 to-blue-600"
    },
    {
      icon: Clock,
      title: "24/7 Availability",
      description: "Round-the-clock customer support and ordering",
      gradient: "from-blue-600 to-indigo-500"
    },
    {
      icon: Truck,
      title: "Fast Shipping",
      description: "Same-day dispatch for orders before 3 PM EST",
      gradient: "from-indigo-600 to-blue-500"
    }
  ];

  return (
    <section ref={sectionRef} className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white via-indigo-50/30 to-white relative overflow-hidden">
      {/* Background decorations - Unified blue theme */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent" />
        
        {/* Floating shapes */}
        <div className="absolute top-20 left-20 w-48 sm:w-64 h-48 sm:h-64 bg-blue-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-56 sm:w-80 h-56 sm:h-80 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm mb-4 sm:mb-6 shadow-sm">
            <Sparkles className="w-3 sm:w-4 h-3 sm:h-4" />
            Why Choose Us
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
            <span className="text-slate-900">
              Industry-Leading
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Standards
            </span>
          </h2>
          <p className="text-slate-600 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed px-4">
            Join hundreds of pharmacies that rely on 9Rx for their trusted and high-quality packaging supply needs
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-12 sm:mb-16 lg:mb-20">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`group relative bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 sm:hover:-translate-y-2 overflow-hidden`}
            >
              {/* Background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              
              {/* Icon */}
              <div className={`w-10 sm:w-12 lg:w-16 h-10 sm:h-12 lg:h-16 rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 sm:mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <stat.icon className="w-5 sm:w-6 lg:w-8 h-5 sm:h-6 lg:h-8 text-white" />
              </div>
              
              {/* Value */}
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-1 sm:mb-2 tabular-nums">
                {stat.value}{stat.suffix}
              </div>
              
              {/* Label */}
              <div className="font-semibold text-slate-800 text-xs sm:text-sm lg:text-base mb-0.5 sm:mb-1">{stat.label}</div>
              <div className="text-xs sm:text-sm text-slate-500 hidden sm:block">{stat.description}</div>
              
              {/* Decorative corner */}
              <div className={`absolute -bottom-4 -right-4 w-16 sm:w-20 lg:w-24 h-16 sm:h-20 lg:h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 sm:mt-16">
          <div className="inline-flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl sm:rounded-2xl p-2 shadow-lg">
            <div className="flex -space-x-2 sm:-space-x-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white flex items-center justify-center text-white text-[10px] sm:text-xs font-bold"
                >
                  {['JD', 'MK', 'AS', 'RB'][i]}
                </div>
              ))}
            </div>
            <div className="pr-2 sm:pr-4">
              <p className="text-xs sm:text-sm font-semibold text-slate-900">Join 250+ pharmacies</p>
              <p className="text-[10px] sm:text-xs text-slate-500">who trust us for their supplies</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
