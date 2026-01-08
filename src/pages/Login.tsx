"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Truck,
  Clock,
  Award,
  Users,
  Package,
  CheckCircle2,
  Star,
  ChevronLeft,
  ChevronRight,
  Lock,
  Zap,
  HeartHandshake,
} from "lucide-react";
import logo from "../assests/home/9rx_logo.png";

// Testimonials data
const testimonials = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    role: "PharmaCare Plus",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "9RX has transformed how we manage our pharmacy supplies. The quality and service are unmatched!",
    rating: 5,
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "HealthFirst Pharmacy",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
    text: "Reliable delivery, competitive prices, and excellent customer support. Highly recommended!",
    rating: 5,
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "Community Rx",
    image: "https://randomuser.me/api/portraits/women/68.jpg",
    text: "The best B2B pharmacy supplier we've worked with. Their platform is intuitive and efficient.",
    rating: 5,
  },
];

// Features data
const features = [
  {
    icon: Package,
    title: "500+ Products",
    description: "Premium pharmacy supplies",
  },
  {
    icon: Truck,
    title: "Free Shipping",
    description: "On orders over $50",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Always here to help",
  },
  {
    icon: Award,
    title: "Quality Assured",
    description: "FDA compliant products",
  },
];

// Stats data
const stats = [
  { value: "10,000+", label: "Happy Customers" },
  { value: "500+", label: "Products" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
];

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get("tab");
  const defaultTab = tabFromUrl || location?.state?.defaultTab || "login";
  
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
        setIsAnimating(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    const userType = sessionStorage.getItem("userType");
    const isLoggedIn = sessionStorage.getItem("isLoggedIn");

    if (isLoggedIn === "true" && userType) {
      const routes: Record<string, string> = {
        pharmacy: "/pharmacy/products",
        admin: "/admin/dashboard",
        hospital: "/hospital/dashboard",
        group: "/group/dashboard",
      };
      if (routes[userType]) {
        navigate(routes[userType]);
      }
    }
  }, [navigate]);

  const nextTestimonial = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
      setIsAnimating(false);
    }, 300);
  };

  const prevTestimonial = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <div className="flex min-h-screen overflow-hidden font-sans">
      {/* Left Side - Visual Section with Animated Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated Gradient Background - Standardized to Emerald */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
          {/* Animated floating shapes */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-400/10 rounded-full blur-2xl animate-bounce" style={{ animationDuration: '3s' }} />
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 p-8 lg:p-12 flex flex-col justify-between h-full w-full text-white">
          {/* Logo */}
          <div className="flex items-center">
            <img src={logo} alt="9RX Logo" className="h-18 w-auto brightness-0 invert" />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
              Your Trusted Partner for
              <span className="block text-yellow-300 mt-2">Pharmacy Supplies</span>
            </h1>
            <p className="text-lg text-blue-100 mb-8">
              Join thousands of pharmacies who trust 9RX for premium quality supplies, 
              competitive pricing, and exceptional service.
            </p>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-all duration-300"
                  role="listitem"
                >
                  <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-gray-900" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{feature.title}</p>
                    <p className="text-xs text-blue-100">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1" role="img" aria-label="5 star rating">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={prevTestimonial}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Previous testimonial"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={nextTestimonial}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Next testimonial"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              
              <div className={`transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                <p className="text-blue-50 italic mb-4">
                  "{testimonials[currentTestimonial].text}"
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonials[currentTestimonial].image}
                    alt=""
                    aria-hidden="true"
                    className="w-10 h-10 rounded-full border-2 border-white/30"
                  />
                  <div>
                    <p className="font-semibold text-sm">{testimonials[currentTestimonial].name}</p>
                    <p className="text-xs text-blue-200">{testimonials[currentTestimonial].role}</p>
                  </div>
                </div>
              </div>

              {/* Testimonial indicators */}
              <div className="flex justify-center gap-2 mt-4" role="tablist" aria-label="Testimonial navigation">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`h-2 rounded-full transition-all min-h-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      index === currentTestimonial ? 'bg-white w-6' : 'bg-white/40 w-2 hover:bg-white/60'
                    }`}
                    role="tab"
                    aria-selected={index === currentTestimonial}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Stats & Trust Badges */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4" role="list" aria-label="Company statistics">
              {stats.map((stat, index) => (
                <div key={index} className="text-center" role="listitem">
                  <p className="text-2xl font-bold text-amber-300">{stat.value}</p>
                  <p className="text-xs text-blue-200">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Badge className="bg-white/20 text-white border-0 gap-1">
                <Shield className="h-3 w-3" /> SSL Secured
              </Badge>
              <Badge className="bg-white/20 text-white border-0 gap-1">
                <Lock className="h-3 w-3" /> HIPAA Compliant
              </Badge>
              <Badge className="bg-white/20 text-white border-0 gap-1">
                <CheckCircle2 className="h-3 w-3" /> FDA Approved
              </Badge>
            </div>

            <p className="text-center text-blue-200 text-sm">
              © {new Date().getFullYear()} 9RX. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-full lg:w-1/2 min-h-screen overflow-y-auto bg-gray-50">
        {/* Mobile Header */}
        <div className="lg:hidden bg-blue-600 p-6 text-white text-center">
          <img src="/final.png" alt="9RX Logo" className="h-12 mx-auto brightness-0 invert mb-3" />
          <p className="text-sm text-blue-100">Your Trusted Pharmacy Supplier</p>
        </div>

        <div className="flex items-center justify-center min-h-[calc(100vh-120px)] lg:min-h-screen p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-md">
            {/* Trust indicators for mobile */}
            <div className="lg:hidden flex justify-center gap-3 mb-6">
              <Badge variant="outline" className="text-xs gap-1">
                <Shield className="h-3 w-3" /> Secure
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                <Users className="h-3 w-3" /> 10K+ Users
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                <Zap className="h-3 w-3" /> Fast
              </Badge>
            </div>

            {/* Main Card */}
            <Card className="shadow-2xl border-0 bg-white rounded-2xl overflow-hidden">
              <CardHeader className="space-y-2 pb-4 pt-8 px-8 bg-gradient-to-b from-gray-50 to-white">
                <CardTitle className="text-3xl font-bold text-center text-gray-900">
                  Welcome Back!
                </CardTitle>
                <CardDescription className="text-center text-gray-600">
                  Sign in to access your pharmacy dashboard
                </CardDescription>
              </CardHeader>

              <CardContent className="px-8 pb-8">
                <Tabs defaultValue={defaultTab} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl h-12">
                    <TabsTrigger
                      value="login"
                      className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-semibold transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-semibold transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4 mt-6">
                    <LoginForm />
                  </TabsContent>
                  
                  <TabsContent value="signup" className="space-y-4 mt-6">
                    <SignupForm />
                  </TabsContent>
                </Tabs>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Why choose 9RX?</span>
                  </div>
                </div>

                {/* Benefits */}
                <div className="grid grid-cols-3 gap-3 text-center" role="list" aria-label="Benefits">
                  <div className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors" role="listitem">
                    <Truck className="h-5 w-5 mx-auto text-blue-600 mb-1" aria-hidden="true" />
                    <p className="text-xs font-medium text-gray-700">Free Shipping</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors" role="listitem">
                    <HeartHandshake className="h-5 w-5 mx-auto text-blue-600 mb-1" aria-hidden="true" />
                    <p className="text-xs font-medium text-gray-700">Best Prices</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors" role="listitem">
                    <Clock className="h-5 w-5 mx-auto text-blue-600 mb-1" aria-hidden="true" />
                    <p className="text-xs font-medium text-gray-700">24/7 Support</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom text */}
            <p className="text-center text-gray-500 text-sm mt-6">
              By signing in, you agree to our{" "}
              <a href="/terms-of-service" className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy-policy" className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
