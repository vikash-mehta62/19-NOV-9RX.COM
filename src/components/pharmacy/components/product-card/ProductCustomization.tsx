import { useState } from "react";
import Select from "react-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Palette, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { useSelector } from "react-redux";
import axios from "../../../../../axiosconfig";
import { useToast } from "@/hooks/use-toast";
interface ProductCustomizationProps {
  sizes: { size_value: string; size_unit: string }[];
  onCustomizationChange: (customizations: Record<string, string>) => void;
}

export const ProductCustomization = ({
  sizes,
  onCustomizationChange,
}: ProductCustomizationProps) => {
  const [customizationEnabled, setCustomizationEnabled] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const { toast } = useToast();

  const handleToggleChange = (checked: boolean) => {
    setCustomizationEnabled(checked);
    onCustomizationChange({ available: checked ? "yes" : "no" });
  };

  const handleProductChange = (selectedOptions: any) => {
    setSelectedProducts(selectedOptions);
  };

  const sizeOptions = sizes.map((size) => ({
    value: `${size.size_value} ${size.size_unit}`,
    label: `${size.size_value} ${size.size_unit}`,
  }));

  const userProfile = useSelector(selectUserProfile);
  const sendCustomization = async () => {
    console.log(userProfile);
    const name = userProfile?.display_name;
    const email = userProfile?.email;
    const phone = userProfile?.mobile_phone || userProfile?.work_phone || "NA";
    console.log(selectedProducts);

    try {
      await axios.post("/customization", {
        name,
        email,
        phone,
        selectedProducts,
      });
      toast({
        title: "Success",
        description: "Our team will connect shortly",
        variant: "default",
      });
      setSelectedProducts([]);
    } catch (apiError) {
      console.error("Failed to send order status to backend:", apiError);
      toast({
        title: "Send Enquiry Failed",
        description: "Please Try Again!",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-50 to-green-50 p-4 rounded-lg transition-transform duration-300 ">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-green-700">
            Customization Available
          </h3>
        </div>
        <div className="flex items-center justify-between bg-white/80 p-3 rounded-md backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-gray-700">Custom Design</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Enable Customization</span>
            <Switch
              checked={customizationEnabled}
              onCheckedChange={handleToggleChange}
            />
          </div>
        </div>

        {customizationEnabled && (
          <div className="mt-4">
            <label className="text-gray-700 font-semibold mb-2 block">
              Select Products
            </label>
            <Select
              options={sizeOptions}
              isMulti
              value={selectedProducts}
              onChange={handleProductChange}
              className="text-black"
            />
            <Button
              className="mt-4 bg-green-600 text-white w-full"
              disabled={selectedProducts.length === 0}
              onClick={sendCustomization}
            >
              Send Enquiry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
