import { useEffect, useRef, useState } from "react";
import axios from "../../axiosconfig";
import {
  CreditCard,
  Landmark,
  User,
  Hash,
  MapPin,
  Building,
  Globe,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Package,
  Receipt,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Gift,
  Star,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  generateOrderId,
} from "./orders/utils/orderUtils";
import { calculateFinalTotal, calculateSubtotal } from "@/utils/orderCalculations";
import { useCart } from "@/hooks/use-cart";
import { validateOrderItems } from "./orders/form/OrderFormValidation";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { InvoiceStatus } from "./invoices/types/invoice.types";
import { useNavigate } from "react-router-dom";
import { OrderActivityService } from "@/services/orderActivityService";
import { awardOrderPoints, calculateOrderPoints } from "@/services/rewardsService";
import { getSavedPaymentMethods, SavedPaymentMethod, chargeSavedCard, saveCardToProfile, canChargeDirectly } from "@/services/paymentService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CreateOrderPaymentFormProps {
  modalIsOpen: boolean;
  setModalIsOpen: (open: boolean) => void;
  form?: any;
  formDataa: any;
  pId?: string;
  setIsCus?: (val: boolean) => void;
  isCus?: boolean;
  orderTotal?: number;
  orderSubtotal?: number;
  orderTax?: number;
  orderShipping?: number;
  discountAmount?: number;
  discountDetails?: any[];
}

