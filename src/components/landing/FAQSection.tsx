import { useState } from "react";
import { ChevronDown, HelpCircle, MessageCircle, Phone, Mail, Sparkles, FastForwardIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "What is the minimum order quantity?",
      answer: "We have no minimum order requirement for most products. However, some items may have case quantity minimums. Volume discounts are available for larger orders - the more you order, the more you save!",
      category: "Orders"
    },
    {
      question: "How fast is shipping?",
      answer: "Orders placed before 3:00 PM EST are dispatched the same day. Standard shipping typically takes 2-5 business days depending on your location. Express and overnight shipping options are also available for urgent needs.",
      category: "Shipping"
    },
    {
      question: "Do you offer customization services?",
      answer: "Yes! We offer full customization for RX paper bags, labels, and many other products. You can add your pharmacy logo, contact information, and custom designs. Our design team will work with you to create the perfect branded materials.",
      category: "Products"
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover), ACH bank transfers, and offer NET 30 terms for qualified accounts. All transactions are secured with industry-standard encryption.",
      category: "Payments"
    },
    {
      question: "Can I return products?",
      answer: "Yes, we have a hassle-free 30-day return policy. Unopened products in original packaging can be returned for a full refund. Custom orders are non-returnable, but we guarantee satisfaction with our quality.",
      category: "Returns"
    },
    {
      question: "Do you offer volume discounts?",
      answer: "Absolutely! We offer tiered pricing based on order volume. Discounts start at 5% for orders over $500 and can go up to 25% for large bulk orders. Contact our sales team for custom pricing on enterprise orders.",
      category: "Pricing"
    }
  ];

  const categories = [...new Set(faqs.map(f => f.category))];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white via-blue-50/20 to-white relative overflow-hidden">
      {/* Background decorations - Unified blue theme */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-100/30 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-100/30 via-transparent to-transparent" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f608_1px,transparent_1px),linear-gradient(to_bottom,#3b82f608_1px,transparent_1px)] bg-[size:14px_24px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm mb-4 sm:mb-6 shadow-sm">
            <HelpCircle className="w-3 sm:w-4 h-3 sm:h-4" />
            Got Questions?
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
            <span className="text-slate-900">
              Frequently Asked
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto px-4">
            Everything you need to know about our products and services
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 max-w-7xl mx-auto">
          {/* FAQ List */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={cn(
                  "group rounded-xl sm:rounded-2xl transition-all duration-300 overflow-hidden",
                  openIndex === index
                    ? "bg-white shadow-xl shadow-blue-100/50 ring-1 ring-blue-200"
                    : "bg-white/80 hover:bg-white shadow-md sm:shadow-lg hover:shadow-xl"
                )}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 sm:p-6 text-left"
                >
                  <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                    <span className={cn(
                      "px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold transition-colors flex-shrink-0",
                      openIndex === index
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    )}>
                      {faq.category}
                    </span>
                    <span className={cn(
                      "font-semibold text-sm sm:text-base lg:text-lg transition-colors truncate",
                      openIndex === index ? "text-blue-700" : "text-slate-900"
                    )}>
                      {faq.question}
                    </span>
                  </div>
                  <div className={cn(
                    "w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ml-2",
                    openIndex === index
                      ? "bg-blue-500 text-white rotate-180"
                      : "bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                  )}>
                    <ChevronDown className="w-4 sm:w-5 h-4 sm:h-5" />
                  </div>
                </button>
                
                <div className={cn(
                  "overflow-hidden transition-all duration-300",
                  openIndex === index ? "max-h-96" : "max-h-0"
                )}>
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
                    <div className="sm:pl-[76px] text-slate-600 leading-relaxed text-sm sm:text-base">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Card */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-4 sm:space-y-6">
              {/* Still have questions card */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-20 sm:w-24 h-20 sm:h-24 bg-white/10 rounded-full blur-xl" />
                
                <div className="relative z-10">
                  <div className="w-12 sm:w-14 h-12 sm:h-14 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                    <MessageCircle className="w-6 sm:w-7 h-6 sm:h-7" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Still have questions?</h3>
                  <p className="text-blue-100 mb-4 sm:mb-6 text-sm sm:text-base">
                    Can't find the answer you're looking for? Our friendly team is here to help.
                  </p>
                  
                  <div className="space-y-2 sm:space-y-3">
                    <a
                      href="tel:+18009696295"
                      className="flex items-center gap-2 sm:gap-3 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 transition-colors text-sm sm:text-base"
                    >
                      <Phone className="w-4 sm:w-5 h-4 sm:h-5" />
                      <span className="font-medium">+1 800 969 6295</span>
                    </a>
                    <a
                      href="mailto:info@9rx.com"
                      className="flex items-center gap-2 sm:gap-3 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 transition-colors text-sm sm:text-base"
                    >
                      <Mail className="w-4 sm:w-5 h-4 sm:h-5" />
                      <span className="font-medium">info@9rx.com</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <span className="font-semibold text-slate-900 text-sm sm:text-base">Quick Facts</span>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span className="text-slate-600">Response Time</span>
                    <span className="font-semibold text-blue-600">&lt; 2 hours</span>
                  </div>
                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span className="text-slate-600">Support Hours</span>
                    <span className="font-semibold text-blue-600">24/7</span>
                  </div>
                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span className="text-slate-600">Satisfaction Rate</span>
                    <span className="font-semibold text-blue-600">98%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
