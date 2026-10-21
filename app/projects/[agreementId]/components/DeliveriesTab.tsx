"use client";

import { useState, useEffect } from "react";
import {
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import DeliveryUpload from "@/components/project/DeliveryUpload";
import InspectionResults from "@/components/project/InspectionResults";
import ApprovalButton from "@/components/project/ApprovalButton";

interface DeliveriesTabProps {
  agreement: any;
  userRole: "creator" | "brand";
  onRefresh: () => void;
}

export default function DeliveriesTab({
  agreement,
  userRole,
  onRefresh,
}: DeliveriesTabProps) {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const bothAccepted =
    agreement.creator_accepted_at && agreement.brand_accepted_at;
  const canUpload = userRole === "creator" && bothAccepted;

  useEffect(() => {
    fetchDeliveries();
  }, [agreement.id]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/deliveries?agreementId=${agreement.id}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch deliveries");
      }

      setDeliveries(data.deliveries || []);
    } catch (err: any) {
      console.error("Error fetching deliveries:", err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (deliveryId: string, fileName: string) => {
    try {
      setDownloading(deliveryId);

      const response = await fetch(`/api/deliveries/${deliveryId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get download URL");
      }

      // Open download URL in new tab
      window.open(data.url, "_blank");
      toast.success("Download started");
    } catch (err: any) {
      console.error("Download error:", err);
      toast.error(err.message);
    } finally {
      setDownloading(null);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pass":
        return {
          icon: CheckCircle2,
          label: "Pass",
          color: "green",
          bgClass: "bg-green-100 dark:bg-green-500/20",
          textClass: "text-green-700 dark:text-green-400",
        };
      case "fail":
        return {
          icon: XCircle,
          label: "Fail",
          color: "red",
          bgClass: "bg-red-100 dark:bg-red-500/20",
          textClass: "text-red-700 dark:text-red-400",
        };
      case "unsupported":
        return {
          icon: AlertTriangle,
          label: "Unsupported",
          color: "yellow",
          bgClass: "bg-yellow-100 dark:bg-yellow-500/20",
          textClass: "text-yellow-700 dark:text-yellow-400",
        };
      case "error":
        return {
          icon: AlertCircle,
          label: "Error",
          color: "red",
          bgClass: "bg-red-100 dark:bg-red-500/20",
          textClass: "text-red-700 dark:text-red-400",
        };
      default:
        return {
          icon: AlertCircle,
          label: "Unknown",
          color: "gray",
          bgClass: "bg-gray-100 dark:bg-white/10",
          textClass: "text-gray-700 dark:text-gray-400",
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Upload Component */}
      {canUpload && (
        <DeliveryUpload
          agreementId={agreement.id}
          onUploadComplete={() => {
            fetchDeliveries();
            onRefresh();
          }}
        />
      )}

      {/* Deliveries List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Delivery History
        </h3>

        {loading ? (
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-12 text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Loading deliveries...
            </p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No deliveries yet
            </p>
          </div>
        ) : (
          deliveries.map((delivery) => {
            const statusConfig = getStatusConfig(delivery.inspection_status);
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedDelivery === delivery.id;
            const canApprove =
              userRole === "brand" &&
              !delivery.brand_approved_at &&
              (delivery.inspection_status === "pass" ||
                delivery.inspection_status === "fail");

            return (
              <div
                key={delivery.id}
                className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Version {delivery.version}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.label}
                        </span>
                        {delivery.brand_approved_at && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved by Brand
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {delivery.file_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatFileSize(delivery.file_size_bytes)} •{" "}
                        {formatDate(delivery.created_at)}
                      </p>
                      {delivery.brand_approved_at && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Approved: {formatDate(delivery.brand_approved_at)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {canApprove && (
                        <ApprovalButton
                          deliveryId={delivery.id}
                          inspectionStatus={delivery.inspection_status}
                          onApproved={() => {
                            fetchDeliveries();
                            onRefresh();
                          }}
                        />
                      )}
                      <button
                        onClick={() => handleDownload(delivery.id, delivery.file_name)}
                        disabled={downloading === delivery.id}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {downloading === delivery.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Download
                          </>
                        )}
                      </button>
                      <button
                        onClick={() =>
                          setExpandedDelivery(isExpanded ? null : delivery.id)
                        }
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Inspection Results */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                      <InspectionResults
                        inspectionStatus={delivery.inspection_status}
                        inspectionResults={delivery.inspection_results}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
