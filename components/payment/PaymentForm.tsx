"use client";

import { useState, FormEvent } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { motion } from "framer-motion";
import { Loader2, Lock, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface PaymentFormProps {
  agreementId: string;
  amount: number;
  milestoneNumber?: number;
  onSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}

export default function PaymentForm({
  agreementId,
  amount,
  milestoneNumber = 1,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardholderName, setCardholderName] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error("Stripe is not loaded yet");
      return;
    }

    if (!cardholderName.trim()) {
      toast.error("Please enter cardholder name");
      return;
    }

    setLoading(true);

    try {
      // Create payment intent
      const response = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementId,
          milestoneNumber,
          amount,
          currency: "INR",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment intent");
      }

      // Handle demo mode
      if (data.demo) {
        toast.success("Demo payment completed!");
        onSuccess(data.paymentIntentId);
        return;
      }

      // Confirm card payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cardholderName,
            },
          },
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent.status === "succeeded") {
        toast.success("Payment successful!");
        onSuccess(data.paymentIntentId);
      } else {
        throw new Error("Payment was not successful");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      const errorMessage = error.message || "Payment failed";
      toast.error(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cardholder Name */}
      <div>
        <label
          htmlFor="cardholderName"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Cardholder Name
        </label>
        <input
          id="cardholderName"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          disabled={loading}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
        />
      </div>

      {/* Card Element */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Card Details
        </label>
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#ffffff",
                  "::placeholder": {
                    color: "#9ca3af",
                  },
                },
                invalid: {
                  color: "#ef4444",
                },
              },
            }}
          />
        </div>
      </div>

      {/* Security Badges */}
      <div className="flex items-center justify-center gap-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Lock className="w-4 h-4" />
          <span>Secured by Stripe</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <CreditCard className="w-4 h-4" />
          <span>PCI DSS Compliant</span>
        </div>
      </div>

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={!stripe || loading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            Pay ₹{(amount / 100).toLocaleString("en-IN")}
          </>
        )}
      </motion.button>

      {/* Test Card Notice */}
      {process.env.NODE_ENV === 'development' && (
        <p className="text-xs text-gray-500 text-center mt-4">
          Test card: 4242 4242 4242 4242 • Any future date • Any CVC
        </p>
      )}
    </form>
  );
}