const CreateOrderPaymentForm = ({
  modalIsOpen,
  setModalIsOpen,
  form,
  formDataa,
  pId,
  setIsCus,
  isCus,
  orderTotal,
  orderSubtotal,
  orderTax,
  orderShipping,
  discountAmount = 0,
  discountDetails = [],
}: CreateOrderPaymentFormProps) => {
  const [paymentType, setPaymentType] = useState("credit_card");
  const { toast } = useToast();
  const { cartItems, clearCart } = useCart();
  const userProfile = useSelector(selectUserProfile);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false); // Guard against double submission
  const [tax, settax] = useState(0);
  const taxper = sessionStorage.getItem("taxper");
  const [saveCard, setSaveCard] = useState(false);
  console.log(formDataa,"formDataa")
  // State for saved cards (quick fill), rewards, and success popup
  const [savedCards, setSavedCards] = useState<SavedPaymentMethod[]>([]);
  const [loadingSavedCards, setLoadingSavedCards] = useState(false);
  const [selectedSavedCard, setSelectedSavedCard] = useState<SavedPaymentMethod | null>(null);
  const [estimatedPoints, setEstimatedPoints] = useState(0);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successData, setSuccessData] = useState<{
    orderNumber: string;
    pointsEarned: number;
    newTotal: number;
    tierUpgrade: boolean;
    newTier?: string;
  } | null>(null);

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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalShippingCost =
    sessionStorage.getItem("shipping") == "true"
      ? 0
      : Math.max(...cartItems.map((item) => item.shipping_cost || 0));

  function cleanCartItems(cartItems: any[]) {
    const cleanedItems = cartItems.map((item) => {
      const updatedSizes = item.sizes.map((size: any) => ({
        ...size,
        quantity: Number(size.quantity),
        price: Number(size.price),
      }));

      const updatedPrice = updatedSizes.reduce(
        (sum: number, size: any) => sum + size.quantity * size.price,
        0
      );

      const updatedQuantity = updatedSizes.reduce(
        (sum: number, size: any) => sum + size.quantity,
        0
      );

      return {
        ...item,
        price: parseFloat(updatedPrice.toFixed(2)),
        quantity: updatedQuantity,
        sizes: updatedSizes,
      };
    });

    localStorage.setItem("cartItems", JSON.stringify(cleanedItems));
    return cleanedItems;
  }

  // Fetch saved payment methods
  useEffect(() => {
    const fetchSavedCards = async () => {
      // Use pId (customer ID) if available, otherwise use userProfile.id (for self-checkout)
      const profileIdToUse = pId || userProfile?.id;
      
      if (!profileIdToUse) return;
      
      setLoadingSavedCards(true);
      try {
        const methods = await getSavedPaymentMethods(profileIdToUse);
        setSavedCards(methods);
      } catch (error) {
        console.error("Error fetching saved cards:", error);
      } finally {
        setLoadingSavedCards(false);
      }
    };
    
    fetchSavedCards();
  }, [pId, userProfile?.id]); // Re-fetch when customer changes

  // Calculate estimated reward points
  useEffect(() => {
    const calculatePoints = async () => {
      // Use pId (customer ID) if available, otherwise use userProfile.id
      const targetUserId = pId || userProfile?.id;
      if (!targetUserId || !formData.amount) return;
      
      try {
        const points = await calculateOrderPoints(formData.amount, targetUserId);
        setEstimatedPoints(points);
      } catch (error) {
        console.error("Error calculating points:", error);
      }
    };
    
    calculatePoints();
  }, [formData.amount, userProfile?.id, pId]);

  useEffect(() => {
    const cleanedCartItems = cleanCartItems(cartItems);

    if (formDataa) {
      // Calculate subtotal from cart items
      const subtotal = orderSubtotal || calculateSubtotal(cleanedCartItems);
      const shipping = orderShipping !== undefined ? orderShipping : totalShippingCost;
      const taxAmount = orderTax || 0;
      const discount = Number((discountAmount || 0).toFixed(2));
      
      // Use single source of truth for final total
      const finalTotal = calculateFinalTotal({
        subtotal,
        shipping,
        tax: taxAmount,
        discount,
      });
      
      settax(taxAmount);
      setFormData((prevData) => ({
        ...prevData,
        nameOnAccount: formDataa.customerInfo?.name || "",
        cardholderName: formDataa.customerInfo?.name || "",
        address: formDataa.customerInfo?.address?.street || "",
        city: formDataa.customerInfo?.address?.city || "",
        state: formDataa.customerInfo?.address?.state || "",
        zip: formDataa.customerInfo?.address?.zip_code || "",
        amount: finalTotal,
      }));
    }
  }, [orderTotal, orderSubtotal, orderTax, orderShipping, discountAmount, cartItems, totalShippingCost]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData({ ...formData, cardNumber: formatted });
    if (errors.cardNumber) {
      setErrors({ ...errors, cardNumber: "" });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Skip card validation if using saved card
    if (selectedSavedCard) {
      // Only validate billing address for saved card
      if (!formData.address) newErrors.address = "Address is required";
      if (!formData.city) newErrors.city = "City is required";
      if (!formData.state) newErrors.state = "State is required";
      if (!formData.zip) newErrors.zip = "ZIP code is required";
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    if (paymentType === "credit_card") {
      if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, "").length < 15) {
        newErrors.cardNumber = "Please enter a valid card number";
      }
      if (!formData.expirationDate || formData.expirationDate.length !== 4) {
        newErrors.expirationDate = "Enter expiry as MMYY";
      }
      if (!formData.cvv || formData.cvv.length < 3) {
        newErrors.cvv = "Enter valid CVV";
      }
      if (!formData.cardholderName) {
        newErrors.cardholderName = "Cardholder name is required";
      }
    } else {
      if (!formData.routingNumber || formData.routingNumber.length !== 9) {
        newErrors.routingNumber = "Enter valid 9-digit routing number";
      }
      if (!formData.accountNumber) {
        newErrors.accountNumber = "Account number is required";
      }
      if (!formData.nameOnAccount) {
        newErrors.nameOnAccount = "Name on account is required";
      }
    }

    if (!formData.address) newErrors.address = "Address is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.zip) newErrors.zip = "ZIP code is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting.current) {
      console.warn("⚠️ Payment already in progress, ignoring duplicate submission");
      return;
    }
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      });
      return;
    }

    isSubmitting.current = true;
    setLoading(true);

    const cleanedCartItems = cleanCartItems(cartItems);

    // Generate invoice number for payment reference (before payment processing)
    const { data: invoiceNumber, error: invoiceError } = await supabase.rpc('generate_invoice_number');

    if (invoiceError || !invoiceNumber) {
      console.error("Failed to generate invoice number:", invoiceError);
      toast({
        title: "Error",
        description: "Failed to generate invoice number. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      isSubmitting.current = false;
      return;
    }

    console.log("✅ Generated invoice number:", invoiceNumber);

    try {
      let paymentResponse: any;

      // ============================================
      // OPTION 1: Charge Saved Card (Token-based - no card number needed!)
      // ============================================
      if (selectedSavedCard && canChargeDirectly(selectedSavedCard)) {
        console.log("🔵 Charging saved card:", selectedSavedCard.card_last_four);
        
        const chargeResult = await chargeSavedCard(
          selectedSavedCard,
          formData.amount,
          invoiceNumber
        );

        if (!chargeResult.success) {
          throw new Error(chargeResult.errorMessage || chargeResult.message || "Payment failed");
        }

        paymentResponse = {
          success: true,
          transactionId: chargeResult.transactionId,
          authCode: chargeResult.authCode,
        };
        
        console.log("✅ Saved card charged successfully:", paymentResponse.transactionId);
      } 
      // ============================================
      // OPTION 2: Direct Card/ACH Payment
      // ============================================
      else {
        // Build payment data for Supabase Edge Function
        const nameParts = (paymentType === "credit_card" ? formData.cardholderName : formData.nameOnAccount).split(" ");
        const firstName = nameParts[0] || "Customer";
        const lastName = nameParts.slice(1).join(" ") || "Customer";

        const paymentRequestData = {
          payment: paymentType === "credit_card"
            ? {
                type: "card" as const,
                cardNumber: formData.cardNumber.replace(/\s/g, ""),
                expirationDate: formData.expirationDate,
                cvv: formData.cvv,
                cardholderName: formData.cardholderName,
              }
            : {
                type: "ach" as const,
                accountType: formData.accountType as "checking" | "savings",
                routingNumber: formData.routingNumber,
                accountNumber: formData.accountNumber,
                nameOnAccount: formData.nameOnAccount,
              },
          amount: formData.amount,
          invoiceNumber: invoiceNumber,
          customerEmail: formDataa?.customerInfo?.email || "",
          billing: {
            firstName,
            lastName,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            country: formData.country,
          },
        };

        // Check if user is authenticated before calling the Edge Function
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error("You must be logged in to process payments. Please log in and try again.");
        }

        // Call Supabase Edge Function for payment processing
        const { data: directPaymentResponse, error: paymentError } = await supabase.functions.invoke(
          "process-payment",
          { body: paymentRequestData }
        );

        if (paymentError) {
          throw new Error(paymentError.message || "Payment processing failed");
        }

        if (!directPaymentResponse?.success) {
          throw new Error(directPaymentResponse?.error || "Payment was declined");
        }

        paymentResponse = directPaymentResponse;

        // Save card if user opted to save it (create Authorize.net profile)
        if (saveCard && paymentType === "credit_card" && userProfile?.id && formDataa?.customerInfo?.email) {
          try {
            console.log("🔵 Saving card to Authorize.net profile...");
            // Use pId (customer ID) if available, otherwise use userProfile.id (for self-checkout)
            const profileIdToSave = pId || userProfile.id;
            const saveResult = await saveCardToProfile(
              profileIdToSave,
              formDataa.customerInfo.email,
              formData.cardNumber,
              formData.expirationDate,
              formData.cvv,
              {
                firstName,
                lastName,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zip: formData.zip,
                country: formData.country,
              }
            );

            if (saveResult.success) {
              console.log("✅ Card saved to profile:", saveResult.savedMethodId);
              toast({
                title: "Card Saved",
                description: "Your card has been saved for 1-click payments.",
              });
            } else {
              console.error("Failed to save card:", saveResult.error);
            }
          } catch (saveError) {
            console.error("Error saving card:", saveError);
          }
        }
      }

      // Payment successful - process the order
      const response = { data: paymentResponse };
      await processOrder(response, cleanedCartItems, invoiceNumber);
    } catch (error: any) {
      setLoading(false);
      isSubmitting.current = false;
      
      const errorMessage = error?.message || "Something went wrong. Please try again.";
      
      if (errorMessage.includes("billing address") || error?.errorCode === "27") {
        toast({
          title: "Payment Declined",
          description: "Your billing address does not match your card's registered address. Please verify and try again.",
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
      }
    }
  };

  const processOrder = async (
    response: any,
    cleanedCartItems: any[],
    invoiceNumber: string
  ) => {
    try {
      const data = formDataa;
      validateOrderItems(data.items);

      // Use formData.amount as single source of truth - DO NOT recalculate
      const finalTotal = formData.amount;
      const subtotal = orderSubtotal || calculateSubtotal(cleanedCartItems);
      const shipping = orderShipping !== undefined ? orderShipping : totalShippingCost;
      const discount = Number((discountAmount || 0).toFixed(2));

      if (userProfile?.id == null) {
        toast({
          title: "User profile not found",
          description: "Please log in to create an order.",
          duration: 5000,
          variant: "destructive",
        });
        setLoading(false);
        isSubmitting.current = false;
        return;
      }

      const defaultEstimatedDelivery = new Date();
      defaultEstimatedDelivery.setDate(defaultEstimatedDelivery.getDate() + 10);

      const orderNumber = await generateOrderId();

      let profileID = userProfile?.id;
      if (sessionStorage.getItem("userType") === "admin") {
        profileID = pId || data.customer;
      } else if (sessionStorage.getItem("userType") === "group") {
        profileID = pId;
      }

      const orderData = {
        order_number: orderNumber,
        profile_id: profileID,
        location_id: pId,
        status: data.status || "new",
        total_amount: finalTotal,
        shipping_cost: shipping,
        tax_amount: Number(tax),
        items: cleanedCartItems,
        payment_status: "paid",
        payment_method: "card",
        notes: data.specialInstructions,
        shipping_method: data.shipping?.method,
        customerInfo: data.customerInfo,
        shippingAddress: data.shippingAddress,
        tracking_number: data.shipping?.trackingNumber,
        estimated_delivery: data.shipping?.estimatedDelivery || defaultEstimatedDelivery.toISOString(),
        customization: isCus || false,
        void: false,
        // Add discount information
        discount_amount: discount,
        discount_details: discountDetails || data.appliedDiscounts || [],
      };

      const { data: orderResponse, error: orderError } = await supabase
        .from("orders")
        .insert([orderData])
        .select();

      if (orderError) {
        throw new Error(orderError.message);
      }

      const newOrder = orderResponse[0];

      // Invoice number was already generated before payment processing
      console.log("✅ Using invoice number:", invoiceNumber);

      const estimatedDeliveryDate = new Date(newOrder.estimated_delivery);
      const dueDate = new Date(estimatedDeliveryDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceData = {
        invoice_number: invoiceNumber,
        order_id: newOrder.id,
        due_date: dueDate.toISOString(),
        profile_id: newOrder.profile_id,
        status: "pending" as InvoiceStatus,
        amount: finalTotal,
        tax_amount: Number(tax),
        total_amount: finalTotal,
        payment_status: "paid",
        payment_transication: response.data.transactionId || "",
        payment_method: "card" as const,
        shippin_cost: shipping,
        notes: response.data.authCode 
          ? `${newOrder.notes || ''}\nAuth Code: ${response.data.authCode}`.trim()
          : newOrder.notes || null,
        items: newOrder.items || [],
        customer_info: newOrder.customerInfo || {
          name: (newOrder.customerInfo as any)?.name,
          email: (newOrder.customerInfo as any)?.email || "",
          phone: (newOrder.customerInfo as any)?.phone || "",
        },
        shipping_info: orderData.shippingAddress || {},
        subtotal: subtotal,
        // Add discount information
        discount_amount: discount,
        discount_details: discountDetails || [],
      };

      let finalInvoiceData;
      let finalInvoiceNumber = invoiceNumber;

      // Robust retry loop for invoice insertion to handle out-of-sync counters
      const MAX_INVOICE_RETRIES = 5;
      let invoiceInserted = false;

      for (let attempt = 0; attempt < MAX_INVOICE_RETRIES; attempt++) {
        const { data: insertedInvoice, error: insertError } = await supabase
          .from("invoices")
          .insert(invoiceData as any)
          .select()
          .single();

        if (!insertError) {
          finalInvoiceData = insertedInvoice;
          invoiceInserted = true;
          break;
        }

        // If duplicate invoice number, generate a new one and retry
        if (insertError.code === '23505' && insertError.message.includes('invoices_invoice_number_key')) {
          console.warn(`⚠️ Duplicate invoice number detected (attempt ${attempt + 1}/${MAX_INVOICE_RETRIES}), generating new one...`);
          
          const { data: newInvoiceNumber, error: newInvoiceError } = await supabase.rpc('generate_invoice_number');
          
          if (newInvoiceError || !newInvoiceNumber) {
            // Fallback: generate a unique invoice number using timestamp
            const fallbackNumber = `INV-${new Date().getFullYear()}${Date.now().toString().slice(-8)}`;
            console.warn(`⚠️ RPC failed, using fallback invoice number: ${fallbackNumber}`);
            invoiceData.invoice_number = fallbackNumber;
            finalInvoiceNumber = fallbackNumber;
          } else {
            console.log("✅ Generated new invoice number:", newInvoiceNumber);
            invoiceData.invoice_number = newInvoiceNumber;
            finalInvoiceNumber = newInvoiceNumber;
          }
          // Continue loop to retry insert with new number
        } else {
          // Non-duplicate error, throw immediately
          throw insertError;
        }
      }

      if (!invoiceInserted) {
        // Final fallback: use a guaranteed unique number with UUID suffix
        const uuid = crypto.randomUUID().split('-')[0];
        const emergencyNumber = `INV-${new Date().getFullYear()}${uuid.toUpperCase()}`;
        console.warn(`⚠️ All retry attempts failed, using emergency invoice number: ${emergencyNumber}`);
        invoiceData.invoice_number = emergencyNumber;
        finalInvoiceNumber = emergencyNumber;

        const { data: emergencyInvoice, error: emergencyError } = await supabase
          .from("invoices")
          .insert(invoiceData as any)
          .select()
          .single();

        if (emergencyError) throw emergencyError;
        finalInvoiceData = emergencyInvoice;
      }

      // Log activities with the final invoice data
      await logOrderActivities(newOrder, orderNumber, finalTotal, response, finalInvoiceNumber, finalInvoiceData);

      // Send email notification
      const { data: profileData } = await supabase
        .from("profiles")
        .select()
        .eq("id", newOrder.profile_id)
        .maybeSingle();

      if (profileData?.email_notifaction || profileData?.order_updates ) {
        try {
          await axios.post("/order-place", newOrder);
        } catch (apiError) {
          console.error("Failed to send order notification:", apiError);
        }
      }

      // Save order items
      const orderItemsData = data.items.map((item: any) => ({
        order_id: newOrder.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.quantity * item.price,
        notes: item.notes,
      }));

      await supabase.from("order_items").insert(orderItemsData);

      // Update stock
      await updateProductStock(cleanedCartItems);

      // Mark redeemed rewards as used and apply credit memos
      const appliedDiscounts = discountDetails || data.appliedDiscounts || [];
      console.log("📦 Applied discounts in payment:", appliedDiscounts);
      console.log("📦 Applied discounts length:", appliedDiscounts.length);
      
      if (appliedDiscounts.length > 0) {
        for (const discountItem of appliedDiscounts) {
          console.log("🎁 Processing discount in payment:", discountItem);
          
          // Handle reward points redemption (deduct points)
          if (discountItem.type === "rewards" && discountItem.pointsUsed) {
            console.log("💰 Starting reward points deduction in payment...");
            console.log("💰 User ID:", newOrder.profile_id);
            console.log("💰 Points to deduct:", discountItem.pointsUsed);
            
            try {
              // Fetch current profile
              const { data: currentProfile, error: fetchError } = await supabase
                .from("profiles")
                .select("reward_points, lifetime_reward_points, reward_tier, first_name, last_name, email, company_name, type")
                .eq("id", newOrder.profile_id)
                .single();

              if (fetchError) {
                console.error("❌ Error fetching profile for points deduction:", fetchError);
              } else if (currentProfile) {
                console.log("💰 Current points:", currentProfile.reward_points);
                const newPoints = Math.max(0, (currentProfile.reward_points || 0) - discountItem.pointsUsed);
                console.log("💰 New points after deduction:", newPoints);
                
                // Update database
                const { error: updateError } = await supabase
                  .from("profiles")
                  .update({ reward_points: newPoints })
                  .eq("id", newOrder.profile_id);

                if (updateError) {
                  console.error("❌ Error updating profile points:", updateError);
                } else {
                  console.log("✅ Database updated successfully with new points");

                  // Log reward transaction
                  const { error: transactionError } = await supabase
                    .from("reward_transactions")
                    .insert({
                      user_id: newOrder.profile_id,
                      points: -discountItem.pointsUsed,
                      transaction_type: "redeem",
                      description: `Redeemed ${discountItem.pointsUsed} points for order ${orderNumber}`,
                      reference_type: "order",
                      reference_id: newOrder.id,
                    });
                  
                  if (transactionError) {
                    console.error("❌ Error creating transaction:", transactionError);
                  } else {
                    console.log("✅ Transaction logged successfully");
                  }
                  
                  console.log(`✅ Deducted ${discountItem.pointsUsed} points from user ${newOrder.profile_id}`);
                }
              }
            } catch (error) {
              console.error("❌ Error in reward points deduction:", error);
            }
          }
          
          if (discountItem.type === "redeemed_reward" && discountItem.redemptionId) {
            console.log("🔄 Marking redemption as used:", discountItem.redemptionId);
            await (supabase as any)
              .from("reward_redemptions")
              .update({ 
                status: "used",
                used_at: new Date().toISOString(),
                used_in_order_id: newOrder.id
              })
              .eq("id", discountItem.redemptionId);
            console.log("✅ Marked reward redemption as used:", discountItem.redemptionId);
          }
          
          // Handle credit memo usage - apply to database
          if (discountItem.type === "credit_memo" && discountItem.creditMemoId) {
            console.log("💳 Applying credit memo:", discountItem.creditMemoId, "Amount:", discountItem.amount);
            const { data: creditMemoResult, error: creditMemoError } = await (supabase as any).rpc('apply_credit_memo', {
              p_credit_memo_id: discountItem.creditMemoId,
              p_order_id: newOrder.id,
              p_amount: discountItem.amount,
              p_applied_by: newOrder.profile_id,
            });
            
            if (creditMemoError) {
              console.error("❌ Error applying credit memo:", creditMemoError);
            } else {
              console.log("✅ Credit memo applied successfully:", creditMemoResult);
            }
          }
        }
      }

      // Note: Card saving is now handled in handleSubmit with Authorize.net Customer Profile

      // Award reward points for the order
      if (newOrder.profile_id && finalTotal > 0) {
        try {
          const rewardResult = await awardOrderPoints(
            newOrder.profile_id,
            newOrder.id,
            finalTotal, // Use final total for points
            orderNumber
          );
          
          // Always show success popup after payment
          setSuccessData({
            orderNumber,
            pointsEarned: rewardResult.success ? rewardResult.pointsEarned : 0,
            newTotal: rewardResult.success ? rewardResult.newTotal : 0,
            tierUpgrade: rewardResult.success ? rewardResult.tierUpgrade : false,
            newTier: rewardResult.success ? rewardResult.newTier?.name : undefined,
          });
          setShowSuccessPopup(true);
          setLoading(false);
          isSubmitting.current = false;
          await clearCart();
          return; // Don't navigate yet, wait for popup
        } catch (rewardError) {
          console.error("Error awarding reward points:", rewardError);
          // Still show success popup even if rewards fail
          setSuccessData({
            orderNumber,
            pointsEarned: 0,
            newTotal: 0,
            tierUpgrade: false,
          });
          setShowSuccessPopup(true);
          setLoading(false);
          isSubmitting.current = false;
          await clearCart();
          return;
        }
      } else {
        // No profile_id or zero total - still show success popup
        setSuccessData({
          orderNumber,
          pointsEarned: 0,
          newTotal: 0,
          tierUpgrade: false,
        });
        setShowSuccessPopup(true);
        setLoading(false);
        isSubmitting.current = false;
        await clearCart();
        return;
      }
    } catch (error) {
      console.error("Order creation error:", error);
      setLoading(false);
      isSubmitting.current = false;
      toast({
        title: "Error Creating Order",
        description: error instanceof Error ? error.message : "There was a problem creating your order.",
        variant: "destructive",
      });
    }
  };

  const logOrderActivities = async (
    newOrder: any,
    orderNumber: string,
    totalAmount: number,
    response: any,
    invoiceNumber: string,
    invoicedata2: any
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userProfileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", session?.user?.id || "")
        .single();

      await OrderActivityService.logOrderCreation({
        orderId: newOrder.id,
        orderNumber: orderNumber,
        totalAmount: totalAmount,
        status: newOrder.status,
        paymentMethod: "card",
        performedBy: session?.user?.id,
        performedByName: userProfileData ? `${userProfileData.first_name} ${userProfileData.last_name}`.trim() : "User",
        performedByEmail: userProfileData?.email,
      });

      await OrderActivityService.logActivity({
        orderId: newOrder.id,
        activityType: "updated",
        description: `Invoice ${invoiceNumber} created for order`,
        performedBy: session?.user?.id,
        performedByName: userProfileData ? `${userProfileData.first_name} ${userProfileData.last_name}`.trim() : "User",
        performedByEmail: userProfileData?.email,
        metadata: {
          invoice_number: invoiceNumber,
          invoice_id: invoicedata2?.id,
          amount: totalAmount,
        },
      });

      await OrderActivityService.logPaymentReceived({
        orderId: newOrder.id,
        orderNumber: orderNumber,
        amount: totalAmount,
        paymentMethod: "card",
        paymentId: response.data.transactionId,
        performedBy: session?.user?.id,
        performedByName: userProfileData ? `${userProfileData.first_name} ${userProfileData.last_name}`.trim() : "User",
        performedByEmail: userProfileData?.email,
      });

      // Log payment transaction in payment_transactions table
      try {
        console.log('💳 Logging payment transaction...');
        const { error: paymentLogError } = await supabase
          .from("payment_transactions")
          .insert({
            profile_id: newOrder.profile_id,
            order_id: newOrder.id,
            amount: totalAmount,
            payment_method_type: "card",
            transaction_id: response.data.transactionId,
            auth_code: response.data.authCode,
            status: "approved",
            transaction_type: "charge",
            currency: "USD",
            raw_response: {
              order_number: orderNumber,
              invoice_number: invoiceNumber,
              customer_name: formDataa.customerInfo?.name,
              items_count: formDataa.items?.length || 0
            }
          });

        if (paymentLogError) {
          console.error('❌ Error logging payment transaction:', paymentLogError);
        } else {
          console.log('✅ Payment transaction logged successfully');
        }
      } catch (paymentLogError) {
        console.error('❌ Failed to log payment transaction:', paymentLogError);
      }

      const logsData = {
        user_id: newOrder.profile_id,
        order_id: orderNumber,
        action: "order_and_payment_success",
        details: {
          message: `Order Created And Payment Successful: ${orderNumber}`,
          items: formDataa.items,
          orderCreateBY: userProfile,
        },
      };
      await axios.post("/logs/create", logsData);
    } catch (activityError) {
      console.error("Failed to log activities:", activityError);
    }
  };

  const updateProductStock = async (cleanedCartItems: any[]) => {
    for (const item of cleanedCartItems) {
      if (item.sizes && item.sizes.length > 0) {
        for (const size of item.sizes) {
          const { data: currentSize, error: fetchError } = await supabase
            .from("product_sizes")
            .select("stock")
            .eq("id", size.id)
            .single();

          if (fetchError || !currentSize) continue;

          const newQuantity = currentSize.stock - size.quantity;

          await supabase
            .from("product_sizes")
            .update({ stock: newQuantity })
            .eq("id", size.id);
        }
      }
    }
  };

  // Calculate actual subtotal from cart items (before discount)
  const actualSubtotal = orderSubtotal || cartItems.reduce((sum, item) => {
    if (item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0) {
      return sum + item.sizes.reduce((sizeSum, size) => {
        return sizeSum + ((size.quantity || 0) * (size.price || 0));
      }, 0);
    }
    return sum + (item.price || 0);
  }, 0);

  if (!modalIsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 to-slate-100 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalIsOpen(false)}
                className="gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Cart
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Secure Checkout</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setModalIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Method Selection */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <CreditCard className="w-6 h-6" />
                  Payment Method
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Choose your preferred payment method
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentType("credit_card")}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                      paymentType === "credit_card"
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <CreditCard className={`w-8 h-8 ${paymentType === "credit_card" ? "text-blue-600" : "text-gray-400"}`} />
                    <span className={`font-medium ${paymentType === "credit_card" ? "text-blue-700" : "text-gray-600"}`}>
                      Credit Card
                    </span>
                    {paymentType === "credit_card" && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500 absolute top-2 right-2" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("ach")}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                      paymentType === "ach"
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Landmark className={`w-8 h-8 ${paymentType === "ach" ? "text-blue-600" : "text-gray-400"}`} />
                    <span className={`font-medium ${paymentType === "ach" ? "text-blue-700" : "text-gray-600"}`}>
                      Bank Transfer (ACH)
                    </span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details Form */}
            <form onSubmit={handleSubmit}>
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {paymentType === "credit_card" ? "Card Details" : "Bank Account Details"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {paymentType === "credit_card" ? (
                    <>
                      {/* Saved Cards Section - Quick Fill */}
                      {savedCards.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-blue-600" />
                            Use Saved Card
                          </Label>
                          <p className="text-xs text-gray-500">
                            {savedCards.some(c => canChargeDirectly(c)) 
                              ? "Select a saved card to pay instantly without entering card details."
                              : "Select a saved card to auto-fill billing address. Enter card number and CVV for security."}
                          </p>
                          <div className="grid gap-2">
                            {savedCards.filter(c => c.method_type === 'card').map((card) => {
                              const canCharge = canChargeDirectly(card);
                              const isSelected = selectedSavedCard?.id === card.id;
                              
                              return (
                                <button
                                  key={card.id}
                                  type="button"
                                  onClick={() => {
                                    if (canCharge) {
                                      // Token-based card - select for direct charge
                                      setSelectedSavedCard(isSelected ? null : card);
                                      if (!isSelected) {
                                        // Clear manual card fields when selecting saved card
                                        setFormData(prev => ({
                                          ...prev,
                                          cardNumber: "",
                                          cvv: "",
                                          cardholderName: `${card.billing_first_name || ''} ${card.billing_last_name || ''}`.trim() || prev.cardholderName,
                                          expirationDate: "",
                                          address: card.billing_address || prev.address,
                                          city: card.billing_city || prev.city,
                                          state: card.billing_state || prev.state,
                                          zip: card.billing_zip || prev.zip,
                                        }));
                                        toast({
                                          title: "Card Selected",
                                          description: `Using ${card.card_type?.toUpperCase()} •••• ${card.card_last_four}. Click Pay to complete.`,
                                        });
                                      }
                                    } else {
                                      // Legacy card - just fill billing info
                                      setSelectedSavedCard(null);
                                      const expiryMonth = card.card_expiry_month?.toString().padStart(2, '0') || '';
                                      const expiryYear = card.card_expiry_year?.toString().slice(-2) || '';
                                      const expirationDate = expiryMonth && expiryYear ? `${expiryMonth}${expiryYear}` : '';
                                      
                                      setFormData(prev => ({
                                        ...prev,
                                        cardholderName: `${card.billing_first_name || ''} ${card.billing_last_name || ''}`.trim() || prev.cardholderName,
                                        expirationDate: expirationDate || prev.expirationDate,
                                        address: card.billing_address || prev.address,
                                        city: card.billing_city || prev.city,
                                        state: card.billing_state || prev.state,
                                        zip: card.billing_zip || prev.zip,
                                      }));
                                      toast({
                                        title: "Billing Info Filled",
                                        description: `Using ${card.card_type?.toUpperCase()} •••• ${card.card_last_four}. Please enter card number and CVV.`,
                                      });
                                    }
                                  }}
                                  className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                                    isSelected 
                                      ? "border-blue-500 bg-blue-50 shadow-md" 
                                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                  }`}
                                >
                                  <div className={`p-2 rounded-lg ${isSelected ? "bg-blue-100" : "bg-gray-100"}`}>
                                    <CreditCard className={`w-5 h-5 ${isSelected ? "text-blue-600" : "text-gray-500"}`} />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className="font-medium text-gray-900">
                                      {card.card_type?.toUpperCase()} •••• {card.card_last_four}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Expires {card.card_expiry_month?.toString().padStart(2, '0')}/{card.card_expiry_year}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {canCharge && (
                                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                        1-Click Pay
                                      </Badge>
                                    )}
                                    {card.is_default && (
                                      <Badge variant="secondary" className="text-xs">Default</Badge>
                                    )}
                                    {isSelected && (
                                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          
                          {/* Show divider only if no card selected for direct charge */}
                          {!selectedSavedCard && (
                            <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                              </div>
                              <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-gray-500">Or enter new card</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Number - Hide when saved card selected */}
                      {!selectedSavedCard && (
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber" className="text-sm font-medium">
                            Card Number
                          </Label>
                          <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="cardNumber"
                              name="cardNumber"
                              placeholder="1234 5678 9012 3456"
                              value={formData.cardNumber}
                              onChange={handleCardNumberChange}
                              maxLength={19}
                              className={`pl-11 h-12 text-lg ${errors.cardNumber ? "border-red-500" : ""}`}
                            />
                          </div>
                          {errors.cardNumber && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              {errors.cardNumber}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Selected Saved Card Display */}
                      {selectedSavedCard && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <CreditCard className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {selectedSavedCard.card_type?.toUpperCase()} •••• {selectedSavedCard.card_last_four}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Ready to charge ${formData.amount.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedSavedCard(null)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Expiry & CVV - Hide when saved card selected */}
                      {!selectedSavedCard && (
                        <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expirationDate" className="text-sm font-medium">
                            Expiry Date
                          </Label>
                          <Input
                            id="expirationDate"
                            name="expirationDate"
                            placeholder="MMYY"
                            value={formData.expirationDate}
                            onChange={handleChange}
                            maxLength={4}
                            className={`h-12 text-lg ${errors.expirationDate ? "border-red-500" : ""}`}
                          />
                          {errors.expirationDate && (
                            <p className="text-sm text-red-500">{errors.expirationDate}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv" className="text-sm font-medium">
                            CVV
                          </Label>
                          <Input
                            id="cvv"
                            name="cvv"
                            placeholder="123"
                            value={formData.cvv}
                            onChange={handleChange}
                            maxLength={4}
                            type="password"
                            className={`h-12 text-lg ${errors.cvv ? "border-red-500" : ""}`}
                          />
                          {errors.cvv && (
                            <p className="text-sm text-red-500">{errors.cvv}</p>
                          )}
                        </div>
                      </div>
                      )}

                      {/* Cardholder Name - Hide when saved card selected */}
                      {!selectedSavedCard && (
                      <div className="space-y-2">
                        <Label htmlFor="cardholderName" className="text-sm font-medium">
                          Cardholder Name
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="cardholderName"
                            name="cardholderName"
                            placeholder="John Doe"
                            value={formData.cardholderName}
                            onChange={handleChange}
                            className={`pl-11 h-12 ${errors.cardholderName ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.cardholderName && (
                          <p className="text-sm text-red-500">{errors.cardholderName}</p>
                        )}
                      </div>
                      )}

                      {/* Save Card Checkbox - Hide when saved card selected */}
                      {!selectedSavedCard && (
                      <div className="flex items-center gap-3 pt-2">
                        <input
                          type="checkbox"
                          id="saveCard"
                          checked={saveCard}
                          onChange={(e) => setSaveCard(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor="saveCard" className="text-sm font-medium cursor-pointer">
                          Save this card for future purchases
                        </Label>
                      </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Account Type */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Account Type</Label>
                        <Select
                          value={formData.accountType}
                          onValueChange={(value) => setFormData({ ...formData, accountType: value })}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking">Checking Account</SelectItem>
                            <SelectItem value="savings">Savings Account</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Routing Number */}
                      <div className="space-y-2">
                        <Label htmlFor="routingNumber" className="text-sm font-medium">
                          Routing Number
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
                            className={`pl-11 h-12 ${errors.routingNumber ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.routingNumber && (
                          <p className="text-sm text-red-500">{errors.routingNumber}</p>
                        )}
                      </div>

                      {/* Account Number */}
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber" className="text-sm font-medium">
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
                            className={`pl-11 h-12 ${errors.accountNumber ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.accountNumber && (
                          <p className="text-sm text-red-500">{errors.accountNumber}</p>
                        )}
                      </div>

                      {/* Name on Account */}
                      <div className="space-y-2">
                        <Label htmlFor="nameOnAccount" className="text-sm font-medium">
                          Name on Account
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="nameOnAccount"
                            name="nameOnAccount"
                            placeholder="John Doe"
                            value={formData.nameOnAccount}
                            onChange={handleChange}
                            className={`pl-11 h-12 ${errors.nameOnAccount ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.nameOnAccount && (
                          <p className="text-sm text-red-500">{errors.nameOnAccount}</p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Billing Address */}
              <Card className="shadow-lg border-0 mt-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Street Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium">
                      Street Address
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="address"
                        name="address"
                        placeholder="123 Main Street"
                        value={formData.address}
                        onChange={handleChange}
                        className={`pl-11 h-12 ${errors.address ? "border-red-500" : ""}`}
                      />
                    </div>
                    {errors.address && (
                      <p className="text-sm text-red-500">{errors.address}</p>
                    )}
                  </div>

                  {/* City & State */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm font-medium">
                        City
                      </Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="city"
                          name="city"
                          placeholder="New York"
                          value={formData.city}
                          onChange={handleChange}
                          className={`pl-11 h-12 ${errors.city ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.city && (
                        <p className="text-sm text-red-500">{errors.city}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-sm font-medium">
                        State
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="state"
                          name="state"
                          placeholder="NY"
                          value={formData.state}
                          onChange={handleChange}
                          className={`pl-11 h-12 ${errors.state ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.state && (
                        <p className="text-sm text-red-500">{errors.state}</p>
                      )}
                    </div>
                  </div>

                  {/* ZIP & Country */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip" className="text-sm font-medium">
                        ZIP Code
                      </Label>
                      <Input
                        id="zip"
                        name="zip"
                        placeholder="10001"
                        value={formData.zip}
                        onChange={handleChange}
                        className={`h-12 ${errors.zip ? "border-red-500" : ""}`}
                      />
                      {errors.zip && (
                        <p className="text-sm text-red-500">{errors.zip}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-sm font-medium">
                        Country
                      </Label>
                      <Input
                        id="country"
                        name="country"
                        placeholder="USA"
                        value={formData.country}
                        onChange={handleChange}
                        className="h-12"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button - Mobile */}
              <div className="lg:hidden mt-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Pay ${formData.amount.toFixed(2)}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Order Summary - Right Side */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Order Summary Card */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gray-50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Receipt className="w-5 h-5 text-blue-600" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Cart Items Preview */}
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {cartItems.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.name || "Product"}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qty: {item.quantity || 1}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          ${(item.price || 0).toFixed(2)}
                        </p>
                      </div>
                    ))}
                    {cartItems.length > 3 && (
                      <p className="text-sm text-gray-500 text-center py-2">
                        +{cartItems.length - 3} more items
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Price Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">${actualSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">
                        {totalShippingCost === 0 ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            FREE
                          </Badge>
                        ) : (
                          `$${totalShippingCost.toFixed(2)}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax ({taxper || 0}%)</span>
                      <span className="font-medium">${tax.toFixed(2)}</span>
                    </div>
                    
                    {/* Show discount if applied */}
                    {discountAmount > 0 && (
                      <>
                        <Separator />
                        {discountDetails && discountDetails.length > 0 ? (
                          discountDetails.map((discount: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-green-600">{discount.name || "Discount"}</span>
                              <span className="font-medium text-green-600">
                                {discount.amount > 0 ? `-$${discount.amount.toFixed(2)}` : "Free Shipping"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600">Discount</span>
                            <span className="font-medium text-green-600">-${discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-blue-600">${formData.amount.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="text-right text-sm text-blue-600">
                        You save: ${discountAmount.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Reward Points Preview */}
                  {estimatedPoints > 0 && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Gift className="w-5 h-5 text-pink-600" />
                          <span className="text-sm font-medium text-gray-700">You'll earn</span>
                        </div>
                        <Badge className="bg-pink-600 text-white">
                          +{estimatedPoints} points
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Submit Button - Desktop */}
              <div className="hidden lg:block">
                <Button
                  type="submit"
                  form="payment-form"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Pay ${formData.amount.toFixed(2)}
                    </>
                  )}
                </Button>
              </div>

              {/* Security Badges */}
              <Card className="border-0 bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2 text-gray-600">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      <span className="text-xs">SSL Secured</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Lock className="w-5 h-5 text-blue-600" />
                      <span className="text-xs">256-bit Encryption</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-3">
                    Your payment information is encrypted and secure. We never store your full card details.
                  </p>
                </CardContent>
              </Card>

              {/* Accepted Cards */}
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="px-3 py-1 bg-white rounded border text-xs font-semibold text-blue-600">VISA</div>
                <div className="px-3 py-1 bg-white rounded border text-xs font-semibold text-red-600">MasterCard</div>
                <div className="px-3 py-1 bg-white rounded border text-xs font-semibold text-blue-800">AMEX</div>
                <div className="px-3 py-1 bg-white rounded border text-xs font-semibold text-orange-600">Discover</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Popup Dialog */}
      <Dialog open={showSuccessPopup} onOpenChange={(open) => {
        if (!open) {
          setShowSuccessPopup(false);
          // Redirect based on user type
          const userType = sessionStorage.getItem("userType");
          if (userType === "admin") {
            navigate("/admin/orders");
          } else if (userType === "group") {
            navigate("/group/orders");
          } else {
            navigate("/pharmacy/orders");
          }
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">Payment Successful!</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-4">
              <p className="text-gray-600">
                Your order <span className="font-semibold text-gray-900">#{successData?.orderNumber}</span> has been placed successfully.
              </p>
              
              {/* Reward Points Earned */}
              {successData?.pointsEarned && successData.pointsEarned > 0 && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                    <span className="text-lg font-bold text-gray-900">Reward Points Earned!</span>
                    <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                  </div>
                  <div className="text-center">
                    <span className="text-4xl font-bold text-pink-600">+{successData.pointsEarned}</span>
                    <span className="text-lg text-gray-600 ml-2">points</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Your new balance: <span className="font-semibold text-pink-600">{successData.newTotal?.toLocaleString()} points</span>
                  </p>
                  
                  {/* Tier Upgrade */}
                  {successData.tierUpgrade && successData.newTier && (
                    <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg p-3 mt-2">
                      <div className="flex items-center justify-center gap-2">
                        <Gift className="w-5 h-5 text-amber-600" />
                        <span className="font-semibold text-amber-800">
                          🎉 Congratulations! You've reached {successData.newTier} status!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              onClick={() => {
                setShowSuccessPopup(false);
                // Redirect based on user type
                const userType = sessionStorage.getItem("userType");
                if (userType === "admin") {
                  navigate("/admin/orders");
                } else if (userType === "group") {
                  navigate("/group/orders");
                } else {
                  navigate("/pharmacy/orders");
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              View My Orders
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setShowSuccessPopup(false);
                // Redirect based on user type
                const userType = sessionStorage.getItem("userType");
                if (userType === "admin") {
                  navigate("/admin/rewards");
                } else if (userType === "group") {
                  navigate("/group/rewards");
                } else {
                  navigate("/pharmacy/rewards");
                }
              }}
              className="w-full"
            >
              <Gift className="w-4 h-4 mr-2" />
              View My Rewards
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateOrderPaymentForm;
