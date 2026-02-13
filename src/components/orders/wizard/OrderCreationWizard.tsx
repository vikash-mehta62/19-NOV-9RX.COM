import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useWizardState } from "./useWizardState";
import { WizardNavigation } from "./WizardNavigation";
import { OrderSummaryCard } from "./OrderSummaryCard";
import { OrderCreationWizardProps, WizardStep, Customer } from "./types";
import { useCart } from "@/hooks/use-cart";
import { CustomerSelectionStep } from "./steps/CustomerSelectionStep";
import { AddressInformationStep } from "./steps/AddressInformationStep";
import { CustomerAndAddressStep } from "./steps/CustomerAndAddressStep";
import { ProductSelectionStep } from "./steps/ProductSelectionStep";
import { ReviewOrderStep } from "./steps/ReviewOrderStep";
import { PaymentConfirmationStep } from "./steps/PaymentConfirmationStep";
import type { BillingAddress, ShippingAddress, PaymentMethod } from "./types";
import { validateStep, ValidationError } from "./validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "./ErrorBoundary";
import { calculateFinalTotal, calculateSubtotal, calculateShipping, calculateTax } from "@/utils/orderCalculations";
import { supabase } from "@/supabaseClient";
import { AddUserModal } from "@/components/users/AddUserModal";
import {
  User,
  MapPin,
  Package,
  FileCheck,
  CreditCard,
} from "lucide-react";
import "./wizard-animations.css";

// Applied discount interface
interface AppliedDiscount {
  type: "promo" | "rewards" | "offer" | "redeemed_reward" | "credit_memo";
  name: string;
  amount: number;
  offerId?: string;
  promoCode?: string;
  pointsUsed?: number;
  redemptionId?: string;
  rewardType?: string;
  creditMemoId?: string;
  // Add item-level discount information
  itemDiscounts?: Map<string, number>; // productId -> discount amount
  discountType?: "percentage" | "flat" | "free_shipping";
  discountValue?: number;
  applicableTo?: string;
}

