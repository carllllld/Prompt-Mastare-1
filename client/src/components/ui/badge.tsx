import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = ({
  variant = "default"
}: {
  variant?: "default" | "secondary" | "destructive" | "outline"
}) => {
  const base = "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover-elevate"
  
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground shadow-xs",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-destructive text-destructive-foreground shadow-xs",
    outline: "border [border-color:var(--badge-outline)] shadow-xs"
  }
  
  return `${base} ${variants[variant]}`
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }
