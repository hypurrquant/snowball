import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice-400/50 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-ice-500 to-ice-600 text-white shadow-ice hover:shadow-ice-lg",
        destructive:
          "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
        outline:
          "border border-border bg-transparent hover:bg-bg-hover text-text-secondary hover:text-text-primary",
        secondary:
          "bg-bg-hover border border-border text-text-secondary hover:text-text-primary hover:border-ice-400/30",
        ghost:
          "hover:bg-bg-hover text-text-secondary hover:text-text-primary",
        link: "text-ice-400 underline-offset-4 hover:underline",
        success:
          "bg-success/10 text-success border border-success/20 hover:bg-success/20",
        warning:
          "bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
