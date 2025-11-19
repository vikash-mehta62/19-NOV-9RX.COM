import {
  Pill,
  Building2,
  Box,
  Truck,
  ShoppingBag,
  Clock,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import image1 from "../../assests/home/1.png";
import image2 from "../../assests/home/2.png";
import image3 from "../../assests/home/3.png";


export const Navbar =() =>{
  const navigate = useNavigate();
  
  return(
  <nav className="fixed w-full top-0 bg-white/95 backdrop-blur-sm z-50 shadow-sm">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-4 sm:space-x-8">
        <div className="relative">
          <div className="absolute inset-0  rounded-full blur-lg transform scale-150"></div>

          <img
            src="/final.png"
            alt="9rx Logo"
            className=" h-14 relative z-10  "
          />
        </div>
      </div>
      <div className="flex items-center space-x-3 sm:space-x-6">
        <Button
          onClick={() =>
            navigate("/login", { state: { defaultTab: "signup" } })
          }
          variant="outline"
          className="hidden md:inline-flex border-emerald-600 text-emerald-600 hover:bg-emerald-50 transition-all duration-300 transform hover:scale-105"
        >
          Sign Up
        </Button>
        <Button
          className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm sm:text-base px-3 sm:px-4"
          onClick={() => navigate("/login")}
        >
          Login
        </Button>
      </div>
    </div>
  </div>
</nav>
)}
const HeroSection = () => {

  return (
    <div className="relative">
      {/* Navigation Bar */}
  
<Navbar />
      {/* Hero Section */}
      <section className="min-h-[90vh] flex items-center pt-16 sm:pt-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/lovable-uploads/320ef3c7-e13e-4702-b3ff-d861e32d31ea.png"
            alt="Hero background"
            className="w-full h-full object-cover opacity-0"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A1F2C]/85 via-[#0EA5E9]/60 to-[#8B5CF6]/70"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-[#403E43]/50 via-[#6E59A5]/30 to-[#9b87f5]/40"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#6E59A5]/20"></div>
          <div className="absolute inset-0 backdrop-blur-[1px]"></div>
          <div className="absolute inset-0 mix-blend-soft-light bg-gradient-to-br from-purple-900/10 via-blue-800/10 to-emerald-800/10"></div>
          <div className="absolute inset-0 mix-blend-overlay bg-gradient-radial from-white/10 via-transparent to-transparent"></div>
        </div>

        <div className="container mx-auto px-4 relative z-20 py-12 sm:py-16 md:py-20">
          <div className="inline-flex items-center bg-white/15 backdrop-blur-md rounded-full px-4 sm:px-6 py-2 sm:py-3 mb-8 sm:mb-12">
            <div className="flex -space-x-2">
              {[image1, image2, image3].map((logo, i) => (
                <img
                  key={i}
                  src={logo}
                  alt={`Trusted Pharmacy ${i + 1}`}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 border-2 border-white shadow-lg transform hover:scale-110 transition-all duration-300" 
                />
              ))}
            </div>

            
            <span className="ml-3 sm:ml-4 text-sm sm:text-base md:text-lg font-medium text-white">
              Trusted by 250+ Pharmacies
            </span>
          </div>

          <div className="max-w-5xl space-y-8 mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight drop-shadow-lg">
              Elevate Your Pharmacy <br />
              <span className="text-teal-300 drop-shadow-lg">
                with Premium Supplies
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-100 max-w-2xl drop-shadow">
              Experience unmatched quality in pharmacy supplies and packaging
              solutions. Trusted by leading pharmacies nationwide for
              reliability and excellence.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 mt-12">
              <FeatureCard
                icon={<Building2 className="w-6 h-6 text-white" />}
                title="Top quality pharmacy supplies"
                description="One of the Fastest growing Rx Supply Company"
             
              />
              <FeatureCard
                icon={<Box className="w- h-6 text-white" />}
                title="Quality & Affordability Assured"
                description="Best Quality Supply at Affordable Pricing"
            
              />
              <FeatureCard
                icon={<Truck className="w-6 h-6 text-white" />}
                title="Fast Delivery"
                description="Same Day Dispatch if the order is placed before 3.00pm EST"
            
              />
              <FeatureCard
                icon={<Settings className="w-6 h-6 text-white" />}
                title="Customization"
                description="Personalized Solutions for your Rx Paper Bags, Rx Labels and many more Products"
               
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 flex items-start space-x-6 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group">
    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/40 group-hover:from-emerald-500/40 group-hover:to-emerald-500/50 transition-all duration-300 shadow-lg">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold text-white text-xl mb-2">{title}</h3>
      <p className="text-white/80 text-base leading-relaxed">{description}</p>
    </div>
  </div>
);

export default HeroSection;
