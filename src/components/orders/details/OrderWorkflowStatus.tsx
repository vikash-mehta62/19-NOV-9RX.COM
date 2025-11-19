import { CheckCircle2, Clock, Package } from "lucide-react";

interface OrderWorkflowStatusProps {
  status: string;
}

export const OrderWorkflowStatus = ({ status }: OrderWorkflowStatusProps) => {
  const steps = [
    { id: 'pending', label: 'Pending', icon: Clock },
    { id: 'processing', label: 'Processing', icon: Package },
    { id: 'shipped', label: 'Shipped', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === status);

  return (
    <div className="py-4">
      <div className="relative flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index <= currentStepIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={`mt-2 text-sm ${
                isActive ? 'text-primary font-medium' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
        
        {/* Progress bar */}
        <div className="absolute top-5 left-0 h-[2px] bg-gray-200 w-full -z-10">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ 
              width: `${(currentStepIndex / (steps.length - 1)) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
};