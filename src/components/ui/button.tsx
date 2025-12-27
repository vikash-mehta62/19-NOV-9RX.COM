import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        default: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-sm hover:shadow-md",
        destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm hover:shadow-md",
        outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-400",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400",
        ghost: "hover:bg-gray-100 text-gray-700 focus-visible:ring-gray-400",
        link: "text-emerald-600 underline-offset-4 hover:underline focus-visible:ring-emerald-500 p-0 h-auto",
        success: "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 shadow-sm hover:shadow-md",
        warning: "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500 shadow-sm hover:shadow-md",
      },
      size: {
        default: "h-11 px-5 py-2.5 text-sm rounded-xl min-h-[44px] [&_svg]:size-4",
        sm: "h-9 px-3.5 py-2 text-sm rounded-lg min-h-[36px] [&_svg]:size-3.5",
        lg: "h-12 px-6 py-3 text-base rounded-xl min-h-[48px] [&_svg]:size-5",
        xl: "h-14 px-8 py-3.5 text-base rounded-2xl min-h-[56px] [&_svg]:size-5",
        icon: "h-11 w-11 rounded-xl min-h-[44px] min-w-[44px] [&_svg]:size-5",
        iconSm: "h-9 w-9 rounded-lg min-h-[36px] min-w-[36px] [&_svg]:size-4",
        iconLg: "h-12 w-12 rounded-xl min-h-[48px] min-w-[48px] [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
