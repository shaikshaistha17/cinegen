"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastProps {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onClose: (id: string) => void;
}

const variantStyles = {
  success: "bg-gradient-to-r from-green-600 to-green-500 text-white",
  error: "bg-gradient-to-r from-red-600 to-red-500 text-white",
  info: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white",
  warning: "bg-gradient-to-r from-yellow-600 to-orange-500 text-white",
};

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

export function Toast({
  id,
  message,
  variant = "info",
  duration = 5000,
  onClose,
}: ToastProps) {
  const [progress, setProgress] = useState(100);
  const Icon = icons[variant];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        onClose(id);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [id, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className={`relative min-w-[300px] max-w-md rounded-xl shadow-2xl overflow-hidden ${variantStyles[variant]}`}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 p-0.5 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="h-1 bg-black/20">
        <motion.div
          className="h-full bg-white/40"
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.016, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}

export function ToastContainer({ toasts, onClose }: { toasts: ToastProps[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default Toast;
