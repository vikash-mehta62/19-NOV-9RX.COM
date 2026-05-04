"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import axios from "../../axiosconfig"
import { processPayment, PaymentResponse, logPaymentTransaction, saveCardToProfile, processPaymentIPOSPay } from "@/services/paymentService"
import {
  CreditCard,
  Landmark,
  User,
  Hash,
  MapPin,
  Building,
  Globe,
  DollarSign,
  Loader2,
  Receipt,
  ShieldCheck,
  Lock,
  ArrowLeft,
  X,
  CheckCircle2,
  AlertCircle,
  Package,
  FileText,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { OrderActivityService } from "@/services/orderActivityService"
import { PaymentResultPopup, PaymentResultData } from "@/components/payment/PaymentResultPopup"
import { getAddressPredictions, getPlaceDetails } from "@/utils/googleAddressHelper"
import { deductOrderBatchesWithFallback } from "@/services/orderBatchDeductionService"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getACHProcessor } from "@/config/paymentConfig"

// Validation functions
function validateCardNumber(cardNumber: string, cardType?: { maxLength: number; name: string }) {
  const cleaned = cardNumber.replace(/\D/g, "")
  
  // Minimum length check
  if (cleaned.length < 13) return "Card number too short"
  
  // Maximum length check - allow 13-19 digits for flexibility
  if (cleaned.length > 19) return "Card number too long"
  
  // Card-type specific length validation
  if (cardType?.name === "Visa") {
    if (cleaned.length !== 13 && cleaned.length !== 16) {
      return "Visa cards must be 13 or 16 digits"
    }
  } else if (cardType?.name === "American Express") {
    if (cleaned.length !== 15) {
      return "American Express requires 15 digits"
    }
  } else if (cardType?.name === "Diners Club") {
    if (cleaned.length !== 14) {
      return "Diners Club requires 14 digits"
    }
  } else if (cardType?.maxLength && cardType.name !== "Credit Card") {
    if (cleaned.length !== cardType.maxLength) {
      return `${cardType.name} requires ${cardType.maxLength} digits`
    }
  }
  
  // Luhn algorithm check
  let sum = 0
  let isEven = false
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10)
    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    isEven = !isEven
  }
  if (sum % 10 !== 0) return "Invalid card number"
  
  return null
}

function validateCVV(cvv: string, expectedLength = 3) {
  const cleaned = cvv.replace(/\D/g, "")
  if (cleaned.length !== expectedLength) return `CVV must be ${expectedLength} digits`
  return null
}

function validateCardholderName(name: string) {
  if (!name || name.trim().length < 3) return "Name must be at least 3 characters"
  return null
}

function validateExpirationDate(date: string) {
  if (!date) return "Expiration date is required"
  if (!date.match(/^\d{2}\/\d{2}$/)) return "Use MM/YY format"
  const [month, year] = date.split("/")
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear() % 100
  const currentMonth = currentDate.getMonth() + 1
  const monthNum = parseInt(month, 10)
  const yearNum = parseInt(year, 10)
  if (monthNum < 1 || monthNum > 12) return "Invalid month"
  if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) return "Card expired"
  return null
}

function validateAddress(address: string) {
  if (!address || address.trim().length < 5) return "Address required (min 5 chars)"
  return null
}

function validateCity(city: string) {
  if (!city || city.trim().length < 2) return "City required"
  return null
}

function validateState(state: string) {
  if (!state || state.trim().length < 2) return "State required"
  return null
}

function validateZip(zip: string) {
  if (!zip || !zip.match(/^\d{5}(-\d{4})?$/)) return "Valid ZIP required"
  return null
}

function validateCountry(country: string) {
  if (!country || country.trim().length < 2) return "Country required"
  return null
}

function validateRoutingNumber(number: string) {
  if (!number || !number.match(/^\d{9}$/)) return "9 digits required"
  
  // ABA routing number checksum validation
  const digits = number.split("").map(Number)
  const checksum = (3 * (digits[0] + digits[3] + digits[6]) +
                    7 * (digits[1] + digits[4] + digits[7]) +
                    1 * (digits[2] + digits[5] + digits[8])) % 10
  if (checksum !== 0) return "Invalid routing number"
  
  return null
}

function validateAccountNumber(number: string) {
  if (!number || !number.match(/^\d{8,17}$/)) return "8-17 digits required"
  return null
}

function validateNotes(notes: string) {
  if (!notes || notes.trim().length < 5) return "Min 5 characters required"
  return null
}

// Enhanced card detection with more card types
function detectCardType(cardNumber: string) {
  const cleaned = cardNumber.replace(/\D/g, "")
  
  // Visa: starts with 4 (13 or 16 digits, standard is 16)
  if (/^4/.test(cleaned)) {
    return { type: "visa", name: "Visa", cvvLength: 3, maxLength: 16, format: [4, 4, 4, 4] }
  }
  
  // Mastercard: starts with 51-55 or 2221-2720
  if (/^5[1-5]/.test(cleaned) || /^2(2[2-9][1-9]|2[3-9]\d|[3-6]\d{2}|7[0-1]\d|720)/.test(cleaned)) {
    return { type: "mastercard", name: "Mastercard", cvvLength: 3, maxLength: 16, format: [4, 4, 4, 4] }
  }
  
  // American Express: starts with 34 or 37
  if (/^3[47]/.test(cleaned)) {
    return { type: "amex", name: "American Express", cvvLength: 4, maxLength: 15, format: [4, 6, 5] }
  }
  
  // Discover: starts with 6011, 622126-622925, 644-649, 65
  if (/^6011/.test(cleaned) || /^62[24-68]/.test(cleaned) || /^6[45]/.test(cleaned)) {
    return { type: "discover", name: "Discover", cvvLength: 3, maxLength: 16, format: [4, 4, 4, 4] }
  }
  
  // Diners Club: starts with 300-305, 36, 38-39
  if (/^3(0[0-5]|[68])/.test(cleaned)) {
    return { type: "diners", name: "Diners Club", cvvLength: 3, maxLength: 14, format: [4, 6, 4] }
  }
  
  // JCB: starts with 35
  if (/^35/.test(cleaned)) {
    return { type: "jcb", name: "JCB", cvvLength: 3, maxLength: 16, format: [4, 4, 4, 4] }
  }
  
  return { type: "unknown", name: "Credit Card", cvvLength: 3, maxLength: 16, format: [4, 4, 4, 4] }
}

// Format card number based on card type
function formatCardNumberByType(num: string, cardType: { format: number[] }) {
  const cleaned = num.replace(/\D/g, "")
  const format = cardType.format
  let result = ""
  let index = 0
  
  for (let i = 0; i < format.length && index < cleaned.length; i++) {
    const chunk = cleaned.slice(index, index + format[i])
    result += chunk
    index += format[i]
    if (index < cleaned.length && i < format.length - 1) {
      result += " "
    }
  }
  
  return result
}

function getCardIcon(cardType: { type: string }) {
  switch (cardType.type) {
    case "visa":
      return (
        <div className="flex items-center gap-1">
          <div className="px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[10px] font-bold rounded shadow-sm">VISA</div>
        </div>
      )
    case "mastercard":
      return (
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded-full opacity-90"></div>
          <div className="w-4 h-4 bg-yellow-400 rounded-full -ml-2 opacity-90"></div>
        </div>
      )
    case "amex":
      return (
        <div className="px-1.5 py-0.5 bg-gradient-to-r from-blue-400 to-blue-600 text-white text-[10px] font-bold rounded shadow-sm">AMEX</div>
      )
    case "discover":
      return (
        <div className="px-1.5 py-0.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] font-bold rounded shadow-sm">DISC</div>
      )
    case "diners":
      return (
        <div className="px-1.5 py-0.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-[10px] font-bold rounded shadow-sm">DC</div>
      )
    case "jcb":
      return (
        <div className="px-1.5 py-0.5 bg-gradient-to-r from-green-600 to-blue-600 text-white text-[10px] font-bold rounded shadow-sm">JCB</div>
      )
    default:
      return <CreditCard className="w-5 h-5 text-gray-400" />
  }
}

