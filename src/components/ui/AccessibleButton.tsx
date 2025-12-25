/**
 * Accessible Button Component
 * - Minimum 44px touch target
 * - Proper focus states
 * - Loading state support
 * - ARIA labels
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const accessibleButtonVariants = cva(
  // Base styles with accessibility requirements
  `inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium
   transition-colors duration-200
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
   disabled:pointer-events-none disabled:opacity-50
   min-h-[44px] min-w-[44px]`, // Touch target minimum
  {
    variants: {
      variant: {
        // Primary - Emerald (standardized)
        default: `
          bg-emerald-600 text-white 
          hover:bg-emerald-700 
          focus-visible:ring-emerald-500
        `,
        // Secondary/Outline
        outline: `
          border border-gray-300 bg-white text-gray-700
          hover:bg-gray-50 hover:border-gray-400
          focus-visible:ring-emerald-500
        `,
        // Ghost
        ghost: `
          bg-transparent text-gray-700
          hover:bg-gray-100
          focus-visible:ring-emerald-500
        `,
        // Destructive
        destructive: `
          bg-red-600 text-white
          hover:bg-red-700
          focus-visible:ring-red-500
        `,
        // Success
        success: `
          bg-green-600 text-white
          hover:bg-green-700
          focus-visible:ring-green-500
        `,
        // Link style
        link: `
          text-emerald-600 underline-offset-4
          hover:underline
          focus-visible:ring-emerald-500
          min-h-0
        `,
      },
      size: {
        default: "h-11 px-5 py-2 rounded-xl",
        sm: "h-10 px-4 py-2 rounded-lg text-sm",
        lg: "h-12 px-8 py-3 rounded-xl text-base",
        icon: "h-11 w-11 rounded-xl p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof accessibleButtonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    // Ensure icon-only buttons have aria-label
    const hasOnlyIcon = size === "icon" && !children;
    if (hasOnlyIcon && !ariaLabel) {
      console.warn(
        "AccessibleButton: Icon-only buttons should have an aria-label for accessibility"
      );
    }

    return (
      <Comp
        className={cn(accessibleButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{loadingText || "Loading..."}</span>
          </>
        ) : (
          <>
            {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);

AccessibleButton.displayName = "AccessibleButton";

export { AccessibleButton, accessibleButtonVariants };
