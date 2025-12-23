import { useState } from "react";
import { ChevronDown, HelpCircle, MessageCircle, Phone, Mail, Sparkles } from "lucide-react";
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
    <section className="py-24 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-violet-100/40 via-transparent to-transparent" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 px-5 py-2.5 rounded-full font-semibold text-sm mb-6 shadow-sm">
            <HelpCircle className="w-4 h-4" />
            Got Questions?
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
              Frequently Asked
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Everything you need to know about our products and services
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
          {/* FAQ List */}
          <div className="lg:col-span-2 space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={cn(
                  "group rounded-2xl transition-all duration-300 overflow-hidden",
                  openIndex === index
                    ? "bg-white shadow-xl shadow-emerald-100/50 ring-1 ring-emerald-200"
                    : "bg-white/80 hover:bg-white shadow-lg hover:shadow-xl"
                )}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                      openIndex === index
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    )}>
                      {faq.category}
                    </span>
                    <span className={cn(
                      "font-semibold text-lg transition-colors",
                      openIndex === index ? "text-emerald-700" : "text-slate-900"
                    )}>
                      {faq.question}
                    </span>
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                    openIndex === index
                      ? "bg-emerald-500 text-white rotate-180"
                      : "bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600"
                  )}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>
                
                <div className={cn(
                  "overflow-hidden transition-all duration-300",
                  openIndex === index ? "max-h-96" : "max-h-0"
                )}>
                  <div className="px-6 pb-6 pt-0">
                    <div className="pl-[76px] text-slate-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Still have questions card */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    <MessageCircle className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Still have questions?</h3>
                  <p className="text-emerald-100 mb-6">
                    Can't find the answer you're looking for? Our friendly team is here to help.
                  </p>
                  
                  <div className="space-y-3">
                    <a
                      href="tel:+18009696295"
                      className="flex items-center gap-3 bg-white/20 hover:bg-white/30 rounded-xl px-4 py-3 transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                      <span className="font-medium">+1 800 969 6295</span>
                    </a>
                    <a
                      href="mailto:info@9rx.com"
                      className="flex items-center gap-3 bg-white/20 hover:bg-white/30 rounded-xl px-4 py-3 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      <span className="font-medium">info@9rx.com</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold text-slate-900">Quick Facts</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Response Time</span>
                    <span className="font-semibold text-emerald-600">&lt; 2 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Support Hours</span>
                    <span className="font-semibold text-emerald-600">24/7</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Satisfaction Rate</span>
                    <span className="font-semibold text-emerald-600">98%</span>
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
