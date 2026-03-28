import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

/**
 * Mäklaraktig Button Component
 * 
 * Design Philosophy:
 * - Primary: Dark green (#2D5016) - ONLY for CTAs
 * - Secondary: White with gray border - secondary actions
 * - Text: No background/border - tertiary actions
 * - NO icons unless absolutely necessary
 * - Generous padding: px-6 py-3 (24px x 12px)
 * - Subtle hover states (10% darkening)
 * - NO shadows (except sticky elements)
 */

const buttonVariants = ({
  variant = "default",
  size = "default",
  className = ""
}: {
  variant?: "default" | "primary" | "secondary" | "text" | "destructive" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}) => {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
  
  const variants = {
    // Primary: Dark green background, white text (ONLY for CTAs)
    default: "bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer",
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer",
    
    // Secondary: White background, gray border and text
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer",
    outline: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer",
    
    // Text: No background, no border (tertiary actions)
    text: "text-gray-600 hover:text-gray-900 cursor-pointer",
    ghost: "text-gray-600 hover:text-gray-900 hover:bg-gray-50 cursor-pointer",
    
    // Destructive: For delete/remove actions
    destructive: "bg-error text-error-foreground hover:bg-error/90 cursor-pointer",
  }
  
  const sizes = {
    default: "h-10 px-6 py-3 text-base",  /* 40px height, 24px horizontal padding */
    sm: "h-9 px-4 py-2 text-sm",          /* 36px height, 16px horizontal padding */
    lg: "h-12 px-8 py-4 text-base",       /* 48px height, 32px horizontal padding */
    icon: "h-10 w-10",                    /* Square icon button */
  }
  
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "text" | "destructive" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
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
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
