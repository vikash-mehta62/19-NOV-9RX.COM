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
      color: "from-violet-500 to-purple-600",
      bgColor: "bg-violet-50"
    },
    {
      icon: Package,
      value: products,
      suffix: "+",
      label: "Products Available",
      description: "Complete catalog",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50"
    },
    {
      icon: HeartHandshake,
      value: satisfaction,
      suffix: "%",
      label: "Satisfaction Rate",
      description: "Happy customers",
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-50"
    },
    {
      icon: Truck,
      value: "Fast Shipping",
      suffix: "",
      label: "",
      description: "Same-day dispatch for orders before 3 PM EST",
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-50"
    }
  ];

  const features = [
    {
      icon: Shield,
      title: "Quality Guaranteed",
      description: "All products meet FDA standards and quality certifications",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Users,
      title: "Expert Support",
      description: "Dedicated account managers for personalized service",
      gradient: "from-violet-500 to-purple-500"
    },
    {
      icon: Clock,
      title: "24/7 Availability",
      description: "Round-the-clock customer support and ordering",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      icon: Truck,
      title: "Fast Shipping",
      description: "Same-day dispatch for orders before 3 PM EST",
      gradient: "from-orange-500 to-amber-500"
    }
  ];

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/50 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-100/50 via-transparent to-transparent" />
        
        {/* Floating shapes */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 px-5 py-2.5 rounded-full font-semibold text-sm mb-6 shadow-sm">
            <Sparkles className="w-4 h-4" />
            Why Choose Us
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
              Industry-Leading
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Standards
            </span>
          </h2>
          <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Join hundreds of pharmacies that rely on 9Rx for their trusted and high-quality packaging supply needs
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden`}
            >
              {/* Background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <stat.icon className="w-8 h-8 text-white" />
              </div>
              
              {/* Value */}
              <div className="text-4xl md:text-5xl font-bold text-slate-900 mb-2 tabular-nums">
                {stat.value}{stat.suffix}
              </div>
              
              {/* Label */}
              <div className="font-semibold text-slate-800 mb-1">{stat.label}</div>
              <div className="text-sm text-slate-500">{stat.description}</div>
              
              {/* Decorative corner */}
              <div className={`absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
            </div>
          ))}
        </div>
        
    

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-slate-100 to-slate-50 rounded-2xl p-2 shadow-lg">
            <div className="flex -space-x-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                >
                  {['JD', 'MK', 'AS', 'RB'][i]}
                </div>
              ))}
            </div>
            <div className="pr-4">
              <p className="text-sm font-semibold text-slate-900">Join 250+ pharmacies</p>
              <p className="text-xs text-slate-500">who trust us for their supplies</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
