import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Mäklaraktig Textarea Component
 * 
 * Design Philosophy:
 * - Same styling as Input component for consistency
 * - Border: 1px light gray (#E5E7EB)
 * - Radius: rounded-md (6px)
 * - Padding: px-3 (12px horizontal)
 * - Placeholder: italic, muted gray, hidden on focus
 * - Focus: 2px ring with primary color (dark green)
 */

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Base styles - consistent with Input
        "flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base",
        "transition-colors duration-200",
        
        // Placeholder styles - italic, muted gray, hidden on focus
        "placeholder:text-muted-foreground placeholder:italic focus:placeholder-transparent",
        
        // Focus states - 2px ring with primary color (dark green)
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-primary",
        
        // Disabled states - gray background, gray text, not-allowed cursor
        "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200",
        
        // Resize behavior
        "resize-none",
        
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
