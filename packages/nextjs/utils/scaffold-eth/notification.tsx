import React from "react";
import { CircleAlert, CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { ToastPosition, toast } from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { HashLink } from "~~/components/HashLink";
import { cn } from "~~/lib/utils";

type NotificationProps = {
  content: React.ReactNode;
  status: "success" | "info" | "loading" | "error" | "warning";
  duration?: number;
  icon?: string;
  position?: ToastPosition;
  txHash?: string;
};

type NotificationOptions = {
  duration?: number;
  icon?: string;
  position?: ToastPosition;
  txHash?: string;
};

const ENUM_STATUSES = {
  success: <CircleCheck className="w-5 h-5 text-success-500" />,
  loading: <LoaderCircle className="w-5 h-5 animate-spin text-primary-accent" />,
  error: <TriangleAlert className="w-5 h-5 text-destructive" />,
  info: <CircleAlert className="w-5 h-5 text-primary-accent" />,
  warning: <TriangleAlert className="w-5 h-5 text-warning-500" />,
};

const DEFAULT_DURATION = 4000;
const DEFAULT_POSITION: ToastPosition = "top-center";

/**
 * Custom Notification
 */
const Notification = ({
  content,
  txHash,
  status,
  duration = DEFAULT_DURATION,
  icon,
  position = DEFAULT_POSITION,
}: NotificationProps) => {
  return toast.custom(
    (t: any) => (
      <div
        className={cn(
          `flex flex-row items-center justify-between rounded-xl shadow-center shadow-accent p-4 gap-4 bg-primary-foreground transform-gpu relative transition-all duration-500 ease-in-out border-2`,
          status === "success"
            ? "border-success-500"
            : status === "error"
              ? "border-destructive"
              : status === "info" || status === "loading"
                ? "border-primary-accent"
                : "border-background",
          position.substring(0, 3) == "top"
            ? `hover:translate-y-1 ${t.visible ? "top-0" : "-top-96"}`
            : `hover:-translate-y-1 ${t.visible ? "bottom-0" : "-bottom-96"}`,
        )}
      >
        <div className="leading-[0] self-center">{icon ? icon : ENUM_STATUSES[status]}</div>
        <div className="flex flex-col">
          <div className={`break-words whitespace-pre-line text-primary text-sm`}>{content}</div>
          {txHash && <HashLink type="tx" hash={txHash} />}
        </div>
        <div className={`cursor-pointer text-lg`} onClick={() => toast.dismiss(t.id)}>
          <XMarkIcon className="w-6 cursor-pointer" onClick={() => toast.remove(t.id)} />
        </div>
      </div>
    ),
    {
      duration: status === "loading" ? Infinity : duration,
      position,
    },
  );
};

export const notification = {
  success: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "success", ...options });
  },
  info: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "info", ...options });
  },
  warning: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "warning", ...options });
  },
  error: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "error", ...options });
  },
  loading: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "loading", ...options });
  },
  remove: (toastId: string) => {
    toast.remove(toastId);
  },
};
