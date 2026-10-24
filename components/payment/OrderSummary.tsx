"use client";

import { motion } from "framer-motion";
import { Agreement, Brief, CreatorProfile } from "@/types";
import Image from "next/image";

interface OrderSummaryProps {
  agreement: Agreement;
  brief: Brief;
  creator: CreatorProfile;
  milestoneNumber: number;
}

export default function OrderSummary({
  agreement,
  brief,
  creator,
  milestoneNumber,
}: OrderSummaryProps) {
  const milestoneAmount = agreement.price;
  const platformFeePercent = 10;
  const platformFee = Math.floor(milestoneAmount * (platformFeePercent / 100));
  const total = milestoneAmount + platformFee;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 space-y-6"
    >
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Order Summary</h2>
        <p className="text-sm text-gray-400">Review your payment details</p>
      </div>

      {/* Creator Info */}
      <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
          {creator.avatarUrl ? (
            <Image
              src={creator.avatarUrl}
              alt={creator.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-semibold">
              {creator.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-white">{creator.name}</h3>
          <p className="text-sm text-gray-400">@{creator.handle}</p>
        </div>
      </div>

      {/* Project Details */}
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-400">Project</p>
          <p className="font-medium text-white">{brief.campaignTitle}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Content Type</p>
          <p className="font-medium text-white">{brief.contentType}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Milestone</p>
          <p className="font-medium text-white">Milestone {milestoneNumber}</p>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Milestone Amount</span>
          <span className="text-white font-medium">
            ₹{(milestoneAmount / 100).toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Platform Fee ({platformFeePercent}%)</span>
          <span className="text-white font-medium">
            ₹{(platformFee / 100).toLocaleString("en-IN")}
          </span>
        </div>
        <div className="border-t border-white/10 pt-3 flex justify-between">
          <span className="text-white font-semibold">Total</span>
          <span className="text-white font-semibold text-lg">
            ₹{(total / 100).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Deliverables */}
      {agreement.deliverables && (
        <div className="border-t border-white/10 pt-4">
          <p className="text-sm text-gray-400 mb-2">What You'll Receive</p>
          <div className="space-y-1 text-sm text-white">
            <p>• {agreement.deliverables.contentType}</p>
            <p>• {agreement.deliverables.quantity} deliverable(s)</p>
            {agreement.deliverables.aspectRatios && (
              <p>• Aspect Ratios: {agreement.deliverables.aspectRatios.join(", ")}</p>
            )}
            <p>• {agreement.includedRevisions} revision(s) included</p>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
        <p className="text-xs text-purple-300">
          🔒 Your payment is secured by Stripe. Funds will be held in escrow until
          delivery is approved.
        </p>
      </div>
    </motion.div>
  );
}
