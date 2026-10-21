"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { Navbar } from "@/components/layout/Navbar";
import { useSession } from "@/hooks/useSession";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Agreement } from "@/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import OverviewTab from "./components/OverviewTab";
import ScopeTab from "./components/ScopeTab";
import DeliveriesTab from "./components/DeliveriesTab";
import MessagesTab from "./components/MessagesTab";
import HistoryTab from "./components/HistoryTab";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const prefersReducedMotion = useReducedMotion();
  const agreementId = params.agreementId as string;

  const [agreement, setAgreement] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session) {
      toast.error("Please login to view projects");
      router.push("/login");
      return;
    }

    fetchAgreement();
  }, [session, sessionLoading, agreementId, refreshTrigger]);

  const fetchAgreement = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/agreements/${agreementId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          toast.error("You are not a participant in this project");
          router.push("/dashboard");
          return;
        }
        throw new Error(data.error || "Failed to fetch agreement");
      }

      setAgreement(data.agreement);
    } catch (err: any) {
      console.error("Error fetching agreement:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading || sessionLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-[#0A0A0F] dark:via-[#0F0F1A] dark:to-[#1A0F2E] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Loading project...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (error || !agreement) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-[#0A0A0F] dark:via-[#0F0F1A] dark:to-[#1A0F2E] flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || "Project not found"}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  const userRole =
    session?.userId === agreement.creator?.user_id ? "creator" : "brand";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-[#0A0A0F] dark:via-[#0F0F1A] dark:to-[#1A0F2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs.Root
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <Tabs.List className="flex gap-2 border-b border-gray-200 dark:border-white/10 overflow-x-auto pb-2">
              {["overview", "scope", "deliveries", "messages", "history"].map(
                (tab) => (
                  <Tabs.Trigger
                    key={tab}
                    value={tab}
                    className={`
                      px-4 py-2 rounded-t-lg text-sm font-medium transition-all
                      focus:outline-none focus:ring-2 focus:ring-purple-500
                      ${
                        activeTab === tab
                          ? "bg-white dark:bg-white/5 text-purple-600 dark:text-purple-400 border-b-2 border-purple-600"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                      }
                    `}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Tabs.Trigger>
                )
              )}
            </Tabs.List>

            <Tabs.Content
              value="overview"
              className={prefersReducedMotion ? "" : "animate-in fade-in-50"}
            >
              <OverviewTab
                agreement={agreement}
                userRole={userRole}
                onRefresh={refresh}
              />
            </Tabs.Content>

            <Tabs.Content
              value="scope"
              className={prefersReducedMotion ? "" : "animate-in fade-in-50"}
            >
              <ScopeTab
                agreement={agreement}
                userRole={userRole}
                onRefresh={refresh}
              />
            </Tabs.Content>

            <Tabs.Content
              value="deliveries"
              className={prefersReducedMotion ? "" : "animate-in fade-in-50"}
            >
              <DeliveriesTab
                agreement={agreement}
                userRole={userRole}
                onRefresh={refresh}
              />
            </Tabs.Content>

            <Tabs.Content
              value="messages"
              className={prefersReducedMotion ? "" : "animate-in fade-in-50"}
            >
              <MessagesTab
                agreement={agreement}
                userRole={userRole}
                onRefresh={refresh}
              />
            </Tabs.Content>

            <Tabs.Content
              value="history"
              className={prefersReducedMotion ? "" : "animate-in fade-in-50"}
            >
              <HistoryTab agreementId={agreement.id} />
            </Tabs.Content>
          </Tabs.Root>
        </div>
      </div>
    </>
  );
}
