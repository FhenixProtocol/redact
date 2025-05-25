import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "~~/lib/utils";

function Accordion({ ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  );
}

type AccordionTriggerProps = React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  iconPosition?: "left" | "right";
  icon?: React.ReactNode;
  iconRotate?: string;
};

function AccordionTrigger({
  className,
  children,
  iconPosition = "right",
  icon,
  iconRotate = "rotate-180",
  ...props
}: AccordionTriggerProps) {
  const iconStyle =
    "text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200";

  // If a custom icon is provided, clone it and apply the style
  const IconComponent = React.isValidElement(icon) ? (
    React.cloneElement(icon as React.ReactElement<any, any>, {
      className: cn(iconStyle, (icon as React.ReactElement<any, any>).props.className),
    })
  ) : (
    <ChevronDownIcon className={iconStyle} />
  );

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          `ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 flex flex-1 items-center gap-4 rounded-md py-4 text-left text-sm font-medium transition-all hover:underline focus-visible:ring-4 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:${iconRotate}`,
          iconPosition === "right" ? "justify-between" : "justify-start",
          className,
        )}
        {...props}
      >
        {iconPosition === "left" && IconComponent}
        {children}
        {iconPosition === "right" && IconComponent}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