const OrderCreationWizardComponent = ({
  initialData,
  isEditMode = false,
  isPharmacyMode = false,
  userType = "admin",
  selectedPharmacyId,
  onComplete,
  onCancel,
}: OrderCreationWizardProps) => {
  // Determine total steps based on user type
  const totalSteps = isPharmacyMode || userType === "group" ? 3 : 5;
  const wizardState = useWizardState(totalSteps);
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialData || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialData?.customer || null
  );
  const [billingAddress, setBillingAddress] = useState<BillingAddress | undefined>(
    initialData?.billingAddress
  );
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | undefined>(
    initialData?.shippingAddress
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [poNumber, setPONumber] = useState("");
  const [customerLocations, setCustomerLocations] = useState<any[]>([]);
  // For Admin, terms and accuracy are true by default
  const [termsAccepted, setTermsAccepted] = useState(userType === "admin" ? true : false);
  const [accuracyConfirmed, setAccuracyConfirmed] = useState(userType === "admin" ? true : false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [customerRefreshKey, setCustomerRefreshKey] = useState(0);
  
  // Discount state
  const [appliedDiscounts, setAppliedDiscounts] = useState<AppliedDiscount[]>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);
  
  // Customer free shipping state (from profile)
  const [customerHasFreeShipping, setCustomerHasFreeShipping] = useState(
    initialData?.customer?.freeShipping === true || sessionStorage.getItem("shipping") === "true"
  );
  
  const { cartItems, clearCart, addToCart } = useCart();
  const { toast } = useToast();

  // Load initial data in edit mode or pharmacy mode - only run once
  useEffect(() => {
    const loadInitialData = async () => {
      if (isInitialized) return; // Prevent multiple runs
      
      // For group users, automatically set customer data from selected pharmacy
      if (userType === "group" && selectedPharmacyId) {
        try {
          const pharmacyData = JSON.parse(sessionStorage.getItem("selectedPharmacyData") || "{}");
          if (pharmacyData && pharmacyData.profileData) {
            const profile = pharmacyData.profileData;
            const billingAddr = profile.billing_address || {};
            
            const groupCustomer: Customer = {
              id: profile.id,
              name: profile.first_name || pharmacyData.name || "Customer",
              email: profile.email?.includes('noreply') ? profile.email : profile.email || "customer@example.com",
              phone: profile.mobile_phone || pharmacyData.contact_phone || "",
              type: "Pharmacy",
              company_name: pharmacyData.name,
              billing_address: {
                street: billingAddr.street1 || billingAddr.street || "",
                city: billingAddr.city || "",
                state: billingAddr.state || "",
                zip_code: billingAddr.zip_code || "",
              },
              freeShipping: profile.freeShipping || false,
              tax_percentage: profile.tax_percentage || 0,
            };
            
            setSelectedCustomer(groupCustomer);
            setBillingAddress({
              street: groupCustomer.billing_address?.street || "",
              city: groupCustomer.billing_address?.city || "",
              state: groupCustomer.billing_address?.state || "",
              zip_code: groupCustomer.billing_address?.zip_code || "",
            });
            setShippingAddress({
              fullName: groupCustomer.name,
              email: groupCustomer.email,
              phone: groupCustomer.phone,
              street: groupCustomer.billing_address?.street || "",
              city: groupCustomer.billing_address?.city || "",
              state: groupCustomer.billing_address?.state || "",
              zip_code: groupCustomer.billing_address?.zip_code || "",
            });
            setCustomerHasFreeShipping(groupCustomer.freeShipping || false);
            
            // Fetch locations for group customer
            if (profile.id) {
              const { data: locationsData } = await supabase
                .from("locations")
                .select("*")
                .eq("profile_id", profile.id)
                .order("created_at", { ascending: false });
              if (locationsData) {
                console.log("Group customer locations fetched:", locationsData);
                setCustomerLocations(locationsData);
              }
            }
          }
        } catch (error) {
          console.error("Error loading group customer data:", error);
        }
        setIsInitialized(true);
        return;
      }
      
      // If no initial data provided, just mark as initialized and start at step 1
      if (!initialData) {
        setIsInitialized(true);
        return;
      }
      
      // Set customer
      if (initialData.customer) {
        setSelectedCustomer(initialData.customer);
        
        // Fetch locations for pre-loaded customer
        if (initialData.customer.id) {
          const { data: locationsData } = await supabase
            .from("locations")
            .select("*")
            .eq("profile_id", initialData.customer.id)
            .order("created_at", { ascending: false });
          if (locationsData) {
            console.log("Pre-loaded customer locations fetched:", locationsData);
            setCustomerLocations(locationsData);
          }
        }
      }

      // Set addresses
      if (initialData.billingAddress) {
        setBillingAddress(initialData.billingAddress);
      }
      if (initialData.shippingAddress) {
        setShippingAddress(initialData.shippingAddress);
      }

      // Set payment method
      if (initialData.paymentMethod) {
        setPaymentMethod(initialData.paymentMethod);
      }

      // Set special instructions and PO number
      if (initialData.specialInstructions) {
        setSpecialInstructions(initialData.specialInstructions);
      }
      if (initialData.poNumber) {
        setPONumber(initialData.poNumber);
      }

      // Load cart items (only in edit mode, not pharmacy mode)
      if (isEditMode && initialData.cartItems && initialData.cartItems.length > 0) {
        console.log("Loading cart items:", initialData.cartItems);
        await clearCart();
        
        // Add each item to cart
        for (const item of initialData.cartItems) {
          await addToCart(item);
        }
      }

      // For pharmacy mode or group mode: Start at step 1 (combined Customer+Address step)
      // Customer is pre-filled, they just need to confirm addresses
      if (isPharmacyMode || userType === "group") {
        // Ensure we are at step 1
        if (wizardState.currentStep !== 1) {
          wizardState.goToStep(1);
        }
      } else if (initialData.skipToProducts && 
                 initialData.billingAddress?.street && 
                 initialData.shippingAddress?.street) {
        // Check if we should skip directly to products (step 3)
        // This happens when customer AND COMPLETE addresses are provided (from ViewProfileModal)
        // Only skip if addresses have actual street data
        wizardState.initializeToStep(3, [1, 2]);
      } else if (initialData.customer) {
        // Customer is pre-selected (from ViewProfileModal or edit mode)
        // Mark step 1 as complete and move to step 2 (addresses)
        // This will happen even if skipToProducts is true but addresses are incomplete
        wizardState.initializeToStep(2, [1]);
      }
      // If no customer selected, stay at step 1 (default)
      
      setIsInitialized(true);
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, isPharmacyMode, initialData, isInitialized]); // Run when these change

  // Calculate order totals - memoized to prevent unnecessary recalculations
  // Using single source of truth from orderCalculations utility
  const { subtotal, tax, shipping, total } = useMemo(() => {
    // Calculate subtotal using utility function
    const subtotal = calculateSubtotal(cartItems);
    
    // Get tax rate from sessionStorage (set when customer is selected)
    const taxPer = Number(sessionStorage.getItem("taxper") || 0);
    
    // Check if customer has free shipping from sessionStorage
    const hasFreeShipping = sessionStorage.getItem("shipping") === "true";
    
    // Check if free_shipping reward is applied
    const hasFreeShippingReward = appliedDiscounts.some(
      (d) => d.rewardType === "free_shipping" || d.rewardType === "shipping" ||
             (d.type === "offer" && d.name?.toLowerCase().includes("free shipping"))
    );
    
    // Calculate shipping using utility function
    const shipping = calculateShipping(cartItems, hasFreeShipping || hasFreeShippingReward);
    
    // Calculate tax using utility function
    const tax = calculateTax(subtotal, taxPer);
    
    // Calculate total using single source of truth formula
    // Note: Discount is NOT subtracted here - it's handled separately in totalDiscount state
    const total = calculateFinalTotal({
      subtotal,
      shipping,
      tax,
      discount: 0, // Discount applied separately via totalDiscount
    });
    
    return { subtotal, tax, shipping, total };
  }, [cartItems, appliedDiscounts]);

  // Persist form data whenever key state changes
  useEffect(() => {
    setFormData({
      customer: selectedCustomer,
      customerId: selectedCustomer?.id,
      billingAddress,
      shippingAddress,
      cartItems,
      paymentMethod,
      specialInstructions,
      poNumber,
      termsAccepted,
      accuracyConfirmed,
      subtotal,
      tax,
      shipping,
      total,
      appliedDiscounts,
      totalDiscount,
      finalTotal: Math.max(0, total - totalDiscount),
    });
  }, [
    selectedCustomer,
    billingAddress,
    shippingAddress,
    cartItems,
    paymentMethod,
    specialInstructions,
    poNumber,
    termsAccepted,
    accuracyConfirmed,
    subtotal,
    tax,
    shipping,
    total,
    appliedDiscounts,
    totalDiscount,
  ]);

  // Handle discount changes from OrderSummaryCard
  const handleDiscountChange = useCallback((discounts: AppliedDiscount[], discount: number) => {
    setAppliedDiscounts(discounts);
    setTotalDiscount(discount);
  }, []);

  // Define wizard steps - memoized to prevent recreation on every render
  // For pharmacy mode: Customer info is pre-filled, Products step is skipped (they add from browsing)
  // For group mode: Similar to pharmacy mode but with group-specific labels
  const steps: WizardStep[] = useMemo(() => {
    if (isPharmacyMode || userType === "group") {
      // Pharmacy/Group mode: 3 visible steps - Customer+Address (combined), Review, Payment
      return [
        {
          number: 1,
          label: userType === "group" ? "Pharmacy Info" : "Info & Address",
          icon: User,
          description: userType === "group" ? "Selected pharmacy details" : "Your details",
        },
        {
          number: 2,
          label: "Review",
          icon: FileCheck,
          description: "Verify order",
        },
        {
          number: 3,
          label: "Payment",
          icon: CreditCard,
          description: "Complete",
        },
      ];
    }
    
    // Admin mode: All 5 steps
    return [
      {
        number: 1,
        label: "Customer",
        icon: User,
        description: "Select customer",
      },
      {
        number: 2,
        label: "Address",
        icon: MapPin,
        description: "Billing & shipping",
      },
      {
        number: 3,
        label: "Products",
        icon: Package,
        description: "Add items",
      },
      {
        number: 4,
        label: "Review",
        icon: FileCheck,
        description: "Verify order",
      },
      {
        number: 5,
        label: "Payment",
        icon: CreditCard,
        description: "Complete order",
      },
    ];
  }, [isPharmacyMode, userType]);

  // Step validation with comprehensive error handling
  const validateCurrentStep = async (): Promise<boolean> => {
    // Clear previous validation errors
    setValidationErrors([]);

    const validationData = {
      customer: selectedCustomer,
      billingAddress,
      shippingAddress,
      cartItems,
      paymentMethod,
      termsAccepted,
      accuracyConfirmed,
    };

    const result = await validateStep(wizardState.currentStep, validationData);

    if (!result.isValid) {
      setValidationErrors(result.errors);
      
      // Show toast notification for validation errors
      toast({
        title: "Validation Error",
        description: `Please fix ${result.errors.length} error${
          result.errors.length > 1 ? "s" : ""
        } before continuing`,
        variant: "destructive",
      });

      // Scroll to top to show error messages
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return result.isValid;
  };

  // Handle customer selection - memoized to prevent recreation
  const handleCustomerSelect = useCallback(async (customer: Customer) => {
    console.log("Customer selected:", customer);
    console.log("Customer ID:", customer.id);
    
    setSelectedCustomer(customer);
    
    // Fetch locations for this customer from locations table
    try {
      const { data: locationsData, error: locationsError } = await supabase
        .from("locations")
        .select("*")
        .eq("profile_id", customer.id)
        .order("created_at", { ascending: false });

      if (!locationsError && locationsData) {
        console.log("Customer locations fetched:", locationsData);
        setCustomerLocations(locationsData);
      } else {
        console.log("No locations found or error:", locationsError);
        setCustomerLocations([]);
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
      setCustomerLocations([]);
    }
    
    // Set tax percentage in sessionStorage (purane code ke according)
    const taxPercentage = customer.tax_percentage || 0;
    sessionStorage.setItem("taxper", taxPercentage.toString());
    
    // Set free shipping in sessionStorage (purane code ke according)
    const hasFreeShipping = customer.freeShipping === true;
    sessionStorage.setItem("shipping", hasFreeShipping.toString());
    setCustomerHasFreeShipping(hasFreeShipping);
    
    // Autofill billing address from customer data if available
    if (customer.billing_address && Object.keys(customer.billing_address).length > 0) {
      const billingAddr: BillingAddress = {
        company_name: customer.company_name || "",
        attention: "",
        street: customer.billing_address.street1 || customer.billing_address.street || "",
        city: customer.billing_address.city || "",
        state: customer.billing_address.state || "",
        zip_code: customer.billing_address.zip_code || "",
      };
      setBillingAddress(billingAddr);
    }
    
    // Autofill shipping address from customer data if available
    if (customer.shipping_address && Object.keys(customer.shipping_address).length > 0) {
      const shippingAddr: ShippingAddress = {
        fullName: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        street: customer.shipping_address.street1 || customer.shipping_address.street || "",
        city: customer.shipping_address.city || "",
        state: customer.shipping_address.state || "",
        zip_code: customer.shipping_address.zip_code || "",
      };
      setShippingAddress(shippingAddr);
    } else {
      // If no shipping address, prefill with customer contact info
      setShippingAddress({
        fullName: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        street: "",
        city: "",
        state: "",
        zip_code: "",
      });
    }
    
    setFormData((prev) => ({
      ...prev,
      customer,
      customerId: customer.id,
    }));

    // Admin mode: Auto-navigate to Address step after customer selection
    if (!isPharmacyMode && userType !== "group") {
      // Mark step 1 as complete and go to step 2 (Address)
      setTimeout(() => {
        wizardState.markStepComplete(1);
        wizardState.goToStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 300);
    }
  }, [isPharmacyMode, userType, wizardState]);

  // Handle add new customer - memoized
  const handleAddNewCustomer = useCallback(() => {
    setAddCustomerModalOpen(true);
  }, []);

  const handleCustomerAdded = useCallback(() => {
    setAddCustomerModalOpen(false);
    setCustomerRefreshKey((prev) => prev + 1);
    toast({ title: "Customer added", description: "Refresh complete. Select the new customer." });
  }, [toast]);

  // Handle billing address change - memoized
  const handleBillingAddressChange = useCallback((address: BillingAddress) => {
    setBillingAddress(address);
    setFormData((prev) => ({
      ...prev,
      billingAddress: address,
    }));
  }, []);

  // Handle shipping address change - memoized
  const handleShippingAddressChange = useCallback((address: ShippingAddress) => {
    setShippingAddress(address);
    setFormData((prev) => ({
      ...prev,
      shippingAddress: address,
    }));
  }, []);

  // Handle payment method change - memoized
  const handlePaymentMethodChange = useCallback((method: PaymentMethod) => {
    setPaymentMethod(method);
    setFormData((prev) => ({
      ...prev,
      paymentMethod: method,
    }));
  }, []);

  // Handle special instructions change - memoized
  const handleSpecialInstructionsChange = useCallback((instructions: string) => {
    setSpecialInstructions(instructions);
    setFormData((prev) => ({
      ...prev,
      specialInstructions: instructions,
    }));
  }, []);

  // Handle PO number change - memoized
  const handlePONumberChange = useCallback((po: string) => {
    setPONumber(po);
    setFormData((prev) => ({
      ...prev,
      poNumber: po,
    }));
  }, []);

  const handleContinue = useCallback(async () => {
    // Validate current step before proceeding
    const isValid = await validateCurrentStep();
    
    if (!isValid) {
      return;
    }

    // Clear validation errors on successful validation
    setValidationErrors([]);

    if (wizardState.currentStep === totalSteps) {
      // Last step - handle payment based on payment method
      setIsSubmitting(true);
      try {
        // Calculate final total with discounts
        const finalTotal = Math.max(0, total - totalDiscount);
        
        // Prepare final order data
        const orderData = {
          ...formData,
          customer: selectedCustomer,
          customerId: selectedCustomer?.id,
          billingAddress,
          shippingAddress,
          cartItems,
          paymentMethod,
          specialInstructions,
          poNumber,
          termsAccepted,
          accuracyConfirmed,
          subtotal,
          tax,
          shipping,
          total: finalTotal,
          originalTotal: total,
          appliedDiscounts,
          totalDiscount,
          createdAt: new Date().toISOString(),
        };

        console.log("Final order data being sent:", orderData);
        console.log("Selected customer ID:", selectedCustomer?.id);
        console.log("Customer ID in orderData:", orderData.customerId);
        console.log("Payment method:", paymentMethod);

        // Handle different payment methods
        if (paymentMethod === "card") {
          // For credit card payments, redirect to payment page
          console.log("Credit card payment selected - should redirect to payment page");
          
          // Store order data in sessionStorage for payment page
          sessionStorage.setItem("pendingOrderData", JSON.stringify(orderData));
          
          // Mark final step as complete
          wizardState.markStepComplete(totalSteps);
          
          toast({
            title: "Redirecting to Payment",
            description: "Please complete your payment to finalize the order",
          });

          // Call onComplete with payment redirect flag
          onComplete?.({
            ...orderData,
            requiresPayment: true,
            paymentMethod: "card"
          });
          
        } else if (paymentMethod === "credit" || paymentMethod === "manual") {
          // For credit account or manual payment, create order directly
          console.log(`${paymentMethod} payment selected - creating order directly`);
          
          // Note: Actual order submission is handled by the parent component (CreateOrder.tsx)
          // This simulates processing time for better UX
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          // Mark final step as complete
          wizardState.markStepComplete(totalSteps);
          
          toast({
            title: "Order Placed Successfully",
            description: `Your order has been submitted with ${paymentMethod} payment`,
          });

          onComplete?.(orderData);
        } else {
          // Default case - create order directly
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          // Mark final step as complete
          wizardState.markStepComplete(totalSteps);
          
          toast({
            title: "Order Placed Successfully",
            description: "Your order has been submitted and is being processed",
          });

          onComplete?.(orderData);
        }
      } catch (error) {
        console.error("Order submission error:", error);
        toast({
          title: "Order Submission Failed",
          description: error instanceof Error ? error.message : "An error occurred while submitting your order",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Pharmacy mode has 3 steps, Admin mode has 5 steps
      // Just move to next step normally
      wizardState.goToNextStep();
      
      // Scroll to top of page for next step
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [validateCurrentStep, wizardState, totalSteps, formData, selectedCustomer, billingAddress, shippingAddress, cartItems, paymentMethod, specialInstructions, poNumber, termsAccepted, accuracyConfirmed, subtotal, tax, shipping, total, totalDiscount, appliedDiscounts, toast, onComplete, isPharmacyMode]);

  const handleBack = useCallback(() => {
    // Clear validation errors when going back
    setValidationErrors([]);
    
    // Just go to previous step - both modes work the same now
    wizardState.goToPreviousStep();
    
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [wizardState, isPharmacyMode]);

  const handleCancel = useCallback(() => {
    const hasData = 
      selectedCustomer || 
      billingAddress?.street || 
      shippingAddress?.street || 
      cartItems.length > 0 ||
      specialInstructions ||
      poNumber;

    if (hasData) {
      if (window.confirm("Are you sure you want to cancel? All progress will be lost.")) {
        onCancel?.();
      }
    } else {
      onCancel?.();
    }
  }, [selectedCustomer, billingAddress, shippingAddress, cartItems, specialInstructions, poNumber, onCancel]);

  // Determine if current step can proceed
  const canProceedFromCurrentStep = (): boolean => {
    // Pharmacy mode has different step validation
    if (isPharmacyMode) {
      switch (wizardState.currentStep) {
        case 1:
          // Combined Customer + Address step - both addresses must be filled
          return !!(
            billingAddress?.street &&
            billingAddress?.city &&
            billingAddress?.state &&
            billingAddress?.zip_code &&
            shippingAddress?.street &&
            shippingAddress?.city &&
            shippingAddress?.state &&
            shippingAddress?.zip_code &&
            shippingAddress?.fullName &&
            shippingAddress?.email &&
            shippingAddress?.phone
          );
        case 2:
          // Review step - cart must have items
          return cartItems.length > 0;
        case 3:
          // Payment step
          return !!(paymentMethod && termsAccepted && accuracyConfirmed);
        default:
          return false;
      }
    }
    
    // Admin mode validation
    switch (wizardState.currentStep) {
      case 1:
        // Customer must be selected
        return !!selectedCustomer && !!selectedCustomer.id && !!selectedCustomer.email;
      case 2:
        // Both addresses must have required fields
        return !!(
          billingAddress?.street &&
          billingAddress?.city &&
          billingAddress?.state &&
          billingAddress?.zip_code &&
          shippingAddress?.street &&
          shippingAddress?.city &&
          shippingAddress?.state &&
          shippingAddress?.zip_code &&
          shippingAddress?.fullName &&
          shippingAddress?.email &&
          shippingAddress?.phone
        );
      case 3:
        // At least one product must be in cart
        return cartItems.length > 0;
      case 4:
        // Review step - all previous data should be present
        return !!(
          selectedCustomer &&
          billingAddress?.street &&
          shippingAddress?.street &&
          cartItems.length > 0
        );
      case 5:
        // Payment step - payment method and confirmations required
        return !!(paymentMethod && termsAccepted && accuracyConfirmed);
      default:
        return false;
    }
  };

  const handleStepClick = useCallback((stepNumber: number) => {
    // Only allow navigation if step can be navigated to
    if (wizardState.canNavigateToStep(stepNumber)) {
      // Clear validation errors when navigating
      setValidationErrors([]);
      wizardState.goToStep(stepNumber);
      
      // Scroll to top of page
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast({
        title: "Cannot Navigate",
        description: "Please complete previous steps before navigating forward",
        variant: "destructive",
      });
    }
  }, [wizardState, toast]);

  const handleEditItems = useCallback(() => {
    // Navigate to products step (admin) or products page (pharmacy)
    if (isPharmacyMode) {
      // In pharmacy mode, redirect to products page to edit items
      navigate("/pharmacy/products");
    } else {
      wizardState.goToStep(3);
    }
  }, [wizardState, isPharmacyMode, navigate]);

  // Handle edit navigation from review step
  const handleEditCustomer = useCallback(() => {
    if (isPharmacyMode) {
      // In pharmacy mode, go to step 1 (combined customer+address)
      wizardState.goToStep(1);
    } else {
      wizardState.goToStep(1);
    }
  }, [wizardState, isPharmacyMode]);

  const handleEditAddress = useCallback(() => {
    if (isPharmacyMode) {
      // In pharmacy mode, go to step 1 (combined customer+address)
      wizardState.goToStep(1);
    } else {
      wizardState.goToStep(2);
    }
  }, [wizardState, isPharmacyMode]);

  const handleEditProducts = useCallback(() => {
    if (isPharmacyMode || userType === "group") {
      navigate("/pharmacy/products");
    } else {
      wizardState.goToStep(3);
    }
  }, [wizardState, isPharmacyMode, userType, navigate]);

  // Handle place order without payment (Admin only)
  const handlePlaceOrderWithoutPayment = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Calculate final total with discounts
      const finalTotal = Math.max(0, total - totalDiscount);
      
      // Prepare order data with skipPayment flag
      const orderData = {
        ...formData,
        customer: selectedCustomer,
        customerId: selectedCustomer?.id,
        billingAddress,
        shippingAddress,
        cartItems,
        paymentMethod: "manual" as PaymentMethod,
        specialInstructions,
        poNumber,
        termsAccepted: true,
        accuracyConfirmed: true,
        subtotal,
        tax,
        shipping,
        total: finalTotal,
        originalTotal: total,
        appliedDiscounts,
        totalDiscount,
        createdAt: new Date().toISOString(),
        skipPayment: true, // Flag to indicate no payment required
        status: "pending", // Order status without payment
      };

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Mark final step as complete
      wizardState.markStepComplete(totalSteps);
      
      toast({
        title: "Order Created Successfully",
        description: "Order has been created without payment processing",
      });

      onComplete?.(orderData);
    } catch (error) {
      console.error("Order creation error:", error);
      toast({
        title: "Order Creation Failed",
        description: error instanceof Error ? error.message : "An error occurred while creating the order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, selectedCustomer, billingAddress, shippingAddress, cartItems, specialInstructions, poNumber, subtotal, tax, shipping, total, totalDiscount, appliedDiscounts, wizardState, totalSteps, toast, onComplete]);

  // Render current step content
  const renderStepContent = () => {
    // Pharmacy mode or Group mode has different step mapping (3 steps instead of 5)
    if (isPharmacyMode || userType === "group") {
      switch (wizardState.currentStep) {
        case 1:
          // Combined Customer + Address step for pharmacy/group
          return (
            <CustomerAndAddressStep
              customer={selectedCustomer}
              billingAddress={billingAddress}
              shippingAddress={shippingAddress}
              onBillingAddressChange={handleBillingAddressChange}
              onShippingAddressChange={handleShippingAddressChange}
              isGroupMode={userType === "group"}
              selectedPharmacyName={userType === "group" ? 
                JSON.parse(sessionStorage.getItem("selectedPharmacyData") || "{}")?.name : undefined
              }
              savedLocations={customerLocations}
              profileBillingAddress={selectedCustomer?.billing_address}
              profileShippingAddress={selectedCustomer?.shipping_address}
            />
          );
        case 2:
          // Review step
          return (
            <ReviewOrderStep
              customer={selectedCustomer || undefined}
              billingAddress={billingAddress}
              shippingAddress={shippingAddress}
              cartItems={cartItems}
              subtotal={subtotal}
              tax={tax}
              shipping={shipping}
              total={total}
              onEditCustomer={handleEditCustomer}
              onEditAddress={handleEditAddress}
              onEditProducts={handleEditProducts}
            />
          );
        case 3:
          // Payment step
          return (
            <PaymentConfirmationStep
              cartItems={cartItems}
              subtotal={subtotal}
              tax={tax}
              shipping={shipping}
              total={total}
              totalDiscount={totalDiscount}
              appliedDiscounts={appliedDiscounts}
              onPaymentMethodChange={handlePaymentMethodChange}
              onSpecialInstructionsChange={handleSpecialInstructionsChange}
              onPONumberChange={handlePONumberChange}
              onTermsAcceptedChange={setTermsAccepted}
              onAccuracyConfirmedChange={setAccuracyConfirmed}
              initialPaymentMethod={paymentMethod}
              initialSpecialInstructions={specialInstructions}
              initialPONumber={poNumber}
              initialTermsAccepted={termsAccepted}
              initialAccuracyConfirmed={accuracyConfirmed}
              isEditMode={isEditMode}
              isAdmin={false}
            />
          );
        default:
          console.error(`Invalid step ${wizardState.currentStep} for pharmacy mode`);
          return (
            <div className="text-center p-8">
              <h3 className="text-lg font-semibold text-red-600">Error: Invalid Step</h3>
              <p>Current step: {wizardState.currentStep}</p>
              <p>Mode: Pharmacy</p>
              <Button onClick={() => wizardState.goToStep(1)} className="mt-4">
                Reset to Step 1
              </Button>
            </div>
          );
      }
    }
    
    // Admin mode - 5 steps
    switch (wizardState.currentStep) {
      case 1:
        return (
          <CustomerSelectionStep
            selectedCustomerId={selectedCustomer?.id}
            onCustomerSelect={handleCustomerSelect}
            onAddNewCustomer={handleAddNewCustomer}
            refreshKey={customerRefreshKey}
            isEditMode={isEditMode}
            lockedCustomer={isEditMode ? selectedCustomer : undefined}
          />
        );
      case 2:
        return (
          <AddressInformationStep
            billingAddress={billingAddress}
            shippingAddress={shippingAddress}
            onBillingAddressChange={handleBillingAddressChange}
            onShippingAddressChange={handleShippingAddressChange}
            customerName={selectedCustomer?.name}
            customerEmail={selectedCustomer?.email}
            customerPhone={selectedCustomer?.phone}
            savedLocations={customerLocations}
            profileBillingAddress={selectedCustomer?.billing_address}
            profileShippingAddress={selectedCustomer?.shipping_address}
            companyName={selectedCustomer?.company_name}
          />
        );
      case 3:
        return <ProductSelectionStep onCartUpdate={onCartUpdate} />;
      case 4:
        return (
          <ReviewOrderStep
            customer={selectedCustomer || undefined}
            billingAddress={billingAddress}
            shippingAddress={shippingAddress}
            cartItems={cartItems}
            subtotal={subtotal}
            tax={tax}
            shipping={shipping}
            total={total}
            onEditCustomer={handleEditCustomer}
            onEditAddress={handleEditAddress}
            onEditProducts={handleEditProducts}
          />
        );
      case 5:
        return (
          <PaymentConfirmationStep
            cartItems={cartItems}
            subtotal={subtotal}
            tax={tax}
            shipping={shipping}
            total={total}
            totalDiscount={totalDiscount}
            appliedDiscounts={appliedDiscounts}
            onPaymentMethodChange={handlePaymentMethodChange}
            onSpecialInstructionsChange={handleSpecialInstructionsChange}
            onPONumberChange={handlePONumberChange}
            onTermsAcceptedChange={setTermsAccepted}
            onAccuracyConfirmedChange={setAccuracyConfirmed}
            initialPaymentMethod={paymentMethod}
            initialSpecialInstructions={specialInstructions}
            initialPONumber={poNumber}
            initialTermsAccepted={termsAccepted}
            initialAccuracyConfirmed={accuracyConfirmed}
            isEditMode={isEditMode}
            isAdmin={true}
          />
        );
      default:
        console.error(`Invalid step ${wizardState.currentStep} for admin mode`);
        return (
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-red-600">Error: Invalid Step</h3>
            <p>Current step: {wizardState.currentStep}</p>
            <p>Mode: Admin</p>
            <Button onClick={() => wizardState.goToStep(1)} className="mt-4">
              Reset to Step 1
            </Button>
          </div>
        );
    }
  };

  // Handle cart updates - memoized
  const onCartUpdate = useCallback(() => {
    // Force re-render to update order summary
    setFormData((prev) => ({ ...prev }));
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error("Wizard error:", error, errorInfo);
        toast({
          title: "An Error Occurred",
          description: "Please try refreshing the page",
          variant: "destructive",
        });
      }}
    >
    <div className="min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden" role="main" aria-label="Order Creation Wizard">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Main Content Area with Order Summary */}
        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 sm:gap-6">
          {/* Main Content - Takes 2 columns on 2xl screens */}
          <div className="min-w-0">
            {/* Validation Errors Alert */}
            {validationErrors.length > 0 && (
              <Alert 
                variant="destructive" 
                className="mb-4 sm:mb-6"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
              >
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Please fix the following errors:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm">
                        {error.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <section 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 min-h-[400px] sm:min-h-[500px]"
              aria-label={`Step ${wizardState.currentStep} of ${totalSteps}: ${steps[wizardState.currentStep - 1]?.label}`}
              role="region"
            >
              <div key={wizardState.currentStep}>
                {renderStepContent()}
              </div>
            </section>

            {/* Navigation - Below content on all screens */}
            <nav className="mt-4 sm:mt-6" aria-label="Wizard navigation controls">
              <WizardNavigation
                currentStep={wizardState.currentStep}
                totalSteps={totalSteps}
                onBack={handleBack}
                onContinue={handleContinue}
                onCancel={handleCancel}
                onPlaceOrderWithoutPayment={handlePlaceOrderWithoutPayment}
                isSubmitting={isSubmitting}
                canContinue={canProceedFromCurrentStep()}
                paymentMethod={paymentMethod}
              />
            </nav>
          </div>

          {/* Order Summary - Sidebar on 2xl screens, top on smaller screens */}
          <aside 
            className="min-w-0 order-first 2xl:order-last"
            aria-label="Order summary"
            role="complementary"
          >
            <OrderSummaryCard
              items={cartItems}
              subtotal={subtotal}
              tax={tax}
              shipping={shipping}
              total={total}
              onEditItems={handleEditItems}
              customerId={selectedCustomer?.id || initialData?.customerId}
              hasFreeShipping={customerHasFreeShipping}
              onDiscountChange={handleDiscountChange}
            />
          </aside>
        </div>
      </div>
      <AddUserModal
        open={addCustomerModalOpen}
        onOpenChange={setAddCustomerModalOpen}
        onUserAdded={handleCustomerAdded}
      />
    </div>
    </ErrorBoundary>
  );
};

// Export memoized version to prevent unnecessary re-renders
export const OrderCreationWizard = memo(OrderCreationWizardComponent);
