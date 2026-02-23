import { Building2, Package, Truck, Award, Users, Clock } from "lucide-react";
import { useEffect, useState, useRef } from "react";

const useCounter = (end: number, duration: number = 2000, shouldStart: boolean = false) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!shouldStart) return;
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
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

const StatsBar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const pharmacies = useCounter(250, 2000, isVisible);
  const products = useCounter(250, 2500, isVisible);
  const orders = useCounter(10000, 2000, isVisible);
  const satisfaction = useCounter(98, 1500, isVisible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const stats = [
    { icon: Building2, value: pharmacies, suffix: "+", label: "Pharmacies" },
    { icon: Package, value: products, suffix: "+", label: "Products Available" },
    { icon: Truck, value: orders, suffix: "+", label: "Orders Delivered" },
    { icon: Award, value: satisfaction, suffix: "%", label: "Satisfaction Rate" },
  ];

  return (
    <section ref={sectionRef} className="py-6 sm:py-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] sm:bg-[size:40px_40px]" />
      
      {/* Glowing orbs */}
      <div className="absolute top-0 left-1/4 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-32 sm:w-40 h-32 sm:h-40 bg-white/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <div className="w-8 sm:w-10 h-8 sm:h-10 bg-white/10 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <stat.icon className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                </div>
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tabular-nums">
                  {stat.value.toLocaleString()}{stat.suffix}
                </span>
              </div>
              <p className="text-blue-200 text-xs sm:text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
