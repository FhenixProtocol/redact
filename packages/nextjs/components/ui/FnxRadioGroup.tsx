"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react";
import { cn } from "~~/lib/utils";
import { RadioGroup, RadioGroupItem } from "~~/components/ui/RadioGroup"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

interface RadioButtonGroupProps {
  labels: string[]
  values?: string[]
  Icons?: LucideIcon[]
  value: string
  onChange: (value: string) => void,
  className?: string
}

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

const RadioButtonGroup = ({ labels, Icons, values, value, onChange, className }: RadioButtonGroupProps) => {
  if (!values) {
    values = labels;
  };

  return (
    <div className="w-full p-2">
      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-2 gap-4">
        {values.map((val, idx) => {
          const Icon = Icons && Icons[idx] ? Icons[idx] : null;
          return (
            <Label
              key={idx}
              htmlFor={val}
              className={cn(
                `
                relative
                cursor-pointer
                rounded-full
                px-6
                py-3
                transition-all
                hover:bg-blue-500/20
                `,
                            value === val
                              ? `
                  text-theme-black
                  bg-info-300
                  before:content-['']
                  before:absolute
                  before:-inset-xs
                  before:rounded-full
                  before:border-2
                  before:border-blue-400
                  before:pointer-events-none
                  `
                  : `bg-gray-200 text-blue-400`,
                className // Ensure `className` is passed correctly as a separate argument
              )}
            >
              <RadioGroupItem id={val} value={val} className="sr-only" />
              <div className="flex items-center justify-center gap-2">
                {idx == 0 && Icon && <Icon className="w-4 h-4" />} {/* Render the icon properly */}
                <span className="text-sm font-bold">{labels[idx]}</span>
                {idx == 1 && Icon && <Icon className="w-4 h-4" />} {/* Render the icon properly */}
              </div>
            </Label>
          );
        })}

      </RadioGroup>
    </div>
  )
}

RadioButtonGroup.displayName = "RadioButtonGroup"

export { RadioButtonGroup }