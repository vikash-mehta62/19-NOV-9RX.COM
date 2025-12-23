import { Users, Heart, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useEffect, useState } from "react";
import cannon from "../../assests/home/3.png";
import valley from "../../assests/home/1.png";
import vistara from "../../assests/home/2.png";

const PartnersSection = () => {
  const [api, setApi] = useState<CarouselApi>();

  // Auto-slide effect
  useEffect(() => {
    if (!api) {
      return;
    }

    const interval = setInterval(() => {
      api.scrollNext();
    }, 3000);

    return () => clearInterval(interval);
  }, [api]);

  const stats = [
    { 
      icon: Users, 
      value: "150+", 
      label: "Happy Clients",
      color: "text-emerald-600",
      bg: "bg-emerald-100"
    },
    { 
      icon: Heart, 
      value: "98%", 
      label: "Satisfaction",
      color: "text-emerald-600",
      bg: "bg-emerald-100"
    },
  ];

  const testimonials = [
    {
      name: "Ryan Yanicko",
      role: "Cannon Pharmacy Mooresville",
      content: "Snehal and 9Rx have been excellent to work with getting our pharmacy bags and labels designed and delivered. They took the time to address our concerns and make sure the product was exactly to our specifications. The product quality is excellent and they are very reliable with ordering and delivery of the products.",
      initials: "RY",
      gradient: "from-emerald-400 to-teal-500",
      logo: cannon
    },
    {
      name: "Mark Cantrell",
      role: "Operations Manager, Cannon Pharmacy Main",
      content: "It has been a pleasure and wonderful experience working with 9rx. The products are wonderful and are customized to our exact specifications perfectly. The service and customer service are unparalleled and unmatched by any vendor that I have or currently work with. We are extremely pleased and lucky to have the amazing opportunity to do business with 9rx. We HIGHLY recommend this company and its services. Extremely Impressed and Pleased.",
      initials: "MC",
      gradient: "from-blue-400 to-indigo-500",
      logo: cannon
    },
    {
      name: "Khristina, PharmD",
      role: "Valley Health Pharmacy, Director of Pharmacy Operations",
      content: "I am incredibly impressed with the service I have received from 9RX when purchasing our pharmacy supplies (prescription labels, custom bags and medication droppers/adaptors). 9RX is truly reliable, offering high-quality items that meet all of our needs. The ordering process was straightforward, and the products arrived on time and in excellent condition. What stood out the most, however, was the excellent customer service. Snehal and the team have been responsive, knowledgeable, and always available to assist with any questions or concerns. I can confidently recommend 9RX to anyone looking for top-notch pharmacy supplies and reliable service.",
      initials: "KP",
      gradient: "from-purple-400 to-pink-500",
      logo: valley
    },
    {
      name: "Manan Patel",
      role: "Independent Pharmacy Owner",
      content: "I'm extremely satisfied with my purchases of pharmacy vials and other supplies from 9-Rx.com past 8 months and more. The quality of the products is very good and the service was fast and reliable. What helped my all businesses the most was the affordability of the pharmacy supplies when reimbursement rate is very challenging now a days. But what truly sets then apart is the trustworthiness of the team. They're knowledgeable, responsive, and genuinely care about their customers. Overall, I highly recommend for all your pharmacy needs. Thanks Much Snehal and Rajesh.",
      initials: "MP",
      gradient: "from-orange-400 to-red-500",
      logo: vistara
    }
  ];

  return (
    <section className="py-20 bg-emerald-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute top-[20%] -left-[10%] w-[400px] h-[400px] rounded-full bg-teal-100/40 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Trusted by Leading Pharmacy Groups
            </h2>
            <p className="text-slate-600 text-lg">
              Join hundreds of satisfied pharmacies who have enhanced their operations with our premium pharmacy supplies and packaging solutions.
            </p>
          </div>

          <div className="flex gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="font-bold text-2xl text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative px-12">
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/2">
                  <div className="h-full bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group flex flex-col">
                    <div className="flex items-start gap-4 mb-6">
                      {testimonial.logo ? (
                        <img 
                          src={testimonial.logo} 
                          alt={`${testimonial.name} logo`} 
                          className="w-12 h-12 rounded-full object-cover shadow-md"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                          {testimonial.initials}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg">{testimonial.name}</h4>
                        <p className="text-emerald-600 font-medium text-sm">{testimonial.role}</p>
                      </div>
                    </div>

                    <p className="text-slate-600 leading-relaxed mb-6 flex-grow line-clamp-4">
                      {testimonial.content}
                    </p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0" />
            <CarouselNext className="right-0" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
