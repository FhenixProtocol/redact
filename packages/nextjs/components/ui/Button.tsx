"use client";

import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "~~/lib/utils";

// Import icon type

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "surface" | "destructive" | "ghost" | "ghost2" | "text" | "outline";
  size?: "md" | "xs" | "sm" | "lg";
  icon?: LucideIcon | React.ComponentType | null;
  iconSize?: "md" | "xs" | "sm" | "lg";
  noOutline?: boolean;
  uppercase?: boolean;
  textCenter?: boolean;
}

const buttonVariants = {
  default: "bg-primary-accent text-white hover:bg-primary-accent-hover",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  surface: "bg-surface hover:bg-button-hover text-primary-accent",
  ghost: "bg-transparent hover:bg-primary-accent/10 text-primary-accent",
  ghost2: "bg-transparent text-primary-accent",
  text: "bg-transparent text-primary font-normal hover:bg-transparent hover:underline hover:font-semibold",
  outline: "bg-transparent border-2 border-primary-accent text-primary-accent hover:bg-primary-accent/10",
};

const sizeVariants = {
  xs: "px-2 py-1 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-md",
  lg: "px-5 py-3 text-lg",
};

const iconSizeVariants = {
  xs: "10px",
  sm: "12px",
  md: "16px",
  lg: "24px",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      iconSize = "md",
      icon: Icon,
      children,
      noOutline = false,
      uppercase = false,
      textCenter = false,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base classes
          "cursor-pointer rounded-full font-semibold transition-colors font-reddit-mono",
          // Outline classes (conditional)
          !noOutline && "focus:outline-hidden focus:ring-2 focus:ring-offset-2",
          // Layout classes
          "flex items-center gap-2",
          textCenter && "justify-center",
          // Variant classes
          buttonVariants[variant],
          // Size-specific classes
          sizeVariants[size],
          "disabled:opacity-50 disabled:cursor-not-allowed", //hover:disabled:bg-inherit
          uppercase && "uppercase",
          className,
        )}
        {...props}
      >
        {Icon && <Icon style={{ width: iconSizeVariants[iconSize], height: iconSizeVariants[iconSize] }} />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
