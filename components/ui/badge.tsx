import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-blue-300 bg-blue-100 text-blue-900 shadow-xs hover:bg-blue-200",
        secondary:
          "border-slate-300 bg-slate-100 text-slate-800 shadow-xs hover:bg-slate-200",
        destructive:
          "border-red-300 bg-red-100 text-red-900 shadow-xs hover:bg-red-200",
        outline: "border-slate-300 bg-slate-100 text-slate-800 shadow-xs",
        success:
          "border-emerald-300 bg-emerald-100 text-emerald-900 shadow-xs hover:bg-emerald-200",
        warning:
          "border-amber-300 bg-amber-100 text-amber-900 shadow-xs hover:bg-amber-200",
        info:
          "border-blue-300 bg-blue-100 text-blue-900 shadow-xs hover:bg-blue-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
