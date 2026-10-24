"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { Agreement, Brief, CreatorProfile } from "@/types";
import PaymentForm from "@/components/payment/PaymentForm";
import OrderSummary from "@/components/payment/OrderSummary";
import ConfettiExplosion from "react-confetti-explosion";
import { CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agreementId = searchParams.get("agreementId");
  const milestoneNumber = parseInt(searchParams.get("milestoneNumber") || "1");
  const amount = parseInt(searchParams.get("amount") || "0");

  const [loading, setLoading] = useState(true);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const stripePromise = getStripePromise();

  useEffect(() => {
    if (!agreementId) {
      toast.error("Agreement ID is required");
      router.push("/dashboard");
      return;
    }

    fetchPaymentData();
  }, [agreementId]);

  const fetchPaymentData = async () => {
    try {
      const supabase = createClient();

      // Fetch agreement
      const { data: agreementData, error: agreementError } = await supabase
        .from("agreements")
        .select("*")
        .eq("id", agreementId)
        .single();

      if (agreementError) throw agreementError;

      // Fetch brief
      const { data: briefData, error: briefError } = await supabase
        .from("briefs")
        .select("*")
        .eq("id", agreementData.brief_id)
        .single();

      if (briefError) throw briefError;

      // Fetch creator profile
      const { data: creatorData, error: creatorError } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("id", agreementData.creator_id)
        .single();

      if (creatorError) throw creatorError;

      setAgreement(agreementData);
      setBrief(briefData);
      setCreator(creatorData);
    } catch (error: any) {
      console.error("Error fetching payment data:", error);
      toast.error("Failed to load payment details");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setPaymentSuccess(true);
    setShowConfetti(true);

    // Redirect after celebration
    setTimeout(() => {
      router.push(`/projects/${agreementId}`);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!agreement || !brief || !creator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Payment data not found</p>
          <Link
            href="/dashboard"
            className="text-purple-400 hover:text-purple-300 transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 relative overflow-hidden">
        {showConfetti && (
          <div className="absolute inset-0 flex items-center justify-center">
            <ConfettiExplosion
              force={0.8}
              duration={3000}
              particleCount={200}
              width={1600}
            />
          </div>
        )}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="text-center"
        >
          <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4">Payment Successful!</h1>
          <p className="text-gray-300 mb-2">
            Your payment of ₹{(amount / 100).toLocaleString("en-IN")} has been processed
          </p>
          <p className="text-gray-400 text-sm">Redirecting to project...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Link
          href={`/projects/${agreementId}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Complete Payment</h1>
          <p className="text-gray-400">
            Secure payment for Milestone {milestoneNumber}
          </p>
        </motion.div>

        {/* Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Payment Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-6">Payment Details</h2>
            <Elements stripe={stripePromise}>
              <PaymentForm
                agreementId={agreementId!}
                amount={amount}
                milestoneNumber={milestoneNumber}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          </motion.div>

          {/* Right Column - Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <OrderSummary
              agreement={agreement}
              brief={brief}
              creator={creator}
              milestoneNumber={milestoneNumber}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}
