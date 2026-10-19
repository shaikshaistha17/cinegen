"use client";
import { forwardRef, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { motion, HTMLMotionProps } from "framer-motion";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantStyles = {
      primary:
        "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 btn-glow shadow-lg shadow-purple-500/25",
      secondary:
        "glass-card border border-white/10 text-foreground hover:bg-white/10",
      outline:
        "border-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-5 py-2.5 text-sm",
      lg: "px-8 py-4 text-base",
    };

    const Component = motion.button as any;

    return (
      <Component
        ref={ref}
        whileHover={{ scale: disabled || loading ? 1 : 1.05 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.95 }}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!loading && icon && iconPosition === "left" && icon}
        {children}
        {!loading && icon && iconPosition === "right" && icon}
      </Component>
    );
  }
);

Button.displayName = "Button";

export default Button;
