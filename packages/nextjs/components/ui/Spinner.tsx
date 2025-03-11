"use client"

import type * as React from "react"
import { motion } from "framer-motion"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  color?: string
}

export function Spinner({ size = 24, color = "currentColor", ...props }: SpinnerProps) {
  return (
    <div role="status" {...props}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
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
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
        />
      </motion.svg>
      <span className="sr-only">Loading...</span>
    </div>
  )
}

