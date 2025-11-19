"use client"

import { useEffect, useState } from "react"
import Modal from "react-modal"
import axios from "../../axiosconfig"
import {
  CreditCard,
  Landmark,
  User,
  Hash,
  MapPin,
  Building,
  Globe,
  DollarSign,
  Calendar,
  KeyRound,
  Loader2,
  Receipt
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { useOrderManagement } from "./orders/hooks/useOrderManagement"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

Modal.setAppElement(document.getElementById("body"))

function validateCardNumber(cardNumber) {
  // Remove spaces and non-numeric characters
  const cleaned = cardNumber.replace(/\D/g, "")

  // Most cards have 16 digits, Amex has 15
  const isValidLength = cleaned.length === 16 || cleaned.length === 15

  if (!isValidLength) {
    return "Card number must be 15-16 digits"
  }

  return null
}

function validateCVV(cvv, expectedLength = 3) {
  const cleaned = cvv.replace(/\D/g, "")

  if (cleaned.length !== expectedLength) {
    return `CVV must be ${expectedLength} digits`
  }

  return null
}

function validateCardholderName(name) {
  if (!name || name.trim().length < 3) {
    return "Cardholder name must be at least 3 characters"
  }
  return null
}

function validateExpirationDate(date) {
  if (!date) return "Expiration date is required"

  // Check format
  if (!date.match(/^\d{2}\/\d{2}$/)) {
    return "Expiration date must be in MM/YY format"
  }

  const [month, year] = date.split("/")
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear() % 100 // Get last two digits
  const currentMonth = currentDate.getMonth() + 1 // January is 0

  // Convert to numbers
  const monthNum = Number.parseInt(month, 10)
  const yearNum = Number.parseInt(year, 10)

  // Validate month
  if (monthNum < 1 || monthNum > 12) {
    return "Invalid month"
  }

  // Check if card is expired
  if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
    return "Card has expired"
  }

  return null
}

function validateAddress(address) {
  if (!address || address.trim().length < 5) {
    return "Address must be at least 5 characters"
  }
  return null
}

function validateCity(city) {
  if (!city || city.trim().length < 2) {
    return "City name is required"
  }
  return null
}

function validateState(state) {
  if (!state || state.trim().length < 2) {
    return "State is required"
  }
  return null
}

function validateZip(zip) {
  // Basic US zip code validation
  if (!zip || !zip.match(/^\d{5}(-\d{4})?$/)) {
    return "Enter a valid ZIP code (e.g., 12345 or 12345-6789)"
  }
  return null
}

function validateCountry(country) {
  if (!country || country.trim().length < 2) {
    return "Country is required"
  }
  return null
}

function validateRoutingNumber(number) {
  // US routing numbers are 9 digits
  if (!number || !number.match(/^\d{9}$/)) {
    return "Routing number must be 9 digits"
  }
  return null
}

function validateAccountNumber(number) {
  // Account numbers are typically 8-12 digits
  if (!number || !number.match(/^\d{8,17}$/)) {
    return "Account number must be 8-17 digits"
  }
  return null
}

function validateNotes(notes) {
  if (!notes || notes.trim().length < 5) {
    return "Please provide payment details (minimum 5 characters)"
  }
  return null
}

function detectCardType(cardNumber) {
  const cleaned = cardNumber.replace(/\D/g, "")

  // Visa: starts with 4
  if (/^4/.test(cleaned)) {
    return { type: "visa", name: "Visa", cvvLength: 3 }
  }

  // Mastercard: starts with 5 or 2221-2720
  if (/^5[1-5]/.test(cleaned) || /^2(22[1-9]|2[3-9]|[3-6]|7[0-1]|720)/.test(cleaned)) {
    return { type: "mastercard", name: "Mastercard", cvvLength: 3 }
  }

  // American Express: starts with 34 or 37
  if (/^3[47]/.test(cleaned)) {
    return { type: "amex", name: "American Express", cvvLength: 4 }
  }

  return { type: "unknown", name: "Credit Card", cvvLength: 3 }
}

function getCardIcon(cardType) {
  switch (cardType.type) {
    case "visa":
      return (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-6 bg-blue-600 text-white text-xs font-bold flex items-center justify-center rounded">
          VISA
        </div>
      )
    case "mastercard":
      return (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-6 flex items-center justify-center">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <div className="w-2 h-2 bg-yellow-500 rounded-full -ml-1"></div>
        </div>
      )
    case "amex":
      return (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-6 bg-blue-500 text-white text-xs font-bold flex items-center justify-center rounded">
          AMEX
        </div>
      )
    default:
      return <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
  }
}

