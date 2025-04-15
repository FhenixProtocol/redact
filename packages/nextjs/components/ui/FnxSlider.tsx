"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "~~/lib/utils";

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /** Show percentage markers */
  showMarkers?: boolean;
  /** Show "MAX" button */
  showMaxButton?: boolean;
  /** Max value */
  max?: number;
  /** On max button click */
  // onMaxClick?: () => void;
  /** Callback when the value changes */
  onValueChange?: (value: number[]) => void;
}

const Slider = React.forwardRef<React.ComponentRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, showMarkers = true, showMaxButton = true, max = 100, onValueChange, ...props }, ref) => {
    // State for the slider value (supports both manual movement & marker clicks)
    const [internalValue, setInternalValue] = React.useState([props.value ? props.value[0] : 0]);

    // Update value when clicking on a marker
    const handleMarkerClick = (percentage: number) => {
      const newValue = (percentage / 100) * max;
      setInternalValue([newValue]); // Updates internal state
      onValueChange?.([newValue]); // Calls external change handler
    };

    return (
      <div className={cn("relative w-full space-y-2", className)}>
        {/* Percentage markers with vertical lines */}
        {showMarkers && (
          <div className="relative flex justify-between text-xs text-gray-500 font-medium px-0">
            {[0, 25, 50, 75, 100].map(percentage => (
              <div
                key={percentage}
                className="flex flex-col items-center cursor-pointer hover:text-blue-600"
                onClick={() => handleMarkerClick(percentage)}
              >
                <span>{percentage}%</span>
                <div className="w-[1px] h-3 bg-gray-500"></div>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-center">
          {/* Slider Track */}
          <SliderPrimitive.Root
            ref={ref}
            className={cn("relative flex w-full touch-none select-none items-center border-none")}
            max={max}
            value={internalValue.filter((v): v is number => v !== undefined)}
            onValueChange={(val: number[]) => {
              setInternalValue(val);
              if (val[0] !== undefined) {
                onValueChange?.(val); // Only call if value is defined
              }
            }}
            {...props}
          >
            <SliderPrimitive.Track className="relative h-3 w-full rounded-full bg-[#005bb5] shadow-inner">
              <SliderPrimitive.Range className="absolute h-full rounded-full border-2 border-[#005bb5] bg-[#0073E6]" />
            </SliderPrimitive.Track>

            {/* Thumb */}
            <SliderPrimitive.Thumb className="block h-6 w-6 rounded-full bg-[#0057FF] border-2 border-[#0057FF] shadow-md focus:outline-hidden focus:ring-2 focus:ring-blue-400" />
          </SliderPrimitive.Root>

          {/* Max Button - Adjusted position */}
          {showMaxButton && (
            <button
              onClick={() => handleMarkerClick(100)}
              className="absolute right-[-55px] top-1/2 -translate-y-1/2 transform text-xs font-semibold text-[#0057FF] font-semibold bg-[#F0F4FF] shadow-md rounded-full px-3 py-1 shadow-md"
              style={{
                marginLeft: "12px", // Small offset to avoid overlapping
                minWidth: "45px", // Ensures size consistency
                height: "24px", // Matches thumb height
              }}
            >
              MAX
            </button>
          )}
        </div>
      </div>
    );
  },
);

Slider.displayName = SliderPrimitive.Root.displayName;
export { Slider };
