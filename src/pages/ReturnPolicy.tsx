import { ArrowLeft, RotateCcw, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/landing/Footer";
import logo from "../assests/home/9rx_logo.png";

const ReturnPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar for light background */}
      <nav 
        className="fixed w-full top-0 z-50 bg-white/95 backdrop-blur-xl shadow-sm"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <a href="/" aria-label="9RX Home" className="flex-shrink-0">
              <img
                src={logo}
                alt="9RX Logo"
                className="h-10 sm:h-12 w-auto"
              />
            </a>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 sm:px-6 rounded-xl shadow-lg shadow-blue-500/25 min-h-[40px] sm:min-h-[44px] text-sm sm:text-base"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          </div>
        </div>
      </nav>
      
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
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Return Policy</h1>
            <p className="text-gray-500 mb-8">Our hassle-free return and refund policy</p>

            {/* Return Window Banner */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-6 mb-8 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">30-Day Return Window</h3>
                  <p className="text-blue-100">Return unused items within 30 days for a full refund</p>
                </div>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Eligible for Return</h3>
                </div>
                <ul className="text-blue-700 text-sm space-y-2">
                  <li>• Unused products in original packaging</li>
                  <li>• Items returned within 30 days</li>
                  <li>• Products with manufacturing defects</li>
                  <li>• Incorrect items received</li>
                </ul>
              </div>
              <div className="bg-red-50 rounded-xl p-5 border border-red-200">
                <div className="flex items-center gap-3 mb-3">
                  <XCircle className="w-6 h-6 text-red-600" />
                  <h3 className="font-semibold text-red-800">Not Eligible</h3>
                </div>
                <ul className="text-red-700 text-sm space-y-2">
                  <li>• Custom printed or personalized items</li>
                  <li>• Opened or used products</li>
                  <li>• Items returned after 30 days</li>
                  <li>• Products without original packaging</li>
                </ul>
              </div>
            </div>

            <div className="prose prose-gray max-w-none">
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How to Return an Item</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-700 font-bold">1</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Contact Customer Service</h4>
                    <p className="text-gray-600 text-sm">Email returns@9rx.com or call +1 (800) 969-6295 to initiate a return</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-700 font-bold">2</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Receive RMA Number</h4>
                    <p className="text-gray-600 text-sm">We'll provide a Return Merchandise Authorization number and shipping label</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-700 font-bold">3</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Ship the Item</h4>
                    <p className="text-gray-600 text-sm">Pack the item securely in original packaging and ship using the provided label</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-700 font-bold">4</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Receive Refund</h4>
                    <p className="text-gray-600 text-sm">Refunds are processed within 5-10 business days after we receive the return</p>
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Refund Information</h2>
              <p className="text-gray-600 mb-4">
                Refunds will be issued to the original payment method. Please allow 5-10 business days 
                for the refund to appear on your statement after we process the return.
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Full refund for items in original condition</li>
                <li>Shipping costs are non-refundable unless the return is due to our error</li>
                <li>Restocking fees may apply for large orders (over $1,000)</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Damaged or Defective Items</h2>
              <p className="text-gray-600 mb-4">
                If you receive a damaged or defective item, please contact us within 48 hours of delivery. 
                We will arrange for a replacement or full refund at no additional cost to you.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
              <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
                <p><strong>Returns Department</strong></p>
                <p>Email: returns@9rx.com</p>
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

export default ReturnPolicy;
