import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Package, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Products = () => {
  const navigate = useNavigate();

  const products = [
    {
      id: 1,
      name: "RX Vials 13 Dram",
      description: "Child-resistant prescription vials with perfect clarity",
      image: "/placeholder.svg",
      category: "RX VIALS",
      pricing: {
        base: 49.99,
        tier1: 44.99,
        tier2: 39.99,
        tier3: 34.99,
      },
      minQuantity: {
        tier1: 1,
        tier2: 50,
        tier3: 200,
      },
    },
    {
      id: 2,
      name: "RX Labels 2x3",
      description: "High-quality prescription labels with strong adhesive",
      image: "/placeholder.svg",
      category: "RX LABELS",
      pricing: {
        base: 29.99,
        tier1: 26.99,
        tier2: 23.99,
        tier3: 20.99,
      },
      minQuantity: {
        tier1: 1,
        tier2: 100,
        tier3: 500,
      },
    },
    // Add more products as needed
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 text-transparent bg-clip-text mb-6">
            Our Products
          </h1>
          <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
            High-quality pharmacy supplies with competitive tier pricing for
            your business
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <Card
              key={product.id}
              className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 animate-scale-in"
            >
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                  {product.category}
                </Badge>
              </div>

              <div className="p-6 space-y-6">
                <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-gray-800 group-hover:text-emerald-600 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-gray-600">{product.description}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      Base Price
                    </span>
                    <span className="font-semibold">
                      ${product.pricing.base}
                    </span>
                  </div>

                  <TooltipProvider>
                    <div className="space-y-2">
                      {[1, 2, 3].map((tier) => (
                        <Tooltip key={tier}>
                          <TooltipTrigger className="w-full">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 transition-colors">
                              <span className="flex items-center gap-1">
                                <Layers className="w-4 h-4" />
                                <span>Tier {tier}</span>
                              </span>
                              <span className="font-semibold text-emerald-600">
                                ${product.pricing[`tier${tier}`]}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Min. Quantity:{" "}
                              {product.minQuantity[`tier${tier}`]} units
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>

                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 transition-all duration-300"
                    onClick={() => navigate("/login?tab=signup")}
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Sign Up Now
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Products;
