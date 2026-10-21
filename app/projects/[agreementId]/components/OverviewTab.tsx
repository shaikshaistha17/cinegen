"use client";

import { useState } from "react";
import { Clock, CheckCircle2, Upload, Eye, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface OverviewTabProps {
  agreement: any;
  userRole: "creator" | "brand";
  onRefresh: () => void;
}

export default function OverviewTab({
  agreement,
  userRole,
  onRefresh,
}: OverviewTabProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);

  const getProjectStatus = () => {
    if (!agreement.creator_accepted_at && !agreement.brand_accepted_at) {
      return {
        label: "Pending Both Parties",
        color: "yellow",
        description: "Waiting for both parties to accept",
      };
    }
    if (!agreement.creator_accepted_at) {
      return {
        label: "Pending Creator Accept",
        color: "yellow",
        description: "Waiting for creator to accept agreement",
      };
    }
    if (!agreement.brand_accepted_at) {
      return {
        label: "Pending Brand Accept",
        color: "yellow",
        description: "Waiting for brand to accept agreement",
      };
    }
    // Both accepted - check if deliveries exist
    if (agreement.deliveries && agreement.deliveries.length > 0) {
      const hasApproved = agreement.deliveries.some(
        (d: any) => d.brand_approved_at
      );
      if (hasApproved) {
        return {
          label: "Completed",
          color: "green",
          description: "Delivery approved",
        };
      }
    }
    return {
      label: "Active",
      color: "blue",
      description: "In production",
    };
  };

  const status = getProjectStatus();

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

  const getPrimaryAction = () => {
    if (needsUserAcceptance) {
      return {
        label: "Accept Agreement",
        onClick: handleAccept,
        loading: accepting,
        icon: CheckCircle2,
      };
    }
    if (bothAccepted && userRole === "creator") {
      return {
        label: "Upload Delivery",
        onClick: () => {
          // Scroll to deliveries tab
          const deliveriesTab = document.querySelector(
            '[data-state="inactive"][value="deliveries"]'
          ) as HTMLButtonElement;
          deliveriesTab?.click();
        },
        icon: Upload,
      };
    }
    if (bothAccepted && userRole === "brand") {
      return {
        label: "View Latest Delivery",
        onClick: () => {
          const deliveriesTab = document.querySelector(
            '[data-state="inactive"][value="deliveries"]'
          ) as HTMLButtonElement;
          deliveriesTab?.click();
        },
        icon: Eye,
      };
    }
    return null;
  };

  const primaryAction = getPrimaryAction();

  // Mock stats - would come from actual queries
  const stats = {
    deliveries: agreement.deliveries?.length || 0,
    revisions: 0, // Count revision_request messages
    messages: 0, // Count all messages
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {agreement.brief?.campaign_title || "Project"}
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
                  ${
                    status.color === "green"
                      ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400"
                      : status.color === "blue"
                      ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                      : "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                  }
                `}
              >
                {status.label}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {status.description}
              </span>
            </div>
          </div>

          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-lg"
            >
              {primaryAction.loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <primaryAction.icon className="w-4 h-4" />
                  {primaryAction.label}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar - Only show when active */}
      {bothAccepted && (
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Project Progress
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Deliverables
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {stats.deliveries} / {agreement.deliverables?.quantity || 1}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    (stats.deliveries /
                      (agreement.deliverables?.quantity || 1)) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Next Milestone */}
      {bothAccepted && (
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Next Milestone
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Delivery deadline in{" "}
                {agreement.milestones?.timelineDays || 14} days
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Complete and submit all deliverables for brand review
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Deliveries
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.deliveries}
              </p>
            </div>
            <Upload className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Revisions
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.revisions}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Messages
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.messages}
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
