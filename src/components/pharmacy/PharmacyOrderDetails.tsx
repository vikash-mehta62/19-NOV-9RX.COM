"use client"

import { useState, useEffect, useCallback } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Package, DollarSign, User, MapPin, Truck, Calendar, 
  FileText, CreditCard, Building, Phone, Mail, Download,
  Clock, CheckCircle, XCircle, AlertCircle, Copy, ExternalLink,
  Printer, ChevronRight, Box, Hash
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/supabaseClient"
import { OrderFormValues, ShippingAddressData } from "@/components/orders/schemas/orderSchema"
import jsPDF from "jspdf"
import "jspdf-autotable"

interface PharmacyOrderDetailsProps {
  order: OrderFormValues
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Helper function to get address fields
const getAddressField = (
  shippingAddress: ShippingAddressData | undefined,
  type: "billing" | "shipping",
  field: string
): string => {
  if (!shippingAddress) return ""
  const addressObj = shippingAddress[type]
  if (addressObj && typeof addressObj === 'object') {
    const value = (addressObj as Record<string, string>)[field]
    if (value) return value
  }
  if (shippingAddress.address && typeof shippingAddress.address === 'object') {
    const legacyAddress = shippingAddress.address as Record<string, string>
    return legacyAddress[field] || ""
  }
  return ""
}

export const PharmacyOrderDetails = ({ order, open, onOpenChange }: PharmacyOrderDetailsProps) => {
  const { toast } = useToast()
  const [companyName, setCompanyName] = useState("")
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Fetch company name
  useEffect(() => {
    const fetchCompany = async () => {
      if (!order?.customer) return
      const { data } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", order.customer)
        .maybeSingle()
      if (data) setCompanyName(data.company_name || "")
    }
    fetchCompany()
  }, [order?.customer])

  // Calculate totals
  const subtotal = order.items.reduce((total, item) => {
    return total + item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0)
  }, 0)
  const shipping = parseFloat(order.shipping_cost || "0")
  const tax = parseFloat(order.tax_amount?.toString() || "0")
  const total = subtotal + shipping + tax
  
  // Count total line items (sizes across all products)
  const totalLineItems = order.items.reduce(
    (total, item) => total + (item.sizes?.length || 0), 0
  )
  
  // Count total units (sum of all quantities)
  const totalUnits = order.items.reduce(
    (total, item) => total + item.sizes.reduce((sum, size) => sum + size.quantity, 0), 0
  )

  // Get shipping address
  const shippingStreet = getAddressField(order.shippingAddress, "shipping", "street1") || 
                         order.shippingAddress?.address?.street || ""
  const shippingCity = getAddressField(order.shippingAddress, "shipping", "city") || 
                       order.shippingAddress?.address?.city || ""
  const shippingState = getAddressField(order.shippingAddress, "shipping", "state") || 
                        order.shippingAddress?.address?.state || ""
  const shippingZip = getAddressField(order.shippingAddress, "shipping", "zipCode") || 
                      order.shippingAddress?.address?.zip_code || ""

  // Copy order number
  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.order_number || "")
    toast({ title: "Copied!", description: "Order number copied to clipboard" })
  }

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, label: "Delivered" }
      case "shipped":
        return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Truck, label: "Shipped" }
      case "processing":
        return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Processing" }
      case "cancelled":
        return { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, label: "Cancelled" }
      default:
        return { color: "bg-gray-100 text-gray-700 border-gray-200", icon: AlertCircle, label: status || "Pending" }
    }
  }

  const statusInfo = getStatusInfo(order.status)
  const StatusIcon = statusInfo.icon

  // Download PDF
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.text("Order Details", 20, 20)
      doc.setFontSize(12)
      doc.text(`Order #: ${order.order_number}`, 20, 35)
      doc.text(`Date: ${new Date(order.date).toLocaleDateString()}`, 20, 42)
      doc.text(`Status: ${order.status}`, 20, 49)
      doc.text(`Total: $${total.toFixed(2)}`, 20, 56)
      doc.save(`Order_${order.order_number}.pdf`)
      toast({ title: "Downloaded", description: "Order PDF downloaded successfully" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-2xl p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-gray-900">Order #{order.order_number}</h2>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyOrderNumber}>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(order.date).toLocaleDateString("en-US", {
                      weekday: "short", year: "numeric", month: "short", day: "numeric"
                    })}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
                  <Download className="w-4 h-4 mr-1" />
                  PDF
                </Button>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge className={`${statusInfo.color} border gap-1.5 px-3 py-1`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusInfo.label}
                </Badge>
                <Badge className={`border px-3 py-1 ${
                  order.payment_status === "paid" 
                    ? "bg-green-100 text-green-700 border-green-200" 
                    : "bg-red-100 text-red-700 border-red-200"
                }`}>
                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                  {order.payment_status === "paid" ? "Paid" : "Unpaid"}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 bg-blue-50 border-0">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Line Items</p>
                    <p className="text-lg font-bold text-blue-700">{totalLineItems}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3 bg-emerald-50 border-0">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Total</p>
                    <p className="text-lg font-bold text-emerald-700">${total.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3 bg-purple-50 border-0">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Units</p>
                    <p className="text-lg font-bold text-purple-700">{totalUnits}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Shipping Address */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
                <div className="flex items-center gap-2 text-white">
                  <MapPin className="w-4 h-4" />
                  <span className="font-semibold">Shipping Address</span>
                </div>
              </div>
              <CardContent className="p-4">
                <p className="font-semibold text-gray-900">
                  {order.shippingAddress?.fullName || order.customerInfo?.name || "N/A"}
                </p>
                {shippingStreet ? (
                  <>
                    <p className="text-gray-600 text-sm mt-1">{shippingStreet}</p>
                    <p className="text-gray-600 text-sm">
                      {[shippingCity, shippingState].filter(Boolean).join(", ")} {shippingZip}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm italic mt-1">No address provided</p>
                )}
                {order.shippingAddress?.phone && (
                  <p className="text-gray-500 text-sm mt-2 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {order.shippingAddress.phone}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tracking Info (if shipped) */}
            {order.tracking_number && (
              <Card className="overflow-hidden border-0 shadow-sm bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Truck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Tracking Number</p>
                        <p className="font-mono font-semibold text-blue-800">{order.tracking_number}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Track
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-3">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span className="font-semibold">Order Items</span>
                  </div>
                  <Badge className="bg-white/20 text-white border-0">
                    {order.items.length} {order.items.length === 1 ? "product" : "products"}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {order.items.map((item, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                          
                          {/* Sizes */}
                          <div className="mt-2 space-y-1.5">
                            {item.sizes.map((size, sizeIdx) => (
                              <div key={sizeIdx} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-700">{size.size_value} {size.size_unit}</span>
                                  {size.type && (
                                    <Badge variant="outline" className="text-xs h-5 capitalize">
                                      {size.type}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-gray-500">
                                    {size.quantity} × ${size.price.toFixed(2)}
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    ${(size.quantity * size.price).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Item Notes */}
                          {item.notes && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                              <p className="text-xs text-blue-600 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {item.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
                <div className="flex items-center gap-2 text-white">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-semibold">Order Summary</span>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({totalLineItems} line items)</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-emerald-600">${total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Special Instructions */}
            {order.specialInstructions && (
              <Card className="overflow-hidden border-0 shadow-sm border-l-4 border-l-blue-500">
                <CardContent className="p-4 bg-blue-50/50">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Special Instructions</p>
                      <p className="text-gray-700 text-sm">{order.specialInstructions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Need Help */}
            <Card className="bg-gray-50 border-0">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-600 mb-2">Need help with this order?</p>
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-1" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
