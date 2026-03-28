import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Mäklaraktig Input Component
 * 
 * Design Philosophy:
 * - Height: h-10 (40px) for normal mode
 * - Border: 1px light gray (#E5E7EB)
 * - Radius: rounded-md (6px)
 * - Padding: px-3 (12px horizontal)
 * - Placeholder: italic, muted gray, hidden on focus
 * - Focus: 2px ring with primary color (dark green)
 * - NO colored borders in default state
 */

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles - Mäklaraktig
          "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-base",
          "transition-colors duration-200",
          
          // File input styles
          "file:border-0 file:bg-transparent file:text-sm file:font-normal file:text-foreground",
          
          // Placeholder styles - italic, muted gray, hidden on focus
          "placeholder:text-muted-foreground placeholder:italic focus:placeholder-transparent",
          
          // Focus states - 2px ring with primary color (dark green)
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          
          // Normal border state - light gray (#E5E7EB)
          !error && "border-gray-300 focus-visible:border-primary",
          
          // Error states - red border and ring
          error && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500",
          
          // Disabled states - gray background, gray text, not-allowed cursor
          "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200",
          
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
