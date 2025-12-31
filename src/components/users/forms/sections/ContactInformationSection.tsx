import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../../schemas/sharedFormSchema";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone } from "lucide-react";

interface ContactInformationSectionProps {
  form: UseFormReturn<BaseUserFormData>;
  self?: boolean;
}

export function ContactInformationSection({
  form,
  self = false,
}: ContactInformationSectionProps) {
  return (
    <Card className={self ? "border-0 shadow-none p-0" : ""}>
      {!self && (
        <CardHeader className="pb-2">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1">
            <Phone className="h-3 w-3 sm:h-4 sm:w-4" /> Contact Information
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={`space-y-2 ${self ? "p-0" : "pt-0"}`}>
        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="workPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-[11px]">Work Phone *</FormLabel>
                <FormControl>
                  <Input placeholder="Work phone" type="tel" {...field} className="h-7 sm:h-8 text-[11px] sm:text-xs" />
                </FormControl>
                <FormMessage className="text-[9px] sm:text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobilePhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-[11px]">Mobile Phone</FormLabel>
                <FormControl>
                  <Input placeholder="Mobile phone" type="tel" {...field} className="h-7 sm:h-8 text-[11px] sm:text-xs" />
                </FormControl>
                <FormMessage className="text-[9px] sm:text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="alternativeEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] sm:text-[11px]">Alternative Email</FormLabel>
              <FormControl>
                <Input placeholder="Alternative email" type="email" {...field} className="h-7 sm:h-8 text-[11px] sm:text-xs" />
              </FormControl>
              <FormMessage className="text-[9px] sm:text-[10px]" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="faxNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-[11px]">Fax Number</FormLabel>
                <FormControl>
                  <Input placeholder="Fax number" type="tel" {...field} className="h-7 sm:h-8 text-[11px] sm:text-xs" />
                </FormControl>
                <FormMessage className="text-[9px] sm:text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-[11px]">Contact Person *</FormLabel>
                <FormControl>
                  <Input placeholder="Contact person" {...field} className="h-7 sm:h-8 text-[11px] sm:text-xs" />
                </FormControl>
                <FormMessage className="text-[9px] sm:text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] sm:text-[11px]">Department</FormLabel>
              <FormControl>
                <Input placeholder="Department" {...field} className="h-7 sm:h-8 text-[11px] sm:text-xs" />
              </FormControl>
              <FormMessage className="text-[9px] sm:text-[10px]" />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
