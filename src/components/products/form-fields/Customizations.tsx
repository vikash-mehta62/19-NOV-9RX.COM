import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../schemas/productSchema";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface CustomizationSectionProps {
  form: UseFormReturn<ProductFormValues>;
}

export function CustomizationSection({ form }: CustomizationSectionProps) {
  const { register, watch, setValue } = form;
  const customizationAllowed = watch("customization.allowed");
  const [options, setOptions] = useState(watch("customization.options") || []);

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const updateOption = (index: number, value: string) => {
    const updatedOptions = [...options];
    updatedOptions[index] = value;
    setOptions(updatedOptions);
    setValue("customization.options", updatedOptions);
  };

  return (
    <div className="border p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Allow Customization</label>
        <Switch
          checked={customizationAllowed}
          onCheckedChange={(checked) =>
            setValue("customization.allowed", checked)
          }
        />
      </div>
      {/* {customizationAllowed && (
        <>
          <div className="mt-3">
            <label className="text-sm font-medium">Customization Price</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register("customization.price", { valueAsNumber: true })}
            />
          </div>
          <div className="mt-3">
            <label className="text-sm font-medium">Customization Options</label>
            {options.map((option, index) => (
              <Input
                key={index}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                className="mt-2"
              />
            ))}
            <Button type="button" onClick={addOption} className="mt-2">
              Add Option
            </Button>
          </div>
        </>
      )} */}
    </div>
  );
}
