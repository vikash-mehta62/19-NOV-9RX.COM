import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWizardState } from "../useWizardState";

describe("useWizardState", () => {
  const totalSteps = 5;

  describe("initialization", () => {
    it("should initialize with step 1", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      expect(result.current.currentStep).toBe(1);
    });

    it("should initialize with no completed steps", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      expect(result.current.completedSteps).toEqual([]);
    });
  });

  describe("canNavigateToStep", () => {
    it("should allow navigation to step 1", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      expect(result.current.canNavigateToStep(1)).toBe(true);
    });

    it("should not allow navigation to step 2 initially", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      expect(result.current.canNavigateToStep(2)).toBe(false);
    });

    it("should allow navigation to step 2 after step 1 is completed", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.markStepComplete(1);
      });

      expect(result.current.canNavigateToStep(2)).toBe(true);
    });

    it("should not allow navigation to invalid step numbers", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      expect(result.current.canNavigateToStep(0)).toBe(false);
      expect(result.current.canNavigateToStep(6)).toBe(false);
      expect(result.current.canNavigateToStep(-1)).toBe(false);
    });

    it("should allow backward navigation to previously visited steps", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.markStepComplete(1);
        result.current.goToStep(2);
        result.current.markStepComplete(2);
        result.current.goToStep(3);
      });

      expect(result.current.canNavigateToStep(1)).toBe(true);
      expect(result.current.canNavigateToStep(2)).toBe(true);
    });

    it("should not allow skipping steps", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.markStepComplete(1);
      });

      expect(result.current.canNavigateToStep(3)).toBe(false);
    });
  });

  describe("markStepComplete", () => {
    it("should mark a step as complete", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.markStepComplete(1);
      });

      expect(result.current.completedSteps).toContain(1);
    });

    it("should not duplicate completed steps", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.markStepComplete(1);
        result.current.markStepComplete(1);
        result.current.markStepComplete(1);
      });

      expect(result.current.completedSteps).toEqual([1]);
    });

    it("should keep completed steps sorted", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.markStepComplete(3);
        result.current.markStepComplete(1);
        result.current.markStepComplete(2);
      });

      expect(result.current.completedSteps).toEqual([1, 2, 3]);
    });
  });

  describe("goToStep", () => {
    it("should navigate to a valid step", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.goToStep(1);
      });

      expect(result.current.currentStep).toBe(1);
    });

    it("should not navigate to step without completing previous steps", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.goToStep(3);
      });

      expect(result.current.currentStep).toBe(1);
    });

    it("should navigate to step after completing previous steps", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.markStepComplete(1);
        result.current.markStepComplete(2);
        result.current.goToStep(3);
      });

      expect(result.current.currentStep).toBe(3);
    });

    it("should not navigate to invalid step numbers", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      const initialStep = result.current.currentStep;
      
      act(() => {
        result.current.goToStep(0);
      });
      expect(result.current.currentStep).toBe(initialStep);

      act(() => {
        result.current.goToStep(6);
      });
      expect(result.current.currentStep).toBe(initialStep);
    });
  });

  describe("goToNextStep", () => {
    it("should move to next step", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.goToNextStep();
      });

      expect(result.current.currentStep).toBe(2);
    });

    it("should mark current step as complete when moving forward", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.goToNextStep();
      });

      expect(result.current.completedSteps).toContain(1);
    });

    it("should not go beyond last step", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        // Complete all steps
        for (let i = 1; i < totalSteps; i++) {
          result.current.goToNextStep();
        }
        // Try to go beyond
        result.current.goToNextStep();
      });

      expect(result.current.currentStep).toBe(totalSteps);
    });

    it("should allow sequential navigation through all steps", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      for (let i = 1; i < totalSteps; i++) {
        act(() => {
          result.current.goToNextStep();
        });
        expect(result.current.currentStep).toBe(i + 1);
      }
    });
  });

  describe("goToPreviousStep", () => {
    it("should move to previous step", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.goToNextStep();
        result.current.goToPreviousStep();
      });

      expect(result.current.currentStep).toBe(1);
    });

    it("should not go before first step", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.goToPreviousStep();
      });

      expect(result.current.currentStep).toBe(1);
    });

    it("should allow backward navigation through all steps", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      // Go to last step
      act(() => {
        for (let i = 1; i < totalSteps; i++) {
          result.current.goToNextStep();
        }
      });

      // Go back through all steps
      for (let i = totalSteps; i > 1; i--) {
        act(() => {
          result.current.goToPreviousStep();
        });
        expect(result.current.currentStep).toBe(i - 1);
      }
    });

    it("should not affect completed steps when going backward", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.goToNextStep();
        result.current.goToNextStep();
      });

      const completedBeforeBack = [...result.current.completedSteps];

      act(() => {
        result.current.goToPreviousStep();
      });

      expect(result.current.completedSteps).toEqual(completedBeforeBack);
    });
  });

  describe("complex navigation scenarios", () => {
    it("should handle forward and backward navigation correctly", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.goToNextStep(); // Go to step 2
        result.current.goToNextStep(); // Go to step 3
        result.current.goToPreviousStep(); // Back to step 2
        result.current.goToNextStep(); // Forward to step 3 again
      });

      expect(result.current.currentStep).toBe(3);
      expect(result.current.completedSteps).toContain(1);
      expect(result.current.completedSteps).toContain(2);
    });

    it("should allow jumping to any completed step", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.goToNextStep(); // Step 2
        result.current.goToNextStep(); // Step 3
        result.current.goToNextStep(); // Step 4
        result.current.goToStep(2); // Jump back to step 2
      });

      expect(result.current.currentStep).toBe(2);
    });

    it("should maintain completed steps when navigating backward", () => {
      const { result } = renderHook(() => useWizardState(totalSteps));
      
      act(() => {
        result.current.goToNextStep(); // Complete step 1, go to 2
        result.current.goToNextStep(); // Complete step 2, go to 3
        result.current.goToNextStep(); // Complete step 3, go to 4
      });

      expect(result.current.completedSteps).toEqual([1, 2, 3]);

      act(() => {
        result.current.goToPreviousStep(); // Back to step 3
      });

      expect(result.current.completedSteps).toEqual([1, 2, 3]);
      expect(result.current.currentStep).toBe(3);
    });
  });
});
