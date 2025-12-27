import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width constraint */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  /** Padding size */
  padding?: "none" | "sm" | "default" | "lg"
  /** Center the container */
  centered?: boolean
}

const maxWidthClasses = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-[1400px]",
  full: "max-w-full",
}

const paddingClasses = {
  none: "",
  sm: "px-3 sm:px-4",
  default: "px-4 sm:px-6 lg:px-8",
  lg: "px-4 sm:px-8 lg:px-12",
}

const ResponsiveContainer = React.forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  ({ className, maxWidth = "2xl", padding = "default", centered = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full",
          maxWidthClasses[maxWidth],
          paddingClasses[padding],
          centered && "mx-auto",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ResponsiveContainer.displayName = "ResponsiveContainer"

export { ResponsiveContainer }
