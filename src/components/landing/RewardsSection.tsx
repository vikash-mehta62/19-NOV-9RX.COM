import { Gift, Star, TrendingUp, Coins, Award, ShoppingCart, Percent, Crown, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

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

const RewardsSection = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const pointsEarned = useCounter(5000, 2000, isVisible);
  const savedAmount = useCounter(250, 1500, isVisible);

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

  const howItWorks = [
    {
      icon: ShoppingCart,
      step: "1",
      title: "Place Orders",
      description: "Earn 1 point for every $1 spent on qualifying purchases"
    },
    {
      icon: Coins,
      step: "2",
      title: "Accumulate Points",
      description: "Watch your points grow with every order you place"
    },
    {
      icon: Gift,
      step: "3",
      title: "Redeem Rewards",
      description: "Use points for discounts, free products, or store credit"
    }
  ];

  const benefits = [
    {
      icon: Percent,
      title: "Up to 25% Back",
      description: "Earn reward points worth up to 25% of your order value on select items"
    },
    {
      icon: Crown,
      title: "VIP Tiers",
      description: "Unlock higher earning rates and exclusive perks as you level up"
    },
    {
      icon: Gift,
      title: "Birthday Bonus",
      description: "Get double points during your pharmacy's anniversary month"
    },
    {
      icon: TrendingUp,
      title: "No Expiration",
      description: "Your earned points never expire as long as your account is active"
    }
  ];

  const tiers = [
    { name: "Bronze", minSpend: "$0", pointsRate: "1x", color: "from-amber-600 to-amber-700" },
    { name: "Silver", minSpend: "$5,000", pointsRate: "1.5x", color: "from-slate-400 to-slate-500" },
    { name: "Gold", minSpend: "$15,000", pointsRate: "2x", color: "from-yellow-500 to-amber-500" },
    { name: "Platinum", minSpend: "$30,000", pointsRate: "2.5x", color: "from-blue-400 to-indigo-500" },
  ];

  return (
    <section ref={sectionRef} className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white via-indigo-50/30 to-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-56 sm:w-80 h-56 sm:h-80 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-200/20 rounded-full blur-3xl" />
        
        {/* Floating coins animation */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 sm:w-4 h-3 sm:h-4 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full opacity-20 animate-float hidden sm:block"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${4 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm mb-4 sm:mb-6 shadow-sm">
            <Gift className="w-3 sm:w-4 h-3 sm:h-4" />
            Rewards Program
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
            <span className="text-slate-900">Earn Points,</span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Save More
            </span>
          </h2>
          <p className="text-slate-600 text-base sm:text-lg md:text-xl max-w-2xl mx-auto px-4">
            Join our rewards program and turn every purchase into savings. The more you order, the more you earn!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-2xl mx-auto mb-10 sm:mb-12 lg:mb-16">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white text-center shadow-xl shadow-blue-500/25">
            <Coins className="w-8 sm:w-10 h-8 sm:h-10 mx-auto mb-2 sm:mb-3 opacity-80" />
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-0.5 sm:mb-1">{pointsEarned.toLocaleString()}+</div>
            <div className="text-blue-100 text-xs sm:text-sm">Avg. Points Earned/Year</div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white text-center shadow-xl shadow-amber-500/25">
            <Award className="w-8 sm:w-10 h-8 sm:h-10 mx-auto mb-2 sm:mb-3 opacity-80" />
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-0.5 sm:mb-1">${savedAmount}+</div>
            <div className="text-amber-100 text-xs sm:text-sm">Avg. Savings/Year</div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-12 sm:mb-16 lg:mb-20">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-6 sm:mb-8 lg:mb-10">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-4xl mx-auto">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-10 sm:top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-blue-300 to-transparent" />
                )}
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center relative">
                  <div className="absolute -top-2 sm:-top-3 -right-2 sm:-right-3 w-6 sm:w-8 h-6 sm:h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg">
                    {step.step}
                  </div>
                  <div className="w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <step.icon className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600" />
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2">{step.title}</h4>
                  <p className="text-slate-600 text-xs sm:text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="mb-12 sm:mb-16 lg:mb-20">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-6 sm:mb-8 lg:mb-10">Program Benefits</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group">
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/25">
                  <benefit.icon className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                </div>
                <h4 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 mb-1 sm:mb-2">{benefit.title}</h4>
                <p className="text-slate-600 text-xs sm:text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tier System */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 mb-10 sm:mb-12 lg:mb-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:30px_30px] sm:bg-[size:40px_40px]" />
          
          <div className="relative z-10">
            <div className="text-center mb-6 sm:mb-8 lg:mb-10">
              <div className="inline-flex items-center gap-2 bg-white/10 text-blue-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold text-xs sm:text-sm mb-3 sm:mb-4">
                <Crown className="w-3 sm:w-4 h-3 sm:h-4" />
                VIP Tiers
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">
                Level Up Your Rewards
              </h3>
              <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base px-4">
                The more you spend, the higher your tier and the more points you earn per dollar.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {tiers.map((tier, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 hover:bg-white/10 transition-all">
                  <div className={`w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br ${tier.color} rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg`}>
                    <Star className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-white mb-0.5 sm:mb-1">{tier.name}</h4>
                  <p className="text-slate-400 text-xs sm:text-sm mb-2 sm:mb-3">Spend {tier.minSpend}+/year</p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-blue-400">{tier.pointsRate}</span>
                    <span className="text-slate-400 text-xs sm:text-sm">points per $1</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Example Calculation */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-5 sm:p-8 mb-10 sm:mb-12 lg:mb-16 border border-blue-100">
          <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8">
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600" />
                See Your Potential Savings
              </h3>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-slate-700 text-sm sm:text-base">Spend $1,000/month = Earn 1,000+ points</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-slate-700 text-sm sm:text-base">1,000 points = $10 store credit</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-slate-700 text-sm sm:text-base">Gold tier members earn 2x = $20/month savings!</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg text-center min-w-[160px] sm:min-w-[200px]">
              <p className="text-slate-500 text-xs sm:text-sm mb-1">Annual Savings Potential</p>
              <p className="text-3xl sm:text-4xl font-bold text-blue-600">$240+</p>
              <p className="text-slate-400 text-[10px] sm:text-xs mt-1">at Gold tier level</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 sm:mb-4">
            Start Earning Rewards Today
          </h3>
          <p className="text-slate-600 mb-6 sm:mb-8 max-w-xl mx-auto text-sm sm:text-base px-4">
            Create your free account and automatically enroll in our rewards program. No fees, no commitments.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <button
              onClick={() => navigate("/login", { state: { defaultTab: "signup" } })}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl text-sm sm:text-base"
            >
              Join Rewards Program
              <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
            <button
              onClick={() => navigate("/products")}
              className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:bg-slate-50 transition-all text-sm sm:text-base"
            >
              Browse Products
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default RewardsSection;
