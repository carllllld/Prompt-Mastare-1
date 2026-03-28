import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Mäklaraktig Badge Component
 * 
 * Design Philosophy:
 * - Remove all colored variants (success, warning, error)
 * - Keep only gray variants (default, secondary, outline)
 * - If badges are needed, they should be minimal and gray
 * - Consider removing badges entirely if not essential
 */

const badgeVariants = cva(
  "inline-flex items-center rounded-md border font-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Primary: Dark green (use sparingly)
        default: "border-transparent bg-primary text-primary-foreground",
        // Secondary: Gray (preferred for most badges)
        secondary: "border-transparent bg-gray-100 text-gray-700",
        // Outline: White with gray border
        outline: "border border-gray-300 bg-white text-gray-700",
        // Legacy colored variants removed - use text color instead
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-2.5 py-1 text-sm",
        lg: "px-3 py-1.5 text-base",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
