import { Building2, Clock, Users } from "lucide-react";

const TrustSection = () => {
  return (
    <section className="  mb-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-emerald-600 font-semibold tracking-wider uppercase text-sm">Why Trust Us</span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">
            Industry-Leading Standards
          </h2>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
          Join hundreds of pharmacies that rely on 9Rx for their trusted and high-quality packaging supply needs.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
          <TrustCard
            icon={Building2}
            title="250+ Partner Pharmacies"
            description="Trusted by leading pharmacy groups across the nation"
          />
          <TrustCard
            icon={Users}
            title="Expert Support"
            description="Dedicated account managers for personalized service"
          />
          <TrustCard
            icon={Clock}
            title="24/7 Availability"
            description="Round-the-clock customer support and ordering"
          />
        </div>
      </div>
    </section>
  );
};

const TrustCard = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
  <div className="flex items-start space-x-4 group">
    <div className="flex-shrink-0">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white shadow-md flex items-center justify-center group-hover:bg-emerald-50 transition-colors duration-300">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
      </div>
    </div>
    <div>
      <h3 className="font-semibold text-gray-800 mb-2 text-lg sm:text-xl group-hover:text-emerald-600 transition-colors duration-300">
        {title}
      </h3>
      <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{description}</p>
    </div>
  </div>
);

export default TrustSection;