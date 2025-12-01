import { useState, useCallback } from "react";
import { WizardState } from "./types";

export const useWizardState = (totalSteps: number): WizardState => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]); // Track visited steps

  const canNavigateToStep = useCallback(
    (step: number): boolean => {
      // Can't navigate to invalid steps
      if (step < 1 || step > totalSteps) return false;
      
      // Can always go to step 1
      if (step === 1) return true;
      
      // Can navigate backward to any previously visited step
      if (step < currentStep) return true;
      
      // Can navigate forward only if all previous steps are completed
      for (let i = 1; i < step; i++) {
        if (!completedSteps.includes(i)) {
          return false;
        }
      }
      
      return true;
    },
    [completedSteps, currentStep, totalSteps]
  );

  const markStepComplete = useCallback((step: number) => {
    setCompletedSteps((prev) => {
      if (prev.includes(step)) return prev;
      return [...prev, step].sort((a, b) => a - b);
    });
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      if (step < 1 || step > totalSteps) {
        console.warn(`Cannot navigate to step ${step}. Valid range: 1-${totalSteps}`);
        return;
      }
      
      if (!canNavigateToStep(step)) {
        console.warn(`Cannot navigate to step ${step}. Previous steps must be completed.`);
        return;
      }
      
      setCurrentStep(step);
      setVisitedSteps((prev) => {
        if (prev.includes(step)) return prev;
        return [...prev, step].sort((a, b) => a - b);
      });
    },
    [totalSteps, canNavigateToStep]
  );

  const goToNextStep = useCallback(() => {
    if (currentStep >= totalSteps) {
      console.warn(`Already at last step (${totalSteps})`);
      return;
    }
    
    // Mark current step as complete before moving forward
    markStepComplete(currentStep);
    
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    setVisitedSteps((prev) => {
      if (prev.includes(nextStep)) return prev;
      return [...prev, nextStep].sort((a, b) => a - b);
    });
  }, [currentStep, totalSteps, markStepComplete]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep <= 1) {
      console.warn("Already at first step");
      return;
    }
    
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    // Don't need to update visitedSteps since we can only go back to visited steps
  }, [currentStep]);

  return {
    currentStep,
    completedSteps,
    canNavigateToStep,
    markStepComplete,
    goToStep,
    goToNextStep,
    goToPreviousStep,
  };
};
