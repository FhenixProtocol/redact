import React from "react";
import { Button } from "./Button";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  duration?: "fast" | "normal" | "slow";
}

export function Modal({ isOpen, onClose, title, children, duration = "normal" }: ModalProps) {
  if (!isOpen) return null;

  // Define duration multipliers
  const durationMultiplier = {
    fast: "100ms",
    normal: "var(--modal-overlay-duration)",
    slow: "300ms",
  };

  const animationDuration = durationMultiplier[duration];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        animation: `overlayShow ${animationDuration} cubic-bezier(0.16, 1, 0.3, 1)`,
      }}
    >
      {/* Backdrop with fade */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        style={{
          animation: `fadeIn ${animationDuration} cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
        onClick={onClose}
      />

      {/* Modal with slide up and fade */}
      <div
        className="relative drop-shadow-lg z-50 w-[450px] rounded-[24px] border-primary-accent border-1 bg-surface p-6 shadow-xl"
        style={{
          animation: `contentShow ${animationDuration} cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-xl font-semibold text-primary-accent">{title}</h2>}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full absolute top-4 right-4"
          >
            <X className="h-5 w-5 text-primary-accent" />
          </Button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
