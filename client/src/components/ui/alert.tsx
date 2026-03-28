import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Mäklaraktig Alert Component
 * 
 * Design Philosophy:
 * - White background (NO colored backgrounds like red-50, yellow-50)
 * - Light gray border (1px)
 * - Subtle left border (border-l-4) with semantic color for type indication
 * - Error: border-l-4 border-red-500
 * - Warning: border-l-4 border-amber-500
 * - Info: border-l-4 border-blue-500
 * - Success: border-l-4 border-green-500
 */

const alertVariants = ({
  variant = "default"
}: {
  variant?: "default" | "destructive" | "success" | "warning" | "info"
}) => {
  const base = "relative w-full rounded-lg border border-gray-200 bg-white p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4"
  
  const variants = {
    default: "text-foreground [&>svg]:text-foreground",
    destructive: "border-l-4 border-l-red-500 text-foreground [&>svg]:text-red-500",
    success: "border-l-4 border-l-green-500 text-foreground [&>svg]:text-green-500",
    warning: "border-l-4 border-l-amber-500 text-foreground [&>svg]:text-amber-500",
    info: "border-l-4 border-l-blue-500 text-foreground [&>svg]:text-blue-500"
  }
  
  return `${base} ${variants[variant]}`
}

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" | "success" | "warning" | "info" }
>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn("mb-1 font-semibold text-md leading-none tracking-tight text-foreground", className)}
      {...props}
    />
  )
)
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm text-muted-foreground font-normal [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
