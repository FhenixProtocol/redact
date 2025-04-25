"use client";

import type * as React from "react";
import { motion } from "framer-motion";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  color?: string;
  className?: string;
}

export function Spinner({ size = 24, color = "currentColor", className = "", ...props }: SpinnerProps) {
  // Calculate stroke width based on size
  const strokeWidth = 2; // Math.max(2, Math.round(size / 8));

  // Calculate appropriate radius
  const radius = Math.max(5, size / 2 - strokeWidth * 2);

  // Calculate viewBox dimensions
  const viewBoxSize = size;
  const center = viewBoxSize / 2;

  // Calculate stroke-dasharray based on radius
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      role="status"
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      {...props}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
        />
      </motion.svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
