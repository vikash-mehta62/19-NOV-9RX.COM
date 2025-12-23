import { Award, Shield, Truck, Star, CheckCircle, Zap, Clock, HeartHandshake } from "lucide-react";

const PartnersSection = () => {
  const certifications = [
    {
      icon: Shield,
      title: "FDA Compliant",
      description: "All products meet FDA standards",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Award,
      title: "Quality Assured",
      description: "ISO certified manufacturing",
      color: "from-violet-500 to-purple-500"
    },
    {
      icon: Truck,
      title: "Fast Shipping",
      description: "Same-day dispatch available",
      color: "from-emerald-500 to-teal-500"
    },
    {
      icon: Star,
      title: "Top Rated",
      description: "98% customer satisfaction",
      color: "from-amber-500 to-orange-500"
    }
  ];

  const paymentMethods = [
    { name: "VISA", color: "text-blue-600", bg: "bg-blue-50" },
    { name: "Mastercard", color: "text-red-500", bg: "bg-red-50" },
    { name: "AMEX", color: "text-blue-500", bg: "bg-blue-50" },
    { name: "Discover", color: "text-orange-500", bg: "bg-orange-50" },
    { name: "ACH", color: "text-emerald-600", bg: "bg-emerald-50" },
    { name: "NET 30", color: "text-violet-600", bg: "bg-violet-50" },
  ];

  const guarantees = [
    { icon: CheckCircle, text: "30-Day Returns" },
    { icon: Zap, text: "Same-Day Dispatch" },
    { icon: Clock, text: "24/7 Support" },
    { icon: HeartHandshake, text: "Price Match" },
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Certifications */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {certifications.map((cert, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cert.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                <cert.icon className="w-7 h-7 text-white" />
              </div>
              <h4 className="font-bold text-slate-900 mb-1">{cert.title}</h4>
              <p className="text-sm text-slate-500">{cert.description}</p>
            </div>
          ))}
        </div>

        {/* Guarantees bar */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 mb-12 shadow-xl">
          <div className="flex flex-wrap justify-center md:justify-between items-center gap-6">
            {guarantees.map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="font-semibold">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-6 font-medium">Secure Payment Methods</p>
          <div className="flex flex-wrap justify-center items-center gap-4">
            {paymentMethods.map((method, index) => (
              <div
                key={index}
                className={`${method.bg} px-5 py-3 rounded-xl border border-slate-200 hover:shadow-md transition-all duration-300 hover:scale-105`}
              >
                <span className={`font-bold ${method.color}`}>{method.name}</span>
              </div>
            ))}
          </div>
          
          {/* Security badges */}
          <div className="flex justify-center items-center gap-6 mt-8 text-slate-400 text-sm">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              256-bit SSL Encryption
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              PCI DSS Compliant
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
