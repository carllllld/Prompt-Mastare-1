import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
          "transition-colors duration-200",
          // File input styles
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Placeholder styles
          "placeholder:text-muted-foreground placeholder:italic",
          // Focus states with ring classes
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // Normal border state
          !error && "border-input focus-visible:border-primary",
          // Error states
          error && "border-error focus-visible:ring-error focus-visible:border-error",
          // Disabled states
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          // Hover state (when not disabled)
          "hover:enabled:border-primary/50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
