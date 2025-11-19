"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Download, Send, RefreshCcw, Link, Copy } from "lucide-react"
import type { Invoice } from "../types/invoice.types"
import { ProcessRefundDialog } from "../../orders/refunds/ProcessRefundDialog"
import { useEffect, useState } from "react"
import { handleInvoiceAction } from "../utils/invoiceWorkflow"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { generateWorkOrderPDF } from "@/utils/work-order-generator"


interface InvoiceRowActionsProps {
  invoice: Invoice
  onPreview: (invoice: Invoice) => void
  onActionComplete: () => void
}

export function InvoiceRowActions({ invoice, onPreview, onActionComplete }: InvoiceRowActionsProps) {
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [paymentLink, setPaymentLink] = useState<string>("")
  const [workOrder, setWorkOrder] = useState(false)
  const [workOrderData, setWorkOrderData] = useState<any>({})
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const { toast } = useToast()
console.log(invoice)


  // Packing slip form data
  const [packingData, setPackingData] = useState({
    shipVia: "",
    notes: "",
    cartons: "",
    masterCases: "",
    weight: "",
    shippingClass: "",
  })

  const handleAction = async (action: "send" | "cancel") => {
    await handleInvoiceAction(invoice, action)
    onActionComplete()
  }

  useEffect(() => {
    console.log(workOrderData)
    // Calculate total quantity for cartons when workOrderData changes
    if (workOrderData && workOrderData.items) {
      const totalCartons = workOrderData.items.reduce((sum: number, item: any) => {
        // Sum the 'quantity' from each item
        return sum + (item.quantity || 0);
      }, 0);
      setPackingData((prev) => ({
        ...prev,
        cartons: totalCartons.toString(), // Convert to string as the input value expects a string
      }));
    }
  }, [workOrderData]);

  const generatePaymentLink = async () => {
    setIsGeneratingLink(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const link = `https://pay.example.com/invoice/${invoice.invoice_number}`
      setPaymentLink(link)
      toast({
        title: "Payment Link Generated",
        description: "The payment link has been generated and copied to clipboard",
      })
      navigator.clipboard.writeText(link)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate payment link",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingLink(false)
    }
  }

  const copyPaymentLink = () => {
    navigator.clipboard.writeText(paymentLink)
    toast({
      title: "Copied",
      description: "Payment link copied to clipboard",
    })
  }

  const handleDownloadPackingSlip = async () => {
    setIsGeneratingPDF(true)
    console.log("workOrderData",workOrderData)
    try {
      await generateWorkOrderPDF(workOrderData, packingData)
      toast({
        title: "Success",
        description: "Packing Slip PDF has been downloaded successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate Packing Slip PDF",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setPackingData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => onPreview(invoice)}>Preview Invoice</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setWorkOrderData(invoice)
              setWorkOrder(true)
            }}
          >
            Packing Slip
          </DropdownMenuItem>
          {invoice.status === "needs_payment_link" && (
            <DropdownMenuItem onClick={generatePaymentLink} disabled={isGeneratingLink}>
              <Link className="mr-2 h-4 w-4" />
              {isGeneratingLink ? "Generating Link..." : "Generate Payment Link"}
            </DropdownMenuItem>
          )}
          {paymentLink && (
            <>
              <DropdownMenuItem onClick={copyPaymentLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Payment Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("send")}>
                <Send className="mr-2 h-4 w-4" />
                Send Link to Customer
              </DropdownMenuItem>
            </>
          )}
          {invoice.status === "paid" && (
            <DropdownMenuItem onClick={() => setShowRefundDialog(true)}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Process Refund
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showRefundDialog && (
        <ProcessRefundDialog
          orderId={invoice.order_id || ""}
          orderTotal={invoice.total_amount}
          originalTransactionId=""
          open={showRefundDialog}
          onOpenChange={setShowRefundDialog}
        />
      )}

      {workOrder && (
        <Dialog open={workOrder} onOpenChange={setWorkOrder}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Packing Slip for {workOrderData?.invoice_number}</DialogTitle>
              <DialogDescription className="text-sm space-y-1">
                <div>
                  <strong>Order Number:</strong> {workOrderData?.orders?.order_number}
                </div>
                <div>
                  <strong>Customer:</strong> {workOrderData?.customer_info?.name}
                </div>
                <div>
                  <strong>Company:</strong> {workOrderData?.profiles?.company_name}
                </div>
                <div>
                  <strong>Total Amount:</strong> ${workOrderData?.total_amount?.toFixed(2)}
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="my-6 space-y-6">
              {/* Packing Details Form */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="font-semibold text-lg mb-4">Packing Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shipVia">Ship Via</Label>
                    <Input
                      id="shipVia"
                      value={packingData.shipVia}
                      onChange={(e) => handleInputChange("shipVia", e.target.value)}
                      placeholder="Enter shipping method"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cartons">Cartons</Label>
                    <Input
                      id="cartons"
                      value={packingData.cartons}
                      onChange={(e) => handleInputChange("cartons", e.target.value)}
                      placeholder="Number of cartons"
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="masterCases">Master Cases</Label>
                    <Input
                      id="masterCases"
                      value={packingData.masterCases}
                      onChange={(e) => handleInputChange("masterCases", e.target.value)}
                      placeholder="Number of master cases"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      value={packingData.weight}
                      onChange={(e) => handleInputChange("weight", e.target.value)}
                      placeholder="Total weight"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shippingClass">Shipping Class</Label>
                    <Input
                      id="shippingClass"
                      value={packingData.shippingClass}
                      onChange={(e) => handleInputChange("shippingClass", e.target.value)}
                      placeholder="Shipping class"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={packingData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Enter any special notes or instructions"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Information */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">Ship To</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Name:</strong> {workOrderData?.customer_info?.name}
                    </div>
                    <div>
                      <strong>Company:</strong> {workOrderData?.profiles?.company_name}
                    </div>
                    <div>
                      <strong>Address:</strong> {workOrderData?.shipping_info?.address?.street},{" "}
                      {workOrderData?.shipping_info?.address?.city}, {workOrderData?.shipping_info?.address?.state}{" "}
                      {workOrderData?.shipping_info?.address?.zip_code}
                    </div>
                    <div>
                      <strong>Phone:</strong> {workOrderData?.customer_info?.phone}
                    </div>
                    <div>
                      <strong>Email:</strong> {workOrderData?.customer_info?.email}
                    </div>
                  </div>
                </div>

                {/* Packing Information */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">Packing Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Packing Slip #:</strong> PS-{workOrderData?.orders?.order_number}
                    </div>
                    <div>
                      <strong>Invoice #:</strong> {workOrderData?.invoice_number}
                    </div>
                    <div>
                      <strong>Order #:</strong> {workOrderData?.orders?.order_number}
                    </div>
                    <div>
                      <strong>Date:</strong> {new Date().toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Status:</strong> {workOrderData?.status?.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Items to Ship</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ITEMS</th>
                        <th className="text-left p-2">DESCRIPTION</th>
                        <th className="text-left p-2">QTY/CS</th>
                        <th className="text-left p-2">Shipped QTY</th>
                        <th className="text-left p-2">IN CASE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrderData?.items?.map((item: any, index: number) =>
                        item.sizes?.map((size: any, sizeIndex: number) => (
                          <tr key={`${index}-${sizeIndex}`} className="border-b">
                            <td className="p-2">{size.sku}</td>
                            <td className="p-2">
                              {item.name} - {size.size_value} {size.size_unit}
                            </td>
                            <td className="p-2">{size.quantity_per_case}</td>
                            <td className="p-2">{size.quantity}</td>
                            <td className="p-2">-</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setWorkOrder(false)}>
                Close
              </Button>
              <Button
                onClick={handleDownloadPackingSlip}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isGeneratingPDF ? "Generating PDF..." : "Download Packing Slip"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}