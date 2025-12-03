import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useWizardState } from "./useWizardState";
import { WizardProgressIndicator } from "./WizardProgressIndicator";
import { WizardNavigation } from "./WizardNavigation";
import { OrderSummaryCard } from "./OrderSummaryCard";
import { OrderCreationWizardProps, WizardStep, Customer } from "./types";
import { useCart } from "@/hooks/use-cart";
import { CustomerSelectionStep } from "./steps/CustomerSelectionStep";
import { AddressInformationStep } from "./steps/AddressInformationStep";
import { ProductSelectionStep } from "./steps/ProductSelectionStep";
import { ReviewOrderStep } from "./steps/ReviewOrderStep";
import { PaymentConfirmationStep } from "./steps/PaymentConfirmationStep";
import type { BillingAddress, ShippingAddress, PaymentMethod } from "./types";
import { validateStep, ValidationError } from "./validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  User,
  MapPin,
  Package,
  FileCheck,
  CreditCard,
} from "lucide-react";
import "./wizard-animations.css";

const OrderCreationWizardComponent = ({
  initialData,
  isEditMode = false,
  onComplete,
  onCancel,
}: OrderCreationWizardProps) => {
  const totalSteps = 5;
  const wizardState = useWizardState(totalSteps);
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [accuracyConfirmed, setAccuracyConfirmed] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const { cartItems, clearCart, addToCart } = useCart();
  const { toast } = useToast();

  // Load initial data in edit mode - only run once
  useEffect(() => {
    const loadInitialData = async () => {
      if (isInitialized) return; // Prevent multiple runs
      
      if (!isEditMode || !initialData) {
        setIsInitialized(true);
        return;
      }
      
      console.log("Loading initial data in edit mode:", initialData);
      
      // Set customer
      if (initialData.customer) {
        setSelectedCustomer(initialData.customer);
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

      // Load cart items
      if (initialData.cartItems && initialData.cartItems.length > 0) {
        console.log("Loading cart items:", initialData.cartItems);
        await clearCart();
        
        // Add each item to cart
        for (const item of initialData.cartItems) {
          await addToCart(item);
        }
      }

      // Mark step 1 as complete and move to step 2 (addresses)
      wizardState.markStepComplete(1);
      wizardState.goToStep(2);
      
      setIsInitialized(true);
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, initialData, isInitialized]); // Run when these change

  // Calculate order totals - memoized to prevent unnecessary recalculations
  const { subtotal, tax, shipping, total } = useMemo(() => {
    // item.price already contains total price (sum of all sizes * quantities)
    // So we don't need to multiply by item.quantity again
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price,
      0
    );
    
    // Get tax rate from sessionStorage (set when customer is selected)
    const taxPer = Number(sessionStorage.getItem("taxper") || 0);
    
    // Check if customer has free shipping from sessionStorage
    const hasFreeShipping = sessionStorage.getItem("shipping") === "true";
    
    // Calculate shipping cost
    const calculatedShipping = hasFreeShipping 
      ? 0 
      : Math.max(...cartItems.map((item) => item.shipping_cost || 0));
    
    // Calculate tax on subtotal (excluding shipping)
    const tax = ((subtotal) * taxPer) / 100;
    
    const total = subtotal + tax + calculatedShipping;
    
    return { subtotal, tax, shipping: calculatedShipping, total };
  }, [cartItems]);

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
  ]);

  // Define wizard steps - memoized to prevent recreation on every render
  const steps: WizardStep[] = useMemo(() => [
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
  ], []);

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
  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    
    // Set tax percentage in sessionStorage (purane code ke according)
    const taxPercentage = customer.tax_percentage || 0;
    sessionStorage.setItem("taxper", taxPercentage.toString());
    
    // Set free shipping in sessionStorage (purane code ke according)
    const hasFreeShipping = customer.freeShipping === true;
    sessionStorage.setItem("shipping", hasFreeShipping.toString());
    
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
  }, []);

  // Handle add new customer - memoized
  const handleAddNewCustomer = useCallback(() => {
    // TODO: Implement add new customer modal
    console.log("Add new customer");
  }, []);

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
      // Last step - submit the order
      setIsSubmitting(true);
      try {
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
          total,
          createdAt: new Date().toISOString(),
        };

        // Note: Actual order submission is handled by the parent component (CreateOrder.tsx)
        // This simulates processing time for better UX
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // Mark final step as complete
        wizardState.markStepComplete(totalSteps);
        
        toast({
          title: "Order Placed Successfully",
          description: "Your order has been submitted and is being processed",
        });

        onComplete?.(orderData);
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
      // Move to next step (goToNextStep already marks current step as complete)
      wizardState.goToNextStep();
      
      // Scroll to top of page for next step
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [validateCurrentStep, wizardState, totalSteps, formData, selectedCustomer, billingAddress, shippingAddress, cartItems, paymentMethod, specialInstructions, poNumber, termsAccepted, accuracyConfirmed, subtotal, tax, shipping, total, toast, onComplete]);

  const handleBack = useCallback(() => {
    // Clear validation errors when going back
    setValidationErrors([]);
    wizardState.goToPreviousStep();
    
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [wizardState]);

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
    // Navigate to products step
    wizardState.goToStep(3);
  }, [wizardState]);

  // Handle edit navigation from review step
  const handleEditCustomer = useCallback(() => {
    wizardState.goToStep(1);
  }, [wizardState]);

  const handleEditAddress = useCallback(() => {
    wizardState.goToStep(2);
  }, [wizardState]);

  const handleEditProducts = useCallback(() => {
    wizardState.goToStep(3);
  }, [wizardState]);

  // Render current step content
  const renderStepContent = () => {
    switch (wizardState.currentStep) {
      case 1:
        return (
          <CustomerSelectionStep
            selectedCustomerId={selectedCustomer?.id}
            onCustomerSelect={handleCustomerSelect}
            onAddNewCustomer={handleAddNewCustomer}
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
          />
        );
      default:
        return null;
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
    <div className="min-h-screen bg-gray-50" role="main" aria-label="Order Creation Wizard">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Progress Indicator */}
        <nav aria-label="Order creation progress">
          <WizardProgressIndicator
            currentStep={wizardState.currentStep}
            completedSteps={wizardState.completedSteps}
            steps={steps}
            onStepClick={handleStepClick}
          />
        </nav>

        {/* Main Content Area with Order Summary */}
        <div className="mt-4 sm:mt-6 lg:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content - Takes 2 columns on desktop */}
          <div className="lg:col-span-2">
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
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 min-h-[400px] sm:min-h-[500px] animate-fade-in"
              aria-label={`Step ${wizardState.currentStep} of ${totalSteps}: ${steps[wizardState.currentStep - 1]?.label}`}
              role="region"
            >
              <div key={wizardState.currentStep} className="animate-slide-up">
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
                isSubmitting={isSubmitting}
                canContinue={canProceedFromCurrentStep()}
                paymentMethod={paymentMethod}
              />
            </nav>
          </div>

          {/* Order Summary - Sidebar on desktop, top on mobile */}
          <aside 
            className="lg:col-span-1 order-first lg:order-last"
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
            />
          </aside>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
};

// Export memoized version to prevent unnecessary re-renders
export const OrderCreationWizard = memo(OrderCreationWizardComponent);
