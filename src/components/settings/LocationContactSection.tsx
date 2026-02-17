import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Plus } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues } from "./settingsTypes";
import { getAddressPredictions, getPlaceDetails } from "@/utils/googleAddressHelper";

interface LocationContactSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

export function LocationContactSection({ form }: LocationContactSectionProps) {
  // Google Address API suggestions
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);

  // Handle address change with Google API
  const handleAddressChange = (value: string) => {
    form.setValue("address", value);
    getAddressPredictions(value, setAddressSuggestions);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: any) => {
    getPlaceDetails(suggestion.place_id, (address) => {
      if (address) {
        form.setValue("address", address.street);
        form.setValue("city", address.city);
        form.setValue("state", address.state);
        form.setValue("zip_code", address.zip_code);
      }
    });
    setAddressSuggestions([]);
  };

export function LocationContactSection({ form }: LocationContactSectionProps) {
  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Location and Contact Info</CardTitle>
          <CardDescription>
            Let customers know where your business is based and how they can
            reach you
          </CardDescription>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add a Second Location
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="relative">
                <FormLabel className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Street Address
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter street address" 
                    value={field.value}
                    onChange={(e) => handleAddressChange(e.target.value)}
                  />
                </FormControl>
                {addressSuggestions.length > 0 && (
                  <ul className="absolute left-0 w-full bg-white border-2 border-blue-200 shadow-lg z-50 mt-1 max-h-60 overflow-y-auto rounded-lg">
                    {addressSuggestions.map((suggestion) => (
                      <li
                        key={suggestion.place_id}
                        className="cursor-pointer hover:bg-blue-50 px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {suggestion.description}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="suite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suite, Unit, etc.</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="zip_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP Code</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Phone
                </FormLabel>
                <FormControl>
                  <Input type="tel" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
