import { Building, Users, Award, Globe, HandshakeIcon, Calculator, Package2, ShoppingBag, DollarSign, Percent, ChartBar, Heart, Smile } from "lucide-react";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const AboutUsSection = () => {
  const [monthlySpend, setMonthlySpend] = useState([5000]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const { toast } = useToast();

  const products = [
    { id: "rx_vials", name: "RX VIALS", avgSpend: 2000 },
    { id: "paper_bags", name: "RX PAPER BAGS", avgSpend: 1500 },
    { id: "labels", name: "RX LABELS", avgSpend: 1000 },
    { id: "ointment_jars", name: "OINTMENT JARS", avgSpend: 1800 },
  ];

  const calculateSavings = () => {
    const baseSpend = monthlySpend[0];
    const selectedProductsSpend = selectedProducts.reduce((total, productId) => {
      const product = products.find(p => p.id === productId);
      return total + (product?.avgSpend || 0);
    }, 0);
    
    const savingsPercentage = 30;
    return ((baseSpend + selectedProductsSpend) * savingsPercentage) / 100;
  };

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    const savings = calculateSavings();
    toast({
      title: "Savings Calculation Complete!",
      description: `Based on your selections, you could save approximately $${savings.toLocaleString()} monthly!`,
    });
    setShowForm(false);
  };

  return (
    <section className="py-24 bg-gradient-to-b from-white to-emerald-50" id="about">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent animate-fade-in">
            Leading Pharmacy Distribution
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto animate-fade-in">
            Since 2010, 9Rx Wholesale has been serving independent pharmacies with reliable supplies and exceptional service
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-16 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-8 shadow-lg transform transition-all duration-500 hover:shadow-xl hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="w-8 h-8 text-emerald-600 animate-bounce" />
            <h3 className="text-2xl text-emerald-800 font-semibold">Calculate Your Potential Savings</h3>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductToggle(product.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 
                    ${selectedProducts.includes(product.id) 
                      ? 'bg-emerald-100 border-2 border-emerald-500 shadow-lg' 
                      : 'bg-white border-2 border-transparent hover:border-emerald-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => handleProductToggle(product.id)}
                    />
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-emerald-500" />
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <label className="text-gray-700 block mb-2 font-medium flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Your Current Monthly Spend on Selected Products
              </label>
              <Slider
                value={monthlySpend}
                onValueChange={setMonthlySpend}
                max={20000}
                min={1000}
                step={500}
                className="py-4"
              />
              <div className="flex justify-between text-gray-600 text-sm mt-2">
                <span>$1,000</span>
                <span className="font-medium">${monthlySpend[0].toLocaleString()}</span>
                <span>$20,000</span>
              </div>
            </div>
            
            {!showForm ? (
              <Button 
                onClick={() => setShowForm(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white group transition-all duration-300"
              >
                <Percent className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                Calculate My Savings
              </Button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                <Input
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-white"
                />
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-white"
                />
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-white"
                />
                <Button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white group"
                >
                  <ChartBar className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Show My Savings
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Vision and commitment section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 hover:shadow-xl transition-all duration-300">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-emerald-600 mb-6 flex items-center gap-2">
                <Smile className="w-6 h-6" />
                Our Vision
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                To be the trusted partner for independent pharmacies by providing reliable supplies and innovative solutions that help them serve their communities better.
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  <span>Quality-Assured Products</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  <span>Pharmacy-Focused Service</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-emerald-600 mb-6">Our Commitment</h3>
              <div className="space-y-4">
                <ValueItem
                  title="Pharmacy Support Excellence"
                  description="Dedicated to helping independent pharmacies thrive with reliable supply solutions"
                />
                <ValueItem
                  title="Personalized Service"
                  description="Understanding each pharmacy's unique needs and providing tailored solutions"
                />
                <ValueItem
                  title="Innovation in Supply"
                  description="Continuously improving our services to meet evolving pharmacy needs"
                />
                <ValueItem
                  title="Reliability"
                  description="Ensuring consistent supply of quality products for uninterrupted pharmacy operations"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ValueItem = ({ title, description }: { title: string; description: string }) => (
  <div className="border-l-2 border-emerald-500 pl-4">
    <h4 className="font-semibold text-gray-800 mb-1">{title}</h4>
    <p className="text-gray-600 text-sm">{description}</p>
  </div>
);

export default AboutUsSection;
