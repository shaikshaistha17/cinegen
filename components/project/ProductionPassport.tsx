"use client";

import {
  FileText,
  Handshake,
  Upload,
  MessageSquare,
  CheckCircle2,
  Star,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
} from "lucide-react";
import { useState } from "react";
import { ProductionPassport as PassportType } from "@/types";

interface ProductionPassportProps {
  passportData: PassportType;
}

export default function ProductionPassport({
  passportData,
}: ProductionPassportProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const toggleEvent = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "brief_created":
        return FileText;
      case "proposal_submitted":
      case "proposal_accepted":
        return Handshake;
      case "agreement_created":
      case "creator_accepted":
      case "brand_accepted":
        return CheckCircle2;
      case "delivery_uploaded":
        return Upload;
      case "message":
        return MessageSquare;
      case "final_approval":
        return CheckCircle2;
      case "review":
        return Star;
      default:
        return Clock;
    }
  };

  const getEventLabel = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Original Brief
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {passportData.brief.campaignTitle}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Agreed Price
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                ${passportData.agreement.price?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Deliveries
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {passportData.deliveries.length} Submitted
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Project Timeline
        </h3>

        <div className="space-y-4">
          {passportData.history.map((event, index) => {
            const EventIcon = getEventIcon(event.type);
            const isExpanded = expandedEvents.has(index);
            const hasExpandableData =
              event.data &&
              Object.keys(event.data).length > 0 &&
              event.type !== "creator_accepted" &&
              event.type !== "brand_accepted";

            return (
              <div key={index} className="flex gap-4">
                {/* Timeline Connector */}
                <div className="flex flex-col items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-full">
                    <EventIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  {index < passportData.history.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 dark:bg-white/10 mt-2" />
                  )}
                </div>

                {/* Event Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {getEventLabel(event.type)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(event.timestamp)}
                      </p>
                    </div>

                    {hasExpandableData && (
                      <button
                        onClick={() => toggleEvent(index)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expanded Data */}
                  {isExpanded && hasExpandableData && (
                    <div className="mt-3 p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Final Approval */}
      {passportData.deliveries.some((d) => d.brandApprovedAt) && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 rounded-2xl border border-green-200 dark:border-green-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Final Approval
            </h3>
          </div>
          {passportData.deliveries
            .filter((d) => d.brandApprovedAt)
            .map((delivery) => (
              <div key={delivery.id} className="space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Delivery Version:</span>{" "}
                  {delivery.version}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Approved:</span>{" "}
                  {formatDate(delivery.brandApprovedAt!)}
                </p>
                {delivery.approvalNotes && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Notes:</span>{" "}
                    {delivery.approvalNotes}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Review */}
      {passportData.review && (
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Client Review
            </h3>
          </div>
          <div className="flex items-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= passportData.review.rating
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300 dark:text-gray-600"
                }`}
              />
            ))}
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              {passportData.review.rating} / 5
            </span>
          </div>
          {passportData.review.comment && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {passportData.review.comment}
            </p>
          )}
        </div>
      )}

      {/* Export Button */}
      <div className="text-center">
        <button
          disabled
          className="px-6 py-3 bg-gray-300 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded-lg font-semibold cursor-not-allowed"
        >
          Export Production Passport (Coming Soon)
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Future feature: Export as PDF or JSON
        </p>
      </div>
    </div>
  );
}
