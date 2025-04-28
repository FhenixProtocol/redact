"use client";

import * as React from "react";
import { Button, ButtonProps } from "./Button";
import { Check, X } from "lucide-react";

export interface ConfirmButtonProps extends Omit<ButtonProps, "onClick"> {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmButton = React.forwardRef<HTMLButtonElement, ConfirmButtonProps>(
  ({ children, onConfirm, confirmText = "Yes", cancelText = "No", ...props }, ref) => {
    const [isConfirming, setIsConfirming] = React.useState(false);

    const handleConfirm = () => {
      setIsConfirming(false);
      onConfirm();
    };

    const handleCancel = () => {
      setIsConfirming(false);
    };

    if (isConfirming) {
      return (
        <div className="flex gap-2">
          <Button
            {...props}
            onClick={handleConfirm}
            ref={ref}
            variant="default"
            size="sm"
            icon={Check}
            className="bg-green-500 hover:bg-green-600"
          >
            {confirmText}
          </Button>
          <Button
            {...props}
            variant="default"
            size="sm"
            icon={X}
            onClick={handleCancel}
            className="bg-red-500 hover:bg-red-600"
          >
            {cancelText}
          </Button>
        </div>
      );
    }

    return (
      <Button {...props} onClick={() => setIsConfirming(true)} ref={ref}>
        {children}
      </Button>
    );
  },
);

ConfirmButton.displayName = "ConfirmButton";
