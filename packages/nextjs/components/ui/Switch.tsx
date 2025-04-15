import * as React from "react";
import { useState } from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>((/*{ className ...props , ref*/) => {
  const [isLight, setIsLight] = useState(true);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="relative flex items-center gap-2 px-2 py-1.5 rounded-full bg-sky-100 border border-primaryAccent">
        <span className="mr-2 text-sm font-medium text-gray-700">Light</span>
        <motion.div
          className="absolute right-2 w-7 h-7 bg-blue-500 rounded-full"
          initial={false}
          animate={{
            x: isLight ? -36 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
        <button
          onClick={() => setIsLight(true)}
          className={`relative z-10 p-1.5 rounded-full ${isLight ? "text-white" : "text-gray-600 hover:text-gray-900"}`}
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsLight(false)}
          className={`relative z-10 p-1.5 rounded-full ${
            !isLight ? "text-white" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Moon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // <SwitchPrimitives.Root
  //   className={cn(
  //     "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
  //     className
  //   )}
  //   {...props}
  //   ref={ref}
  // >
  //   <SwitchPrimitives.Thumb
  //     className={cn(
  //       "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
  //     )}
  //   />
  // </SwitchPrimitives.Root>
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
