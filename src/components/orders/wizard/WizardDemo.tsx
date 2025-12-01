import { OrderCreationWizard } from "./OrderCreationWizard";
import { useNavigate } from "react-router-dom";

/**
 * Demo component to test the Order Creation Wizard infrastructure
 * This component can be used to verify that all wizard components work correctly
 */
export const WizardDemo = () => {
  const navigate = useNavigate();

  const handleComplete = (data: any) => {
    console.log("Order completed with data:", data);
    alert("Order creation wizard completed! Check console for data.");
    // In production, this would navigate to orders list or show success message
  };

  const handleCancel = () => {
    console.log("Order creation cancelled");
    // In production, this would navigate back to orders list
    navigate(-1);
  };

  return (
    <OrderCreationWizard
      initialData={{}}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
};
