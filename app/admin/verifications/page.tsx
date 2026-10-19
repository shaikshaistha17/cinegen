"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle, XCircle, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { useVerifications } from "@/hooks/useVerifications";
import { useSession } from "@/hooks/useSession";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AdminVerificationsPage() {
  const { session } = useSession();
  const router = useRouter();
  const { getPendingVerifications, approveVerification, rejectVerification, loading } = useVerifications();
  const [verifications, setVerifications] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Check if user is admin
    if (!session || session.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    const loadVerifications = async () => {
      const data = await getPendingVerifications();
      setVerifications(data);
    };

    loadVerifications();
  }, [session, router, getPendingVerifications]);

  const loadVerifications = async () => {
    const data = await getPendingVerifications();
    setVerifications(data);
  };

  const handleApprove = async (id: string) => {
    setProcessing(true);
    try {
      await approveVerification(id, adminNotes);
      toast.success("Verification approved!");
      setSelectedId(null);
      setAdminNotes("");
      await loadVerifications();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve verification");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    try {
      await rejectVerification(id, adminNotes);
      toast.success("Verification rejected");
      setSelectedId(null);
      setAdminNotes("");
      await loadVerifications();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject verification");
    } finally {
      setProcessing(false);
    }
  };

  if (!session || session.role !== "admin") {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-violet-400" />
          <h1 className="font-display font-bold text-3xl">Verification Requests</h1>
        </div>
        <p className="text-muted-foreground">Review and approve creator verification requests</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : verifications.length === 0 ? (
        <div className="glass rounded-2xl border border-white/5 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="font-display font-semibold text-xl mb-2">All caught up!</h3>
          <p className="text-muted-foreground">No pending verification requests at the moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {verifications.map((verification, i) => (
            <motion.div
              key={verification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl border border-white/5 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                    {verification.creator?.user?.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{verification.creator?.user?.name || "Unknown"}</h3>
                    <p className="text-sm text-muted-foreground">@{verification.creator?.handle || "unknown"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {verification.creator?.user?.email || ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-full text-sm font-medium mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Pending
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(verification.created_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Verification Type
                  </label>
                  <p className="text-sm font-medium mt-1 capitalize">
                    {verification.verification_type.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Evidence
                  </label>
                  {verification.evidence_url ? (
                    <a
                      href={verification.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 mt-1"
                    >
                      View Evidence <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No URL provided</p>
                  )}
                </div>
              </div>

              {selectedId === verification.id ? (
                <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <label className="block text-sm font-medium mb-2">Admin Notes</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this verification (required for rejection)..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-muted-foreground resize-none mb-3"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedId(null);
                        setAdminNotes("");
                      }}
                      disabled={processing}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(verification.id)}
                      disabled={processing || !adminNotes.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Reject
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleApprove(verification.id)}
                      disabled={processing}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setSelectedId(verification.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-lg hover:bg-violet-500/30 transition-all"
                  >
                    Review
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
