"use client";

import { CheckCircle2, Clock, Package, Truck, XCircle, RotateCcw } from "lucide-react";

interface OrderWorkflowStatusProps {
  status: string;
}

export const OrderWorkflowStatus = ({ status }: OrderWorkflowStatusProps) => {
  const normalizedStatus = status.toLowerCase();

  const baseSteps = [
    { id: 'new', label: 'New Order', icon: Clock, description: 'Order received, awaiting review' },
    { id: 'pending', label: 'Confirmed', icon: CheckCircle2, description: 'Order confirmed by 9RX' },
    { id: 'processing', label: 'Processing', icon: Package, description: 'Order is being processed' },
    { id: 'shipped', label: 'Shipped', icon: Truck, description: 'Order has been shipped' },
  ];

  // Dynamically add 'cancelled' or 'refunded' as a final, distinct step
  const dynamicStep =
    normalizedStatus === 'cancelled'
      ? { id: 'cancelled', label: 'Cancelled', icon: XCircle, description: 'Order has been cancelled' }
      : normalizedStatus === 'refunded'
      ? { id: 'refunded', label: 'Refunded', icon: RotateCcw, description: 'Order has been refunded' }
      : null;

  // If there's a dynamic step, it becomes the only step if it's 'cancelled' or 'refunded'
  // otherwise, it's appended to base steps for a linear flow.
  // This logic assumes 'cancelled' or 'refunded' are terminal states that replace the linear progression.
  const steps = dynamicStep ? [dynamicStep] : baseSteps;
  const currentStepIndex = steps.findIndex(step => step.id === normalizedStatus);

  // If the current status is one of the base steps, we calculate the progress
  // based on the baseSteps array.
  const actualStepsForProgress = dynamicStep ? [...baseSteps, dynamicStep] : baseSteps;
  const actualCurrentStepIndex = actualStepsForProgress.findIndex(step => step.id === normalizedStatus);


  return (
    <div className="py-4">
      <div className="relative flex items-center justify-between overflow-x-auto gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          // Determine if the step is active, considering the overall progression
          const isActive = actualCurrentStepIndex >= actualStepsForProgress.findIndex(s => s.id === step.id);
          const isCurrent = step.id === normalizedStatus;

          // Special styling for cancelled/refunded status
          const isCancelled = step.id === 'cancelled';
          const isRefunded = step.id === 'refunded';

          let circleClasses = 'bg-gray-100';
          let textClasses = 'text-gray-500';

          if (isCancelled) {
            circleClasses = 'bg-red-500 text-white'; // Red background for cancelled
            textClasses = 'text-red-600'; // Red text for cancelled
          } else if (isRefunded) {
            circleClasses = 'bg-purple-500 text-white'; // Purple background for refunded
            textClasses = 'text-purple-600'; // Purple text for refunded
          } else if (isActive) {
            circleClasses = 'bg-primary text-primary-foreground';
            textClasses = 'text-primary';
          }

          if (isCurrent && !isCancelled && !isRefunded) {
            circleClasses += ' ring-2 ring-primary ring-offset-2';
          } else if (isCurrent && (isCancelled || isRefunded)) {
            // Add a distinct ring for current cancelled/refunded
            circleClasses += ' ring-2 ring-current-status-ring ring-offset-2'; // You might want to define current-status-ring in your CSS
          }


          return (
            <div key={step.id} className="flex flex-col items-center relative z-10 min-w-[100px]">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 ${circleClasses}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`mt-2 text-sm font-medium ${textClasses}`}
              >
                {step.label}
              </span>
              <span className="text-xs text-gray-500 text-center mt-1 max-w-[120px]">
                {step.description}
              </span>
            </div>
          );
        })}

        {/* Progress bar - only show for linear progression, not for terminal states like cancelled/refunded */}
        {!dynamicStep && (
          <div className="absolute top-5 left-0 h-[2px] bg-gray-200 w-full -z-10">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${(currentStepIndex / (baseSteps.length - 1)) * 100}%`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};