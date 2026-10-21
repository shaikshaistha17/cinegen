"use client";

import { useState } from "react";
import {
  FileText,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

interface ScopeTabProps {
  agreement: any;
  userRole: "creator" | "brand";
  onRefresh: () => void;
}

export default function ScopeTab({
  agreement,
  userRole,
  onRefresh,
}: ScopeTabProps) {
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    try {
      setAccepting(true);
      const response = await fetch(`/api/agreements/${agreement.id}/accept`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept agreement");
      }

      toast.success("Agreement accepted");
      onRefresh();
    } catch (err: any) {
      console.error("Error accepting agreement:", err);
      toast.error(err.message);
    } finally {
      setAccepting(false);
    }
  };

  const needsUserAcceptance =
    (userRole === "creator" && !agreement.creator_accepted_at) ||
    (userRole === "brand" && !agreement.brand_accepted_at);

  const bothAccepted =
    agreement.creator_accepted_at && agreement.brand_accepted_at;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Agreement Scope
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Version {agreement.version} •{" "}
              {formatDate(agreement.created_at)}
            </p>
          </div>

          {needsUserAcceptance && (
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-lg"
            >
              {accepting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Accept Agreement
                </>
              )}
            </button>
          )}
        </div>

        {/* Acceptance Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-white/10">
          <div
            className={`flex items-center gap-3 p-3 rounded-lg ${
              agreement.creator_accepted_at
                ? "bg-green-50 dark:bg-green-500/10"
                : "bg-gray-50 dark:bg-white/5"
            }`}
          >
            <CheckCircle2
              className={`w-5 h-5 ${
                agreement.creator_accepted_at
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-400 dark:text-gray-600"
              }`}
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Creator Acceptance
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {agreement.creator_accepted_at
                  ? formatDate(agreement.creator_accepted_at)
                  : "Pending"}
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-3 p-3 rounded-lg ${
              agreement.brand_accepted_at
                ? "bg-green-50 dark:bg-green-500/10"
                : "bg-gray-50 dark:bg-white/5"
            }`}
          >
            <CheckCircle2
              className={`w-5 h-5 ${
                agreement.brand_accepted_at
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-400 dark:text-gray-600"
              }`}
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Brand Acceptance
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {agreement.brand_accepted_at
                  ? formatDate(agreement.brand_accepted_at)
                  : "Pending"}
              </p>
            </div>
          </div>
        </div>

        {bothAccepted && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              ✓ Both parties have accepted this agreement
            </p>
          </div>
        )}
      </div>

      {/* Deliverables */}
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Deliverables
          </h3>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Content Type
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {agreement.deliverables?.contentType || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Quantity
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {agreement.deliverables?.quantity || 1}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Resolution
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {agreement.deliverables?.resolution || "N/A"}
              </p>
            </div>
          </div>

          {agreement.deliverables?.aspectRatios && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Aspect Ratios
              </p>
              <div className="flex flex-wrap gap-2">
                {agreement.deliverables.aspectRatios.map(
                  (ratio: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded-full text-sm font-medium"
                    >
                      {ratio}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {agreement.deliverables?.durationSeconds && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Duration
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {agreement.deliverables.durationSeconds} seconds
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Price & Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Price
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${agreement.price?.toLocaleString() || "0"}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {agreement.currency || "USD"}
          </p>
        </div>

        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Timeline
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {agreement.milestones?.timelineDays || 14}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            days to delivery
          </p>
        </div>
      </div>

      {/* Revisions & Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Included Revisions
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {agreement.included_revisions || 2}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            revision rounds included
          </p>
        </div>

        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Usage Rights
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                License Tier
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {agreement.usage_requirements?.licenseTier || "N/A"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Model Indemnity
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {agreement.usage_requirements?.modelIndemnity ? "Yes" : "No"}
              </span>
            </div>
            {agreement.usage_requirements?.usageRegions && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Regions
                </p>
                <div className="flex flex-wrap gap-1">
                  {agreement.usage_requirements.usageRegions.map(
                    (region: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded text-xs"
                      >
                        {region}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
