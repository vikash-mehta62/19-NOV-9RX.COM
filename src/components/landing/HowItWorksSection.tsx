import { UserPlus, Search, Truck, CheckCircle, Sparkles, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const HowItWorksSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  const steps = [
    {
      icon: UserPlus,
      step: "01",
      title: "Create Your Account",
      description: "Sign up in seconds and unlock exclusive wholesale pricing, volume discounts, and personalized recommendations.",
      color: "from-violet-500 to-purple-600",
      bgColor: "bg-violet-50",
      features: ["Free registration", "Instant access", "No credit card required"]
    },
    {
      icon: Search,
      step: "02", 
      title: "Browse & Select",
      description: "Explore our extensive catalog of 500+ pharmacy supplies. Filter by category, compare prices, and find exactly what you need.",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50",
      features: ["500+ products", "Smart search", "Real-time stock"]
    },
    {
      icon: CheckCircle,
      step: "03",
      title: "Secure Checkout",
      description: "Add items to cart, apply volume discounts automatically, and complete your order with our secure payment system.",
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-50",
      features: ["Volume discounts", "Multiple payment options", "Order tracking"]
    },
    {
      icon: Truck,
      step: "04",
      title: "Fast Delivery",
      description: "Same-day dispatch for orders before 3 PM EST. Track your shipment in real-time and receive quality products at your doorstep.",
      color: "from-orange-500 to-amber-500",
      bgColor: "bg-orange-50",
      features: ["Same-day dispatch", "Real-time tracking", "Secure packaging"]
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-violet-200/40 to-purple-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/30 to-cyan-100/30 rounded-full blur-3xl" />
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-emerald-400/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 px-5 py-2.5 rounded-full font-semibold text-sm mb-6 shadow-sm">
            <Sparkles className="w-4 h-4" />
            Simple 4-Step Process
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
              How It Works
            </span>
          </h2>
          <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Get started in minutes with our streamlined ordering process designed for busy pharmacy professionals
          </p>
        </div>

        {/* Progress bar */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="flex items-center justify-between relative">
            {/* Background line */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-slate-200 rounded-full" />
            {/* Active line */}
            <div 
              className="absolute top-6 left-0 h-1 bg-gradient-to-r from-violet-500 via-emerald-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
            />
            
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                  index <= activeStep
                    ? `bg-gradient-to-br ${step.color} text-white shadow-lg scale-110`
                    : 'bg-white text-slate-400 border-2 border-slate-200'
                }`}
              >
                {step.step}
              </button>
            ))}
          </div>
        </div>

        {/* Main content - Active step showcase */}
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Visual */}
            <div className="relative">
              <div className={`${steps[activeStep].bgColor} rounded-3xl p-8 md:p-12 relative overflow-hidden transition-all duration-500`}>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/50 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/30 rounded-full blur-xl" />
                
                {/* Icon */}
                <div className={`relative w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br ${steps[activeStep].color} flex items-center justify-center mb-8 shadow-2xl transform transition-all duration-500 hover:scale-105`}>
                  {(() => {
                    const IconComponent = steps[activeStep].icon;
                    return <IconComponent className="w-12 h-12 md:w-16 md:h-16 text-white" />;
                  })()}
                </div>

                {/* Step number */}
                <div className="absolute top-8 right-8 text-8xl md:text-9xl font-black text-black/5">
                  {steps[activeStep].step}
                </div>

                {/* Features list */}
                <div className="space-y-3 relative z-10">
                  {steps[activeStep].features.map((feature, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <CheckCircle className={`w-5 h-5 bg-gradient-to-br ${steps[activeStep].color} bg-clip-text text-transparent`} style={{ color: 'currentColor' }} />
                      <span className="font-medium text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right - Content */}
            <div className="space-y-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${steps[activeStep].color} text-white font-semibold text-sm shadow-lg`}>
                Step {steps[activeStep].step}
              </div>
              
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900">
                {steps[activeStep].title}
              </h3>
              
              <p className="text-slate-600 text-lg leading-relaxed">
                {steps[activeStep].description}
              </p>

              {/* Navigation dots */}
              <div className="flex items-center gap-3 pt-4">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === activeStep 
                        ? `w-8 bg-gradient-to-r ${steps[idx].color}` 
                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <a
            href="/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default HowItWorksSection;
