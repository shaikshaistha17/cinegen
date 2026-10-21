"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

interface ApprovalButtonProps {
  deliveryId: string;
  inspectionStatus: "pass" | "fail" | "unsupported" | "error";
  onApproved: () => void;
}

export default function ApprovalButton({
  deliveryId,
  inspectionStatus,
  onApproved,
}: ApprovalButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [approving, setApproving] = useState(false);

  const requiresOverride = inspectionStatus === "fail";

  const handleApprove = async () => {
    if (requiresOverride && !overrideReason.trim()) {
      toast.error("Override reason is required for failed deliveries");
      return;
    }

    try {
      setApproving(true);

      const response = await fetch(`/api/deliveries/${deliveryId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalNotes: approvalNotes.trim() || null,
          overrideReason: overrideReason.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve delivery");
      }

      toast.success("Delivery approved");
      setShowDialog(false);
      onApproved();
    } catch (err: any) {
      console.error("Approval error:", err);
      toast.error(err.message);
    } finally {
      setApproving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
          focus:outline-none focus:ring-2 focus:ring-purple-500
          ${
            requiresOverride
              ? "bg-orange-600 hover:bg-orange-700 text-white"
              : "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
          }
        `}
      >
        {requiresOverride ? (
          <>
            <AlertTriangle className="w-4 h-4" />
            Approve with Override
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Approve Delivery
          </>
        )}
      </button>

      <Dialog.Root open={showDialog} onOpenChange={setShowDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#0F0F1A] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-lg z-50 focus:outline-none">
            <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {requiresOverride ? "Approve with Override" : "Approve Delivery"}
            </Dialog.Title>

            <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {requiresOverride
                ? "This delivery failed inspection checks. Please provide a reason for the override."
                : "Confirm approval of this delivery. This action marks the deliverable as accepted."}
            </Dialog.Description>

            <div className="space-y-4">
              {requiresOverride && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Override Reason *
                  </label>
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Explain why you're approving despite inspection failure..."
                    rows={3}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Approval Notes {requiresOverride ? "" : "(Optional)"}
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDialog(false)}
                disabled={approving}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approving || (requiresOverride && !overrideReason.trim())}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {approving ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
