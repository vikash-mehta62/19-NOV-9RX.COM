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
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50",
      features: ["Free registration", "Instant access", "No credit card required"]
    },
    {
      icon: Search,
      step: "02", 
      title: "Browse & Select",
      description: "Explore our extensive catalog of 500+ pharmacy supplies. Filter by category, compare prices, and find exactly what you need.",
      color: "from-indigo-500 to-blue-600",
      bgColor: "bg-indigo-50",
      features: ["500+ products", "Smart search", "Real-time stock"]
    },
    {
      icon: CheckCircle,
      step: "03",
      title: "Secure Checkout",
      description: "Add items to cart, apply volume discounts automatically, and complete your order with our secure payment system.",
      color: "from-blue-600 to-indigo-500",
      bgColor: "bg-blue-50",
      features: ["Volume discounts", "Multiple payment options", "Order tracking"]
    },
    {
      icon: Truck,
      step: "04",
      title: "Fast Delivery",
      description: "Same-day dispatch for orders before 3 PM EST. Track your shipment in real-time and receive quality products at your doorstep.",
      color: "from-indigo-600 to-blue-500",
      bgColor: "bg-indigo-50",
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
    <section ref={sectionRef} className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white via-blue-50/30 to-white relative overflow-hidden">
      {/* Animated background elements - Unified blue theme */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-56 sm:w-80 h-56 sm:h-80 bg-gradient-to-br from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Floating particles - blue theme */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-blue-400/20 rounded-full animate-float hidden sm:block"
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
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm mb-4 sm:mb-6 shadow-sm">
            <Sparkles className="w-3 sm:w-4 h-3 sm:h-4" />
            Simple 4-Step Process
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
            <span className="text-slate-900">
              How It Works
            </span>
          </h2>
          <p className="text-slate-600 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed px-4">
            Get started in minutes with our streamlined ordering process designed for busy pharmacy professionals
          </p>
        </div>

        {/* Progress bar */}
        <div className="max-w-4xl mx-auto mb-10 sm:mb-16 px-4">
          <div className="flex items-center justify-between relative">
            {/* Background line */}
            <div className="absolute top-5 sm:top-6 left-0 right-0 h-0.5 sm:h-1 bg-blue-100 rounded-full" />
            {/* Active line */}
            <div 
              className="absolute top-5 sm:top-6 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
            />
            
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`relative z-10 w-10 sm:w-12 h-10 sm:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-500 ${
                  index <= activeStep
                    ? `bg-gradient-to-br ${step.color} text-white shadow-lg scale-105 sm:scale-110`
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
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left - Visual */}
            <div className="relative order-2 lg:order-1">
              <div className={`${steps[activeStep].bgColor} rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 relative overflow-hidden transition-all duration-500`}>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-white/50 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/30 rounded-full blur-xl" />
                
                {/* Icon */}
                <div className={`relative w-16 sm:w-20 md:w-24 lg:w-32 h-16 sm:h-20 md:h-24 lg:h-32 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${steps[activeStep].color} flex items-center justify-center mb-6 sm:mb-8 shadow-2xl transform transition-all duration-500 hover:scale-105 mx-auto lg:mx-0`}>
                  {(() => {
                    const IconComponent = steps[activeStep].icon;
                    return <IconComponent className="w-8 sm:w-10 md:w-12 lg:w-16 h-8 sm:h-10 md:h-12 lg:h-16 text-white" />;
                  })()}
                </div>

                {/* Step number */}
                <div className="absolute top-4 sm:top-8 right-4 sm:right-8 text-6xl sm:text-8xl md:text-9xl font-black text-black/5">
                  {steps[activeStep].step}
                </div>

                {/* Features list */}
                <div className="space-y-2 sm:space-y-3 relative z-10">
                  {steps[activeStep].features.map((feature, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-2 sm:gap-3 bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <CheckCircle className={`w-4 sm:w-5 h-4 sm:h-5 bg-gradient-to-br ${steps[activeStep].color} bg-clip-text text-transparent flex-shrink-0`} style={{ color: 'currentColor' }} />
                      <span className="font-medium text-slate-700 text-sm sm:text-base">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right - Content */}
            <div className="space-y-4 sm:space-y-6 text-center lg:text-left order-1 lg:order-2">
              <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r ${steps[activeStep].color} text-white font-semibold text-xs sm:text-sm shadow-lg`}>
                Step {steps[activeStep].step}
              </div>
              
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
                {steps[activeStep].title}
              </h3>
              
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                {steps[activeStep].description}
              </p>

              {/* Navigation dots */}
              <div className="flex items-center gap-2 sm:gap-3 pt-2 sm:pt-4 justify-center lg:justify-start">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === activeStep 
                        ? `w-6 sm:w-8 bg-gradient-to-r ${steps[idx].color}` 
                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 sm:mt-16">
          <a
            href="/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group"
          >
            Get Started Now
            <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform" />
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
