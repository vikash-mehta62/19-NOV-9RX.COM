import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { UserFormData } from "../../schemas/userFormSchemas";
import { US_STATES } from "./constants";

interface StateSelectProps {
  form: UseFormReturn<UserFormData>;
  fieldName: string;
}

export function StateSelect({ form, fieldName }: StateSelectProps) {
  return (
    <FormField
      control={form.control}
      name={fieldName as any} // TODO: Improve type safety here
      render={({ field }) => (
        <FormItem>
          <FormLabel>State *</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state.code} value={state.code}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
