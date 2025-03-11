import type React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "~~/lib/utils"

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  size?: "sm" | "md" | "lg"
}

export function IconButton({ icon: Icon, size = "md", className, ...props }: IconButtonProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center text-foreground hover:text-primary focus:text-primary transition-colors cursor-pointer",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      <Icon className={cn("h-4 w-4", { "h-5 w-5": size === "lg" })} />
    </button>
  )
}

