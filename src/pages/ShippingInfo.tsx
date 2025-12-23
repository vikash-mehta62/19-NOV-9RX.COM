import { ArrowLeft, Truck, Clock, Package, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/HeroSection";
import { Card, CardContent } from "@/components/ui/card";

const ShippingInfo = () => {
  const navigate = useNavigate();

  const shippingOptions = [
    {
      icon: Truck,
      title: "Standard Shipping",
      time: "5-7 Business Days",
      price: "Calculated at checkout",
      color: "from-blue-500 to-indigo-500"
    },
    {
      icon: Clock,
      title: "Express Shipping",
      time: "2-3 Business Days",
      price: "Additional fees apply",
      color: "from-amber-500 to-orange-500"
    },
    {
      icon: Package,
      title: "Same-Day Shipping",
      time: "Orders before 3PM EST",
      price: "Available for select areas",
      color: "from-emerald-500 to-teal-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Shipping Information</h1>
            <p className="text-gray-500 mb-8">Everything you need to know about our shipping policies</p>

            {/* Free Shipping Banner */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-6 mb-8 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <DollarSign className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">FREE Shipping on Orders $500+</h3>
                  <p className="text-emerald-100">Enjoy free standard shipping on qualifying orders</p>
                </div>
              </div>
            </div>

            {/* Shipping Options */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Options</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {shippingOptions.map((option, index) => (
                <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center mb-4`}>
                      <option.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{option.title}</h3>
                    <p className="text-emerald-600 font-medium text-sm mb-1">{option.time}</p>
                    <p className="text-gray-500 text-sm">{option.price}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="prose prose-gray max-w-none">
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Shipping Policies</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Order Processing</h3>
              <p className="text-gray-600 mb-4">
                Orders placed before 3:00 PM EST on business days are typically processed and shipped 
                the same day. Orders placed after 3:00 PM EST or on weekends/holidays will be processed 
                the next business day.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Delivery Areas</h3>
              <p className="text-gray-600 mb-4">
                We ship to all 50 US states. International shipping is available for select countries. 
                Please contact us for international shipping rates and availability.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Tracking Your Order</h3>
              <p className="text-gray-600 mb-4">
                Once your order ships, you will receive an email with tracking information. 
                You can also track your order by logging into your account and viewing your order history.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Delivery Issues</h3>
              <p className="text-gray-600 mb-4">
                If your package is lost, damaged, or delayed, please contact our customer service team 
                within 48 hours of the expected delivery date. We will work with the carrier to resolve 
                the issue promptly.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
              <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
                <p><strong>Shipping Questions?</strong></p>
                <p>Email: shipping@9rx.com</p>
                <p>Phone: +1 (800) 969-6295</p>
                <p>Hours: Mon-Fri 9AM-6PM EST</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ShippingInfo;
