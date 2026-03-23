import * as React from "react"
import { cn } from "@/lib/utils"

const alertVariants = ({
  variant = "default"
}: {
  variant?: "default" | "destructive" | "success" | "warning" | "info"
}) => {
  const base = "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4"
  
  const variants = {
    default: "bg-background text-foreground border-border [&>svg]:text-foreground",
    destructive: "bg-error-bg text-error border-error [&>svg]:text-error",
    success: "bg-success-bg text-success border-success [&>svg]:text-success",
    warning: "bg-warning-bg text-warning border-warning [&>svg]:text-warning",
    info: "bg-info-bg text-info border-info [&>svg]:text-info"
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
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
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
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
