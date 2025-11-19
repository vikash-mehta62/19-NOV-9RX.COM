import cannon from "../../assests/home/3.png";
import valley from "../../assests/home/1.png";
import vistara from "../../assests/home/2.png";
("use client");

import { useState } from "react";
import type React from "react";
import { Users, HeartHandshake, ChevronDown, ChevronUp } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const TestimonialsSection = () => {
  return (
    <section className="relative bg-[#ecfdf5] overflow-hidden py-12 md:py-16">
      <div className="absolute inset-0 bg-grid-white/5 bg-[size:3rem_3rem] pointer-events-none mix-blend-plus-lighter" />

      {/* Top Content */}
      <div className="container mx-auto px-4 sm:px-6 mb-8 md:mb-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 md:mb-12 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-900 mb-3 md:mb-4">
              Trusted by Leading Pharmacy Groups
            </h2>
            <p className="text-sm md:text-base text-emerald-700">
              Join hundreds of satisfied pharmacies who have enhanced their
              operations with our premium pharmacy supplies and packaging
              solutions.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:gap-8 mt-6 lg:mt-0">
            <StatsCard
              icon={
                <Users className="w-6 h-6 md:w-8 md:h-8 text-emerald-600" />
              }
              value="150+"
              label="Happy Clients"
            />
            <StatsCard
              icon={
                <HeartHandshake className="w-6 h-6 md:w-8 md:h-8 text-emerald-600" />
              }
              value="98%"
              label="Satisfaction"
            />
          </div>
        </div>
      </div>

      {/* Testimonials Slider */}
      <div className="relative container mx-auto px-4 sm:px-6">
        <div className="absolute inset-y-0 left-0 w-12 sm:w-16 md:w-24 bg-gradient-to-r from-[#ecfdf5] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-12 sm:w-16 md:w-24 bg-gradient-to-l from-[#ecfdf5] to-transparent z-10 pointer-events-none" />

        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={24}
          slidesPerView={1}
          pagination={{ clickable: true }}
          autoplay={{ delay: 15000, disableOnInteraction: false }}
          loop={true}
          className="testimonials-swiper !pb-12"
          breakpoints={{
            640: {
              slidesPerView: 1,
              spaceBetween: 20,
            },
            768: {
              slidesPerView: 1,
              spaceBetween: 24,
            },
            1024: {
              slidesPerView: 1,
              spaceBetween: 24,
            },
            1280: {
              slidesPerView: 1.5,
              spaceBetween: 32,
            },
          }}
        >
          {testimonials.map((testimonial, index) => (
            <SwiperSlide key={index} className="p-2 sm:p-4 md:p-5">
              <TestimonialCard {...testimonial} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

const StatsCard = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) => (
  <div className="text-center transform transition-transform hover:scale-105 duration-300">
    <div className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-emerald-100 rounded-full mb-2 mx-auto">
      {icon}
    </div>
    <p className="text-xl md:text-2xl font-bold text-emerald-900">{value}</p>
    <p className="text-xs md:text-sm text-emerald-600">{label}</p>
  </div>
);

const TestimonialCard = ({
  name,
  title,
  image,
  quote,
}: {
  name: string;
  title: string;
  image: string;
  quote: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 150;
  const isLongQuote = quote.length > maxLength;

  const truncatedQuote = isLongQuote
    ? `${quote.substring(0, maxLength)}...`
    : quote;

  return (
    <div className="min-h-[250px] p-4 sm:p-6 cursor-pointer rounded-2xl backdrop-blur-sm shadow-lg shadow-gray-300 bg-white/50 transform transition-transform duration-300 h-full flex flex-col">
      <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
        <img
          src={image || "/placeholder.svg"}
          alt={name}
          className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-emerald-200"
          loading="lazy"
        />
        <div>
          <h4 className="text-emerald-900 font-semibold text-base md:text-lg">
            {name || "Anonymous"}
          </h4>
          <p className="text-emerald-600 text-xs md:text-sm">
            {title || "Pharmacy Professional"}
          </p>
        </div>
      </div>

      <div className="text-emerald-800 text-sm md:text-base lg:text-lg mb-3 flex-grow">
        {isExpanded ? quote : truncatedQuote}
      </div>

      {isLongQuote && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm font-medium transition-colors mt-auto"
        >
          {isExpanded ? (
            <>
              Read Less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Read More <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

const testimonials = [
  {
    name: "Ryan Yanicko",
    title: "Cannon Pharmacy Mooresville",
    image: cannon,
    quote:
      "Snehal and 9Rx have been excellent to work with getting our pharmacy bags and labels designed and delivered. They took the time to address our concerns and make sure the product was exactly to our specifications. The product quality is excellent and they are very reliable with ordering and delivery of the products.",
  },
  {
    name: "Mark Cantrell",
    title: "Operations Manager, Cannon Pharmacy Main",
    image: cannon,
    quote:
      "It has been a pleasure and wonderful experience working with 9rx. The products are wonderful and are customized to our exact specifications perfectly. The service and customer service are unparalleled and unmatched by any vendor that I have or currently work with. We are extremely pleased and lucky to have the amazing opportunity to do business with 9rx. We HIGHLY recommend this company and its services. Extremely Impressed and Pleased.",
  },
  {
    name: "Khristina, PharmD",
    title: "Valley Health Pharmacy, Director of Pharmacy Operations",
    image: valley,
    quote:
      "I am incredibly impressed with the service I have received from 9RX when purchasing our pharmacy supplies (prescription labels, custom bags and medication droppers/adaptors). 9RX is truly reliable, offering high-quality items that meet all of our needs. The ordering process was straightforward, and the products arrived on time and in excellent condition. What stood out the most, however, was the excellent customer service. Snehal and the team have been responsive, knowledgeable, and always available to assist with any questions or concerns. I can confidently recommend 9RX to anyone looking for top-notch pharmacy supplies and reliable service.",
  },
  {
    name: "Manan Patel",
    title: "Independent Pharmacy Owner",
    image: vistara,
    quote:
      "I'm extremely satisfied with my purchases of pharmacy vials and other supplies from 9-Rx.com past 8 months and more. The quality of the products is very good and the service was fast and reliable. What helped my all businesses the most was the affordability of the pharmacy supplies when reimbursement rate is very challenging now a days. But what truly sets then apart is the trustworthiness of the team. They're knowledgeable, responsive, and genuinely care about their customers. Overall, I highly recommend for all your pharmacy needs. Thanks Much Snehal and Rajesh.",
  },
];

export default TestimonialsSection;
