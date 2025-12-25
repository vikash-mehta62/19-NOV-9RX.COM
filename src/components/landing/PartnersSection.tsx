import { Users, Heart, ChevronRight, Star } from "lucide-react";
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
    }, 4000);

    return () => clearInterval(interval);
  }, [api]);

  const testimonials = [
    {
      name: "Ryan Yanicko",
      role: "Cannon Pharmacy Mooresville",
      content: "Snehal and 9Rx have been excellent to work with. The product quality is excellent and they are very reliable with ordering and delivery.",
      initials: "RY",
      gradient: "from-blue-500 to-indigo-600",
      logo: cannon,
      rating: 5
    },
    {
      name: "Mark Cantrell",
      role: "Operations Manager, Cannon Pharmacy",
      content: "The service and customer service are unparalleled. We are extremely pleased and lucky to have the opportunity to do business with 9rx.",
      initials: "MC",
      gradient: "from-indigo-500 to-blue-600",
      logo: cannon,
      rating: 5
    },
    {
      name: "Khristina, PharmD",
      role: "Valley Health Pharmacy",
      content: "9RX is truly reliable, offering high-quality items. The ordering process was straightforward, and products arrived on time.",
      initials: "KP",
      gradient: "from-blue-600 to-indigo-500",
      logo: valley,
      rating: 5
    },
    {
      name: "Manan Patel",
      role: "Independent Pharmacy Owner",
      content: "The quality of products is very good and the service was fast and reliable. What truly sets them apart is the trustworthiness of the team.",
      initials: "MP",
      gradient: "from-indigo-600 to-blue-500",
      logo: vistara,
      rating: 5
    }
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full bg-blue-50 blur-3xl" />
        <div className="absolute top-[40%] -left-[10%] w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] rounded-full bg-indigo-50 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold text-xs sm:text-sm mb-3 sm:mb-4">
            <Heart className="w-3 sm:w-4 h-3 sm:h-4" />
            Customer Stories
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">
            Trusted by Leading Pharmacies
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base px-4">
            Join hundreds of satisfied pharmacies who have enhanced their operations with our premium supplies.
          </p>
        </div>

        {/* Testimonials Carousel */}
        <div className="relative px-2 sm:px-4 md:px-12">
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
                <CarouselItem key={index} className="basis-full sm:basis-1/2 lg:basis-1/2 pl-3 sm:pl-4">
                  <div className="h-full bg-gradient-to-br from-slate-50 to-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group">
                    {/* Rating */}
                    <div className="flex gap-0.5 sm:gap-1 mb-3 sm:mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-3 sm:w-4 h-3 sm:h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="text-slate-600 leading-relaxed mb-4 sm:mb-6 line-clamp-3 text-sm sm:text-base">
                      "{testimonial.content}"
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      {testimonial.logo ? (
                        <img 
                          src={testimonial.logo} 
                          alt={`${testimonial.name}`} 
                          className="w-8 sm:w-10 h-8 sm:h-10 rounded-full object-cover shadow-md"
                        />
                      ) : (
                        <div className={`w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md`}>
                          {testimonial.initials}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">{testimonial.name}</h4>
                        <p className="text-blue-600 text-xs sm:text-sm">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0 hidden md:flex" />
            <CarouselNext className="right-0 hidden md:flex" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