const PaymentForm = ({ modalIsOpen, setModalIsOpen, customer, amountP, orderId, orders, payNow = false }) => {
  const [paymentType, setPaymentType] = useState("credit_card")
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const [cardType, setCardType] = useState({ type: "unknown", name: "Credit Card", cvvLength: 3 })

console.log(  orders
)
  const [formData, setFormData] = useState({
    amount: 0,
    cardNumber: "",
    expirationDate: "",
    cvv: "",
    cardholderName: "",
    accountType: "",
    routingNumber: "",
    accountNumber: "",
    nameOnAccount: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    notes: "",
  })



  const [selectedMonth, setSelectedMonth] = useState("")
const [selectedYear, setSelectedYear] = useState("")

useEffect(() => {
  if (selectedMonth && selectedYear) {
    const expiration = `${selectedMonth}/${selectedYear.slice(2)}` // Format MM/YY
    setFormData((prev) => ({
      ...prev,
      expirationDate: expiration,
    }))
  }
}, [selectedMonth, selectedYear])



useEffect(() => {
  if (formData.expirationDate) {
    const [mm, yy] = formData.expirationDate.split("/")
    setSelectedMonth(mm)
    setSelectedYear("20" + yy) // Assuming format is MM/YY
  }
}, [])











const getYears = (range = 10) => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: range }, (_, i) => currentYear + i)
}