// Helper function to create invoice after payment
async function createInvoice(order: any, totalAmount: number, newTax: number) {
  // Ensure profile_id is valid before querying
  const profileId = order.profile_id || order.customer
  
  if (!profileId) {
    console.warn("No profile_id found for order, skipping payment_terms lookup")
  }
  
  let customerProfile = null
  if (profileId) {
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("payment_terms")
      .eq("id", profileId)
      .maybeSingle()
    
    if (profileError) {
      console.error("Error fetching profile:", profileError.message)
    }
    customerProfile = data
  }

  const dueDate = new Date(new Date(order.estimated_delivery || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // Calculate subtotal (total - tax - shipping)
  const shippingCost = order.shipping_cost || 0
  const discountAmount = Number(order.discount_amount || 0)
  // Subtotal should be original amount before discount
  const subtotal = totalAmount + discountAmount - newTax - shippingCost

  const MAX_INVOICE_RETRIES = 5
  let lastInvoiceError: any = null

  for (let attempt = 1; attempt <= MAX_INVOICE_RETRIES; attempt++) {
    const { data: generatedInvoiceNumber, error: invoiceNumberError } = await supabase.rpc("generate_invoice_number")

    // Keep payment flow resilient even if RPC fails unexpectedly.
    const invoiceNumber =
      !invoiceNumberError && generatedInvoiceNumber
        ? generatedInvoiceNumber
        : `INV-${new Date().getFullYear()}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0")}`

    const invoiceData = {
      invoice_number: invoiceNumber,
      order_id: order.id,
      due_date: dueDate,
      profile_id: profileId || null,
      status: "pending" as const,
      amount: subtotal,
      tax_amount: newTax,
      total_amount: totalAmount,
      payment_status: order.payment_status || "paid",
      payment_method: order.paymentMethod || order.payment_method || "card",
      notes: order.notes || null,
      purchase_number_external: order.purchase_number_external,
      items: order.items,
      customer_info: order.customerInfo,
      shipping_info: order.shippingAddress,
      shippin_cost: shippingCost,
      subtotal: subtotal,
      // Add discount information
      discount_amount: discountAmount,
      discount_details: order.discount_details || [],
      // Use processing fee from order object (should be updated before calling this function)
      processing_fee_amount: Number(order.processing_fee_amount || 0),
      // Copy paid_amount from order
      paid_amount: Number(order.paid_amount || 0),
    }

    const { error: invoiceError } = await supabase.from("invoices").insert(invoiceData)
    if (!invoiceError) return

    lastInvoiceError = invoiceError
    const isDuplicateInvoiceNumber =
      invoiceError.code === "23505" &&
      String(invoiceError.message || "").includes("invoices_invoice_number_key")

    if (!isDuplicateInvoiceNumber) {
      throw new Error(invoiceError.message)
    }
  }

  throw new Error(
    lastInvoiceError?.message || "Failed to create invoice after retrying invoice number generation"
  )
}

async function updateProductStock(orderItems: any[], orderId: string) {
  const items = Array.isArray(orderItems) ? orderItems : []

  const result = await deductOrderBatchesWithFallback(orderId, items)
  if (result.alreadyDeducted) {
    console.log(`Batch stock already deducted for order ${orderId}, skipping duplicate deduction.`)
    return
  }

  // Batch deduction is preferred, but legacy product_sizes fallback remains valid
  // for sizes that do not have active/allocatable batches.
  for (const item of items) {
    const productId = String(item?.productId || "")
    const isManualLine =
      item?.isManualItem === true ||
      item?.source === "sales_manual" ||
      productId.startsWith("manual-order-") ||
      productId.startsWith("manual-po-")

    if (item.sizes && item.sizes.length > 0) {
      for (const size of item.sizes) {
        if (!size?.id) continue
        const sizeId = String(size.id || "")
        const isManualSize =
          isManualLine ||
          size?.isManualItem === true ||
          size?.source === "sales_manual" ||
          String(size?.type || "").toLowerCase() === "manual" ||
          sizeId.startsWith("manual-order-") ||
          sizeId.startsWith("manual-po-")

        if (isManualSize) continue
        if (result.batchManagedSizeIds.has(size.id)) {
          // Batch flow already adjusts product_sizes; skip to avoid double decrement.
          continue
        }

        const { data: currentSize, error: fetchError } = await supabase
          .from("product_sizes")
          .select("stock")
          .eq("id", size.id)
          .single()

        if (fetchError || !currentSize) {
          throw new Error(`Failed to fetch product size stock for ${size.id}`)
        }

        const newQuantity = Number(currentSize.stock || 0) - Number(size.quantity || 0)

        const { error: updateError } = await supabase
          .from("product_sizes")
          .update({ stock: newQuantity })
          .eq("id", size.id)

        if (updateError) {
          throw new Error(`Failed to update product size stock for ${size.id}`)
        }
      }
    }
  }
}

async function deductOrderStockByRpc(orderId: string) {
  const { data: rpcResult, error: rpcError } = await (supabase as any).rpc(
    "deduct_order_stock_after_payment_atomic",
    { p_order_id: orderId }
  )

  if (rpcError) {
    const detailedError = [rpcError.message, rpcError.details, rpcError.hint]
      .filter(Boolean)
      .join(" | ")
    throw new Error(detailedError || "Payment stock deduction RPC failed")
  }

  if (!rpcResult?.success) {
    throw new Error(rpcResult?.message || "Payment stock deduction failed")
  }

  console.log(`Payment stock deduction RPC completed for order ${orderId}:`, rpcResult)
}

interface PaymentFormProps {
  modalIsOpen: boolean
  setModalIsOpen: (open: boolean) => void
  customer: any
  amountP: number
  orderId: string
  orders: any
  payNow?: boolean
  isBalancePayment?: boolean
  previousPaidAmount?: number
  onPaymentSuccess?: () => void
  useStockDeductionRpc?: boolean
}

const PaymentForm = ({ modalIsOpen, setModalIsOpen, customer, amountP, orderId, orders, payNow = false, isBalancePayment = false, previousPaidAmount = 0, onPaymentSuccess, useStockDeductionRpc = false }: PaymentFormProps) => {
  // Check if this is a Purchase Order (PO)
  const isPurchaseOrder = orders?.order_number?.startsWith('PO-') || orders?.order_type === 'purchase_order'
  const userType = sessionStorage.getItem("userType")?.toLowerCase() || ""
  const currentPath = window.location.pathname.toLowerCase()
  const isAdminUser = userType === "admin" || currentPath.startsWith("/admin")
  const isPharmacyUser = userType === "pharmacy" || currentPath.startsWith("/pharmacy")
  const isPayNowPharmacyReviewOnly = payNow && isPharmacyUser
  const isPayNowAdminReview = payNow && isAdminUser

  const [paymentType, setPaymentType] = useState(isPurchaseOrder ? "manaul_payemnt" : "credit_card")
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [cardType, setCardType] = useState({ type: "unknown", name: "Credit Card", cvvLength: 3, maxLength: 16, format: [4, 4, 4, 4] })
  
  // Payment result popup state
  const [showResultPopup, setShowResultPopup] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResultData | null>(null)
  const [showCardFeeConfirm, setShowCardFeeConfirm] = useState(false)
  const [saveCard, setSaveCard] = useState(false)
  
  // Google Address API suggestions
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])

  const [formData, setFormData] = useState({
    amount: 0,
    cardNumber: "",
    expirationDate: "",
    cvv: "",
    cardholderName: "",
    accountType: "checking",
    routingNumber: "",
    accountNumber: "",
    nameOnAccount: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "USA",
    notes: "",
  })

  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")

  const [errors, setErrors] = useState<Record<string, string | null>>({})

  const hasDeferredOrderEditInventoryDeduction = async () => {
    try {
      const { data, error } = await supabase
        .from("order_activities")
        .select("metadata")
        .eq("order_id", orderId)
        .eq("activity_type", "updated")
        .contains("metadata", {
          source: "order_edit_inventory_rpc",
          inventory_changed: true,
        })
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Failed checking deferred order-edit inventory marker:", error);
        return false;
      }

      const activities = (data || []) as Array<{ metadata?: { adjustment_action?: string } | null }>;
      return activities.some((row) => {
        const action = row?.metadata?.adjustment_action;
        return action === "none" || action === "send_payment_link";
      });
    } catch (error) {
      console.error("Error checking deferred order-edit inventory marker:", error);
      return false;
    }
  }

  const months = [
    { value: "01", label: "01 - Jan" },
    { value: "02", label: "02 - Feb" },
    { value: "03", label: "03 - Mar" },
    { value: "04", label: "04 - Apr" },
    { value: "05", label: "05 - May" },
    { value: "06", label: "06 - Jun" },
    { value: "07", label: "07 - Jul" },
    { value: "08", label: "08 - Aug" },
    { value: "09", label: "09 - Sep" },
    { value: "10", label: "10 - Oct" },
    { value: "11", label: "11 - Nov" },
    { value: "12", label: "12 - Dec" },
  ]

  const getYears = (range = 10) => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: range }, (_, i) => currentYear + i)
  }

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      const expiration = `${selectedMonth}/${selectedYear.slice(2)}`
      setFormData((prev) => ({ ...prev, expirationDate: expiration }))
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    if (formData.expirationDate) {
      const [mm, yy] = formData.expirationDate.split("/")
      setSelectedMonth(mm)
      setSelectedYear("20" + yy)
    }
  }, [])

  useEffect(() => {
    if (customer) {
      setFormData((prevData) => ({
        ...prevData,
        nameOnAccount: customer.name || "",
        cardholderName: customer.name || "",
        address: customer.address?.street || "",
        city: customer.address?.city || "",
        state: customer.address?.state || "",
        zip: customer.address?.zip_code || "",
        amount: Number(amountP) || 0,
      }))
    }
  }, [customer, amountP])

  useEffect(() => {
    if (isPurchaseOrder) {
      setPaymentType("manaul_payemnt")
      return
    }

    if (isPayNowPharmacyReviewOnly || isPayNowAdminReview) {
      setPaymentType("credit_card")
    }
  }, [isPurchaseOrder, isPayNowAdminReview, isPayNowPharmacyReviewOnly])

  useEffect(() => {
    if (!isPayNowAdminReview || !orders?.order_number) return

    setFormData((prev) => ({
      ...prev,
      notes: prev.notes?.trim() ? prev.notes : `Manual payment for order ${orders.order_number}`,
    }))
  }, [isPayNowAdminReview, orders?.order_number])

  const basePaymentAmount = Number(formData.amount || 0)
  const cardProcessingFeeAmount = 0
  const processorChargeAmount = Number(basePaymentAmount.toFixed(2))
  const orderTotalAmount = Number(orders?.total_amount || orders?.total || 0)
  const alreadyPaidAmount = Number(previousPaidAmount || orders?.paid_amount || 0)
  const pendingAfterThisPayment = Math.max(0, orderTotalAmount - (alreadyPaidAmount + basePaymentAmount))
  
  const savableProfileId = orders?.profile_id || orders?.customer || customer?.id || null
  const canOfferSaveCard =
    paymentType === "credit_card" &&
    Boolean(savableProfileId && customer?.email)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setErrors({ ...errors, [name]: null })

    if (name === "cardNumber") {
      // Strip all non-digits from the display value (which includes spaces from formatting)
      const cleaned = value.replace(/\D/g, "")
      const detected = detectCardType(cleaned)
      // Cap at the max length for this card type
      const trimmed = cleaned.slice(0, detected.maxLength)
      setFormData({ ...formData, [name]: trimmed })
      setCardType(detected)
    } else if (name === "cvv") {
      const formattedValue = value.replace(/\D/g, "").slice(0, cardType.cvvLength)
      setFormData({ ...formData, [name]: formattedValue })
    } else if (name === "zip") {
      const formattedValue = value.replace(/[^0-9-]/g, "").slice(0, 10)
      setFormData({ ...formData, [name]: formattedValue })
    } else if (name === "routingNumber") {
      const formattedValue = value.replace(/\D/g, "").slice(0, 9)
      setFormData({ ...formData, [name]: formattedValue })
    } else if (name === "accountNumber") {
      const formattedValue = value.replace(/\D/g, "").slice(0, 17)
      setFormData({ ...formData, [name]: formattedValue })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  // Google Address API - Handle address change
  const handleAddressChange = (value: string) => {
    setFormData({ ...formData, address: value })
    setErrors({ ...errors, address: null })
    getAddressPredictions(value, setAddressSuggestions)
  }

  // Google Address API - Handle suggestion click
  const handleAddressSuggestionClick = (suggestion: any) => {
    getPlaceDetails(suggestion.place_id, (address) => {
      if (address) {
        setFormData({
          ...formData,
          address: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip_code,
          country: address.country || "USA",
        })
      }
    })
    setAddressSuggestions([])
  }

  const authorizeErrorMap: Record<string, string> = {
    // Authentication errors
    E00003: "Invalid request data structure.",
    E00007: "Authentication failed. Please check payment gateway credentials.",
    E00012: "Duplicate subscription exists.",
    E00015: "Field length exceeded.",
    E00020: "Account not enabled for eCheck.",
    E00027: "Transaction unsuccessful.",
    E00039: "Duplicate record detected.",
    E00040: "Record not found.",
    E00099: "Profile creation failed.",
    // Gateway configuration errors
    MISSING_CREDENTIALS: "Payment gateway not configured. Please contact support.",
    GATEWAY_DISABLED: "Payment gateway is disabled. Please contact support.",
    CONFIG_ERROR: "Payment configuration error. Please contact support.",
    // Transaction errors
    "2": "Card declined. Please try a different card.",
    "3": "Card declined. Please contact your bank.",
    "4": "Card declined. Please try again.",
    "5": "Invalid amount.",
    "6": "Invalid card number.",
    "7": "Invalid expiration date.",
    "8": "Card expired.",
    "11": "Duplicate transaction.",
    "27": "AVS mismatch. Please verify billing address.",
    "44": "CVV mismatch. Please verify security code.",
    "45": "Card code verification failed.",
    "65": "Card declined. Exceeds limit.",
    "127": "AVS and CVV mismatch.",
    "252": "Transaction pending review.",
    "253": "Transaction held for review.",
  }

  const validateForm = () => {
    if (isPayNowPharmacyReviewOnly && paymentType === "credit_card") {
      setErrors({})
      return true
    }

    const newErrors: Record<string, string | null> = {}
    let hasErrors = false

    if (paymentType === "credit_card" || paymentType === "ach") {
      newErrors.cardholderName = validateCardholderName(formData.cardholderName)
      newErrors.address = validateAddress(formData.address)
      newErrors.city = validateCity(formData.city)
      newErrors.state = validateState(formData.state)
      newErrors.zip = validateZip(formData.zip)
      newErrors.country = validateCountry(formData.country)
    } else if (paymentType === "manaul_payemnt") {
      newErrors.notes = validateNotes(formData.notes)
      // Billing address is optional for manual payments
    } else if (paymentType === "ach") {
      newErrors.routingNumber = validateRoutingNumber(formData.routingNumber)
      newErrors.accountNumber = validateAccountNumber(formData.accountNumber)
      newErrors.nameOnAccount = validateCardholderName(formData.nameOnAccount)
      newErrors.address = validateAddress(formData.address)
      newErrors.city = validateCity(formData.city)
      newErrors.state = validateState(formData.state)
      newErrors.zip = validateZip(formData.zip)
      newErrors.country = validateCountry(formData.country)
    }

    for (const key in newErrors) {
      if (newErrors[key]) hasErrors = true
    }

    setErrors(newErrors)
    return !hasErrors
  }

  const submitPayment = async (skipFeeConfirm = false) => {
    // Prevent double submission
    if (loading) return
    
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please fill all required fields correctly.", variant: "destructive" })
      return
    }

    // Validate amount
    if (!basePaymentAmount || basePaymentAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Payment amount must be greater than zero.", variant: "destructive" })
      return
    }

    if (!skipFeeConfirm && cardProcessingFeeAmount > 0) {
      setShowCardFeeConfirm(true)
      return
    }

    setLoading(true)

    // ============================================
    // 🚀 iPOS PAYS INTEGRATION CHECK
    // ============================================
    // Check if iPOS Pays is enabled (hardcoded in edge function)
    // If enabled, redirect to iPOS Pays hosted payment page
    if (paymentType === "credit_card" || paymentType === "ach") {
      try {
        console.log("🔍 Checking if iPOS Pays is enabled...");
        
        // Try to generate payment URL (edge function will check if enabled)
        const iPosResult = await processPaymentIPOSPay({
          amount: basePaymentAmount,
          orderId,
          paymentMethod: paymentType === "ach" ? "ach" : "card",
          customerName:
            (paymentType === "credit_card" ? formData.cardholderName : formData.nameOnAccount) ||
            customer?.name,
          customerEmail: customer?.email,
          customerMobile: customer?.phone,
          description: `Order #${orders?.order_number}`,
          merchantName: orders?.business_name || "Your Store",
          logoUrl: orders?.logo_url,
          returnUrl: `${window.location.origin}/payment/callback`,
          failureUrl: `${window.location.origin}/payment/callback`,
          cancelUrl: `${window.location.origin}/payment/cancel`,
          calculateFee: paymentType === "credit_card",
          calculateTax: false,
          tipsInputPrompt: false,
          themeColor: "#2563EB",
        });
        
        if (iPosResult.success && iPosResult.paymentUrl) {
          console.log("✅ iPOS Pays enabled - redirecting to payment page");
          
          // Save pending payment info for callback
          localStorage.setItem('pending_payment', JSON.stringify({
            transactionReferenceId: iPosResult.transactionReferenceId,
            orderId,
            orderNumber: orders?.order_number,
            amount: basePaymentAmount,
            baseAmount: basePaymentAmount,
            estimatedChargedAmount: processorChargeAmount,
            estimatedProcessingFee: cardProcessingFeeAmount,
            customerName:
              (paymentType === "credit_card" ? formData.cardholderName : formData.nameOnAccount) ||
              customer?.name,
            customerEmail: customer?.email,
            paymentMethod: paymentType === "credit_card" ? "card" : "ach",
            timestamp: new Date().toISOString(),
          }));
          
          // Show loading message
          toast({
            title: "Redirecting to Payment Page",
            description: "You will be redirected to secure payment page...",
          });
          
          // Redirect to iPOS Pays
          setTimeout(() => {
            window.location.href = iPosResult.paymentUrl!;
          }, 1000);
          
          return;
        } else {
          console.error("❌ iPOS Pays error:", iPosResult.error);
          toast({
            title: "Payment Error",
            description: iPosResult.error || "Failed to initiate payment",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      } catch (error: any) {
        console.error("❌ iPOS Pays check failed:", error);
        toast({
          title: "Payment Error",
          description: error?.message || "Unable to start secure checkout.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }
    // ============================================
    // END iPOS PAYS CHECK
    // ============================================

    // Check which ACH processor to use from database settings
    const achProcessor = await getACHProcessor();

    // Manual payment handling
    if (paymentType === "manaul_payemnt") {
      try {
        // Calculate new paid_amount for manual payment
        const newPaidAmount = previousPaidAmount + basePaymentAmount
        const orderTotal = Number(orders.total_amount || orders.total || 0)
        // Use tolerance for floating point comparison (0.01 = 1 cent)
        const newPaymentStatus = (newPaidAmount >= orderTotal - 0.01) ? "paid" : "partial_paid"
        
        // Get current order status before updating
        const { data: currentOrderData } = await supabase
          .from("orders")
          .select("payment_status, payment_method, profile_id, location_id")
          .eq("id", orderId)
          .single();
        
        const previousPaymentStatus = String(currentOrderData?.payment_status || "").toLowerCase()
        const wasUnpaidOrPending = previousPaymentStatus === "unpaid" || 
                                   previousPaymentStatus === "pending" ||
                                   previousPaymentStatus === "partial_paid";
        const deferredEditInventoryAlreadyDeducted =
          previousPaymentStatus === "partial_paid"
            ? await hasDeferredOrderEditInventoryDeduction()
            : false;
        
        await supabase.from("orders").update({
          payment_status: newPaymentStatus,
          paid_amount: newPaidAmount,
          notes: formData.notes,
          updated_at: new Date().toISOString(),
        }).eq("id", orderId)

        // Deduct stock only when order transitions to fully paid (exclude Purchase Orders).
        const shouldDeductFullStockOnFinalize =
          newPaymentStatus === "paid" &&
          !isPurchaseOrder &&
          (
            previousPaymentStatus === "unpaid" ||
            previousPaymentStatus === "pending" ||
            (previousPaymentStatus === "partial_paid" && !deferredEditInventoryAlreadyDeducted)
          );

        if (shouldDeductFullStockOnFinalize) {
          try {
            if (useStockDeductionRpc) {
              await deductOrderStockByRpc(orderId)
            } else {
              await updateProductStock(orders.items || [], orderId)
            }
          } catch (stockError) {
            console.error("Stock deduction failed (manual payment):", stockError)
            // Don't throw - payment succeeded
          }
        } else if (deferredEditInventoryAlreadyDeducted) {
          console.log("Skipping full stock deduction: deferred order-edit inventory already applied.")
        }

        // Award reward points if order is now fully paid and was unpaid/pending before
        // Only award for non-credit orders
        console.log("🔍 Checking reward points eligibility (Manual Payment):");
        console.log("  - New payment status:", newPaymentStatus);
        console.log("  - Was unpaid/pending:", wasUnpaidOrPending);
        console.log("  - Previous status:", currentOrderData?.payment_status);
        console.log("  - Payment method:", currentOrderData?.payment_method);
        console.log("  - Order total:", orderTotal);
        
        if (newPaymentStatus === "paid" && wasUnpaidOrPending && currentOrderData?.payment_method !== "credit") {
          try {
            console.log("✅ ELIGIBLE for reward points!");
            console.log("🎁 Awarding reward points for newly paid order (manual payment)...");
            const customerId = currentOrderData?.profile_id || currentOrderData?.location_id || orders.profile_id || orders.location_id || orders.customer;
            console.log("  - Customer ID:", customerId);
            
            if (customerId && orderTotal > 0) {
              const { awardOrderPoints } = await import("@/services/rewardsService");
              console.log("  - Calling awardOrderPoints...");
              const rewardResult = await awardOrderPoints(
                customerId,
                orderId,
                orderTotal,
                orders.order_number
              );
              
              console.log("  - Reward result:", rewardResult);
              
              if (rewardResult.success && rewardResult.pointsEarned > 0) {
                console.log(`✅ SUCCESS! Reward points awarded: ${rewardResult.pointsEarned} points`);
              } else {
                console.log("⚠️ Reward points NOT awarded:", rewardResult.error || "Unknown reason");
              }
            } else {
              console.log("❌ Missing customer ID or order total is 0");
            }
          } catch (rewardError) {
            console.error("❌ Error awarding reward points:", rewardError);
            // Don't throw - payment was successful
          }
        } else {
          console.log("❌ NOT ELIGIBLE for reward points:");
          console.log("  - Is paid?", newPaymentStatus === "paid");
          console.log("  - Was unpaid/pending?", wasUnpaidOrPending);
          console.log("  - Not credit?", currentOrderData?.payment_method !== "credit");
        }

        const { data: existingInvoice } = await supabase.from("invoices").select("*").eq("order_id", orderId).maybeSingle()

        if (!existingInvoice) {
          const orderInfo = { 
            ...orders, 
            profile_id: orders.customer, 
            id: orderId, 
            paymentMethod: "manual", 
            payment_status: newPaymentStatus,
            // Use the actual order total from database
            total_amount: orderTotal,
            paid_amount: newPaidAmount,
          }
          // Pass the correct order total
          await createInvoice(orderInfo, orderTotal, orders.tax_amount || 0)
        }

        await supabase.from("invoices").update({
          payment_status: newPaymentStatus,
          paid_amount: newPaidAmount,
          total_amount: orderTotal,
          processing_fee_amount: orders.processing_fee_amount || 0,
          updated_at: new Date().toISOString(),
          payment_method: "manual",
          payment_notes: formData.notes,
        }).eq("order_id", orderId)

        await OrderActivityService.logPaymentReceived({
          orderId, orderNumber: orders.order_number, amount: basePaymentAmount, paymentMethod: "manual", performedByName: "Admin",
        })

        // Show success popup for manual payment
        setPaymentResult({
          success: true,
          amount: basePaymentAmount,
          orderNumber: orders?.order_number,
          paymentMethod: "manual",
        })
        setShowResultPopup(true)
        setLoading(false)
        return
      } catch (error: any) {
        setLoading(false)
        // Show failure popup for manual payment
        setPaymentResult({
          success: false,
          amount: basePaymentAmount,
          orderNumber: orders?.order_number,
          paymentMethod: "manual",
          errorMessage: error.message || "Failed to process manual payment",
        })
        setShowResultPopup(true)
        return
      }
    }

    // Card/ACH payment - ensure all billing fields have valid values
    const getNameParts = (fullName: string) => {
      const parts = (fullName || "").trim().split(" ").filter(Boolean);
      return {
        firstName: parts[0] || "Customer",
        lastName: parts.slice(1).join(" ") || "Customer" // Default to "Customer" if no last name
      };
    };
    
    const cardNameParts = getNameParts(formData.cardholderName);
    const achNameParts = getNameParts(formData.nameOnAccount);
    const maybeSaveCardAfterSuccess = async () => {
      if (!saveCard || paymentType !== "credit_card" || !savableProfileId || !customer?.email) {
        return
      }

      try {
        const saveResult = await saveCardToProfile(
          savableProfileId,
          customer.email,
          formData.cardNumber,
          formData.expirationDate,
          formData.cvv,
          {
            firstName: cardNameParts.firstName,
            lastName: cardNameParts.lastName,
            address: formData.address || "N/A",
            city: formData.city || "N/A",
            state: formData.state || "N/A",
            zip: formData.zip || "00000",
            country: formData.country || "USA",
          }
        )

        if (saveResult.success) {
          toast({
            title: "Card Saved",
            description: "This card is now available for faster future checkout.",
          })
        } else if (saveResult.error) {
          console.error("Failed to save card after payment:", saveResult.error)
        }
      } catch (saveError) {
        console.error("Error saving card after payment:", saveError)
      }
    }

    // ============================================
    // PAY-NOW FLOW: Use server endpoint (unauthenticated)
    // This bypasses RLS by processing everything server-side
    // ============================================
    if (payNow) {
      try {
        const payNowPayload: any = {
          orderId,
          paymentType,
          amount: processorChargeAmount,
          appliedAmount: basePaymentAmount,
          processingFeeAmount: cardProcessingFeeAmount,
          saveCard,
          address: formData.address || "N/A",
          city: formData.city || "N/A",
          state: formData.state || "N/A",
          zip: formData.zip || "00000",
          country: formData.country || "USA",
        };

        if (paymentType === "credit_card") {
          payNowPayload.cardNumber = formData.cardNumber;
          payNowPayload.expirationDate = formData.expirationDate.replace("/", "");
          payNowPayload.cvv = formData.cvv;
          payNowPayload.cardholderName = formData.cardholderName;
        } else if (paymentType === "ach") {
          payNowPayload.accountType = formData.accountType;
          payNowPayload.routingNumber = formData.routingNumber;
          payNowPayload.accountNumber = formData.accountNumber;
          payNowPayload.nameOnAccount = formData.nameOnAccount;
        }

        const serverResponse = await axios.post("/api/pay-now-process", payNowPayload);
        const result = serverResponse.data;

        if (result.success) {
          if (result.cardSaved) {
            toast({
              title: "Card Saved",
              description: "This card is now available for faster future checkout.",
            });
          }
          setPaymentSuccess(true);
          setPaymentResult({
            success: true,
            transactionId: result.transactionId,
            authCode: result.authCode,
            amount: result.amount || processorChargeAmount,
            orderNumber: orders?.order_number,
            paymentMethod: paymentType === "credit_card" ? "card" : "ach",
            cardType: paymentType === "credit_card" ? cardType.type : undefined,
            cardLastFour: paymentType === "credit_card" ? formData.cardNumber.slice(-4) : undefined,
            accountType: paymentType === "ach" ? formData.accountType : undefined,
            accountLastFour: paymentType === "ach" ? formData.accountNumber.slice(-4) : undefined,
          });
          setShowResultPopup(true);
          setLoading(false);
          onPaymentSuccess?.();
        } else {
          setPaymentResult({
            success: false,
            amount: processorChargeAmount,
            orderNumber: orders?.order_number,
            errorMessage: result.message || "Payment failed. Please try again.",
            errorCode: result.errorCode,
            paymentMethod: paymentType === "credit_card" ? "card" : "ach",
            cardType: paymentType === "credit_card" ? cardType.type : undefined,
            cardLastFour: paymentType === "credit_card" ? formData.cardNumber.slice(-4) : undefined,
          });
          setShowResultPopup(true);
          setLoading(false);
        }
      } catch (error: any) {
        const errMsg = error?.response?.data?.message || error?.message || "Something went wrong. Please try again.";
        setPaymentResult({
          success: false,
          amount: processorChargeAmount,
          orderNumber: orders?.order_number,
          errorMessage: errMsg,
          paymentMethod: paymentType === "credit_card" ? "card" : "ach",
          cardType: paymentType === "credit_card" ? cardType.type : undefined,
          cardLastFour: paymentType === "credit_card" ? formData.cardNumber.slice(-4) : undefined,
        });
        setShowResultPopup(true);
        setLoading(false);
      }
      return; // Don't continue to the authenticated flow below
    }

    // ============================================
    // AUTHENTICATED FLOW: Use Edge Function + direct Supabase (existing logic)
    // ============================================
    try {
      let response: PaymentResponse;
      
      // Handle ACH payment based on processor selection
      if (paymentType === "ach" && achProcessor === "fortispay") {
        // Use FortisPay for ACH
        const { processACHPaymentFortisPay } = await import("@/services/paymentService");
        
        response = await processACHPaymentFortisPay(
          {
            accountType: formData.accountType as "checking" | "savings" | "businessChecking",
            routingNumber: formData.routingNumber,
            accountNumber: formData.accountNumber,
            nameOnAccount: formData.nameOnAccount,
          },
          {
            firstName: achNameParts.firstName,
            lastName: achNameParts.lastName,
            address: formData.address || "N/A",
            city: formData.city || "N/A",
            state: formData.state || "N/A",
            zip: formData.zip || "00000",
            country: formData.country || "USA",
          },
          processorChargeAmount,
          orderId,
          `Order Payment - ${orders?.order_number}`,
          "WEB"
        );
      } else {
        // Use Authorize.Net (default) for both card and ACH
        const paymentRequest = paymentType === "credit_card"
          ? {
              payment: { type: "card" as const, cardNumber: formData.cardNumber, expirationDate: formData.expirationDate.replace("/", ""), cvv: formData.cvv, cardholderName: formData.cardholderName },
              amount: processorChargeAmount,
              chargedAmount: processorChargeAmount,
              appliedAmount: basePaymentAmount,
              processingFeeAmount: cardProcessingFeeAmount,
              invoiceNumber: orders?.order_number,
              orderId,
              customerEmail: customer?.email,
              billing: { firstName: cardNameParts.firstName, lastName: cardNameParts.lastName, address: formData.address || "N/A", city: formData.city || "N/A", state: formData.state || "N/A", zip: formData.zip || "00000", country: formData.country || "USA" },
            }
          : {
              payment: { type: "ach" as const, accountType: formData.accountType as "checking" | "savings", routingNumber: formData.routingNumber, accountNumber: formData.accountNumber, nameOnAccount: formData.nameOnAccount, echeckType: "WEB" as const },
              amount: processorChargeAmount,
              chargedAmount: processorChargeAmount,
              appliedAmount: basePaymentAmount,
              processingFeeAmount: cardProcessingFeeAmount,
              invoiceNumber: orders?.order_number,
              orderId,
              customerEmail: customer?.email,
              billing: { firstName: achNameParts.firstName, lastName: achNameParts.lastName, address: formData.address || "N/A", city: formData.city || "N/A", state: formData.state || "N/A", zip: formData.zip || "00000", country: formData.country || "USA" },
            };
        
        response = await processPayment(paymentRequest);
      }

      // Log transaction to payment_transactions table (for both success and failure)
      const cardLastFour = paymentType === "credit_card" ? formData.cardNumber.slice(-4) : undefined
      const cardTypeDetected = paymentType === "credit_card" ? detectCardType(formData.cardNumber).type : undefined
      
      // Get profile_id - try multiple sources
      const profileIdForLog = orders.profile_id || orders.customer || null
      
      if (profileIdForLog) {
        await logPaymentTransaction(
          profileIdForLog,
          orderId,
          null, // invoice_id - will be set after invoice creation
          "auth_capture",
          processorChargeAmount,
          {
            success: response.success,
            transactionId: response.transactionId,
            authCode: response.authCode,
            message: response.message || response.error || "",
            errorCode: response.errorCode,
            errorMessage: response.error,
        },
        paymentType === "credit_card" ? "card" : "ach",
        cardLastFour,
        cardTypeDetected
      )
      } else {
        console.warn("No profile_id found for order, skipping payment transaction log")
      }

      if (response.success) {
        setPaymentSuccess(true)
        await maybeSaveCardAfterSuccess()
        
        // Get current order data FIRST to calculate everything correctly
        const { data: currentOrderData } = await supabase
          .from("orders")
          .select("payment_status, payment_method, profile_id, location_id, processing_fee_amount, total_amount, paid_amount")
          .eq("id", orderId)
          .single();
        
        const previousPaymentStatus = String(currentOrderData?.payment_status || "").toLowerCase()
        const wasUnpaidOrPending = previousPaymentStatus === "unpaid" || 
                                   previousPaymentStatus === "pending" ||
                                   previousPaymentStatus === "partial_paid";
        const deferredEditInventoryAlreadyDeducted =
          previousPaymentStatus === "partial_paid"
            ? await hasDeferredOrderEditInventoryDeduction()
            : false;
        
        // Get current values from database
        const currentTotal = Number(currentOrderData?.total_amount || 0);
        const currentPaid = Number(currentOrderData?.paid_amount || 0);
        const previousProcessingFee = Number(currentOrderData?.processing_fee_amount || 0);
        
        // Calculate new values
        // When customer pays with card, they are charged: basePaymentAmount + cardProcessingFeeAmount
        // This full amount (processorChargeAmount) should be reflected in paid_amount
        // The processing fee increases the total, and the customer pays it, so both should increase together
        const newTotalAmount = currentTotal + cardProcessingFeeAmount; // Add fee to total
        const newPaidAmount = currentPaid + processorChargeAmount; // Add full charged amount (base + fee)
        const totalProcessingFee = previousProcessingFee + cardProcessingFeeAmount; // Accumulate fees
        
        // Determine payment status based on new values
        // Use tolerance for floating point comparison (0.01 = 1 cent)
        const newPaymentStatus = (newPaidAmount >= newTotalAmount - 0.01) ? "paid" : "partial_paid";
        
        console.log("💰 Payment Calculation:", {
          currentTotal,
          currentPaid,
          basePaymentAmount,
          cardProcessingFeeAmount,
          processorChargeAmount,
          newTotalAmount,
          newPaidAmount,
          totalProcessingFee,
          newPaymentStatus,
          formula: `total: ${currentTotal} + ${cardProcessingFeeAmount} = ${newTotalAmount}, paid: ${currentPaid} + ${processorChargeAmount} = ${newPaidAmount}`
        });
        
        await supabase.from("orders").update({ 
          payment_status: newPaymentStatus, 
          paid_amount: newPaidAmount, // Full amount charged to customer (base + processing fee)
          total_amount: newTotalAmount, // Total includes processing fee
          processing_fee_amount: totalProcessingFee, // Accumulated fees tracked separately
          updated_at: new Date().toISOString() 
        }).eq("id", orderId)

        // Deduct stock only when order transitions to fully paid (exclude Purchase Orders).
        const shouldDeductFullStockOnFinalize =
          newPaymentStatus === "paid" &&
          !isPurchaseOrder &&
          (
            previousPaymentStatus === "unpaid" ||
            previousPaymentStatus === "pending" ||
            (previousPaymentStatus === "partial_paid" && !deferredEditInventoryAlreadyDeducted)
          );

        if (shouldDeductFullStockOnFinalize) {
          try {
            if (useStockDeductionRpc) {
              await deductOrderStockByRpc(orderId)
            } else {
              await updateProductStock(orders.items || [], orderId)
            }
          } catch (stockError) {
            console.error("Stock deduction failed (card/ach payment):", stockError)
            // Don't throw - payment succeeded
          }
        } else if (deferredEditInventoryAlreadyDeducted) {
          console.log("Skipping full stock deduction: deferred order-edit inventory already applied.")
        }

        // Award reward points if order is now fully paid and was unpaid/pending before
        // Only award for non-credit orders
        console.log("🔍 Checking reward points eligibility:");
        console.log("  - New payment status:", newPaymentStatus);
        console.log("  - Was unpaid/pending:", wasUnpaidOrPending);
        console.log("  - Previous status:", currentOrderData?.payment_status);
        console.log("  - Payment method:", currentOrderData?.payment_method);
        console.log("  - Order total:", newTotalAmount);
        
        if (newPaymentStatus === "paid" && wasUnpaidOrPending && currentOrderData?.payment_method !== "credit") {
          try {
            console.log("✅ ELIGIBLE for reward points!");
            console.log("🎁 Awarding reward points for newly paid order...");
            const customerId = currentOrderData?.profile_id || currentOrderData?.location_id || orders.profile_id || orders.location_id || orders.customer;
            console.log("  - Customer ID:", customerId);
            
            if (customerId && newTotalAmount > 0) {
              const { awardOrderPoints } = await import("@/services/rewardsService");
              console.log("  - Calling awardOrderPoints...");
              const rewardResult = await awardOrderPoints(
                customerId,
                orderId,
                newTotalAmount,
                orders.order_number
              );
              
              console.log("  - Reward result:", rewardResult);
              
              if (rewardResult.success && rewardResult.pointsEarned > 0) {
                console.log(`✅ SUCCESS! Reward points awarded: ${rewardResult.pointsEarned} points`);
              } else {
                console.log("⚠️ Reward points NOT awarded:", rewardResult.error || "Unknown reason");
              }
            } else {
              console.log("❌ Missing customer ID or order total is 0");
            }
          } catch (rewardError) {
            console.error("❌ Error awarding reward points:", rewardError);
            // Don't throw - payment was successful
          }
        } else {
          console.log("❌ NOT ELIGIBLE for reward points:");
          console.log("  - Is paid?", newPaymentStatus === "paid");
          console.log("  - Was unpaid/pending?", wasUnpaidOrPending);
          console.log("  - Not credit?", currentOrderData?.payment_method !== "credit");
        }

        // Use maybeSingle() instead of single() to avoid error when invoice doesn't exist
        let { data: invoiceData } = await supabase.from("invoices").select("*").eq("order_id", orderId).maybeSingle()
        
        const isNewInvoice = !invoiceData;
        
        if (isNewInvoice) {
          // Fetch the LATEST order data from database (not the stale orders prop)
          const { data: latestOrderData } = await supabase
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single();
          
          // Ensure profile_id is set - use orders.customer if profile_id is not available
          const orderWithProfileId = { 
            ...latestOrderData, // Use latest data from database
            profile_id: latestOrderData?.profile_id || orders.profile_id || orders.customer,
            id: orderId,
            // Pass the updated total_amount that includes processing fee
            total_amount: newTotalAmount,
            processing_fee_amount: totalProcessingFee,
            paid_amount: newPaidAmount,
          }
          // Pass the updated total amount (which includes processing fee)
          await createInvoice(orderWithProfileId, newTotalAmount, orders.tax_amount || 0)
          
          // Fetch the newly created invoice to get its data
          const { data: newInvoiceData } = await supabase.from("invoices").select("*").eq("order_id", orderId).maybeSingle()
          invoiceData = newInvoiceData
        }

        // Calculate invoice totals based on whether it's a new or existing invoice
        let finalInvoiceTotalAmount: number;
        let finalInvoiceProcessingFee: number;
        
        if (isNewInvoice) {
          // For new invoices, the total already includes the processing fee from createInvoice
          finalInvoiceTotalAmount = newTotalAmount;
          finalInvoiceProcessingFee = totalProcessingFee;
        } else {
          // For existing invoices (partial payments), add new processing fee to existing totals
          const previousInvoiceProcessingFee = Number(invoiceData?.processing_fee_amount || 0);
          finalInvoiceProcessingFee = previousInvoiceProcessingFee + cardProcessingFeeAmount;
          
          const currentInvoiceTotal = Number(invoiceData?.total_amount || 0);
          finalInvoiceTotalAmount = currentInvoiceTotal + cardProcessingFeeAmount;
        }

        await supabase.from("invoices").update({
          payment_status: newPaymentStatus,
          paid_amount: newPaidAmount, // Full amount charged to customer (base + processing fee)
          total_amount: finalInvoiceTotalAmount, // Update total to include processing fee
          processing_fee_amount: finalInvoiceProcessingFee, // Add to existing processing fees
          updated_at: new Date().toISOString(),
          payment_transication: response.transactionId || "",
          payment_method: paymentType === "credit_card" ? "card" : "ach",
        }).eq("order_id", orderId)

        await OrderActivityService.logPaymentReceived({
          orderId, orderNumber: orders.order_number, amount: basePaymentAmount, chargedAmount: processorChargeAmount, processingFeeAmount: cardProcessingFeeAmount, paymentMethod: paymentType === "credit_card" ? "card" : "ach", paymentId: response.transactionId, performedByName: customer.name || "Customer", performedByEmail: customer.email,
        })

        // Show success popup with transaction details
        setPaymentResult({
          success: true,
          transactionId: response.transactionId,
          authCode: response.authCode,
          amount: processorChargeAmount,
          orderNumber: orders?.order_number,
          paymentMethod: paymentType === "credit_card" ? "card" : "ach",
          cardType: paymentType === "credit_card" ? cardType.type : undefined,
          cardLastFour: paymentType === "credit_card" ? formData.cardNumber.slice(-4) : undefined,
          accountType: paymentType === "ach" ? formData.accountType : undefined,
          accountLastFour: paymentType === "ach" ? formData.accountNumber.slice(-4) : undefined,
        })
        setShowResultPopup(true)
        setLoading(false)
      } else {
        setLoading(false)
        const errorCode = response.errorCode
        const finalMessage = errorCode && authorizeErrorMap[errorCode] ? `${authorizeErrorMap[errorCode]} (${errorCode})` : response.error || "Payment failed. Please try again."
        
        // Show failure popup with error details
        setPaymentResult({
          success: false,
          amount: processorChargeAmount,
          orderNumber: orders?.order_number,
          errorMessage: finalMessage,
          errorCode: errorCode,
          paymentMethod: paymentType === "credit_card" ? "card" : "ach",
          cardType: paymentType === "credit_card" ? cardType.type : undefined,
          cardLastFour: paymentType === "credit_card" ? formData.cardNumber.slice(-4) : undefined,
          accountType: paymentType === "ach" ? formData.accountType : undefined,
          accountLastFour: paymentType === "ach" ? formData.accountNumber.slice(-4) : undefined,
        })
        setShowResultPopup(true)
      }
    } catch (error: any) {
      setLoading(false)
      // Show failure popup for unexpected errors
      setPaymentResult({
        success: false,
        amount: processorChargeAmount,
        orderNumber: orders?.order_number,
        errorMessage: error?.message || "Something went wrong. Please try again.",
        paymentMethod: paymentType === "credit_card" ? "card" : "ach",
        cardType: paymentType === "credit_card" ? cardType.type : undefined,
        cardLastFour: paymentType === "credit_card" ? formData.cardNumber.slice(-4) : undefined,
        accountType: paymentType === "ach" ? formData.accountType : undefined,
        accountLastFour: paymentType === "ach" ? formData.accountNumber.slice(-4) : undefined,
      })
      setShowResultPopup(true)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.()
    await submitPayment()
  }

  if (!modalIsOpen) return null

  // Helper to safely format amount
  const formatAmount = (amt: number | string) => {
    const num = typeof amt === 'string' ? parseFloat(amt) : amt
    return isNaN(num) ? '0.00' : num.toFixed(2)
  }

  const primaryActionLabel =
    isPayNowPharmacyReviewOnly
      ? `Pay Pending Amount $${formatAmount(processorChargeAmount)}`
      : paymentType === "manaul_payemnt"
        ? `Record Manual Payment $${formatAmount(processorChargeAmount)}`
        : paymentType === "credit_card"
          ? "Continue to Secure Card Checkout"
          : "Continue to Secure ACH Checkout"

  const paymentContent = (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-50 via-white to-slate-100 overflow-y-auto overscroll-contain">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setModalIsOpen(false)} className="gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Secure Payment</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Payment Form - Left Side (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Payment Method Selection */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-blue-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl text-white">
                  <CreditCard className="w-6 h-6" />
                  Payment Method
                </CardTitle>
                <CardDescription className="text-blue-100">
                  {isPayNowPharmacyReviewOnly
                    ? "Review pending amount and continue to secure payment"
                    : isPayNowAdminReview || isPurchaseOrder
                      ? "Review order and choose payment method"
                      : "Select how you'd like to pay"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className={cn(
                  "grid gap-3",
                  (isPurchaseOrder || isPayNowPharmacyReviewOnly) ? "grid-cols-1" : (isPayNowAdminReview ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3")
                )}>
                  {!isPurchaseOrder && !isPayNowPharmacyReviewOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPaymentType("credit_card")}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 relative",
                          paymentType === "credit_card" ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <CreditCard className={cn("w-7 h-7", paymentType === "credit_card" ? "text-blue-600" : "text-gray-400")} />
                          <span className={cn("font-medium text-sm", paymentType === "credit_card" ? "text-blue-700" : "text-gray-600")}>Credit Card</span>
                          <span className="text-xs text-gray-500 text-center">
                            Final total confirmed at secure checkout
                        </span>
                        {paymentType === "credit_card" && <CheckCircle2 className="w-4 h-4 text-blue-500 absolute top-2 right-2" />}
                      </button>
                      {!isPayNowAdminReview && (
                        <button
                          type="button"
                          onClick={() => setPaymentType("ach")}
                          className={cn(
                            "p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 relative",
                            paymentType === "ach" ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <Landmark className={cn("w-7 h-7", paymentType === "ach" ? "text-blue-600" : "text-gray-400")} />
                            <span className={cn("font-medium text-sm", paymentType === "ach" ? "text-blue-700" : "text-gray-600")}>Bank (ACH)</span>
                            <span className="text-xs text-emerald-600 text-center">No card processing fee</span>
                          {paymentType === "ach" && <CheckCircle2 className="w-4 h-4 text-blue-500 absolute top-2 right-2" />}
                        </button>
                      )}
                    </>
                  )}
                  {isAdminUser && (
                    <button
                      type="button"
                      onClick={() => setPaymentType("manaul_payemnt")}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 relative",
                        paymentType === "manaul_payemnt" ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <FileText className={cn("w-7 h-7", paymentType === "manaul_payemnt" ? "text-blue-600" : "text-gray-400")} />
                      <span className={cn("font-medium text-sm", paymentType === "manaul_payemnt" ? "text-blue-700" : "text-gray-600")}>Manual</span>
                      {paymentType === "manaul_payemnt" && <CheckCircle2 className="w-4 h-4 text-blue-500 absolute top-2 right-2" />}
                    </button>
                  )}
                </div>
                {(isPayNowPharmacyReviewOnly || isPayNowAdminReview) && (
                  <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 space-y-1">
                    <p><strong>Order total:</strong> ${formatAmount(orderTotalAmount)}</p>
                    <p><strong>Already paid:</strong> ${formatAmount(alreadyPaidAmount)}</p>
                    <p><strong>Pending to pay now:</strong> ${formatAmount(basePaymentAmount)}</p>
                    <p><strong>Pending after this payment:</strong> ${formatAmount(pendingAfterThisPayment)}</p>
                  </div>
                )}
                {isPurchaseOrder && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    <p className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      Purchase Orders require manual payment processing. Please enter payment details and reference information.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Details Form */}
            <form onSubmit={handleSubmit}>
              <Card className="shadow-lg border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {isPayNowPharmacyReviewOnly && <><Receipt className="w-5 h-5 text-blue-600" /> Review Pending Payment</>}
                    {!isPayNowPharmacyReviewOnly && paymentType === "credit_card" && <><CreditCard className="w-5 h-5 text-blue-600" /> Secure Card Checkout</>}
                    {!isPayNowPharmacyReviewOnly && paymentType === "ach" && <><Landmark className="w-5 h-5 text-blue-600" /> Secure ACH Checkout</>}
                    {!isPayNowPharmacyReviewOnly && paymentType === "manaul_payemnt" && <><FileText className="w-5 h-5 text-blue-600" /> Manual Payment</>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {isPayNowPharmacyReviewOnly && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                      <p className="flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        Review complete. Click the payment button to pay pending amount on secure iPOSPay page.
                      </p>
                    </div>
                  )}

                  {paymentType === "credit_card" && !isPayNowPharmacyReviewOnly && (
                    <>
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                        <p className="flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          Card number, expiration date, and CVV are collected on the secure iPOSPay page. This screen should only collect payer and billing details before redirect.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardholderName" className={cn(errors.cardholderName && "text-red-500")}>Name on Card</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="cardholderName"
                            name="cardholderName"
                            placeholder="John Doe"
                            value={formData.cardholderName}
                            onChange={handleChange}
                            className={cn("pl-11 h-12", errors.cardholderName && "border-red-500")}
                          />
                        </div>
                        {errors.cardholderName && <p className="text-sm text-red-500">{errors.cardholderName}</p>}
                      </div>
                    </>
                  )}

                  {paymentType === "ach" && !isPayNowPharmacyReviewOnly && (
                    <>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                        <p className="flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          Bank account details are collected on the secure iPOSPay page. This screen only confirms the account holder name and billing address before redirect.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nameOnAccount" className={cn(errors.nameOnAccount && "text-red-500")}>Name on Bank Account</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input 
                            id="nameOnAccount" 
                            name="nameOnAccount" 
                            placeholder="John Doe" 
                            value={formData.nameOnAccount} 
                            onChange={handleChange} 
                            className={cn("pl-11 h-12", errors.nameOnAccount && "border-red-500")} 
                          />
                        </div>
                        {errors.nameOnAccount && <p className="text-sm text-red-500">{errors.nameOnAccount}</p>}
                      </div>
                    </>
                  )}

                  {paymentType === "manaul_payemnt" && (
                    <div className="space-y-2">
                      <Label htmlFor="notes" className={cn(errors.notes && "text-red-500")}>Payment Notes / Reference</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        placeholder="Enter payment details, check number, or reference..."
                        value={formData.notes}
                        onChange={handleChange}
                        className={cn("min-h-[120px]", errors.notes && "border-red-500")}
                      />
                      {errors.notes && <p className="text-sm text-red-500">{errors.notes}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Billing Address */}
              {!isPayNowPharmacyReviewOnly && paymentType !== "manaul_payemnt" && (
              <Card className="shadow-lg border-0 mt-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 relative">
                    <Label htmlFor="address" className={cn(errors.address && "text-red-500")}>Street Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input 
                        id="address" 
                        name="address" 
                        placeholder="123 Main Street" 
                        value={formData.address} 
                        onChange={(e) => handleAddressChange(e.target.value)} 
                        className={cn("pl-11 h-12", errors.address && "border-red-500")} 
                      />
                    </div>
                    {addressSuggestions.length > 0 && (
                      <ul className="absolute left-0 w-full bg-white border-2 border-blue-200 shadow-lg z-50 mt-1 max-h-60 overflow-y-auto rounded-lg">
                        {addressSuggestions.map((suggestion) => (
                          <li
                            key={suggestion.place_id}
                            className="cursor-pointer hover:bg-blue-50 px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors"
                            onClick={() => handleAddressSuggestionClick(suggestion)}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {suggestion.description}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className={cn(errors.city && "text-red-500")}>City</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input id="city" name="city" placeholder="New York" value={formData.city} onChange={handleChange} className={cn("pl-11 h-12", errors.city && "border-red-500")} />
                      </div>
                      {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className={cn(errors.state && "text-red-500")}>State</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input id="state" name="state" placeholder="NY" value={formData.state} onChange={handleChange} className={cn("pl-11 h-12", errors.state && "border-red-500")} />
                      </div>
                      {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip" className={cn(errors.zip && "text-red-500")}>ZIP Code</Label>
                      <Input id="zip" name="zip" placeholder="10001" value={formData.zip} onChange={handleChange} className={cn("h-12", errors.zip && "border-red-500")} />
                      {errors.zip && <p className="text-sm text-red-500">{errors.zip}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" name="country" placeholder="USA" value={formData.country} onChange={handleChange} className="h-12" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Mobile Submit Button */}
              <div className="lg:hidden mt-6">
                <Button 
                  type="submit" 
                  disabled={loading || basePaymentAmount <= 0} 
                  className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Redirecting...</>
                  ) : (
                    <><Lock className="w-5 h-5 mr-2" />{primaryActionLabel}</>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Order Summary - Right Side (2 cols) */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              {/* Order Summary Card */}
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-blue-600 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <Receipt className="w-5 h-5" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Order Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Order Number
                      </span>
                      <Badge variant="secondary" className="font-mono">{orders?.order_number || "N/A"}</Badge>
                    </div>
                    {customer?.name && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Customer
                        </span>
                        <span className="font-medium text-gray-900">{customer.name}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Payment applied
                      </span>
                      <span className="text-2xl font-bold text-blue-700">${formatAmount(basePaymentAmount)}</span>
                    </div>
                  </div>

                  {/* Payment Method Badge */}
                  <div className="flex items-center justify-center gap-2 py-2">
                    <span className="text-sm text-gray-500">Paying with:</span>
                    <Badge variant="outline" className="capitalize">
                      {paymentType === "credit_card" && <><CreditCard className="w-3 h-3 mr-1" />Credit Card</>}
                      {paymentType === "ach" && <><Landmark className="w-3 h-3 mr-1" />Bank Transfer</>}
                      {paymentType === "manaul_payemnt" && <><FileText className="w-3 h-3 mr-1" />Manual</>}
                    </Badge>
                  </div>

                  {paymentType !== "credit_card" && !isPayNowAdminReview && (
                    <Card className={cn(
                      "border",
                      paymentType === "ach"
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50"
                    )}>
                      <CardContent className="p-5">
                        {paymentType === "ach" ? (
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="rounded-full bg-emerald-100 p-2">
                              <ShieldCheck className="h-5 w-5 text-emerald-700" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-emerald-900">ACH avoids card fees</p>
                              <p className="text-sm text-emerald-800">
                                The amount you enter is the exact amount charged and applied to this balance.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">
                          Manual payments apply only the amount entered to the order or invoice balance.
                        </p>
                      )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Desktop Submit Button */}
              <div className="hidden lg:block">
                <Button 
                  type="button" 
                  disabled={loading || basePaymentAmount <= 0} 
                  onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} 
                  className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Redirecting...</>
                  ) : (
                    <><Lock className="w-5 h-5 mr-2" />{primaryActionLabel}</>
                  )}
                </Button>
              </div>

              {/* Security Info */}
              <Card className="border-0 bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center gap-6 mb-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      <span className="text-xs">SSL Secured</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Lock className="w-5 h-5 text-blue-600" />
                      <span className="text-xs">256-bit Encryption</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Your payment information is encrypted and secure. We never store your full card details.
                  </p>
                </CardContent>
              </Card>

              {/* Accepted Cards */}
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="px-2 py-1 bg-white rounded border text-xs font-bold text-blue-600">VISA</div>
                <div className="px-2 py-1 bg-white rounded border text-xs font-bold text-red-600">MC</div>
                <div className="px-2 py-1 bg-white rounded border text-xs font-bold text-blue-800">AMEX</div>
                <div className="px-2 py-1 bg-white rounded border text-xs font-bold text-orange-600">DISC</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Handler for closing result popup on success
  const handleResultPopupClose = () => {
    setShowResultPopup(false)
    if (paymentResult?.success) {
      setModalIsOpen(false)
      // Call the success callback to refresh order data
      if (onPaymentSuccess) {
        onPaymentSuccess()
      }
    }
  }

  // Handler for "Try Again" on failure
  const handleTryAgain = () => {
    setShowResultPopup(false)
    setPaymentResult(null)
  }

  // Use createPortal to render outside the table DOM hierarchy
  return (
    <>
      {createPortal(paymentContent, document.body)}
      <AlertDialog open={showCardFeeConfirm} onOpenChange={setShowCardFeeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm card payment</AlertDialogTitle>
            <AlertDialogDescription>
              The final card fee is calculated on the secure iPOSPay page before the customer confirms payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl border bg-slate-50 p-4 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span>Payment applied to invoice</span>
              <span className="font-medium">${basePaymentAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2 font-semibold">
              <span>Total to pay</span>
              <span>${processorChargeAmount.toFixed(2)}</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={async () => {
                setShowCardFeeConfirm(false)
                await submitPayment(true)
              }}
            >
              Continue to secure checkout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {paymentResult && (
        <PaymentResultPopup
          isOpen={showResultPopup}
          onClose={handleResultPopupClose}
          onTryAgain={handleTryAgain}
          result={paymentResult}
        />
      )}
    </>
  )
}

export default PaymentForm
