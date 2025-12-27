import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-3 text-base sm:text-sm text-gray-900 dark:text-gray-100 ring-offset-background transition-colors duration-200",
          "placeholder:text-gray-400 dark:placeholder:text-gray-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700",
          "resize-y",
          error
            ? "border-red-300 dark:border-red-600 focus-visible:ring-red-500 focus-visible:border-red-500"
            : "border-gray-300 dark:border-gray-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500",
          className
        )}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
