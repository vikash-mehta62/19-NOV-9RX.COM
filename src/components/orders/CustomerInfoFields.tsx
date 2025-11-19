"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { UseFormReturn } from "react-hook-form"

declare global {
  interface Window {
    google: any;
  }
}

interface CustomerInfoFieldsProps {
  form: UseFormReturn<any>
  readOnly?: boolean
  poIs?: boolean
}

export function CustomerInfoFields({ form, readOnly = false,poIs = false }: CustomerInfoFieldsProps) {
  const [sameAsCustomer, setSameAsCustomer] = useState(false)
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([])
  const [shippingSuggestions, setShippingSuggestions] = useState<any[]>([])
  const customerAddressInputRef = useRef<HTMLInputElement | null>(null)
  const shippingAddressInputRef = useRef<HTMLInputElement | null>(null)

  const handlePlaceSelected = (place: any, addressType: string) => {
    if (!place || !place.address_components) return

    let city = ""
    let state = ""
    let zipCode = ""
    let street = place.formatted_address?.split(",")[0] || ""
    let companyName = place.name || ""

    place.address_components.forEach((component: any) => {
      const types = component.types
      if (types.includes("locality")) city = component.long_name
      if (types.includes("administrative_area_level_1")) state = component.short_name
      if (types.includes("postal_code")) zipCode = component.long_name
    })

    const addressField = addressType === "customer" ? "customerInfo" : "shippingAddress"
    form.setValue(`${addressField}.address.street`, street, { shouldValidate: true })
    form.setValue(`${addressField}.address.city`, city, { shouldValidate: true })
    form.setValue(`${addressField}.address.state`, state, { shouldValidate: true })
    form.setValue(`${addressField}.address.zip_code`, zipCode, { shouldValidate: true })
    form.setValue(`${addressField}.address.companyName`, companyName, { shouldValidate: true })
  }

  const syncShippingWithCustomer = useCallback(() => {
    const info = form.getValues("customerInfo")
    form.setValue("shippingAddress.fullName", info.name || "", { shouldValidate: true })
    form.setValue("shippingAddress.email", info.email || "", { shouldValidate: true })
    form.setValue("shippingAddress.phone", info.phone || "", { shouldValidate: true })
    form.setValue("shippingAddress.address.street", info.address?.street || "", { shouldValidate: true })
    form.setValue("shippingAddress.address.city", info.address?.city || "", { shouldValidate: true })
    form.setValue("shippingAddress.address.state", info.address?.state || "", { shouldValidate: true })
    form.setValue("shippingAddress.address.zip_code", info.address?.zip_code || "", { shouldValidate: true })
    form.setValue("shippingAddress.address.companyName", info.address?.companyName || "", { shouldValidate: true })
  }, [form])

  const handleToggle = (checked: boolean) => {
    setSameAsCustomer(checked)
    if (checked) syncShippingWithCustomer()
  }

  useEffect(() => {
    if (sameAsCustomer) {
      const subscription = form.watch((_, { name }) => {
        if (name?.startsWith("customerInfo.")) {
          syncShippingWithCustomer()
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [sameAsCustomer, syncShippingWithCustomer, form])

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    addressType: "customer" | "shipping"
  ) => {
    const value = e.target.value
    const field = addressType === "customer" ? "customerInfo" : "shippingAddress"
    form.setValue(`${field}.address.street`, value, { shouldValidate: true })

    if (value.length > 2 && window.google) {
      const service = new window.google.maps.places.AutocompleteService()
      service.getPlacePredictions(
        {
          input: value,
              types: ["geocode", "establishment"]
        },
        (predictions: any[]) => {
          if (addressType === "customer") {
            setCustomerSuggestions(predictions || [])
          } else {
            setShippingSuggestions(predictions || [])
          }
        }
      )
    } else {
      addressType === "customer"
        ? setCustomerSuggestions([])
        : setShippingSuggestions([])
    }
  }

  const handleSuggestionClick = (suggestion: any, addressType: string) => {
    const placesService = new window.google.maps.places.PlacesService(document.createElement("div"))
    placesService.getDetails({ placeId: suggestion.place_id }, (place: any) => {
      if (place) handlePlaceSelected(place, addressType)
    })

    if (addressType === "customer") {
      setCustomerSuggestions([])
    } else {
      setShippingSuggestions([])
    }
  }

  const renderField = (name: string, label: string, type = "text", readOnlyField = false) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type={type}
              readOnly={readOnlyField}
              className={readOnlyField ? "bg-gray-100" : ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <div className="space-y-4">
      {/* Customer Info Fields */}
      <h2 className="text-lg font-semibold">{poIs ? "Vendor" :"Customer"} Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField("customerInfo.name", "Name")}
        {renderField("customerInfo.email", "Email", "email")}
        {renderField("customerInfo.phone", "Phone", "tel")}

        <div className="relative col-span-1 md:col-span-2">
          <FormField
            control={form.control}
            name="customerInfo.address.street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) => handleAddressChange(e, "customer")}
                  
                    ref={customerAddressInputRef}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {customerSuggestions.length > 0 && (
            <ul className="absolute left-0 w-full bg-white border shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
              {customerSuggestions.map((suggestion) => (
                <li
                  key={suggestion.place_id}
                  className="cursor-pointer hover:bg-gray-100 px-4 py-2 text-sm"
                  onClick={() => handleSuggestionClick(suggestion, "customer")}
                >
                  {suggestion.description}
                </li>
              ))}
            </ul>
          )}
        </div>

        {renderField("customerInfo.address.city", "City")}
        {renderField("customerInfo.address.state", "State")}
        {renderField("customerInfo.address.zip_code", "Zip Code")}
      </div>

      {/* Shipping Info Fields */}
      <div className="flex items-center justify-between mt-6 mb-2">
        <h2 className="text-lg font-semibold"> Shiping Address</h2>
       {!poIs && <div className="flex items-center space-x-2">
          <Switch id="same-as-customer" checked={sameAsCustomer} onCheckedChange={handleToggle} />
          <Label htmlFor="same-as-customer" className="cursor-pointer">Same as Billing Address</Label>
        </div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField("shippingAddress.fullName", "Name", "text", readOnly || sameAsCustomer)}
        {renderField("shippingAddress.email", "Email", "email", readOnly || sameAsCustomer)}
        {renderField("shippingAddress.phone", "Phone", "tel", readOnly || sameAsCustomer)}

        <div className="relative col-span-1 md:col-span-2">
          <FormField
            control={form.control}
            name="shippingAddress.address.street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) => handleAddressChange(e, "shipping")}
                    readOnly={readOnly || sameAsCustomer}
                    className={(readOnly || sameAsCustomer) ? "bg-gray-100" : ""}
                    ref={shippingAddressInputRef}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {shippingSuggestions.length > 0 && (
            <ul className="absolute left-0 w-full bg-white border shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
              {shippingSuggestions.map((suggestion) => (
                <li
                  key={suggestion.place_id}
                  className="cursor-pointer hover:bg-gray-100 px-4 py-2 text-sm"
                  onClick={() => handleSuggestionClick(suggestion, "shipping")}
                >
                  {suggestion.description}
                </li>
              ))}
            </ul>
          )}
        </div>

        {renderField("shippingAddress.address.city", "City", "text", readOnly || sameAsCustomer)}
        {renderField("shippingAddress.address.state", "State", "text", readOnly || sameAsCustomer)}
        {renderField("shippingAddress.address.zip_code", "Zip Code", "text", readOnly || sameAsCustomer)}
      </div>
    </div>
  )
}
