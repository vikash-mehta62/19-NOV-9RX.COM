import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/landing/Footer";
import logo from "../assests/home/9rx_logo.png";

const PrivacyPolicy = () => {
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
                className="h-16 sm:h-12 w-auto"
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
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-gray-500 mb-8">Last updated: December 22, 2024</p>

            <div className="prose prose-gray max-w-none">
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
              <p className="text-gray-600 mb-4">
                We collect information you provide directly to us, such as when you create an account, 
                place an order, subscribe to our newsletter, or contact us for support. This may include:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Name and contact information (email, phone, address)</li>
                <li>Business information (pharmacy name, license number)</li>
                <li>Payment information (processed securely through our payment providers)</li>
                <li>Order history and preferences</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-600 mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Process and fulfill your orders</li>
                <li>Send order confirmations and shipping updates</li>
                <li>Provide customer support</li>
                <li>Send promotional communications (with your consent)</li>
                <li>Improve our products and services</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Information Sharing</h2>
              <p className="text-gray-600 mb-4">
                We do not sell your personal information. We may share your information with:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Service providers who assist in our operations (shipping, payment processing)</li>
                <li>Legal authorities when required by law</li>
                <li>Business partners with your consent</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Data Security</h2>
              <p className="text-gray-600 mb-4">
                We implement appropriate security measures to protect your personal information, 
                including encryption, secure servers, and regular security assessments.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Your Rights</h2>
              <p className="text-gray-600 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
                <li>Data portability</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Cookies</h2>
              <p className="text-gray-600 mb-4">
                We use cookies and similar technologies to enhance your experience, analyze usage, 
                and assist in our marketing efforts. You can manage cookie preferences through your browser settings.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have questions about this Privacy Policy, please contact us at:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
                <p><strong>9RX LLC</strong></p>
                <p>724 Montana drive, Charlotte, NC 28216</p>
                <p>Email: info@9rx.com</p>
                <p>Phone: +1 (800) 940-9619</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
