// components/FnxSelect.tsx

"use client";

import * as React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~~/components/ui/Select";
import Image from 'next/image';
import { useState } from "react";

interface FnxSelectItem {
  logo?: string;
  dot?: boolean;
  value: string;
  name: string;
}

interface FnxSelectProps {
  /** The currently selected item's value */
  value: string;
  /** Callback called when user selects a new item */
  onChange: (val: string) => void;
  /** The list of items to display in the select */
  items: FnxSelectItem[];
  /** Optional placeholder for when nothing is selected */
  placeholder?: string;
  /** Additional class names for the trigger, etc. */
  className?: string;
  fixedFooter?: (close: () => void) => React.ReactNode;
}

/**
 * A reusable Select component wrapping Radix and shadcn/ui's Select primitives.
 */
export function FnxSelect({
  value,
  onChange,
  items,
  placeholder = "Select",
  className,
  fixedFooter,
}: FnxSelectProps) {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Select value={value} onValueChange={onChange} open={open} onOpenChange={setOpen}>
      <SelectTrigger
        className={`
          rounded-[20px] border-none bg-gray-200 text-primary-accent
          ${className || ""}
        `}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent 
        className="rounded-[20px] border-none p-0 bg-surface"
        position="popper"
        sideOffset={-48}
      >
        {items.map((item: FnxSelectItem) => (
          <SelectItem 
            key={item.value} 
            value={item.value} 
            className="my-1 hover:bg-white/50 data-[state=checked]:bg-white"
          >
            <div className="flex items-center gap-2 font-medium text-md">
              {item.logo ? (
                <Image 
                  src={item.logo} 
                  alt={item.name} 
                  width={24} 
                  height={24} 
                  className="w-6 h-6"
                  style={{
                    maxWidth: '100%',
                    height: 'auto'
                  }}
                />
              ) : (
                <div className="h-4 w-4 rounded-full bg-primary" />
              )}
              <span className="text-primary-accent">{item.name}</span>
            </div>
          </SelectItem>
        ))}

        {fixedFooter && (
          <>
            <div className="h-[1px] bg-white/20 mx-2" />
            {fixedFooter(handleClose)}
          </>
        )}
      </SelectContent>
    </Select>
  );
}
