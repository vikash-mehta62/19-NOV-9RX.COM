import Select from "react-select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../CreateGroupPricingDialog";

interface GroupPharmacyFieldsProps {
  form: UseFormReturn<FormValues>;
  groups: Array<{ id: string; name: string }>;
  pharmacies: Array<{ id: string; name: string }>;
}

export function GroupPharmacyFields({ form, groups, pharmacies }: GroupPharmacyFieldsProps) {
  return (
    <>
      {/* Multi-select for Groups */}
      <FormField
        control={form.control}
        name="group"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Select Pharmacy</FormLabel>
            <FormControl>
              <Select
                isMulti
                options={groups.map((group) => ({ value: group.id, label: group.name }))}
                value={groups.filter((group) => field.value?.includes(group.id)).map((group) => ({ value: group.id, label: group.name }))}
                onChange={(selectedOptions) => field.onChange(selectedOptions.map((option) => option.value))}
                placeholder="Select Pharmacy"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

     
    </>
  );
}
