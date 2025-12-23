import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/HeroSection";

const TermsOfService = () => {
  const navigate = useNavigate();

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
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
            <p className="text-gray-500 mb-8">Last updated: December 22, 2024</p>

            <div className="prose prose-gray max-w-none">
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 mb-4">
                By accessing and using 9RX services, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our services.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Account Registration</h2>
              <p className="text-gray-600 mb-4">
                To access certain features, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Be responsible for all activities under your account</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Orders and Payments</h2>
              <p className="text-gray-600 mb-4">
                All orders are subject to acceptance and availability. We reserve the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Refuse or cancel any order for any reason</li>
                <li>Limit quantities purchased per person or order</li>
                <li>Verify information before processing orders</li>
                <li>Correct pricing errors</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Pricing</h2>
              <p className="text-gray-600 mb-4">
                Prices are subject to change without notice. Wholesale pricing is available only to 
                registered pharmacy accounts. All prices are in USD unless otherwise stated.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Shipping</h2>
              <p className="text-gray-600 mb-4">
                Shipping times are estimates and not guaranteed. Risk of loss passes to you upon 
                delivery to the carrier. Free shipping is available on qualifying orders over $500.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Returns and Refunds</h2>
              <p className="text-gray-600 mb-4">
                We accept returns within 30 days of delivery for unused products in original packaging. 
                Custom or personalized items are non-returnable. Refunds will be processed within 
                5-10 business days after receiving the returned item.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Intellectual Property</h2>
              <p className="text-gray-600 mb-4">
                All content on this website, including text, graphics, logos, and images, is the 
                property of 9RX LLC and protected by copyright laws.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-600 mb-4">
                9RX shall not be liable for any indirect, incidental, special, or consequential 
                damages arising from your use of our services or products.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Governing Law</h2>
              <p className="text-gray-600 mb-4">
                These terms shall be governed by the laws of the State of North Carolina, 
                without regard to conflict of law principles.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Contact</h2>
              <p className="text-gray-600 mb-4">
                For questions about these Terms of Service, contact us at:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
                <p><strong>9RX LLC</strong></p>
                <p>936 Broad River Ln, Charlotte, NC 28211</p>
                <p>Email: legal@9rx.com</p>
                <p>Phone: +1 (800) 969-6295</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsOfService;
