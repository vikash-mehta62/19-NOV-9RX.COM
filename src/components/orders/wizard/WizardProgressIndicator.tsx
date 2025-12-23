import { memo, useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WizardProgressIndicatorProps } from "./types";

const WizardProgressIndicatorComponent = ({
  currentStep,
  completedSteps,
  steps,
  onStepClick,
}: WizardProgressIndicatorProps) => {
  // Filter out hidden steps (e.g., step 3 in pharmacy mode)
  const visibleSteps = useMemo(() => steps.filter(step => !step.hidden), [steps]);
  
  const getStepStatus = (stepNumber: number) => {
    if (completedSteps.includes(stepNumber)) return "completed";
    if (stepNumber === currentStep) return "active";
    return "pending";
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-white border-green-500";
      case "active":
        return "bg-blue-500 text-white border-blue-500";
      default:
        return "bg-gray-200 text-gray-500 border-gray-300";
    }
  };

  const getLineColor = (stepNumber: number) => {
    if (completedSteps.includes(stepNumber)) {
      return "bg-green-500";
    }
    return "bg-gray-300";
  };

  return (
    <div className="w-full py-6" role="navigation" aria-label="Progress steps">
      {/* Desktop: Horizontal layout */}
      <ol className="hidden md:flex items-center justify-between">
        {visibleSteps.map((step, index) => {
          const status = getStepStatus(step.number);
          const Icon = step.icon;
          const isClickable = onStepClick && completedSteps.includes(step.number - 1);

          return (
            <li key={step.number} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isClickable && onStepClick(step.number)}
                  disabled={!isClickable}
                  className={cn(
                    "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 transform",
                    getStepColor(status),
                    isClickable && "cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95",
                    !isClickable && "cursor-not-allowed",
                    status === "active" && "animate-pulse-subtle shadow-lg",
                    status === "completed" && "animate-scale-in"
                  )}
                  aria-label={`${step.label}: ${step.description}${status === "completed" ? " - Completed" : status === "active" ? " - Current step" : " - Not started"}`}
                  aria-current={status === "active" ? "step" : undefined}
                  aria-disabled={!isClickable}
                  tabIndex={isClickable ? 0 : -1}
                  type="button"
                >
                  {status === "completed" ? (
                    <Check className="w-6 h-6 animate-scale-in" aria-hidden="true" />
                  ) : (
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  )}
                </button>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      status === "active" && "text-blue-600",
                      status === "completed" && "text-green-600",
                      status === "pending" && "text-gray-500"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-500 hidden lg:block">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connecting Line */}
              {index < visibleSteps.length - 1 && (
                <div 
                  className="flex-1 h-0.5 mx-4 bg-gray-300 overflow-hidden"
                  role="presentation"
                  aria-hidden="true"
                >
                  <div
                    className={cn(
                      "h-full transition-all duration-500 ease-out",
                      getLineColor(step.number),
                      completedSteps.includes(step.number) && "animate-progress-fill"
                    )}
                    style={{
                      width: completedSteps.includes(step.number) ? "100%" : "0%"
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: Vertical layout */}
      <ol className="md:hidden space-y-4">
        {visibleSteps.map((step, index) => {
          const status = getStepStatus(step.number);
          const Icon = step.icon;
          const isClickable = onStepClick && completedSteps.includes(step.number - 1);

          return (
            <li key={step.number} className="flex items-start">
              {/* Step Circle and Line */}
              <div className="flex flex-col items-center mr-4">
                <button
                  onClick={() => isClickable && onStepClick(step.number)}
                  disabled={!isClickable}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 transform",
                    getStepColor(status),
                    isClickable && "cursor-pointer active:scale-95",
                    !isClickable && "cursor-not-allowed",
                    status === "active" && "animate-pulse-subtle shadow-md",
                    status === "completed" && "animate-scale-in"
                  )}
                  aria-label={`${step.label}: ${step.description}${status === "completed" ? " - Completed" : status === "active" ? " - Current step" : " - Not started"}`}
                  aria-current={status === "active" ? "step" : undefined}
                  aria-disabled={!isClickable}
                  tabIndex={isClickable ? 0 : -1}
                  type="button"
                >
                  {status === "completed" ? (
                    <Check className="w-5 h-5 animate-scale-in" aria-hidden="true" />
                  ) : (
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
                {index < visibleSteps.length - 1 && (
                  <div 
                    className="w-0.5 h-12 mt-2 bg-gray-300 overflow-hidden"
                    role="presentation"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        "w-full transition-all duration-500 ease-out",
                        getLineColor(step.number),
                        completedSteps.includes(step.number) && "animate-progress-fill"
                      )}
                      style={{
                        height: completedSteps.includes(step.number) ? "100%" : "0%"
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Step Info */}
              <div className="flex-1 pt-2">
                <p
                  className={cn(
                    "text-sm font-medium",
                    status === "active" && "text-blue-600",
                    status === "completed" && "text-green-600",
                    status === "pending" && "text-gray-500"
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

// Export memoized version to prevent unnecessary re-renders
export const WizardProgressIndicator = memo(WizardProgressIndicatorComponent);
