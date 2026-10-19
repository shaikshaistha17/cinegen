"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Shield, Award, AlertCircle, Upload, Loader2 } from "lucide-react";
import { VerificationBadge as BadgeType } from "@/types";
import { useVerifications, VerificationType } from "@/hooks/useVerifications";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

interface VerificationBadgeProps {
  badge: BadgeType;
  toolsVerified: boolean;
  workflowVerified: boolean;
  pastWorkVerified: boolean;
  creatorId: string;
  isOwnProfile?: boolean;
}

export function VerificationBadge({
  badge,
  toolsVerified,
  workflowVerified,
  pastWorkVerified,
  creatorId,
  isOwnProfile = false,
}: VerificationBadgeProps) {
  const { session } = useSession();
  const { requestVerification, loading } = useVerifications();
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState<VerificationType | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getBadgeConfig = () => {
    switch (badge) {
      case "Studio":
        return {
          icon: Award,
          color: "from-yellow-400 to-amber-500",
          bgColor: "bg-yellow-500/20",
          borderColor: "border-yellow-500/50",
          label: "Studio",
        };
      case "Verified":
        return {
          icon: CheckCircle,
          color: "from-green-400 to-emerald-500",
          bgColor: "bg-green-500/20",
          borderColor: "border-green-500/50",
          label: "Verified",
        };
      case "Rising":
        return {
          icon: Shield,
          color: "from-blue-400 to-cyan-500",
          bgColor: "bg-blue-500/20",
          borderColor: "border-blue-500/50",
          label: "Rising",
        };
      default:
        return {
          icon: AlertCircle,
          color: "from-gray-400 to-gray-500",
          bgColor: "bg-gray-500/20",
          borderColor: "border-gray-500/50",
          label: "Unverified",
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const handleRequestVerification = async () => {
    if (!selectedType || !evidenceUrl.trim()) {
      toast.error("Please provide evidence URL");
      return;
    }

    setSubmitting(true);
    try {
      await requestVerification(creatorId, selectedType, evidenceUrl);
      toast.success("Verification request submitted! Our team will review it soon.");
      setShowModal(false);
      setSelectedType(null);
      setEvidenceUrl("");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit verification request");
    } finally {
      setSubmitting(false);
    }
  };

  const verificationTypes: { type: VerificationType; label: string; verified: boolean; description: string }[] = [
    {
      type: "tools",
      label: "Tools Verified",
      verified: toolsVerified,
      description: "Verify your proficiency with AI tools",
    },
    {
      type: "workflow",
      label: "Workflow Verified",
      verified: workflowVerified,
      description: "Share your creative workflow process",
    },
    {
      type: "past_work",
      label: "Past Work Verified",
      verified: pastWorkVerified,
      description: "Showcase completed commercial projects",
    },
  ];

  return (
    <>
      <div className="relative inline-block group">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 ${config.bgColor} ${config.borderColor} border rounded-full cursor-pointer transition-all hover:scale-105`}
        >
          <Icon className={`w-4 h-4 bg-gradient-to-r ${config.color} bg-clip-text text-transparent`} />
          <span className={`text-sm font-semibold bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
            {config.label}
          </span>
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="glass rounded-lg border border-white/10 p-3 shadow-xl min-w-[200px]">
            <div className="text-xs font-semibold mb-2">Verification Status</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                {toolsVerified ? (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-gray-500" />
                )}
                <span className={toolsVerified ? "text-green-400" : "text-muted-foreground"}>Tools</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {workflowVerified ? (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-gray-500" />
                )}
                <span className={workflowVerified ? "text-green-400" : "text-muted-foreground"}>Workflow</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {pastWorkVerified ? (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-gray-500" />
                )}
                <span className={pastWorkVerified ? "text-green-400" : "text-muted-foreground"}>Past Work</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Verification Button (own profile only) */}
      {isOwnProfile && session?.role === "creator" && badge !== "Studio" && (
        <button
          onClick={() => setShowModal(true)}
          className="ml-3 inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-full text-sm font-medium hover:bg-violet-500/30 transition-all"
        >
          <Upload className="w-4 h-4" />
          Request Verification
        </button>
      )}

      {/* Verification Request Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl border border-white/10 p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="font-display font-semibold text-xl mb-4">Request Verification</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Choose what you'd like to verify and provide evidence URL (portfolio link, video, or documentation)
              </p>

              <div className="space-y-3 mb-6">
                {verificationTypes.map((type) => (
                  <button
                    key={type.type}
                    onClick={() => setSelectedType(type.type)}
                    disabled={type.verified}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      type.verified
                        ? "bg-green-500/10 border-green-500/30 opacity-50 cursor-not-allowed"
                        : selectedType === type.type
                        ? "bg-violet-500/20 border-violet-500/50"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm mb-1">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                      {type.verified && <CheckCircle className="w-5 h-5 text-green-400" />}
                    </div>
                  </button>
                ))}
              </div>

              {selectedType && !verificationTypes.find((t) => t.type === selectedType)?.verified && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Evidence URL</label>
                  <input
                    type="url"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://your-portfolio.com/evidence"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Provide a link to your portfolio, project, or relevant documentation
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedType(null);
                    setEvidenceUrl("");
                  }}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestVerification}
                  disabled={!selectedType || !evidenceUrl.trim() || submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl hover:from-violet-500 hover:to-violet-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
