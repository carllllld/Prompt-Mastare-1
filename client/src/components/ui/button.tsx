import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const buttonVariants = ({
  variant = "default",
  size = "default",
  className = ""
}: {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}) => {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
  
  const variants = {
    default: "bg-primary text-primary-foreground border border-primary-border shadow-sm hover:bg-primary-hover hover:shadow-md active:shadow-none cursor-pointer",
    destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md active:shadow-none cursor-pointer",
    outline: "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground active:shadow-none cursor-pointer",
    secondary: "bg-secondary text-secondary-foreground border border-secondary-border hover:bg-accent active:bg-accent/80 cursor-pointer",
    ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 cursor-pointer"
  }
  
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-6 text-base",
    icon: "h-10 w-10"
  }
  
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost"
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
