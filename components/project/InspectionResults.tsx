"use client";

import { CheckCircle2, XCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { InspectionResult } from "@/types";

interface InspectionResultsProps {
  inspectionStatus: "pass" | "fail" | "unsupported" | "error";
  inspectionResults: InspectionResult;
}

export default function InspectionResults({
  inspectionStatus,
  inspectionResults,
}: InspectionResultsProps) {
  const getStatusConfig = () => {
    switch (inspectionStatus) {
      case "pass":
        return {
          icon: CheckCircle2,
          label: "Pass",
          color: "green",
          bgClass: "bg-green-50 dark:bg-green-500/10",
          borderClass: "border-green-200 dark:border-green-500/20",
          textClass: "text-green-700 dark:text-green-400",
          iconClass: "text-green-600 dark:text-green-400",
        };
      case "fail":
        return {
          icon: XCircle,
          label: "Fail",
          color: "red",
          bgClass: "bg-red-50 dark:bg-red-500/10",
          borderClass: "border-red-200 dark:border-red-500/20",
          textClass: "text-red-700 dark:text-red-400",
          iconClass: "text-red-600 dark:text-red-400",
        };
      case "unsupported":
        return {
          icon: AlertTriangle,
          label: "Unsupported",
          color: "yellow",
          bgClass: "bg-yellow-50 dark:bg-yellow-500/10",
          borderClass: "border-yellow-200 dark:border-yellow-500/20",
          textClass: "text-yellow-700 dark:text-yellow-400",
          iconClass: "text-yellow-600 dark:text-yellow-400",
        };
      case "error":
        return {
          icon: AlertCircle,
          label: "Error",
          color: "red",
          bgClass: "bg-red-50 dark:bg-red-500/10",
          borderClass: "border-red-200 dark:border-red-500/20",
          textClass: "text-red-700 dark:text-red-400",
          iconClass: "text-red-600 dark:text-red-400",
        };
      default:
        return {
          icon: AlertCircle,
          label: "Unknown",
          color: "gray",
          bgClass: "bg-gray-50 dark:bg-white/5",
          borderClass: "border-gray-200 dark:border-white/10",
          textClass: "text-gray-700 dark:text-gray-400",
          iconClass: "text-gray-600 dark:text-gray-400",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div
        className={`flex items-center gap-3 p-4 rounded-xl border ${config.bgClass} ${config.borderClass}`}
      >
        <Icon className={`w-6 h-6 ${config.iconClass}`} />
        <div>
          <p className={`font-semibold ${config.textClass}`}>
            Inspection {config.label}
          </p>
          {inspectionResults.message && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {inspectionResults.message}
            </p>
          )}
        </div>
      </div>

      {/* Metadata Table */}
      {inspectionResults.metadata &&
        Object.keys(inspectionResults.metadata).length > 0 && (
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Media Properties
              </h4>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-white/10">
              {Object.entries(inspectionResults.metadata).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="px-4 py-3 flex justify-between items-center"
                  >
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white font-mono">
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

      {/* Checks Table - Only show if status is fail and checks exist */}
      {inspectionStatus === "fail" &&
        inspectionResults.checks &&
        inspectionResults.checks.length > 0 && (
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Requirement Checks
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Requirement
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Expected
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Actual
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {inspectionResults.checks.map((check, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {check.requirement}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {check.expected}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {check.actual}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {check.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Unsupported/Error Message */}
      {(inspectionStatus === "unsupported" || inspectionStatus === "error") &&
        inspectionResults.message && (
          <div
            className={`p-4 rounded-xl border ${config.bgClass} ${config.borderClass}`}
          >
            <p className={`text-sm ${config.textClass}`}>
              {inspectionResults.message}
            </p>
            {inspectionStatus === "unsupported" && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                This file format cannot be automatically inspected. Manual
                review is recommended.
              </p>
            )}
          </div>
        )}
    </div>
  );
}
