"use client"

import type React from "react"

import { Building2, Mail, Phone, MapPin, Package, Globe, Printer, X,AlertTriangle , ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface Location {
  id: string
  name: string
  address: string
  contact_email: string
  contact_phone: string
  countryRegion: string
  faxNumber: string
  ordersThisMonth: number
  status: string
  type: string
  attention: string
}

interface LocationPopupProps {
  location: Location
  onClose: () => void
}

const LocationPopup: React.FC<LocationPopupProps> = ({ location, onClose }) => {
  if (!location) return null
console.log(location)
  // Function to determine status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "inactive":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
      case "closed":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      default:
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
    }
  }

  // Function to format location type with proper capitalization
  const formatLocationType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-md bg-white shadow-xl animate-in fade-in-50 zoom-in-95 h-[80vh] overflow-y-scroll">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-bold">{location.name}</CardTitle>
                {/* <Badge variant="outline" className={getStatusColor(location.status)}>
                  {location.status}
                </Badge> */}
              </div>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>{formatLocationType(location.type)}</span>
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Location Details</h3>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{location.address}</p>
              </div>
            </div>
{/* 
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Region</p>
                <p className="text-sm text-muted-foreground">{location.countryRegion}</p>
              </div>
            </div> */}
          </div>

          <Separator />
          
          <div className="space-y-6 bg-white p-4 text-black rounded-md">
  <h3 className="text-base font-semibold">Contact Information</h3>

  {location.attention && (
    <div className="flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
      <p className="text-sm">
        <span className="font-medium">Attention:</span> {location.attention}
      </p>
    </div>
  )}

  <div className="flex items-start gap-3">
    <Mail className="h-5 w-5 text-gray-700 mt-0.5" />
    <div>
      <p className="text-sm font-medium">Email</p>
      <a
        href={`mailto:${location.contact_email}`}
        className="text-sm text-blue-600 hover:underline"
      >
        {location.contact_email}
      </a>
    </div>
  </div>

  <div className="flex items-start gap-3">
    <Phone className="h-5 w-5 text-gray-700 mt-0.5" />
    <div>
      <p className="text-sm font-medium">Phone</p>
      <a
        href={`tel:${location.contact_phone}`}
        className="text-sm text-blue-600 hover:underline"
      >
        {location.contact_phone}
      </a>
    </div>
  </div>

  {location.faxNumber && (
    <div className="flex items-start gap-3">
      <Printer className="h-5 w-5 text-gray-700 mt-0.5" />
      <div>
        <p className="text-sm font-medium">Fax</p>
        <p className="text-sm text-gray-700">{location.faxNumber}</p>
      </div>
    </div>
  )}
</div>

          <Separator />

      
        </CardContent>

        <CardFooter className="flex justify-between border-t p-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {/* <Button className="flex items-center gap-1">
            <span>View Details</span>
            <ExternalLink className="h-4 w-4" />
          </Button> */}
        </CardFooter>
      </Card>
    </div>
  )
}

export default LocationPopup

