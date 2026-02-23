import { memo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X, FileText } from "lucide-react";
import { WizardNavigationProps } from "./types";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./LoadingSpinner";

const WizardNavigationComponent = ({
  currentStep,
  totalSteps,
  onBack,
  onContinue,
  onCancel,
  onPlaceOrderWithoutPayment,
  isSubmitting = false,
  canContinue = true,
  paymentMethod = "card",
}: WizardNavigationProps) => {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  
  // Check if user is admin
  const userType = sessionStorage.getItem("userType")?.toLowerCase();
  const isAdmin = userType === "admin";
  
  // For Admin, show "Place Order Without Payment" on Review step (step 4) as well
  const isReviewStep = isAdmin && totalSteps === 5 && currentStep === 4;
  const showPlaceOrderWithoutPayment = (isLastStep || isReviewStep) && isAdmin && onPlaceOrderWithoutPayment;
  
  // Determine button text based on payment method
  const getButtonText = () => {
    if (!isLastStep) return "Continue";
    if (paymentMethod === "card") return "Place Order & Payment";
    return "Place Order";
  };

  return (
    <div className="bg-white border-t border-gray-200 rounded-lg shadow-sm" role="navigation" aria-label="Step navigation">
      <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Left side - Back or Cancel */}
          <div className="order-2 sm:order-1">
            {isFirstStep ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className="flex items-center justify-center gap-2 w-full sm:w-auto transition-all duration-200 hover:scale-105 active:scale-95 min-h-[44px]"
                disabled={isSubmitting}
                aria-label="Cancel order creation"
              >
                <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" aria-hidden="true" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex items-center justify-center gap-2 w-full sm:w-auto transition-all duration-200 hover:scale-105 active:scale-95 group min-h-[44px]"
                disabled={isSubmitting}
                aria-label={`Go back to step ${currentStep - 1}`}
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
                <span>Back</span>
              </Button>
            )}
          </div>

          {/* Right side - Continue or Place Order */}
          <div className="order-1 sm:order-2 flex flex-col sm:flex-row gap-2">
            {/* Place Order Without Payment - For Admin on Review step (step 4) or last step */}
            {showPlaceOrderWithoutPayment && (
              <Button
                type="button"
                variant="outline"
                onClick={onPlaceOrderWithoutPayment}
                disabled={!canContinue || isSubmitting}
                className={cn(
                  "flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] transition-all duration-200 group",
                  "hover:scale-105 active:scale-95 border-blue-500 text-blue-600 hover:bg-blue-50"
                )}
                aria-label="Place order without payment"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="border-blue-500 border-t-blue-200" aria-hidden="true" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" aria-hidden="true" />
                    <span>Place Order (No Payment)</span>
                  </>
                )}
              </Button>
            )}
            
            <Button
              type="button"
              onClick={onContinue}
              disabled={!canContinue || isSubmitting}
              className={cn(
                "flex items-center justify-center gap-2 w-full sm:w-auto min-w-[140px] min-h-[44px] transition-all duration-200 group",
                "hover:scale-105 active:scale-95",
                isLastStep && "bg-blue-600 hover:bg-blue-700 hover:shadow-lg",
                !isLastStep && "hover:shadow-md bg-blue-600 hover:bg-blue-700"
              )}
              aria-label={isLastStep ? "Place order and complete checkout" : `Continue to step ${currentStep + 1}`}
              aria-disabled={!canContinue || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="border-white border-t-white/50" aria-hidden="true" />
                  <span>{getButtonText()}</span>
                  <span className="sr-only">Processing your order, please wait</span>
                </>
              ) : (
                <>
                  <span>{getButtonText()}</span>
                  {!isLastStep && <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export memoized version to prevent unnecessary re-renders
export const WizardNavigation = memo(WizardNavigationComponent);
