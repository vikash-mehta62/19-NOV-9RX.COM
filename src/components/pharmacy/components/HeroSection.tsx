import { Button } from "@/components/ui/button";
import { Package2 } from "lucide-react";

export const HeroSection = () => {
  return (
    <div className="relative rounded-2xl overflow-hidden p-8 text-white min-w-full">
      {/* Background image container */}
      <div className="absolute inset-0 z-0">
        <img
          src="/lovable-uploads/320ef3c7-e13e-4702-b3ff-d861e32d31ea.png"
          alt="Pharmacy supplies background"
          className="w-full h-full object-cover opacity-20"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/90 to-emerald-500/90"></div>
      </div>

      <div className="relative z-10 min-w-full">
        <h2 className="text-3xl font-bold mb-4">Special Offers This Week</h2>
        <p className="text-emerald-50 mb-6">
          Exclusive deals on premium pharmacy supplies. Limited time offers
          available.
        </p>
        <Button
          variant="secondary"
          className="bg-white text-emerald-600 hover:bg-emerald-50"
        >
          View All Offers
        </Button>
      </div>
      <div className="absolute right-0 top-0 w-1/3 h-full opacity-10">
        <Package2 className="w-full h-full" />
      </div>
    </div>
  );
};