const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]






  const [errors, setErrors] = useState({
    cardNumber: null,
    cvv: null,
    expirationDate: null,
    cardholderName: null,
    address: null,
    city: null,
    state: null,
    zip: null,
    country: null,
    routingNumber: null,
    accountNumber: null,
    nameOnAccount: null,
    notes: null,
  })

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
        email: customer.email || "",
        phone: customer.phone || "",
        amount: amountP || 0,
      }))
    }
  }, [customer])
  console.log(orders)
  const handleChange = (e) => {
    const { name, value } = e.target

    // Clear error when user starts typing
    setErrors({
      ...errors,
      [name]: null,
    })

    if (name === "expirationDate") {
      let formattedValue = value.replace(/[^0-9]/g, "")

      // Add separator after month (after 2 digits)
      if (formattedValue.length > 2) {
        formattedValue = formattedValue.slice(0, 2) + "/" + formattedValue.slice(2)
      }

      // Limit to MM/YY format (5 characters total)
      if (formattedValue.length <= 5) {
        setFormData({ ...formData, [name]: formattedValue })
      }
    } else if (name === "cardNumber") {
      // Only allow numbers and limit to 16 digits
      const formattedValue = value.replace(/\D/g, "").slice(0, 16)
      setFormData({ ...formData, [name]: formattedValue })

      // Detect card type
      const detectedCardType = detectCardType(formattedValue)
      setCardType(detectedCardType)
    } else if (name === "cvv") {
      // Only allow numbers and limit based on card type
      const formattedValue = value.replace(/\D/g, "").slice(0, cardType.cvvLength)
      setFormData({ ...formData, [name]: formattedValue })
    } else if (name === "zip") {
      // Allow only numbers and hyphen for ZIP codes
      const formattedValue = value.replace(/[^0-9-]/g, "").slice(0, 10)
      setFormData({ ...formData, [name]: formattedValue })
    } else if (name === "routingNumber" || name === "accountNumber") {
      // Only allow numbers for banking information
      const formattedValue = value.replace(/\D/g, "")
      setFormData({ ...formData, [name]: formattedValue })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value })
  }

  useEffect(() => {
    console.log("Current payment type:", paymentType)
  }, [paymentType])

  const handleSubmit = async (e) => {
    e.preventDefault()

    
    // Initialize validation errors
    const newErrors = {}
    let hasErrors = false

    // Validate fields based on payment type
    if (paymentType === "credit_card") {
      newErrors.cardNumber = validateCardNumber(formData.cardNumber)
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

    // Check if there are any validation errors
    for (const key in newErrors) {
      if (newErrors[key]) {
        hasErrors = true
        break
      }
    }

    // Update errors state
    setErrors(newErrors)

    // If any errors, don't proceed
    if (hasErrors) {
      return
    }

    setLoading(true)

    if (paymentType === "manaul_payemnt") {
      const { data: dateOrder, error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          notes: formData.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select("*")
        .maybeSingle()

      if (updateError) throw updateError

      const { data, error } = await supabase
        .from("invoices")
        .update({
          payment_status: "paid",
          updated_at: new Date().toISOString(),
          payment_method: "manual",
          payment_notes: formData.notes,
        })
        .eq("order_id", orderId)
        .select("*")

      if (error) {
        console.error("Error creating invoice:", error)
        throw error
      }

      console.log("Invoice created successfully:", data)
      setModalIsOpen(false)
      toast({
        title: "Payment Successful",
        description: "",
      })


      const logsData = {
        user_id: orders.customer,
        order_id: orders.order_number,
        action: 'payment_success',
        details: {
          message: `Payment Successful For: ${orders.order_number}, manaul_payemnt, Note:- ${formData.notes}`,

        },
      };
      try {
        await axios.post("/logs/create", logsData);
        console.log("LOGS STORED SUCCESSFULLYY");
      } catch (apiError) {
        console.error("Failed to store logs:", apiError);
      }
      window.location.reload()

      return
    }

    const { data, error } = await supabase.from("invoices").select("*").eq("order_id", orderId).single()

    const paymentData =
      paymentType === "credit_card"
        ? {
          paymentType,
          amount: formData.amount,
          cardNumber: formData.cardNumber,
          expirationDate: formData.expirationDate,
          cvv: formData.cvv,
          cardholderName: formData.cardholderName,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          country: formData.country,
          invoiceNumber: data.invoice_number,
        }
        : {
          paymentType,
          amount: formData.amount,
          accountType: formData.accountType,
          routingNumber: formData.routingNumber,
          accountNumber: formData.accountNumber,
          nameOnAccount: formData.nameOnAccount,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          country: formData.country,
          invoiceNumber: data.invoice_number,
        }

    try {
      const response = await axios.post("/pay", paymentData)

      if (response.status === 200) {
        const { data: dateOrder, error: updateError } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .select("*")
          .maybeSingle()

        if (updateError) throw updateError

        try {
          const response2 = await axios.post("/pay-successfull", {
            name: customer.name || "N/A",
            email: customer.email,
            orderNumber: dateOrder.order_number,
            transactionId: response?.data.transactionId || "1234",
          })

          console.log("Payment Successful:", response2.data)
        } catch (error) {
          console.error("Error in user verification:", error.response?.data || error.message)
        }

        const { data, error } = await supabase
          .from("invoices")
          .update({
            payment_status: "paid",
            updated_at: new Date().toISOString(),
            payment_transication: response?.data?.transactionId || "",
            payment_method: "card",
          })
          .eq("order_id", orderId)

        if (error) {
          console.error("Error creating invoice:", error)
          throw error
        }

        console.log("Invoice created successfully:", data)

        if (payNow) {
          navigate("/pharmacy/orders")
        }

        setModalIsOpen(false)
        toast({
          title: "Payment Successful",
          description: response.data.message,
        })


        const logsData = {
          user_id: orders.customer,
          order_id: orders.order_number,
          action: 'payment_success',
          details: {
            message: `Payment Successful For: ${orders.order_number}, Credit Card, Transaction Id:- ${response?.data?.transactionId}`,

          },
        };
        try {
          await axios.post("/logs/create", logsData);
          console.log("LOGS STORED SUCCESSFULLYY");
        } catch (apiError) {
          console.error("Failed to store logs:", apiError);
        }
        window.location.reload()

        setTimeout(() => {
          if (payNow) {
            navigate("/pharmacy/orders")
          }
        }, 500)
      } else {
        console.log(response)
        setLoading(false)
      }
    } catch (error) {
      setLoading(false)
      console.log(error)


      const logsData = {
        user_id: orders.customer,
        order_id: orders.order_number,
        action: 'payment_failed',
        details: {
          message: `Payment Failed For: ${orders.order_number}, Credit Card, Error Code:- ${error?.response.data.errocode}`,

        },
      };
      try {
        await axios.post("/logs/create", logsData);
        console.log("LOGS STORED SUCCESSFULLYY");
      } catch (apiError) {
        console.error("Failed to store logs:", apiError);
      }
      toast({
        title: "Payment failed",
        description: error.response.data.message || "Failed ",
        variant: "destructive",
      })
    }
  }
  console.log(orders)
  return (
    <div className="flex justify-center items-center min-h-screen z-[99999]">
      <Modal
        isOpen={modalIsOpen}
        shouldCloseOnOverlayClick={false}
        onRequestClose={() => setModalIsOpen(false)}
        className="bg-white p-0 rounded-lg shadow-xl w-[450px] mx-auto mt-20 z-[99] max-h-[85vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[99] pointer-events-auto"
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 rounded-full h-8 w-8"
              onClick={() => setModalIsOpen(false)}
            >
              <span className="sr-only">Close</span>✕
            </Button>
            <CardTitle className="text-xl font-semibold">Make a Payment</CardTitle>
            <CardDescription>Complete your payment securely</CardDescription>
          </CardHeader>

          <CardContent className="px-6">
            <div className="mb-4">
              <Label htmlFor="paymentType">Payment Method</Label>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 w-full max-w-md space-y-4">
      <h4 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-indigo-600" />
        Payment Summary
      </h4>

      <div className="flex items-center justify-between text-sm text-gray-700">
        <span className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-500" />
          Amount Due:
        </span>
        <span className="font-medium">${formData.amount}</span>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-700">
        <span className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-blue-500" />
          Order Number:
        </span>
        <span className="font-medium">{orders?.order_number || "N/A"}</span>
      </div>
    </div>
              <div className="mt-1">
                <select
                  id="paymentType"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="credit_card">Credit Card</option>
                  {sessionStorage.getItem("userType")?.toLocaleLowerCase() === "admin" && (
                    <option value="manaul_payemnt">Manual Payment</option>
                  )}
                  {/* <option value="ach">Bank Transfer</option> */}
                </select>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="amount"
                    type="number"
                    name="amount"
                    readOnly
                    value={formData.amount}
                    className="pl-9 cursor-not-allowed bg-gray-50"
                  />
                </div>
              </div> */}

              {paymentType === "credit_card" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber" className={cn(errors.cardNumber && "text-destructive")}>
                      Card Number ({cardType.name})
                    </Label>
                    <div className="relative">
                      {getCardIcon(cardType)}
                      <Input
                        id="cardNumber"
                        type="text"
                        name="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber}
                        onChange={handleChange}
                        className={cn("pl-9", errors.cardNumber && "border-destructive focus-visible:ring-destructive")}
                        required
                      />
                    </div>
                    {errors.cardNumber && <p className="text-sm font-medium text-destructive">{errors.cardNumber}</p>}
                  </div>

                   <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="expirationMonth" className={cn(errors.expirationDate && "text-destructive")}>
          Expiration Month / Year
        </Label>
        <div className="flex gap-2">
          <select
            id="expirationMonth"
            name="expirationMonth"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={cn(
              "w-1/2 rounded border px-2 py-2",
              errors.expirationDate && "border-destructive focus-visible:ring-destructive"
            )}
          >
            <option value="">Month</option>
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>

          <select
            id="expirationYear"
            name="expirationYear"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className={cn(
              "w-1/2 rounded border px-2 py-2",
              errors.expirationDate && "border-destructive focus-visible:ring-destructive"
            )}
          >
            <option value="">Year</option>
            {getYears().map((year) => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
        </div>
        {errors.expirationDate && (
          <p className="text-sm font-medium text-destructive">{errors.expirationDate}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cvv" className={cn(errors.cvv && "text-destructive")}>
          CVV ({cardType.cvvLength} digits)
        </Label>
        <div className="relative">
          <input
            id="cvv"
            type="text"
            name="cvv"
            placeholder={cardType.cvvLength === 4 ? "1234" : "123"}
            value={formData.cvv}
            onChange={handleChange}
            className={cn("pl-2 w-full rounded border py-2", errors.cvv && "border-destructive focus:ring-destructive")}
            required
          />
        </div>
        {errors.cvv && <p className="text-sm font-medium text-destructive">{errors.cvv}</p>}
      </div>
    </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardholderName" className={cn(errors.cardholderName && "text-destructive")}>
                      Cardholder Name
                    </Label>
                    <div className="relative">
                      <User
                        className={cn(
                          "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500",
                          errors.cardholderName && "text-destructive",
                        )}
                      />
                      <Input
                        id="cardholderName"
                        type="text"
                        name="cardholderName"
                        placeholder="John Doe"
                        value={formData.cardholderName}
                        onChange={handleChange}
                        className={cn(
                          "pl-9",
                          errors.cardholderName && "border-destructive focus-visible:ring-destructive",
                        )}
                        required
                      />
                    </div>
                    {errors.cardholderName && (
                      <p className="text-sm font-medium text-destructive">{errors.cardholderName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className={cn(errors.address && "text-destructive")}>
                      Address
                    </Label>
                    <div className="relative">
                      <MapPin
                        className={cn(
                          "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500",
                          errors.address && "text-destructive",
                        )}
                      />
                      <Input
                        id="address"
                        type="text"
                        name="address"
                        placeholder="123 Main St"
                        value={formData.address}
                        onChange={handleChange}
                        className={cn("pl-9", errors.address && "border-destructive focus-visible:ring-destructive")}
                        required
                      />
                    </div>
                    {errors.address && <p className="text-sm font-medium text-destructive">{errors.address}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className={cn(errors.city && "text-destructive")}>
                        City
                      </Label>
                      <div className="relative">
                        <Building
                          className={cn(
                            "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500",
                            errors.city && "text-destructive",
                          )}
                        />
                        <Input
                          id="city"
                          type="text"
                          name="city"
                          placeholder="New York"
                          value={formData.city}
                          onChange={handleChange}
                          className={cn("pl-9", errors.city && "border-destructive focus-visible:ring-destructive")}
                          required
                        />
                      </div>
                      {errors.city && <p className="text-sm font-medium text-destructive">{errors.city}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className={cn(errors.state && "text-destructive")}>
                        State
                      </Label>
                      <div className="relative">
                        <Globe
                          className={cn(
                            "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500",
                            errors.state && "text-destructive",
                          )}
                        />
                        <Input
                          id="state"
                          type="text"
                          name="state"
                          placeholder="NY"
                          value={formData.state}
                          onChange={handleChange}
                          className={cn("pl-9", errors.state && "border-destructive focus-visible:ring-destructive")}
                          required
                        />
                      </div>
                      {errors.state && <p className="text-sm font-medium text-destructive">{errors.state}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip" className={cn(errors.zip && "text-destructive")}>
                        ZIP Code
                      </Label>
                      <Input
                        id="zip"
                        type="text"
                        name="zip"
                        placeholder="10001"
                        value={formData.zip}
                        onChange={handleChange}
                        className={cn(errors.zip && "border-destructive focus-visible:ring-destructive")}
                        required
                      />
                      {errors.zip && <p className="text-sm font-medium text-destructive">{errors.zip}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className={cn(errors.country && "text-destructive")}>
                        Country
                      </Label>
                      <Input
                        id="country"
                        type="text"
                        name="country"
                        placeholder="USA"
                        value={formData.country}
                        onChange={handleChange}
                        className={cn(errors.country && "border-destructive focus-visible:ring-destructive")}
                        required
                      />
                      {errors.country && <p className="text-sm font-medium text-destructive">{errors.country}</p>}
                    </div>
                  </div>
                </>
              ) : paymentType === "manaul_payemnt" ? (
                <div className="space-y-2">
                  <Label htmlFor="notes" className={cn(errors.notes && "text-destructive")}>
                    Payment Notes
                  </Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Enter payment details or reference number"
                    value={formData.notes}
                    onChange={handleChange}
                    className={cn("min-h-[100px]", errors.notes && "border-destructive focus-visible:ring-destructive")}
                    required
                  />
                  {errors.notes && <p className="text-sm font-medium text-destructive">{errors.notes}</p>}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select
                      value={formData.accountType}
                      onValueChange={(value) => handleSelectChange("accountType", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="routingNumber" className={cn(errors.routingNumber && "text-destructive")}>
                      Routing Number
                    </Label>
                    <div className="relative">
                      <Landmark
                        className={cn(
                          "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500",
                          errors.routingNumber && "text-destructive",
                        )}
                      />
                      <Input
                        id="routingNumber"
                        type="text"
                        name="routingNumber"
                        placeholder="123456789"
                        value={formData.routingNumber}
                        onChange={handleChange}
                        className={cn(
                          "pl-9",
                          errors.routingNumber && "border-destructive focus-visible:ring-destructive",
                        )}
                        required
                      />
                    </div>
                    {errors.routingNumber && (
                      <p className="text-sm font-medium text-destructive">{errors.routingNumber}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountNumber" className={cn(errors.accountNumber && "text-destructive")}>
                      Account Number
                    </Label>
                    <div className="relative">
                      <Hash
                        className={cn(
                          "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500",
                          errors.accountNumber && "text-destructive",
                        )}
                      />
                      <Input
                        id="accountNumber"
                        type="text"
                        name="accountNumber"
                        placeholder="987654321"
                        value={formData.accountNumber}
                        onChange={handleChange}
                        className={cn(
                          "pl-9",
                          errors.accountNumber && "border-destructive focus-visible:ring-destructive",
                        )}
                        required
                      />
                    </div>
                    {errors.accountNumber && (
                      <p className="text-sm font-medium text-destructive">{errors.accountNumber}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nameOnAccount" className={cn(errors.nameOnAccount && "text-destructive")}>
                      Name on Account
                    </Label>
                    <div className="relative">
                      <User
                        className={cn(
                          "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500",
                          errors.nameOnAccount && "text-destructive",
                        )}
                      />
                      <Input
                        id="nameOnAccount"
                        type="text"
                        name="nameOnAccount"
                        placeholder="John Doe"
                        value={formData.nameOnAccount}
                        onChange={handleChange}
                        className={cn(
                          "pl-9",
                          errors.nameOnAccount && "border-destructive focus-visible:ring-destructive",
                        )}
                        required
                      />
                    </div>
                    {errors.nameOnAccount && (
                      <p className="text-sm font-medium text-destructive">{errors.nameOnAccount}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className={cn(errors.address && "text-destructive")}>
                      Address
                    </Label>
                    <div className="relative">
                      <MapPin
                        className={cn(
                          "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500",
                          errors.address && "text-destructive",
                        )}
                      />
                      <Input
                        id="address"
                        type="text"
                        name="address"
                        placeholder="123 Main St"
                        value={formData.address}
                        onChange={handleChange}
                        className={cn("pl-9", errors.address && "border-destructive focus-visible:ring-destructive")}
                        required
                      />
                    </div>
                    {errors.address && <p className="text-sm font-medium text-destructive">{errors.address}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className={cn(errors.city && "text-destructive")}>
                        City
                      </Label>
                      <div className="relative">
                        <Building
                          className={cn(
                            "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500",
                            errors.city && "text-destructive",
                          )}
                        />
                        <Input
                          id="city"
                          type="text"
                          name="city"
                          placeholder="New York"
                          value={formData.city}
                          onChange={handleChange}
                          className={cn("pl-9", errors.city && "border-destructive focus-visible:ring-destructive")}
                          required
                        />
                      </div>
                      {errors.city && <p className="text-sm font-medium text-destructive">{errors.city}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className={cn(errors.state && "text-destructive")}>
                        State
                      </Label>
                      <div className="relative">
                        <Globe
                          className={cn(
                            "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500",
                            errors.state && "text-destructive",
                          )}
                        />
                        <Input
                          id="state"
                          type="text"
                          name="state"
                          placeholder="NY"
                          value={formData.state}
                          onChange={handleChange}
                          className={cn("pl-9", errors.state && "border-destructive focus-visible:ring-destructive")}
                          required
                        />
                      </div>
                      {errors.state && <p className="text-sm font-medium text-destructive">{errors.state}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip" className={cn(errors.zip && "text-destructive")}>
                        ZIP Code
                      </Label>
                      <Input
                        id="zip"
                        type="text"
                        name="zip"
                        placeholder="10001"
                        value={formData.zip}
                        onChange={handleChange}
                        className={cn(errors.zip && "border-destructive focus-visible:ring-destructive")}
                        required
                      />
                      {errors.zip && <p className="text-sm font-medium text-destructive">{errors.zip}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className={cn(errors.country && "text-destructive")}>
                        Country
                      </Label>
                      <Input
                        id="country"
                        type="text"
                        name="country"
                        placeholder="USA"
                        value={formData.country}
                        onChange={handleChange}
                        className={cn(errors.country && "border-destructive focus-visible:ring-destructive")}
                        required
                      />
                      {errors.country && <p className="text-sm font-medium text-destructive">{errors.country}</p>}
                    </div>
                  </div>
                </>
              )}
            </form>
          </CardContent>

          <CardFooter className="px-6 pb-6 pt-2">
            <Button type="submit" className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </CardFooter>
        </Card>
      </Modal>
    </div>
  )
}

export default PaymentForm
