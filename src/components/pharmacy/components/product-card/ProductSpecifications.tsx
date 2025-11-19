import { Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ProductSpecifications as ProductSpecsType } from "../../types/product.types";

interface ProductSpecificationsProps {
  specifications?: ProductSpecsType;
}

export const ProductSpecifications = ({ specifications }: ProductSpecificationsProps) => {
  if (!specifications) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Info className="w-4 h-4" />
        Specifications
      </h3>
      <div className="space-y-3 text-sm">
        {specifications.dimensions && (
          <div>
            <span className="font-medium">Dimensions:</span> {specifications.dimensions}
          </div>
        )}
        {specifications.material && (
          <div>
            <span className="font-medium">Material:</span> {specifications.material}
          </div>
        )}
        {specifications.compatibility && specifications.compatibility.length > 0 && (
          <div>
            <span className="font-medium">Compatible with:</span>
            <ul className="list-disc list-inside ml-2 mt-1">
              {specifications.compatibility.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {specifications.safetyInfo && (
          <>
            <Separator />
            <div>
              <span className="font-medium block mb-1">Safety Information:</span>
              <p className="text-gray-600">{specifications.safetyInfo}</p>
            </div>
          </>
        )}
        {specifications.usageGuidelines && (
          <div>
            <span className="font-medium block mb-1">Usage Guidelines:</span>
            <p className="text-gray-600">{specifications.usageGuidelines}</p>
          </div>
        )}
      </div>
    </div>
  );
};