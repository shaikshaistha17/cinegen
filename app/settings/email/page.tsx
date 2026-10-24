"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Mail, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface EmailPreferences {
  proposal_submitted: boolean;
  proposal_accepted: boolean;
  payment_received: boolean;
  delivery_uploaded: boolean;
  review_submitted: boolean;
  message_received: boolean;
}

const emailTypeLabels: Record<keyof EmailPreferences, { title: string; description: string }> = {
  proposal_submitted: {
    title: "Proposal Submitted",
    description: "When a creator submits a proposal to your brief",
  },
  proposal_accepted: {
    title: "Proposal Accepted",
    description: "When your proposal is accepted by a brand",
  },
  payment_received: {
    title: "Payment Received",
    description: "When you receive payment for a project",
  },
  delivery_uploaded: {
    title: "Delivery Uploaded",
    description: "When a creator uploads a delivery for review",
  },
  review_submitted: {
    title: "Review Submitted",
    description: "When a brand submits a review on your delivery",
  },
  message_received: {
    title: "Message Received",
    description: "When you receive a new message",
  },
};

export default function EmailPreferencesPage() {
  const [preferences, setPreferences] = useState<EmailPreferences>({
    proposal_submitted: true,
    proposal_accepted: true,
    payment_received: true,
    delivery_uploaded: true,
    review_submitted: true,
    message_received: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  async function fetchPreferences() {
    try {
      const response = await fetch("/api/settings/email-preferences");
      if (!response.ok) {
        throw new Error("Failed to fetch preferences");
      }
      const data = await response.json();
      setPreferences(data.preferences);
    } catch (error: any) {
      console.error("Error fetching preferences:", error);
      toast.error("Failed to load email preferences");
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    setSaving(true);
    try {
      const response = await fetch("/api/settings/email-preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }

      toast.success("Email preferences saved successfully");
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save email preferences");
    } finally {
      setSaving(false);
    }
  }

  function togglePreference(key: keyof EmailPreferences) {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Email Preferences</h1>
              <p className="text-gray-400 mt-1">
                Manage which email notifications you want to receive
              </p>
            </div>
          </div>
        </motion.div>

        {/* Preferences Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
            <Bell className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">
              Notification Types
            </h2>
          </div>

          <div className="space-y-4">
            {(Object.keys(preferences) as Array<keyof EmailPreferences>).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-1">
                    {emailTypeLabels[key].title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {emailTypeLabels[key].description}
                  </p>
                </div>

                <div className="flex items-center gap-8 ml-4">
                  {/* In-App (always on) */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-2">In-App</div>
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                  </div>

                  {/* Email toggle */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-2">Email</div>
                    <button
                      onClick={() => togglePreference(key)}
                      className={`relative w-14 h-8 rounded-full transition-all ${
                        preferences[key]
                          ? "bg-gradient-to-r from-purple-500 to-indigo-600"
                          : "bg-gray-700"
                      }`}
                    >
                      <motion.div
                        className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
                        animate={{
                          left: preferences[key] ? "30px" : "4px",
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-end"
        >
          <button
            onClick={savePreferences}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl"
        >
          <p className="text-blue-300 text-sm">
            <strong>Note:</strong> In-app notifications are always enabled. Email
            preferences only control whether you receive emails for these events.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
