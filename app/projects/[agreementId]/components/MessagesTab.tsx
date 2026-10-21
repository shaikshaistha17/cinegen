"use client";

import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, AlertTriangle, FileEdit } from "lucide-react";
import { toast } from "sonner";
import * as Select from "@radix-ui/react-select";
import { useSession } from "@/hooks/useSession";

interface MessagesTabProps {
  agreement: any;
  userRole: "creator" | "brand";
  onRefresh: () => void;
}

export default function MessagesTab({
  agreement,
  userRole,
  onRefresh,
}: MessagesTabProps) {
  const { session } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");
  const [messageType, setMessageType] = useState<
    "comment" | "revision_request" | "scope_change_request"
  >("comment");
  const [deliveryVersion, setDeliveryVersion] = useState<string>("");
  const [proposedChanges, setProposedChanges] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, [agreement.id]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/project-messages?agreementId=${agreement.id}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch messages");
      }

      setMessages(data.messages || []);
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!content.trim()) {
      toast.error("Message content is required");
      return;
    }

    if (
      messageType === "scope_change_request" &&
      !proposedChanges.trim()
    ) {
      toast.error("Proposed changes are required for scope change requests");
      return;
    }

    try {
      setSending(true);

      const body: any = {
        agreementId: agreement.id,
        messageType,
        content: content.trim(),
      };

      if (messageType === "revision_request" && deliveryVersion) {
        body.deliveryVersion = parseInt(deliveryVersion);
      }

      if (messageType === "scope_change_request") {
        try {
          body.proposedChanges = JSON.parse(proposedChanges);
        } catch {
          // If not valid JSON, treat as plain text
          body.proposedChanges = { changes: proposedChanges.trim() };
        }
      }

      const response = await fetch("/api/project-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      toast.success("Message sent");
      setContent("");
      setDeliveryVersion("");
      setProposedChanges("");
      setMessageType("comment");
      fetchMessages();
      onRefresh();
    } catch (err: any) {
      console.error("Send message error:", err);
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMessageTypeConfig = (type: string) => {
    switch (type) {
      case "comment":
        return {
          icon: MessageSquare,
          label: "Comment",
          color: "blue",
          bgClass: "bg-blue-100 dark:bg-blue-500/20",
          textClass: "text-blue-700 dark:text-blue-400",
        };
      case "revision_request":
        return {
          icon: FileEdit,
          label: "Revision Request",
          color: "orange",
          bgClass: "bg-orange-100 dark:bg-orange-500/20",
          textClass: "text-orange-700 dark:text-orange-400",
        };
      case "scope_change_request":
        return {
          icon: AlertTriangle,
          label: "Scope Change Request",
          color: "red",
          bgClass: "bg-red-100 dark:bg-red-500/20",
          textClass: "text-red-700 dark:text-red-400",
        };
      default:
        return {
          icon: MessageSquare,
          label: "Message",
          color: "gray",
          bgClass: "bg-gray-100 dark:bg-white/10",
          textClass: "text-gray-700 dark:text-gray-400",
        };
    }
  };

  const isCurrentUserMessage = (message: any) => {
    return message.sender_id === session?.userId;
  };

  return (
    <div className="space-y-6">
      {/* Messages List */}
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            No messages yet
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const typeConfig = getMessageTypeConfig(message.message_type);
              const TypeIcon = typeConfig.icon;
              const isCurrentUser = isCurrentUserMessage(message);

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isCurrentUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] ${
                      isCurrentUser ? "items-end" : "items-start"
                    } flex flex-col gap-1`}
                  >
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                      {!isCurrentUser && (
                        <span className="font-medium">
                          {message.senderName}
                        </span>
                      )}
                      <span>{formatDate(message.created_at)}</span>
                    </div>

                    <div
                      className={`rounded-2xl p-4 ${
                        isCurrentUser
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                          : "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                            isCurrentUser
                              ? "bg-white/20 text-white"
                              : `${typeConfig.bgClass} ${typeConfig.textClass}`
                          }`}
                        >
                          <TypeIcon className="w-3 h-3" />
                          {typeConfig.label}
                        </span>
                      </div>

                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>

                      {message.delivery_version && (
                        <p className="text-xs mt-2 opacity-80">
                          Related to: Delivery Version {message.delivery_version}
                        </p>
                      )}

                      {message.video_timestamp_seconds !== null &&
                        message.video_timestamp_seconds !== undefined && (
                          <p className="text-xs mt-2 opacity-80">
                            Timestamp: {message.video_timestamp_seconds}s
                          </p>
                        )}

                      {message.proposed_changes && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                          <p className="text-xs font-medium mb-1">
                            Proposed Changes:
                          </p>
                          <pre className="text-xs opacity-90 whitespace-pre-wrap">
                            {typeof message.proposed_changes === "string"
                              ? message.proposed_changes
                              : JSON.stringify(
                                  message.proposed_changes,
                                  null,
                                  2
                                )}
                          </pre>
                          {(message.change_accepted_by_creator ||
                            message.change_accepted_by_brand) && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs opacity-90">
                                Creator:{" "}
                                {message.change_accepted_by_creator
                                  ? "✓ Accepted"
                                  : "Pending"}
                              </p>
                              <p className="text-xs opacity-90">
                                Brand:{" "}
                                {message.change_accepted_by_brand
                                  ? "✓ Accepted"
                                  : "Pending"}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
        <div className="space-y-4">
          {/* Message Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Message Type
            </label>
            <select
              value={messageType}
              onChange={(e) =>
                setMessageType(
                  e.target.value as
                    | "comment"
                    | "revision_request"
                    | "scope_change_request"
                )
              }
              className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="comment">Comment</option>
              <option value="revision_request">Revision Request</option>
              <option value="scope_change_request">Scope Change Request</option>
            </select>
          </div>

          {/* Delivery Version (for revision requests) */}
          {messageType === "revision_request" && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Delivery Version (Optional)
              </label>
              <input
                type="number"
                min="1"
                value={deliveryVersion}
                onChange={(e) => setDeliveryVersion(e.target.value)}
                placeholder="e.g., 1"
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {/* Proposed Changes (for scope change requests) */}
          {messageType === "scope_change_request" && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Proposed Changes (JSON or plain text)
              </label>
              <textarea
                value={proposedChanges}
                onChange={(e) => setProposedChanges(e.target.value)}
                placeholder='{"priceDelta": 500, "deadlineDeltaDays": 7, "changes": "Add 1 more video"}'
                rows={3}
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              />
            </div>
          )}

          {/* Message Content */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Message
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message..."
              rows={4}
              className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || !content.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-lg"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Message
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
