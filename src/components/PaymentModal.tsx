"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import axios from "../../axiosconfig"
import { processPayment, PaymentResponse, logPaymentTransaction } from "@/services/paymentService"
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
import { cn } from "@/lib/utils"
import { OrderActivityService } from "@/services/orderActivityService"
import { PaymentResultPopup, PaymentResultData } from "@/components/payment/PaymentResultPopup"

// Validation functions
function validateCardNumber(cardNumber: string, cardType?: { maxLength: number; name: string }) {
  const cleaned = cardNumber.replace(/\D/g, "")
  const expectedLength = cardType?.maxLength || 16
  
  if (cleaned.length < 13) return "Card number too short"
  if (cleaned.length !== expectedLength) return `${cardType?.name || "Card"} requires ${expectedLength} digits`
  
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
  
  // Visa: starts with 4
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

  const year = new Date().getFullYear()
  const { data: inData, error: fetchError } = await supabase
    .from("centerize_data")
    .select("id, invoice_no, invoice_start")
    .order("id", { ascending: false })
    .limit(1)
  if (fetchError) throw new Error(fetchError.message)

  const newInvNo = (inData?.[0]?.invoice_no || 0) + 1
  const invoiceStart = inData?.[0]?.invoice_start || "INV"

  if (inData?.[0]?.id) {
    const { error: updateError } = await supabase
      .from("centerize_data")
      .update({ invoice_no: newInvNo })
      .eq("id", inData[0].id)
    if (updateError) throw new Error(updateError.message)
  }

  const invoiceNumber = `${invoiceStart}-${year}${newInvNo.toString().padStart(6, "0")}`
  const dueDate = new Date(new Date(order.estimated_delivery || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // Calculate subtotal (total - tax - shipping)
  const shippingCost = order.shipping_cost || 0
  const subtotal = totalAmount - newTax - shippingCost

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
    payment_method: order.paymentMethod || "card",
    notes: order.notes || null,
    purchase_number_external: order.purchase_number_external,
    items: order.items,
    customer_info: order.customerInfo,
    shipping_info: order.shippingAddress,
    shippin_cost: shippingCost,
    subtotal: subtotal
  }

  const { error: invoiceError } = await supabase.from("invoices").insert(invoiceData)
  if (invoiceError) throw new Error(invoiceError.message)
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
}

const PaymentForm = ({ modalIsOpen, setModalIsOpen, customer, amountP, orderId, orders, payNow = false, isBalancePayment = false, previousPaidAmount = 0 }: PaymentFormProps) => {
  const [paymentType, setPaymentType] = useState("credit_card")
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [cardType, setCardType] = useState({ type: "unknown", name: "Credit Card", cvvLength: 3, maxLength: 16, format: [4, 4, 4, 4] })
  
  // Payment result popup state
  const [showResultPopup, setShowResultPopup] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResultData | null>(null)

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setErrors({ ...errors, [name]: null })

    if (name === "cardNumber") {
      const cleaned = value.replace(/\D/g, "")
      const detected = detectCardType(cleaned)
      const formattedValue = cleaned.slice(0, detected.maxLength)
      setFormData({ ...formData, [name]: formattedValue })
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
    const newErrors: Record<string, string | null> = {}
    let hasErrors = false

    if (paymentType === "credit_card") {
      newErrors.cardNumber = validateCardNumber(formData.cardNumber, cardType)
      newErrors.cvv = validateCVV(formData.cvv, cardType.cvvLength)
      newErrors.expirationDate = validateExpirationDate(formData.expirationDate)
      newErrors.cardholderName = validateCardholderName(formData.cardholderName)
      newErrors.address = validateAddress(formData.address)
      newErrors.city = validateCity(formData.city)
      newErrors.state = validateState(formData.state)
      newErrors.zip = validateZip(formData.zip)
      newErrors.country = validateCountry(formData.country)
    } else if (paymentType === "manaul_payemnt") {
      newErrors.notes = validateNotes(formData.notes)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.()
    
    // Prevent double submission
    if (loading) return
    
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please fill all required fields correctly.", variant: "destructive" })
      return
    }

    // Validate amount
    if (!formData.amount || formData.amount <= 0) {
      toast({ title: "Invalid Amount", description: "Payment amount must be greater than zero.", variant: "destructive" })
      return
    }

    setLoading(true)

    // Manual payment handling
    if (paymentType === "manaul_payemnt") {
      try {
        // Calculate new paid_amount for manual payment
        const newPaidAmount = previousPaidAmount + formData.amount
        const orderTotal = Number(orders.total_amount || 0)
        const newPaymentStatus = newPaidAmount >= orderTotal ? "paid" : "partial_paid"
        
        await supabase.from("orders").update({
          payment_status: newPaymentStatus,
          paid_amount: newPaidAmount,
          notes: formData.notes,
          updated_at: new Date().toISOString(),
        }).eq("id", orderId)

        const { data: existingInvoice } = await supabase.from("invoices").select("*").eq("order_id", orderId).maybeSingle()

        if (!existingInvoice) {
          const orderInfo = { ...orders, profile_id: orders.customer, id: orderId, paymentMethod: "manual", payment_status: newPaymentStatus }
          await createInvoice(orderInfo, formData.amount, orders.tax_amount || 0)
        }

        await supabase.from("invoices").update({
          payment_status: newPaymentStatus,
          paid_amount: newPaidAmount,
          updated_at: new Date().toISOString(),
          payment_method: "manual",
          payment_notes: formData.notes,
        }).eq("order_id", orderId)

        await OrderActivityService.logPaymentReceived({
          orderId, orderNumber: orders.order_number, amount: formData.amount, paymentMethod: "manual", performedByName: "Admin",
        })

        // Show success popup for manual payment
        setPaymentResult({
          success: true,
          amount: formData.amount,
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
          amount: formData.amount,
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
    
    const paymentRequest = paymentType === "credit_card"
      ? {
          payment: { type: "card" as const, cardNumber: formData.cardNumber, expirationDate: formData.expirationDate.replace("/", ""), cvv: formData.cvv, cardholderName: formData.cardholderName },
          amount: formData.amount,
          invoiceNumber: orders?.order_number,
          orderId,
          customerEmail: customer?.email,
          billing: { firstName: cardNameParts.firstName, lastName: cardNameParts.lastName, address: formData.address || "N/A", city: formData.city || "N/A", state: formData.state || "N/A", zip: formData.zip || "00000", country: formData.country || "USA" },
        }
      : {
          payment: { type: "ach" as const, accountType: formData.accountType as "checking" | "savings", routingNumber: formData.routingNumber, accountNumber: formData.accountNumber, nameOnAccount: formData.nameOnAccount, echeckType: "WEB" as const },
          amount: formData.amount,
          invoiceNumber: orders?.order_number,
          orderId,
          customerEmail: customer?.email,
          billing: { firstName: achNameParts.firstName, lastName: achNameParts.lastName, address: formData.address || "N/A", city: formData.city || "N/A", state: formData.state || "N/A", zip: formData.zip || "00000", country: formData.country || "USA" },
        }

    try {
      const response: PaymentResponse = await processPayment(paymentRequest)

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
          formData.amount,
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
        
        // Calculate new paid_amount - add current payment to previous paid amount
        const newPaidAmount = previousPaidAmount + formData.amount
        const orderTotal = Number(orders.total_amount || 0)
        const newPaymentStatus = newPaidAmount >= orderTotal ? "paid" : "partial_paid"
        
        await supabase.from("orders").update({ 
          payment_status: newPaymentStatus, 
          paid_amount: newPaidAmount,
          updated_at: new Date().toISOString() 
        }).eq("id", orderId)

        // Use maybeSingle() instead of single() to avoid error when invoice doesn't exist
        const { data: invoiceData } = await supabase.from("invoices").select("*").eq("order_id", orderId).maybeSingle()
        if (!invoiceData) {
          // Ensure profile_id is set - use orders.customer if profile_id is not available
          const orderWithProfileId = { 
            ...orders, 
            profile_id: orders.profile_id || orders.customer,
            id: orderId 
          }
          // Pass the actual tax_amount from the order
          await createInvoice(orderWithProfileId, formData.amount, orders.tax_amount || 0)
        }

        await supabase.from("invoices").update({
          payment_status: newPaymentStatus,
          paid_amount: newPaidAmount,
          updated_at: new Date().toISOString(),
          payment_transication: response.transactionId || "",
          payment_method: paymentType === "credit_card" ? "card" : "ach",
        }).eq("order_id", orderId)

        await OrderActivityService.logPaymentReceived({
          orderId, orderNumber: orders.order_number, amount: formData.amount, paymentMethod: paymentType === "credit_card" ? "card" : "ach", paymentId: response.transactionId, performedByName: customer.name || "Customer", performedByEmail: customer.email,
        })

        // Show success popup with transaction details
        setPaymentResult({
          success: true,
          transactionId: response.transactionId,
          authCode: response.authCode,
          amount: formData.amount,
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
          amount: formData.amount,
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
        amount: formData.amount,
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

  if (!modalIsOpen) return null

  // Helper to safely format amount
  const formatAmount = (amt: number | string) => {
    const num = typeof amt === 'string' ? parseFloat(amt) : amt
    return isNaN(num) ? '0.00' : num.toFixed(2)
  }

  const paymentContent = (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-50 via-white to-slate-100 overflow-auto">
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
                <Lock className="w-4 h-4 text-emerald-600" />
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
              <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <CreditCard className="w-6 h-6" />
                  Payment Method
                </CardTitle>
                <CardDescription className="text-emerald-100">Select how you'd like to pay</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentType("credit_card")}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 relative",
                      paymentType === "credit_card" ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <CreditCard className={cn("w-7 h-7", paymentType === "credit_card" ? "text-emerald-600" : "text-gray-400")} />
                    <span className={cn("font-medium text-sm", paymentType === "credit_card" ? "text-emerald-700" : "text-gray-600")}>Credit Card</span>
                    {paymentType === "credit_card" && <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute top-2 right-2" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("ach")}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 relative",
                      paymentType === "ach" ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <Landmark className={cn("w-7 h-7", paymentType === "ach" ? "text-emerald-600" : "text-gray-400")} />
                    <span className={cn("font-medium text-sm", paymentType === "ach" ? "text-emerald-700" : "text-gray-600")}>Bank (ACH)</span>
                    {paymentType === "ach" && <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute top-2 right-2" />}
                  </button>
                  {sessionStorage.getItem("userType")?.toLowerCase() === "admin" && (
                    <button
                      type="button"
                      onClick={() => setPaymentType("manaul_payemnt")}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 relative",
                        paymentType === "manaul_payemnt" ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <FileText className={cn("w-7 h-7", paymentType === "manaul_payemnt" ? "text-emerald-600" : "text-gray-400")} />
                      <span className={cn("font-medium text-sm", paymentType === "manaul_payemnt" ? "text-emerald-700" : "text-gray-600")}>Manual</span>
                      {paymentType === "manaul_payemnt" && <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute top-2 right-2" />}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Details Form */}
            <form onSubmit={handleSubmit}>
              <Card className="shadow-lg border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {paymentType === "credit_card" && <><CreditCard className="w-5 h-5 text-emerald-600" /> Card Details</>}
                    {paymentType === "ach" && <><Landmark className="w-5 h-5 text-emerald-600" /> Bank Account Details</>}
                    {paymentType === "manaul_payemnt" && <><FileText className="w-5 h-5 text-emerald-600" /> Manual Payment</>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {paymentType === "credit_card" && (
                    <>
                      {/* Card Number */}
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber" className={cn(errors.cardNumber && "text-red-500")}>
                          Card Number {cardType.type !== "unknown" && <span className="text-emerald-600 font-normal">({cardType.name})</span>}
                        </Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">{getCardIcon(cardType)}</div>
                          <Input
                            id="cardNumber"
                            name="cardNumber"
                            placeholder={cardType.type === "amex" ? "3782 822463 10005" : "1234 5678 9012 3456"}
                            value={formatCardNumberByType(formData.cardNumber, cardType)}
                            onChange={handleChange}
                            className={cn("pl-16 h-12 text-lg font-mono tracking-wider", errors.cardNumber && "border-red-500")}
                          />
                          {formData.cardNumber.length > 0 && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              {formData.cardNumber.length}/{cardType.maxLength}
                            </div>
                          )}
                        </div>
                        {errors.cardNumber && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.cardNumber}</p>}
                      </div>

                      {/* Expiry & CVV */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className={cn(errors.expirationDate && "text-red-500")}>Expiration Date</Label>
                          <div className="flex gap-2">
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                              <SelectTrigger className={cn("h-12", errors.expirationDate && "border-red-500")}>
                                <SelectValue placeholder="Month" />
                              </SelectTrigger>
                              <SelectContent className="z-[10000]">
                                {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                              <SelectTrigger className={cn("h-12", errors.expirationDate && "border-red-500")}>
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                              <SelectContent className="z-[10000]">
                                {getYears().map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {errors.expirationDate && <p className="text-sm text-red-500">{errors.expirationDate}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv" className={cn(errors.cvv && "text-red-500")}>
                            {cardType.type === "amex" ? "CID" : "CVV"} ({cardType.cvvLength} digits)
                          </Label>
                          <div className="relative">
                            <Input
                              id="cvv"
                              name="cvv"
                              type="text"
                              inputMode="numeric"
                              placeholder={cardType.cvvLength === 4 ? "1234" : "123"}
                              value={formData.cvv}
                              onChange={handleChange}
                              maxLength={cardType.cvvLength}
                              className={cn("h-12 text-lg font-mono tracking-widest text-center", errors.cvv && "border-red-500")}
                            />
                            {formData.cvv.length > 0 && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                {formData.cvv.length}/{cardType.cvvLength}
                              </div>
                            )}
                          </div>
                          {errors.cvv && <p className="text-sm text-red-500">{errors.cvv}</p>}
                        </div>
                      </div>

                      {/* Cardholder Name */}
                      <div className="space-y-2">
                        <Label htmlFor="cardholderName" className={cn(errors.cardholderName && "text-red-500")}>Cardholder Name</Label>
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

                  {paymentType === "ach" && (
                    <>
                      {/* Account Type */}
                      <div className="space-y-2">
                        <Label>Account Type</Label>
                        <Select 
                          value={formData.accountType} 
                          onValueChange={(v) => setFormData({ ...formData, accountType: v })}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select account type">
                              {formData.accountType === "checking" && "Checking Account"}
                              {formData.accountType === "savings" && "Savings Account"}
                              {formData.accountType === "businessChecking" && "Business Checking"}
                              {!formData.accountType && "Select account type"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="z-[10000]">
                            <SelectItem value="checking">
                              <div className="flex items-center gap-2">
                                <Landmark className="w-4 h-4 text-blue-600" />
                                Checking Account
                              </div>
                            </SelectItem>
                            <SelectItem value="savings">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                Savings Account
                              </div>
                            </SelectItem>
                            <SelectItem value="businessChecking">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-purple-600" />
                                Business Checking
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Routing & Account Numbers */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="routingNumber" className={cn(errors.routingNumber && "text-red-500")}>
                            Routing Number (9 digits)
                          </Label>
                          <div className="relative">
                            <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input 
                              id="routingNumber" 
                              name="routingNumber" 
                              placeholder="123456789" 
                              value={formData.routingNumber} 
                              onChange={handleChange} 
                              maxLength={9} 
                              inputMode="numeric"
                              className={cn("pl-11 h-12 font-mono tracking-wider", errors.routingNumber && "border-red-500")} 
                            />
                            {formData.routingNumber.length > 0 && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                {formData.routingNumber.length}/9
                              </div>
                            )}
                          </div>
                          {errors.routingNumber && <p className="text-sm text-red-500">{errors.routingNumber}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountNumber" className={cn(errors.accountNumber && "text-red-500")}>
                            Account Number
                          </Label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input 
                              id="accountNumber" 
                              name="accountNumber" 
                              placeholder="Enter account number" 
                              value={formData.accountNumber} 
                              onChange={handleChange} 
                              maxLength={17}
                              inputMode="numeric"
                              className={cn("pl-11 h-12 font-mono tracking-wider", errors.accountNumber && "border-red-500")} 
                            />
                          </div>
                          {errors.accountNumber && <p className="text-sm text-red-500">{errors.accountNumber}</p>}
                        </div>
                      </div>

                      {/* Name on Account */}
                      <div className="space-y-2">
                        <Label htmlFor="nameOnAccount" className={cn(errors.nameOnAccount && "text-red-500")}>Name on Account</Label>
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

                      {/* ACH Info Note */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                        <p className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          ACH payments typically take 3-5 business days to process. Your routing and account numbers can be found at the bottom of your checks.
                        </p>
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

              {/* Billing Address - Only for card/ach */}
              {paymentType !== "manaul_payemnt" && (
                <Card className="shadow-lg border-0 mt-6">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      Billing Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address" className={cn(errors.address && "text-red-500")}>Street Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input id="address" name="address" placeholder="123 Main Street" value={formData.address} onChange={handleChange} className={cn("pl-11 h-12", errors.address && "border-red-500")} />
                      </div>
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
                  disabled={loading || formData.amount <= 0} 
                  className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                  ) : (
                    <><Lock className="w-5 h-5 mr-2" />Pay ${formatAmount(formData.amount)}</>
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
                <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
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

                  {/* Amount */}
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-700 font-medium flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Amount Due
                      </span>
                      <span className="text-2xl font-bold text-emerald-700">${formatAmount(formData.amount)}</span>
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
                </CardContent>
              </Card>

              {/* Desktop Submit Button */}
              <div className="hidden lg:block">
                <Button 
                  type="button" 
                  disabled={loading || formData.amount <= 0} 
                  onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} 
                  className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing Payment...</>
                  ) : (
                    <><Lock className="w-5 h-5 mr-2" />Pay ${formatAmount(formData.amount)}</>
                  )}
                </Button>
              </div>

              {/* Security Info */}
              <Card className="border-0 bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center gap-6 mb-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs">SSL Secured</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Lock className="w-5 h-5 text-emerald-600" />
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
