import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean
  inputSize?: "sm" | "default" | "lg"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, inputSize = "default", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-9 px-3 text-sm min-h-[36px]",
      default: "h-11 px-4 text-base sm:text-sm min-h-[44px]",
      lg: "h-12 px-5 text-base min-h-[48px]",
    }

    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ring-offset-background transition-colors duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-gray-400 dark:placeholder:text-gray-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700",
          error
            ? "border-red-300 dark:border-red-600 focus-visible:ring-red-500 focus-visible:border-red-500"
            : "border-gray-300 dark:border-gray-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500",
          sizeClasses[inputSize],
          className
        )}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
